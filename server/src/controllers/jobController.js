const Call = require('../models/Call');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * List recent jobs (calls) from the database
 * GET /api/jobs
 */
exports.getJobs = async (req, res) => {
  try {
    const { status, limit = 20, skip = 0 } = req.query;
    
    const filter = {};
    if (status) filter.status = status;

    const calls = await Call.find(filter)
      .populate('clientId', 'name')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    const formattedJobs = calls.map((call) => ({
      id: call._id,
      name: `Call to ${call.phone}`,
      data: { clientId: call.clientId, phone: call.phone },
      status: call.status,
      attempts: call.attempts,
      timestamp: call.createdAt,
      processedOn: call.startedAt,
      finishedOn: call.endedAt,
      delay: 0 // Legacy field
    }));

    return sendSuccess(res, formattedJobs, 'Recent call records fetched');
  } catch (error) {
    return sendError(res, `Failed to fetch records: ${error.message}`, 500);
  }
};

/**
 * Get specific call details (Legacy Job ID support)
 * GET /api/jobs/:id
 */
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const call = await Call.findById(id).populate('clientId', 'name');

    if (!call) {
      return sendError(res, 'Record not found', 404);
    }

    const formattedJob = {
      id: call._id,
      name: `Call to ${call.phone}`,
      data: { clientId: call.clientId, phone: call.phone },
      status: call.status,
      attempts: call.attempts,
      timestamp: call.createdAt,
      processedOn: call.startedAt,
      finishedOn: call.endedAt,
      opts: {},
      returnValue: call.response,
      failedReason: call.errorMessage,
      stacktrace: []
    };

    return sendSuccess(res, formattedJob, 'Record details fetched');
  } catch (error) {
    return sendError(res, `Failed to fetch record: ${error.message}`, 500);
  }
};

/**
 * Get real-time call health statistics from DB
 * GET /api/queue/stats
 */
exports.getQueueStats = async (req, res) => {
  try {
    const stats = await Call.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const counts = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0
    };

    stats.forEach(s => {
      if (s._id === 'queued') counts.waiting = s.count;
      if (['processing', 'calling', 'initiated'].includes(s._id)) counts.active += s.count;
      if (['recorded', 'completed'].includes(s._id)) counts.completed += s.count;
      if (s._id === 'failed') counts.failed = s.count;
    });

    return res.json({
      queueEnabled: false,
      mode: "direct-processing",
      queued: counts.waiting,
      processing: counts.active,
      completed: counts.completed,
      failed: counts.failed
    });
  } catch (error) {
    return sendError(res, `Failed to fetch stats: ${error.message}`, 500);
  }
};

/**
 * Get overall platform metrics
 * GET /api/metrics
 */
exports.getMetrics = async (req, res) => {
  try {
    const stats = await Call.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    let completed = 0;
    let failed = 0;
    let total = 0;

    stats.forEach(s => {
      total += s.count;
      if (['recorded', 'completed'].includes(s._id)) completed += s.count;
      if (s._id === 'failed') failed += s.count;
    });
    
    const successRate = (completed + failed) > 0 
      ? (completed / (completed + failed)) * 100 
      : 100;

    return sendSuccess(res, {
      queueEnabled: false,
      mode: "direct-processing",
      total,
      successCount: completed,
      failureCount: failed,
      successRate: parseFloat(successRate.toFixed(2))
    }, 'Platform metrics fetched from MongoDB');
  } catch (error) {
    return sendError(res, `Failed to fetch metrics: ${error.message}`, 500);
  }
};
