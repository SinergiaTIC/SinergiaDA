import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../module/global/model/index';
import User from '../../module/admin/users/model/user.model';
import { insertServerLog } from '../../services/server-log/server-log.service';
import { consumeSsoToken } from './sso-consumed.store';
import { revokeSsoSessions } from './sso-revocations.store';
import { syncReadOnly } from './sso-readonly';

const jwt = require('jsonwebtoken');
const SEED = require('../../../config/seed').SEED;
const applyConfigOverwrite = require('../../../config/apply-config-overwrite');

const SSO_ISSUER = 'sinergiacrm';
const SSO_AUDIENCE = 'sinergiada';
const SESSION_EXPIRES_IN = 14400;

/**
 * Claim holding the moment the SSO session really started. It is copied over on
 * every token refresh so a refreshed session can still be revoked after the user
 * logs out of SinergiaCRM (see sso-revocations.store.ts).
 */
const SESSION_STARTED_CLAIM = 'ssoIssuedAt';

const SSO_CONFIG = applyConfigOverwrite('sso_config', {
    SECRET: '',
    CRM_URL: '',
    ALLOWED_ORIGINS: [],
});

// Environment variables take precedence, so the shared secret does not have to
// live in a file (useful for container deployments).
const SSO_SECRET = process.env.SDA_SSO_SECRET || SSO_CONFIG.SECRET;
const SSO_CRM_URL = process.env.SDA_SSO_CRM_URL || SSO_CONFIG.CRM_URL;

export const isSsoEnabled = (): boolean => !!SSO_SECRET && !!SSO_CRM_URL;

export class SsoController {

    /**
     * Tells the frontend whether the SinergiaCRM SSO is available in this instance.
     */
    static async status(req: Request, res: Response, next: NextFunction) {
        try {
            return res.status(200).json({
                ok: true,
                enabled: !!SSO_SECRET && !!SSO_CRM_URL,
                crmUrl: SSO_CRM_URL || '',
                allowedOrigins: SSO_CONFIG.ALLOWED_ORIGINS || [],
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Exchanges a SinergiaCRM signed token for a SinergiaDA session token.
     */
    static async login(req: Request, res: Response, next: NextFunction) {
        try {
            if (!SSO_SECRET) {
                return next(new HttpException(503, 'SinergiaCRM SSO is not configured'));
            }

            const token = req.body?.token;
            if (!token || typeof token !== 'string') {
                return next(new HttpException(400, 'Token required'));
            }

            let payload: any;
            try {
                payload = jwt.verify(token, SSO_SECRET, {
                    algorithms: ['HS256'],
                    issuer: SSO_ISSUER,
                    audience: SSO_AUDIENCE,
                });
            } catch (err) {
                insertServerLog(req, 'error', 'newLogin', '', 'sso-invalid-token');
                return next(new HttpException(401, 'Invalid SSO token'));
            }

            if (!payload?.jti || !payload?.sub) {
                return next(new HttpException(401, 'Invalid SSO token'));
            }

            const isNewToken = await consumeSsoToken(payload.jti);
            if (!isNewToken) {
                insertServerLog(req, 'error', 'newLogin', payload.sub, 'sso-token-replay');
                return next(new HttpException(401, 'SSO token already used'));
            }

            const user: any = await User.findOne(
                { email: payload.sub },
                'name email img role google info'
            );

            if (!user) {
                insertServerLog(req, 'error', 'newLogin', payload.sub, 'sso-user-not-found');
                return next(new HttpException(404, 'User with this email not found'));
            }

            if (user?.info?.scrm_user !== true) {
                insertServerLog(req, 'error', 'newLogin', payload.sub, 'sso-user-not-managed-by-crm');
                return next(new HttpException(403, 'User is not managed by SinergiaCRM'));
            }

            // The `ro` claim (CRM sda_allowed_c = 2) is applied as EDA_RO membership,
            // the same mechanism the model sync uses for read-only users.
            try {
                await syncReadOnly(user, payload.ro === true);
            } catch (error) {
                console.error('[SsoSinergiaCRM] Unable to apply the read-only claim', error);
            }

            const sessionUser: any = user.toObject ? user.toObject() : user;
            sessionUser.password = ':)';

            const sessionToken = jwt.sign(
                {
                    user: sessionUser,
                    sso: true,
                    [SESSION_STARTED_CLAIM]: Math.floor(Date.now() / 1000),
                },
                SEED,
                { expiresIn: SESSION_EXPIRES_IN }
            );

            insertServerLog(req, 'info', 'newLogin', sessionUser.name?.toString() || payload.sub, 'sso');

            return res.status(200).json({ user: sessionUser, token: sessionToken, id: user._id });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Invalidates every SinergiaDA session opened for a SinergiaCRM user.
     */
    static async logout(req: Request, res: Response, next: NextFunction) {
        try {
            if (!SSO_SECRET) {
                return next(new HttpException(503, 'SinergiaCRM SSO is not configured'));
            }

            const token = req.body?.token;
            if (!token || typeof token !== 'string') {
                return next(new HttpException(400, 'Token required'));
            }

            let payload: any;
            try {
                payload = jwt.verify(token, SSO_SECRET, {
                    algorithms: ['HS256'],
                    issuer: SSO_ISSUER,
                    audience: SSO_AUDIENCE,
                });
            } catch (err) {
                insertServerLog(req, 'error', 'newLogout', '', 'sso-invalid-token');
                return next(new HttpException(401, 'Invalid SSO token'));
            }

            if (!payload?.sub) {
                return next(new HttpException(401, 'Invalid SSO token'));
            }

            await revokeSsoSessions(String(payload.sub));
            insertServerLog(req, 'info', 'newLogout', String(payload.sub), 'sso');

            return res.status(200).json({ ok: true });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Sends the browser to SinergiaCRM so it can start the SSO flow for the current session.
     */
    static async redirect(req: Request, res: Response, next: NextFunction) {
        try {
            if (!SSO_CRM_URL) {
                return next(new HttpException(503, 'SinergiaCRM SSO is not configured'));
            }

            const returnUrl = typeof req.qs?.return === 'string' ? req.qs.return : '';
            const crmUrl = String(SSO_CRM_URL).replace(/\/+$/, '');
            const target = `${crmUrl}/index.php?module=Home&action=sdaRedirect`
                + (returnUrl ? `&return=${encodeURIComponent(returnUrl)}` : '');

            return res.redirect(302, target);
        } catch (error) {
            next(error);
        }
    }
}
