import { Router } from 'express';
import dashboardController from '../controller/dashboardController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// Rotas de Dashboard
router.get('/dashboard/admin', requireAuth, dashboardController.getAdminDashboard.bind(dashboardController));
router.get('/dashboard/user', requireAuth, dashboardController.getUserDashboard.bind(dashboardController));

export default router;
