const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const scheduleController = require('../controllers/scheduleController');

const router = express.Router();

router.use(protect); // Ensure user is authenticated

router.route('/')
  .get(scheduleController.getSchedules)
  .post(scheduleController.createSchedule);

router.route('/:id')
  .put(scheduleController.updateSchedule)
  .delete(scheduleController.cancelSchedule);

module.exports = router;
