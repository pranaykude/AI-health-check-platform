const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const supportMemberController = require('../controllers/supportMemberController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { sendError } = require('../utils/response');

// Validation middleware
const validateSupportMember = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('phone')
    .optional()
    .trim(),
  body('role')
    .optional()
    .isIn(['support', 'senior_support', 'technical_support', 'operations', 'manager'])
    .withMessage('Role must be support, senior_support, technical_support, operations, or manager'),
  body('department')
    .optional()
    .trim(),
  body('avatar')
    .optional()
    .trim(),
  body('status')
    .optional()
    .isIn(['online', 'offline', 'busy'])
    .withMessage('Status must be online, offline, or busy'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array of strings'),
  body('designation')
    .optional()
    .trim(),
];

const validateUpdateSupportMember = [
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Full name cannot exceed 100 characters'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('phone')
    .optional()
    .trim(),
  body('role')
    .optional()
    .isIn(['support', 'senior_support', 'technical_support', 'operations', 'manager'])
    .withMessage('Role must be support, senior_support, technical_support, operations, or manager'),
  body('department')
    .optional()
    .trim(),
  body('avatar')
    .optional()
    .trim(),
  body('status')
    .optional()
    .isIn(['online', 'offline', 'busy'])
    .withMessage('Status must be online, offline, or busy'),
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array of strings'),
  body('designation')
    .optional()
    .trim(),
];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 'Validation failed', 400, errors.array().map((e) => e.msg));
  }
  next();
};

// --- ROUTES ---

// 1. Directory and Workloads
router.get('/', protect, supportMemberController.getSupportMembers);
router.get('/workload', protect, authorize('admin', 'manager'), supportMemberController.getWorkloads);

// 2. Client Assignment Action
router.post('/assign', protect, authorize('admin', 'manager'), supportMemberController.assignClients);

// 3. Single Support Member management
router.route('/:id')
  .get(protect, supportMemberController.getSupportMember)
  .put(protect, validateUpdateSupportMember, handleValidation, supportMemberController.updateSupportMember)
  .delete(protect, authorize('admin', 'manager'), supportMemberController.deleteSupportMember);

// 4. Create support member
router.post('/', protect, authorize('admin', 'manager'), validateSupportMember, handleValidation, supportMemberController.createSupportMember);

// 5. Get assigned clients
router.get('/:id/clients', protect, supportMemberController.getAssignedClients);
router.post('/:id/assign-clients', protect, authorize('admin', 'manager'), supportMemberController.assignClientsToMember);
router.post('/:id/remove-client', protect, authorize('admin', 'manager'), supportMemberController.removeClientFromMember);

module.exports = router;
