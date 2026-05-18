const Client = require('../models/Client');
const { sendSuccess } = require('../utils/response');
const { parseCSV, parseExcel } = require('../utils/parser');
const { transformData } = require('../utils/transformer');
const { validateData } = require('../utils/validator');
const { bulkInsertClients, handleDuplicates } = require('../services/clientService');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Light phone normalization
 * Trims, removes spaces, and ensures +91 for 10-digit numbers
 */
const normalizePhone = (phone) => {
  if (!phone) return phone;
  let cleaned = phone.trim().replace(/\s+/g, '');
  // If it's a 10-digit number, prefix with +91
  if (cleaned.length === 10 && /^\d+$/.test(cleaned)) {
    return `+91${cleaned}`;
  }
  return cleaned;
};

// @desc    Create a new client
// @route   POST /api/v1/clients
const createClient = async (req, res, next) => {
  try {
    const { name, phone, language, product, email, address, status, notes, assignedSupportMember, assignedDepartment } = req.body;

    const client = await Client.create({
      name,
      phone: normalizePhone(phone),
      language,
      product,
      email,
      address,
      status,
      notes,
      assignedSupportMember: assignedSupportMember || null,
      assignedDepartment: assignedDepartment || '',
    });

    // Two-way sync: Add client to SupportMember's assigned list
    if (assignedSupportMember) {
      const SupportMember = require('../models/SupportMember');
      await SupportMember.findByIdAndUpdate(
        assignedSupportMember,
        { $addToSet: { assignedClients: client._id } }
      );
    }

    return sendSuccess(res, client, 'Client created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all clients with pagination, search, and filter
// @route   GET /api/v1/clients
const getClients = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};

    if (req.query.status && ['active', 'inactive'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    if (req.query.language && ['en', 'hi'].includes(req.query.language)) {
      filter.language = req.query.language;
    }

    // Search across name, phone, product using regex
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { product: searchRegex },
      ];
    }

    const [clients, total] = await Promise.all([
      Client.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Client.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    return sendSuccess(res, {
      clients,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }, 'Clients fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single client by ID
// @route   GET /api/v1/clients/:id
const getClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id).lean();

    if (!client) {
      const error = new Error('Client not found');
      error.statusCode = 404;
      throw error;
    }

    return sendSuccess(res, client, 'Client fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update a client
// @route   PUT /api/v1/clients/:id
const updateClient = async (req, res, next) => {
  try {
    const { name, phone, language, product, email, address, status, notes, assignedSupportMember, assignedDepartment } = req.body;

    const client = await Client.findById(req.params.id);

    if (!client) {
      const error = new Error('Client not found');
      error.statusCode = 404;
      throw error;
    }

    // Keep track of old support member for sync
    const oldSupportMemberId = client.assignedSupportMember ? client.assignedSupportMember.toString() : null;

    // Update only provided fields
    if (name !== undefined) client.name = name;
    if (phone !== undefined) client.phone = normalizePhone(phone);
    if (language !== undefined) client.language = language;
    if (product !== undefined) client.product = product;
    if (email !== undefined) client.email = email;
    if (address !== undefined) client.address = address;
    if (status !== undefined) client.status = status;
    if (notes !== undefined) client.notes = notes;
    if (assignedSupportMember !== undefined) {
      client.assignedSupportMember = assignedSupportMember === '' ? null : assignedSupportMember;
    }
    if (assignedDepartment !== undefined) {
      client.assignedDepartment = assignedDepartment;
    }

    const updatedClient = await client.save();

    // Two-way sync on SupportMember
    const newSupportMemberId = client.assignedSupportMember ? client.assignedSupportMember.toString() : null;
    if (assignedSupportMember !== undefined && oldSupportMemberId !== newSupportMemberId) {
      const SupportMember = require('../models/SupportMember');
      
      // Remove client from old support member
      if (oldSupportMemberId) {
        await SupportMember.findByIdAndUpdate(
          oldSupportMemberId,
          { $pull: { assignedClients: client._id } }
        );
      }
      // Add client to new support member
      if (newSupportMemberId) {
        await SupportMember.findByIdAndUpdate(
          newSupportMemberId,
          { $addToSet: { assignedClients: client._id } }
        );
      }
    }

    return sendSuccess(res, updatedClient, 'Client updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a client
// @route   DELETE /api/v1/clients/:id
const deleteClient = async (req, res, next) => {
  try {
    const client = await Client.findById(req.params.id);

    if (!client) {
      const error = new Error('Client not found');
      error.statusCode = 404;
      throw error;
    }

    await client.deleteOne();

    return sendSuccess(res, { id: req.params.id }, 'Client deleted successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get client statistics
// @route   GET /api/v1/clients/stats
const getStats = async (req, res, next) => {
  try {
    const [total, active, inactive, languageStats] = await Promise.all([
      Client.countDocuments(),
      Client.countDocuments({ status: 'active' }),
      Client.countDocuments({ status: 'inactive' }),
      Client.aggregate([
        {
          $group: {
            _id: '$language',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byLanguage = {};
    languageStats.forEach((lang) => {
      byLanguage[lang._id] = lang.count;
    });

    return sendSuccess(res, {
      total,
      active,
      inactive,
      byLanguage,
    }, 'Client statistics fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Upload clients via CSV/Excel (Step 6: Bulk Insert)
// @route   POST /api/v1/clients/upload
const uploadClients = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error('No file uploaded');
      error.statusCode = 400;
      throw error;
    }

    // Step 2: Parse File (CSV or Excel)
    const ext = path.extname(req.file.originalname).toLowerCase();
    let rawRows;

    try {
      if (ext === '.csv') {
        rawRows = await parseCSV(req.file.path);
      } else if (ext === '.xlsx' || ext === '.xls') {
        rawRows = await parseExcel(req.file.path);
      } else {
        const error = new Error('Unsupported file format. Please upload CSV or Excel.');
        error.statusCode = 400;
        throw error;
      }

      // Handle Empty File Case
      if (!rawRows || rawRows.length === 0) {
        const error = new Error('The uploaded file is empty');
        error.statusCode = 400;
        throw error;
      }

      const totalRecords = rawRows.length;

      // Step 3: Transform Data
      const transformedRecords = transformData(rawRows);

      // Step 4: Validate Data
      const { validRecords, invalidRecords } = validateData(transformedRecords);

      // Step 5: Duplicate Handling
      const { uniqueRecords, duplicateRecords } = await handleDuplicates(validRecords);

      // Step 6: Bulk Insertion
      let insertedCount = 0;
      if (uniqueRecords.length > 0) {
        insertedCount = await bulkInsertClients(uniqueRecords);
      }

      // Cleanup: Delete the uploaded file after processing
      fs.unlink(req.file.path, (err) => {
        if (err) logger.error(`Error deleting file: ${req.file.path}`);
      });

      // Step 7: Final Error Reporting (Strict Format)
      const combinedErrors = [
        ...invalidRecords,
        ...duplicateRecords
      ].sort((a, b) => a.row - b.row);

      // Limit errors array to first 50 entries to avoid huge payloads
      const limitedErrors = combinedErrors.slice(0, 50);

      return sendSuccess(res, {
        total: totalRecords,
        inserted: insertedCount,
        failed: invalidRecords.length + duplicateRecords.length,
        duplicates: duplicateRecords.length,
        invalid: invalidRecords.length,
        errors: limitedErrors,
      }, 'Bulk upload processed');

    } catch (processError) {
      // Ensure file is deleted if processing fails
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }
      throw processError;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
  getStats,
  uploadClients,
};
