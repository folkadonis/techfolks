import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { UserRole } from '../types/enums';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize(UserRole.ADMIN));

// User management
router.get('/users', AdminController.getAllUsers);
router.put('/users/:id/role', AdminController.updateUserRole);
router.put('/users/:username/promote', AdminController.promoteUserToAdmin);
router.put('/users/:id/ban', AdminController.banUser);
router.put('/users/:id/unban', AdminController.unbanUser);
router.delete('/users/:id', AdminController.deleteUser);

// System stats
router.get('/stats', AdminController.getSystemStats);

// Data management (development only)
router.post('/clear-data', AdminController.clearData);

export default router;