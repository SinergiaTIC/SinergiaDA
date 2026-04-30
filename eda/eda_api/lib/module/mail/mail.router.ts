import * as  express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { MailController } from './mail.controller';
const router = express.Router();

router.get('/credentials', authGuard, roleGuard, MailController.getCredentials);
router.post('/check', authGuard, roleGuard, MailController.checkCredentials);
router.post('/save', authGuard, roleGuard, MailController.saveCredentials);
// SDA CUSTOM - Add send-test route for validating mail delivery
/* SDA CUSTOM */router.post('/send-test', authGuard, roleGuard, MailController.sendTestMail);
// SDA CUSTOM - Add send-now route
/*SDA CUSTOM*/ router.post('/send-now', authGuard, MailController.sendNow);
// END SDA CUSTOM

export default router;