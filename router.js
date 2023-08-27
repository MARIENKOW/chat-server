import { Router } from 'express';
import controller from './controllers/user-controller.js';
import autUserMiddelware from './middlewares/authUser-middleware.js';
import changePassMiddleware from './middlewares/changePass-middleware.js';

const router = new Router();

router.post('/signIn', controller.signIn);

router.post('/signUp', controller.signUp);

router.post('/logOut', controller.logOut);

router.get('/refresh', controller.refresh);

router.get('/activate/:activationLink', controller.activate);

router.get('/aboutUser', autUserMiddelware, controller.aboutUser);

router.post('/rememberPassword', controller.rememberPassword);

router.post('/changePass', changePassMiddleware, controller.changePass);

router.post('/checkChangePassLink', changePassMiddleware, controller.checkChangePassLink);

router.post('/user/searchUsers', autUserMiddelware, controller.searchUsers);




export default router;