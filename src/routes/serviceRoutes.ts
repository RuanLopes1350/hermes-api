import { Router } from 'express';
import serviceController from '../controller/serviceController.js';
import { requireAuth } from '../middlewares/requireAuth.js';

const router = Router();

// Todas as rotas de serviços exigem sessão autenticada
router.post('/services', requireAuth, serviceController.createService.bind(serviceController));
router.get('/services', requireAuth, serviceController.listServices.bind(serviceController));
router.get('/services/:id', requireAuth, serviceController.getService.bind(serviceController));
router.patch('/services/:id', requireAuth, serviceController.updateService.bind(serviceController));
router.delete(
	'/services/:id',
	requireAuth,
	serviceController.deleteService.bind(serviceController),
);

// Member Routes
router.get('/services/:id/members', requireAuth, serviceController.listMembers.bind(serviceController));
router.post('/services/:id/members', requireAuth, serviceController.addMember.bind(serviceController));
router.delete('/services/:id/members/:userId', requireAuth, serviceController.removeMember.bind(serviceController));
router.post('/services/:id/transfer-ownership', requireAuth, serviceController.transferOwnership.bind(serviceController));

export default router;
