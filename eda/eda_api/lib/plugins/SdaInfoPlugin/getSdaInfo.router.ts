import * as express from 'express';
import { authGuard } from '../../guards/auth-guard';
import { roleGuard } from '../../guards/role-guard';
import { GetSdaInfoController } from './getSdaInfo.controller';

const router = express.Router();

/**
 * @openapi
 * /getsdainfo/getinfo:
 *   get:
 *     description: Returns information about the current SinergiaDA installation (versions, API port, last synchronization with SinergiaCRM)
 *     parameters:
 *     - in: query
 *       name: token
 *       required: true
 *       description: authorization token
 *     responses:
 *       200:
 *         description: Information retrieved successfully
 *     tags:
 *       - SDA Info Routes
 */
router.get('/getinfo', authGuard, GetSdaInfoController.getinfo);

/**
 * @openapi
 * /getsdainfo/overwrite-config:
 *   get:
 *     description: Returns the values set in config.overwrite.js (credentials and connection keys omitted). Admin only.
 *     parameters:
 *     - in: query
 *       name: token
 *       required: true
 *       description: authorization token
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *     tags:
 *       - SDA Info Routes
 */
router.get('/overwrite-config', authGuard, roleGuard, GetSdaInfoController.getOverwriteConfig);

/**
 * @openapi
 * /getsdainfo/plugins:
 *   get:
 *     description: Returns the plugins registered in the API (type, kind and route). Admin only.
 *     parameters:
 *     - in: query
 *       name: token
 *       required: true
 *       description: authorization token
 *     responses:
 *       200:
 *         description: Plugin list retrieved successfully
 *     tags:
 *       - SDA Info Routes
 */
router.get('/plugins', authGuard, roleGuard, GetSdaInfoController.getPlugins);

/**
 * @openapi
 * /getsdainfo/update-model:
 *   post:
 *     description: Runs the SinergiaCRM data-model update (same job as the scheduled /updatemodel/update). Admin only.
 *     parameters:
 *     - in: query
 *       name: token
 *       required: true
 *       description: authorization token
 *     responses:
 *       200:
 *         description: Update finished ({status:'ok'} / {status:'ko'})
 *       403:
 *         description: Administrator role required
 *       409:
 *         description: Another update is already running
 *     tags:
 *       - SDA Info Routes
 */
router.post('/update-model', authGuard, GetSdaInfoController.runUpdateModel);

/**
 * @openapi
 * /getsdainfo/sync-users:
 *   post:
 *     description: Runs only the users/groups synchronization of updateModel (no model rebuild). Admin only.
 *     parameters:
 *     - in: query
 *       name: token
 *       required: true
 *       description: authorization token
 *     responses:
 *       200:
 *         description: Synchronization finished
 *       403:
 *         description: Administrator role required
 *     tags:
 *       - SDA Info Routes
 */
router.post('/sync-users', authGuard, GetSdaInfoController.syncUsersAndGroups);

/**
 * @openapi
 * /getsdainfo/diagnostics:
 *   get:
 *     description: Read-only health checks (SinergiaCRM, metadata.json, MongoDB, cache, logs). Admin only.
 *     parameters:
 *     - in: query
 *       name: token
 *       required: true
 *       description: authorization token
 *     responses:
 *       200:
 *         description: Checks retrieved successfully
 *       403:
 *         description: Administrator role required
 *     tags:
 *       - SDA Info Routes
 */
router.get('/diagnostics', authGuard, GetSdaInfoController.getDiagnostics);

export default router;
