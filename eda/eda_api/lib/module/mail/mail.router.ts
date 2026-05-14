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
/*SDA CUSTOM*/ router.post('/send-now-with-pdf', authGuard, MailController.sendNowWithPDF);
/*SDA CUSTOM*/ router.post('/send-now-with-image', authGuard, MailController.sendNowWithImage);
/*SDA CUSTOM*/ router.post('/send-test-kpi-alert', authGuard, MailController.sendTestKpiAlert);
// SDA CUSTOM - OAuth2 token acquisition
/* SDA CUSTOM */router.post('/oauth2-url', authGuard, roleGuard, MailController.getOAuth2Url);
/* SDA CUSTOM */router.post('/oauth2-token', authGuard, roleGuard, MailController.getOAuth2Tokens);
// END SDA CUSTOM

export default router;