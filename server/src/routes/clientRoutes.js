const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
  getStats,
  uploadClients,
} = require('../controllers/clientController');
const upload = require('../middleware/uploadMiddleware');

// Validation middleware
const validateClient = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[\d\s\-]{10,15}$/)
    .withMessage('Phone number must be 10-15 digits'),
  body('language')
    .optional()
    .isIn(['en', 'hi'])
    .withMessage('Language must be "en" or "hi"'),
  body('product')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Product name cannot exceed 200 characters'),
  body('email')
    .optional()
    .trim()
    .custom((value) => {
      if (value === '') return true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error('Please enter a valid email address');
      }
      return true;
    }),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be "active" or "inactive"'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('assignedSupportMember')
    .optional()
    .custom((value) => {
      if (value === '' || value === null) return true;
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid Support Member ID');
      }
      return true;
    }),
  body('assignedDepartment')
    .optional()
    .trim(),
];

const validateUpdateClient = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s\-]{10,15}$/)
    .withMessage('Phone number must be 10-15 digits'),
  body('language')
    .optional()
    .isIn(['en', 'hi'])
    .withMessage('Language must be "en" or "hi"'),
  body('product')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Product name cannot exceed 200 characters'),
  body('email')
    .optional()
    .trim()
    .custom((value) => {
      if (value === '') return true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error('Please enter a valid email address');
      }
      return true;
    }),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address cannot exceed 500 characters'),
  body('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be "active" or "inactive"'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('assignedSupportMember')
    .optional()
    .custom((value) => {
      if (value === '' || value === null) return true;
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid Support Member ID');
      }
      return true;
    }),
  body('assignedDepartment')
    .optional()
    .trim(),
];

const { sendError } = require('../utils/response');

// Validation result handler
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array().map((e) => e.msg));
  }
  next();
};

// Routes — stats must be before :id routes to avoid conflict
router.get('/stats', getStats);
router.post('/upload', upload.single('file'), uploadClients);

router.route('/')
  .get(getClients)
  .post(validateClient, handleValidation, createClient);

router.route('/:id')
  .get(getClient)
  .put(validateUpdateClient, handleValidation, updateClient)
  .delete(deleteClient);

module.exports = router;
