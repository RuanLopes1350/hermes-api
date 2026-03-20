import { Router } from 'express';
import userController from '../controller/userController';

const router = Router();

// Rota para criação de usuário (SignUp)
router.post('/users', userController.createUser.bind(userController));

export default router;
