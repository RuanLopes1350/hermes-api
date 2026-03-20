import ServiceController from '../controller/serviceController';
import { Router } from 'express';
import { requireAuth } from '../middlewares/requireAuth';

const serviceRouter = Router();
const serviceController = new ServiceController();

serviceRouter.post(
	'/services',
	requireAuth,
	serviceController.createService.bind(serviceController),
);

export default serviceRouter;
