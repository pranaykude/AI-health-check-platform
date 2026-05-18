const ScheduledCall = require('../models/ScheduledCall');
const Client = require('../models/Client');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Schedule a new call
 * POST /api/v1/schedules
 */
exports.createSchedule = async (req, res) => {
  try {
    const { clientId, callType, date, time, recurrence, note } = req.body;
    
    // Validate inputs
    if (!clientId || !callType || !date || !time) {
      return sendError(res, 'Client, Call Type, Date and Time are required', 400);
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return sendError(res, 'Client not found', 404);
    }

    // Parse date and time into a single Date object
    const [year, month, day] = date.split('-');
    const [hour, minute] = time.split(':');
    const scheduledAt = new Date(year, month - 1, day, hour, minute);

    if (scheduledAt < new Date()) {
      return sendError(res, 'Scheduled time must be in the future', 400);
    }

    const schedule = await ScheduledCall.create({
      client: clientId,
      callType,
      scheduledAt,
      recurrence: recurrence || 'One-time',
      note: note || ''
    });

    return sendSuccess(res, schedule, 'Call scheduled successfully');
  } catch (err) {
    logger.error('Error scheduling call:', err);
    return sendError(res, err.message || 'Error scheduling call', 500);
  }
};

/**
 * Get scheduled calls (upcoming)
 * GET /api/v1/schedules
 */
exports.getSchedules = async (req, res) => {
  try {
    const filter = {};
    if (req.query.clientId) filter.client = req.query.clientId;
    if (req.query.status) filter.status = req.query.status;

    const schedules = await ScheduledCall.find(filter)
      .populate('client', 'name email phone product')
      .sort({ scheduledAt: 1 });

    return sendSuccess(res, schedules, 'Scheduled calls retrieved successfully');
  } catch (err) {
    logger.error('Error fetching scheduled calls:', err);
    return sendError(res, 'Error fetching scheduled calls', 500);
  }
};

/**
 * Update a scheduled call
 * PUT /api/v1/schedules/:id
 */
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, callType, recurrence, note } = req.body;

    const updateData = {};
    if (date && time) {
      const [year, month, day] = date.split('-');
      const [hour, minute] = time.split(':');
      updateData.scheduledAt = new Date(year, month - 1, day, hour, minute);
      
      if (updateData.scheduledAt < new Date()) {
        return sendError(res, 'Scheduled time must be in the future', 400);
      }
    }
    
    if (callType) updateData.callType = callType;
    if (recurrence) updateData.recurrence = recurrence;
    if (note !== undefined) updateData.note = note;

    const schedule = await ScheduledCall.findByIdAndUpdate(id, updateData, { new: true });
    if (!schedule) {
      return sendError(res, 'Schedule not found', 404);
    }

    return sendSuccess(res, schedule, 'Schedule updated successfully');
  } catch (err) {
    logger.error('Error updating schedule:', err);
    return sendError(res, 'Error updating schedule', 500);
  }
};

/**
 * Cancel a scheduled call
 * DELETE /api/v1/schedules/:id
 */
exports.cancelSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await ScheduledCall.findByIdAndUpdate(id, { status: 'Cancelled' }, { new: true });
    
    if (!schedule) {
      return sendError(res, 'Schedule not found', 404);
    }

    return sendSuccess(res, schedule, 'Schedule cancelled successfully');
  } catch (err) {
    logger.error('Error cancelling schedule:', err);
    return sendError(res, 'Error cancelling schedule', 500);
  }
};
