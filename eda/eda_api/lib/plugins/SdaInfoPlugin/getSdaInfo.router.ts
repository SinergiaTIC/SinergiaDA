import * as express from 'express';
import { GetSdaInfoController } from './getSdaInfo.controller';

const router = express.Router();

/**
 * @openapi
 * /getsdainfo/getinfo:
 *   get:
 *     description: Returns information about the current SinergiaDA installation (versions, API port, last synchronization with SinergiaCRM)
 *     responses:
 *       200:
 *         description: Information retrieved successfully
 *     tags:
 *       - SDA Info Routes
 */
router.get('/getinfo', GetSdaInfoController.getinfo);

export default router;
