const cron = require('node-cron');
const ScheduledCall = require('../models/ScheduledCall');
const Client = require('../models/Client');
const Call = require('../models/Call');
const telephonyService = require('../services/telephonyService');
const logger = require('../utils/logger');
const { normalizePhone } = require('../utils/phoneHelper');
const callController = require('../controllers/callController');

// This job runs every minute to check for pending scheduled calls
const startScheduler = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Find pending calls where scheduledAt is now or in the past
      const pendingSchedules = await ScheduledCall.find({
        status: 'Pending',
        scheduledAt: { $lte: now }
      }).populate('client');

      if (pendingSchedules.length > 0) {
        logger.info(`[SCHEDULER] Found ${pendingSchedules.length} scheduled calls to trigger`);
      }

      for (const schedule of pendingSchedules) {
        try {
          const client = schedule.client;
          if (!client || client.status !== 'active') {
            schedule.status = 'Failed';
            schedule.note = (schedule.note || '') + ' - Failed: Client inactive or not found';
            await schedule.save();
            continue;
          }

          let normalizedPhone;
          try {
            normalizedPhone = normalizePhone(client.phone);
          } catch (err) {
            schedule.status = 'Failed';
            schedule.note = (schedule.note || '') + ' - Failed: ' + err.message;
            await schedule.save();
            continue;
          }

          // Create Call record (Queued)
          const callRecord = await Call.create({
            clientId: client._id,
            phone: normalizedPhone,
            status: 'queued',
            provider: 'twilio',
            scheduledAt: schedule.scheduledAt
          });

          // Trigger Twilio Call
          const result = await telephonyService.initiateCall({
            to: normalizedPhone,
            clientId: client._id,
            callId: callRecord._id
          });

          // Update Call Record
          await Call.findByIdAndUpdate(callRecord._id, {
            providerCallId: result.callSid,
            status: 'initiated',
            errorMessage: null
          });

          // Update Client
          await Client.findByIdAndUpdate(client._id, { lastCallAt: new Date() });

          // Mark Schedule as Completed
          schedule.status = 'Completed';
          schedule.callSid = result.callSid;
          await schedule.save();

          logger.info(`[SCHEDULER] Successfully triggered call for schedule ${schedule._id}`);

          // Handle recurrence
          if (schedule.recurrence && schedule.recurrence !== 'One-time') {
            const nextDate = new Date(schedule.scheduledAt);
            if (schedule.recurrence === 'Daily') {
              nextDate.setDate(nextDate.getDate() + 1);
            } else if (schedule.recurrence === 'Weekly') {
              nextDate.setDate(nextDate.getDate() + 7);
            } else if (schedule.recurrence === 'Monthly') {
              nextDate.setMonth(nextDate.getMonth() + 1);
            }

            // Create next schedule
            await ScheduledCall.create({
              client: client._id,
              callType: schedule.callType,
              scheduledAt: nextDate,
              recurrence: schedule.recurrence,
              note: schedule.note
            });
            logger.info(`[SCHEDULER] Created recurring schedule for ${client.name} at ${nextDate}`);
          }
        } catch (error) {
          logger.error(`[SCHEDULER] Failed to trigger schedule ${schedule._id}: ${error.message}`);
          schedule.status = 'Failed';
          await schedule.save();
        }
      }
    } catch (err) {
      logger.error(`[SCHEDULER ERROR] ${err.message}`);
    }
  });

  logger.info('[SCHEDULER] Background cron scheduler started');
};

module.exports = { startScheduler };
