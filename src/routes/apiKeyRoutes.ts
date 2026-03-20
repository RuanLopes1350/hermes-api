import { Router } from 'express';
import ApiKeyController from '../controller/apiKeyController';
import { requireAuth } from '../middlewares/requireAuth';

const apiKeyRouter = Router();
const apiKeyController = new ApiKeyController();

apiKeyRouter.post('/apikey', requireAuth, apiKeyController.createApiKey.bind(apiKeyController));

export default apiKeyRouter;
