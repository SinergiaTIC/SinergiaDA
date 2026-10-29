import * as express from 'express';
import { SsoController } from './sso.controller';

const router = express.Router();

/**
 * @openapi
 * /auth/sso/status:
 *   get:
 *     description: Reports whether the SinergiaCRM single sign-on integration is configured in this instance.
 *     responses:
 *       200:
 *         description: SSO status returned successfully.
 *     tags:
 *       - Authentication Routes
 */
router.get('/status', SsoController.status);

/**
 * @openapi
 * /auth/sso/login:
 *   post:
 *     description: Exchanges a short-lived token signed by SinergiaCRM for a SinergiaDA session token. The token is single-use and only accepted for users managed by SinergiaCRM.
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *               description: Signed token issued by SinergiaCRM
 *     responses:
 *       200:
 *         description: SSO authentication successful, SinergiaDA session token returned.
 *       401:
 *         description: Invalid, expired or already used token.
 *       403:
 *         description: The user is not managed by SinergiaCRM.
 *       503:
 *         description: SSO is not configured in this instance.
 *     tags:
 *       - Authentication Routes
 */
router.post('/login', SsoController.login);

/**
 * @openapi
 * /auth/sso/redirect:
 *   get:
 *     description: Redirects the browser to SinergiaCRM so it can start the single sign-on flow for the current session.
 *     parameters:
 *       - name: return
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: SinergiaDA route the user wanted to open
 *     responses:
 *       302:
 *         description: Redirect to SinergiaCRM.
 *       503:
 *         description: SSO is not configured in this instance.
 *     tags:
 *       - Authentication Routes
 */
router.get('/redirect', SsoController.redirect);

export default router;
