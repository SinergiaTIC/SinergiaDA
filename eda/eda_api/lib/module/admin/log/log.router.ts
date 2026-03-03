
import * as  express from 'express';
import { authGuard } from '../../../guards/auth-guard';
import { roleGuard } from '../../../guards/role-guard';
import { originGuard } from '../../../guards/origin-guard';
import { LogController } from './log.controller';
const router = express.Router();

router.get('/log-file', [authGuard, roleGuard], LogController.getLogFile);

router.get('/log-error-file', [authGuard, roleGuard], LogController.getLogErrorFile);

// AI START
router.get('/app-logs', [authGuard, roleGuard], LogController.getAppLogs);
// AI END


export default router;
