import { Router } from 'express';
import UserController from '../controller/userController';
import { requireAuth } from '../middlewares/requireAuth';

const userRouter = Router();
const userController = new UserController();

userRouter.post('/user', userController.createUser.bind(userController));
userRouter.get('/user/me', requireAuth, userController.getMe.bind(userController));

export default userRouter;
