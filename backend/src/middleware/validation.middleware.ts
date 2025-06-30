import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

export const contestValidationRules = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage('Title must be between 3 and 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10 })
      .withMessage('Description must be at least 10 characters'),
    body('contest_type')
      .isIn(['ACM_ICPC', 'IOI', 'AtCoder', 'CodeForces'])
      .withMessage('Invalid contest type'),
    body('start_time')
      .isISO8601()
      .withMessage('Start time must be a valid date'),
    body('end_time')
      .isISO8601()
      .withMessage('End time must be a valid date')
      .custom((value, { req }) => new Date(value) > new Date(req.body.start_time))
      .withMessage('End time must be after start time'),
    body('is_public')
      .optional()
      .isBoolean()
      .withMessage('is_public must be a boolean'),
    body('registration_open')
      .optional()
      .isBoolean()
      .withMessage('registration_open must be a boolean'),
    body('problem_ids')
      .optional()
      .isArray()
      .withMessage('problem_ids must be an array')
      .custom((value) => value.every((id: any) => Number.isInteger(id)))
      .withMessage('All problem IDs must be integers')
  ],

  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage('Title must be between 3 and 255 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10 })
      .withMessage('Description must be at least 10 characters'),
    body('contest_type')
      .optional()
      .isIn(['ACM_ICPC', 'IOI', 'AtCoder', 'CodeForces'])
      .withMessage('Invalid contest type'),
    body('start_time')
      .optional()
      .isISO8601()
      .withMessage('Start time must be a valid date'),
    body('end_time')
      .optional()
      .isISO8601()
      .withMessage('End time must be a valid date'),
    body('is_public')
      .optional()
      .isBoolean()
      .withMessage('is_public must be a boolean'),
    body('registration_open')
      .optional()
      .isBoolean()
      .withMessage('registration_open must be a boolean')
  ]
};

export const submissionValidationRules = {
  create: [
    body('problem_id')
      .isInt()
      .withMessage('Problem ID must be a valid integer'),
    body('language')
      .isIn(['c', 'cpp', 'java', 'python', 'javascript', 'go', 'rust', 'csharp'])
      .withMessage('Invalid programming language'),
    body('source_code')
      .trim()
      .isLength({ min: 1, max: 100000 })
      .withMessage('Source code must be between 1 and 100000 characters'),
    body('contest_id')
      .optional()
      .isInt()
      .withMessage('Contest ID must be a valid integer')
  ],

  runCode: [
    body('language')
      .isIn(['c', 'cpp', 'java', 'python', 'javascript', 'go', 'rust', 'csharp'])
      .withMessage('Invalid programming language'),
    body('source_code')
      .trim()
      .isLength({ min: 1, max: 100000 })
      .withMessage('Source code must be between 1 and 100000 characters'),
    body('input')
      .optional()
      .isLength({ max: 10000 })
      .withMessage('Input must not exceed 10000 characters')
  ]
};

export const problemValidationRules = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage('Title must be between 3 and 255 characters'),
    body('statement')
      .trim()
      .isLength({ min: 10 })
      .withMessage('Problem statement must be at least 10 characters'),
    body('input_format')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Input format cannot be empty'),
    body('output_format')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Output format cannot be empty'),
    body('constraints')
      .trim()
      .notEmpty()
      .withMessage('Constraints are required'),
    body('difficulty')
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('Difficulty must be easy, medium, or hard'),
    body('time_limit')
      .optional()
      .isInt({ min: 100, max: 10000 })
      .withMessage('Time limit must be between 100ms and 10000ms'),
    body('memory_limit')
      .optional()
      .isInt({ min: 16, max: 1024 })
      .withMessage('Memory limit must be between 16MB and 1024MB'),
    body('is_public')
      .optional()
      .isBoolean()
      .withMessage('is_public must be a boolean')
  ],

  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 255 })
      .withMessage('Title must be between 3 and 255 characters'),
    body('statement')
      .optional()
      .trim()
      .isLength({ min: 10 })
      .withMessage('Problem statement must be at least 10 characters'),
    body('input_format')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Input format cannot be empty'),
    body('output_format')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Output format cannot be empty'),
    body('constraints')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Constraints cannot be empty'),
    body('difficulty')
      .optional()
      .isIn(['easy', 'medium', 'hard'])
      .withMessage('Difficulty must be easy, medium, or hard'),
    body('time_limit')
      .optional()
      .isInt({ min: 100, max: 10000 })
      .withMessage('Time limit must be between 100ms and 10000ms'),
    body('memory_limit')
      .optional()
      .isInt({ min: 16, max: 1024 })
      .withMessage('Memory limit must be between 16MB and 1024MB'),
    body('is_public')
      .optional()
      .isBoolean()
      .withMessage('is_public must be a boolean')
  ]
};

export const authValidationRules = {
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers and underscore'),
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email address'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter and one number'),
    body('fullName')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters')
  ],

  login: [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username or email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  forgotPassword: [
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email address')
  ],

  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter and one number')
  ],

  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter and one number')
      .custom((value, { req }) => value !== req.body.currentPassword)
      .withMessage('New password must be different from current password')
  ],

  updateProfile: [
    body('fullName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Bio must not exceed 500 characters'),
    body('country')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Country must be between 2 and 100 characters'),
    body('institution')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Institution must not exceed 200 characters'),
    body('github_username')
      .optional()
      .trim()
      .matches(/^[a-zA-Z0-9-]+$/)
      .withMessage('Invalid GitHub username'),
    body('linkedin_url')
      .optional()
      .trim()
      .isURL()
      .withMessage('Invalid LinkedIn URL'),
    body('website_url')
      .optional()
      .trim()
      .isURL()
      .withMessage('Invalid website URL')
  ]
};