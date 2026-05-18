const mongoose = require('mongoose');
const SupportMember = require('../models/SupportMember');
const Client = require('../models/Client');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

// @desc    Create a new support member
// @route   POST /api/v1/support-members
// @access  Protected (Admin/Manager)
const createSupportMember = async (req, res, next) => {
  try {
    const { fullName, email, phone, role, department, avatar, status, skills, designation } = req.body;

    // Check if email already exists
    const existing = await SupportMember.findOne({ email });
    if (existing) {
      return sendError(res, 'A support member with this email already exists', 400);
    }

    const supportMember = await SupportMember.create({
      fullName,
      email,
      phone,
      role,
      department,
      avatar,
      status,
      skills: skills || [],
      designation,
      createdBy: req.user.id
    });

    logger.info(`[SUPPORT MEMBER] Created member ${fullName} (${email}) by user ${req.user.email}`);
    return sendSuccess(res, supportMember, 'Support member created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all support members with filters
// @route   GET /api/v1/support-members
// @access  Protected
const getSupportMembers = async (req, res, next) => {
  try {
    const filter = {};

    if (req.query.role) {
      filter.role = req.query.role;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.department) {
      filter.department = req.query.department;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { fullName: searchRegex },
        { email: searchRegex },
        { designation: searchRegex }
      ];
    }

    const members = await SupportMember.find(filter)
      .populate('assignedClients', 'name phone email status')
      .sort({ fullName: 1 });

    return sendSuccess(res, members, 'Support members fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single support member
// @route   GET /api/v1/support-members/:id
// @access  Protected
const getSupportMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid support member ID', 400);
    }

    const member = await SupportMember.findById(id).populate('assignedClients');

    if (!member) {
      return sendError(res, 'Support member not found', 404);
    }

    return sendSuccess(res, member, 'Support member details fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update support member details
// @route   PUT /api/v1/support-members/:id
// @access  Protected (Admin/Manager/Self)
const updateSupportMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, role, department, avatar, status, skills, designation, assignedClients } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid support member ID', 400);
    }

    const member = await SupportMember.findById(id);
    if (!member) {
      return sendError(res, 'Support member not found', 404);
    }

    // Role validation: Non-admin/manager can only update their own profile, status, and avatar
    const isSelf = req.user.id === id || req.user.email === member.email;
    const isAuthorizedModifier = ['admin', 'manager'].includes(req.user.role);

    if (!isAuthorizedModifier && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this support member profile'
      });
    }

    // Apply updates
    if (fullName !== undefined && isAuthorizedModifier) member.fullName = fullName;
    if (email !== undefined && isAuthorizedModifier) {
      // Validate uniqueness if email changed
      if (email.toLowerCase() !== member.email.toLowerCase()) {
        const emailExists = await SupportMember.findOne({ email });
        if (emailExists) {
          return sendError(res, 'Email address is already in use by another member', 400);
        }
      }
      member.email = email;
    }
    if (phone !== undefined) member.phone = phone;
    if (role !== undefined && isAuthorizedModifier) member.role = role;
    if (department !== undefined && isAuthorizedModifier) member.department = department;
    if (avatar !== undefined) member.avatar = avatar;
    if (status !== undefined) member.status = status;
    if (skills !== undefined) member.skills = skills;
    if (designation !== undefined) member.designation = designation;

    // Handle assignedClients update if provided by Admin/Manager
    if (assignedClients !== undefined && isAuthorizedModifier) {
      // Clean up previous client assignments (remove this member from any client not in the new list)
      const removedClients = member.assignedClients.filter(cId => !assignedClients.includes(cId.toString()));
      if (removedClients.length > 0) {
        await Client.updateMany(
          { _id: { $in: removedClients } },
          { $set: { assignedSupportMember: null } }
        );
      }

      // Sync new client assignments (set this member on any client in the new list)
      if (assignedClients.length > 0) {
        await Client.updateMany(
          { _id: { $in: assignedClients } },
          { $set: { assignedSupportMember: id } }
        );
      }

      member.assignedClients = assignedClients;
    }

    member.lastActiveAt = Date.now();
    const updatedMember = await member.save();

    logger.info(`[SUPPORT MEMBER] Updated member ${member.fullName} (${member.email})`);
    return sendSuccess(res, updatedMember, 'Support member updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete support member
// @route   DELETE /api/v1/support-members/:id
// @access  Protected (Admin/Manager)
const deleteSupportMember = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid support member ID', 400);
    }

    const member = await SupportMember.findById(id);
    if (!member) {
      return sendError(res, 'Support member not found', 404);
    }

    // Safe dissociation: Unassign all clients first
    await Client.updateMany(
      { assignedSupportMember: id },
      { $set: { assignedSupportMember: null } }
    );

    await member.deleteOne();

    logger.info(`[SUPPORT MEMBER] Deleted member ${member.fullName} (${member.email})`);
    return sendSuccess(res, { id }, 'Support member and all their client assignments dissociated and deleted successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get all clients assigned to a support member
// @route   GET /api/v1/support-members/:id/clients
// @access  Protected
const getAssignedClients = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 'Invalid support member ID', 400);
    }

    // Verify member exists
    const memberExists = await SupportMember.exists({ _id: id });
    if (!memberExists) {
      return sendError(res, 'Support member not found', 404);
    }

    // Fetch clients directly from database to ensure absolute sync
    const clients = await Client.find({ assignedSupportMember: id }).sort({ name: 1 });

    return sendSuccess(res, clients, 'Assigned clients fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Assign single/multiple clients to a support member and/or department
// @route   POST /api/v1/support-members/assign
// @access  Protected (Admin/Manager)
const assignClients = async (req, res, next) => {
  try {
    const { clientIds, supportMemberId, department } = req.body;

    if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
      return sendError(res, 'clientIds must be a non-empty array of client object IDs', 400);
    }

    // 1. If supportMemberId is provided, validate it and load member
    let member = null;
    if (supportMemberId) {
      if (!mongoose.Types.ObjectId.isValid(supportMemberId)) {
        return sendError(res, 'Invalid support member ID', 400);
      }
      member = await SupportMember.findById(supportMemberId);
      if (!member) {
        return sendError(res, 'Support member not found', 404);
      }
    }

    // 2. Perform Client updates
    const clientUpdate = {};
    if (supportMemberId !== undefined) {
      clientUpdate.assignedSupportMember = supportMemberId || null;
    }
    if (department !== undefined) {
      clientUpdate.assignedDepartment = department;
    }

    // Update clients
    await Client.updateMany(
      { _id: { $in: clientIds } },
      { $set: clientUpdate }
    );

    // 3. Two-way synchronization on SupportMember collections
    // If a new supportMemberId is specified, add these clients to their list
    if (supportMemberId) {
      await SupportMember.findByIdAndUpdate(
        supportMemberId,
        { $addToSet: { assignedClients: { $each: clientIds } } }
      );
    }

    // If supportMemberId was set to null (unassignment), remove these clients from ALL members' assignedClients lists
    if (supportMemberId === null) {
      await SupportMember.updateMany(
        { assignedClients: { $in: clientIds } },
        { $pull: { assignedClients: { $in: clientIds } } }
      );
    } else {
      // Remove these client IDs from any other support member's list (since they are now assigned to the new supportMemberId)
      await SupportMember.updateMany(
        { _id: { $ne: supportMemberId }, assignedClients: { $in: clientIds } },
        { $pull: { assignedClients: { $in: clientIds } } }
      );
    }

    logger.info(`[CLIENT ASSIGNMENT] Assigned ${clientIds.length} clients to support member: ${supportMemberId || 'None'} / Dept: ${department || 'None'}`);
    return sendSuccess(res, null, 'Client assignment synchronized successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get support member workloads
// @route   GET /api/v1/support-members/workload
// @access  Protected (Admin/Manager)
const getWorkloads = async (req, res, next) => {
  try {
    const workloads = await SupportMember.aggregate([
      {
        $project: {
          fullName: 1,
          email: 1,
          role: 1,
          department: 1,
          status: 1,
          designation: 1,
          clientCount: { $size: '$assignedClients' }
        }
      },
      {
        $sort: { clientCount: -1, fullName: 1 }
      }
    ]);

    // Also get unassigned clients count
    const unassignedCount = await Client.countDocuments({ assignedSupportMember: null });

    return sendSuccess(res, { workloads, unassignedClientsCount: unassignedCount }, 'Support workloads computed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSupportMember,
  getSupportMembers,
  getSupportMember,
  updateSupportMember,
  deleteSupportMember,
  getAssignedClients,
  assignClients,
  getWorkloads
};
