import { IFeaturePlugin } from '../plugin.interface';
import SsoRouter from './sso.router';
import { isSessionRevoked } from './sso-revocations.store';

/**
 * Single sign-on for users coming from SinergiaCRM.
 *
 * SinergiaCRM mints a short-lived, single-use token for the user of its current
 * session; this plugin validates it and issues the SinergiaDA session. When the
 * user logs out of SinergiaCRM, its sessions are invalidated (POST /sso/logout).
 *
 * Configuration (config.overwrite.js, key `sso_config`, or the SDA_SSO_SECRET /
 * SDA_SSO_CRM_URL environment variables, which take precedence):
 *   - SECRET:          shared secret used by SinergiaCRM to sign the token.
 *   - CRM_URL:         base URL of SinergiaCRM, used to start the flow when the
 *                      user reaches SinergiaDA without a session.
 *   - ALLOWED_ORIGINS: optional list of origins allowed for the iframe handshake.
 *
 * The integration stays disabled while SECRET or CRM_URL are empty.
 */
export const SsoSinergiaCRMPlugin: IFeaturePlugin = {
    kind: 'feature',
    type: 'sso-sinergiacrm',
    router: SsoRouter,
    routerPath: '/sso',
    validateSession: async (payload: any) => {
        if (!payload?.sso) {
            return true;
        }
        return !(await isSessionRevoked(payload?.user?.email, payload?.iat));
    },
};
