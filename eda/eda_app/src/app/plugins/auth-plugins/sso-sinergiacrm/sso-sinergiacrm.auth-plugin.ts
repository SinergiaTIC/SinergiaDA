import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { URL_SERVICES } from '@eda/configs/config';
import { AuthPluginResult, IAuthPlugin, IAuthPluginContext } from '../auth-plugin.interface';

const SSO_QUERY_PARAM = 't';
const PARENT_REQUEST_MESSAGE = 'sda-sso-request';
const PARENT_RESPONSE_MESSAGE = 'sda-sso-token';
const PARENT_HANDSHAKE_TIMEOUT_MS = 4000;

/**
 * Single sign-on for users coming from SinergiaCRM.
 *
 * When the user already has a SinergiaCRM session, SinergiaDA gets them in
 * without asking for credentials:
 *  - if the signed token arrives in the URL (?t=...), it is exchanged directly;
 *  - if SinergiaDA is embedded in an iframe, it asks the parent page for a token;
 *  - otherwise the browser is sent to SinergiaCRM to start the flow.
 *
 * The token is always validated by the SinergiaDA API (signature, audience,
 * expiry and single use), never in the browser.
 */
export class SsoSinergiaCrmAuthPlugin implements IAuthPlugin {

    public type = 'sso-sinergiacrm';

    public async tryAuthenticate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
        ctx: IAuthPluginContext
    ): Promise<AuthPluginResult> {

        const tokenFromUrl = this.readTokenFromUrl(route);
        if (tokenFromUrl) {
            return this.completeLogin(tokenFromUrl, state, ctx);
        }

        if (this.isEmbedded()) {
            const tokenFromParent = await this.requestTokenFromParent();
            if (tokenFromParent) {
                return this.completeLogin(tokenFromParent, state, ctx);
            }
        }

        const status = await this.fetchSsoStatus(ctx);
        if (status?.enabled) {
            const returnUrl = encodeURIComponent(state.url);
            window.location.href = `${URL_SERVICES}/sso/redirect?return=${returnUrl}`;
            return 'redirecting';
        }

        return 'not-handled';
    }

    private readTokenFromUrl(route: ActivatedRouteSnapshot): string | null {
        const fromRouter = route?.queryParams?.[SSO_QUERY_PARAM];
        if (typeof fromRouter === 'string' && fromRouter.length > 0) {
            return fromRouter;
        }

        const fromLocation = new URLSearchParams(window.location.search).get(SSO_QUERY_PARAM);
        return fromLocation && fromLocation.length > 0 ? fromLocation : null;
    }

    private isEmbedded(): boolean {
        return typeof window !== 'undefined' && !!window.parent && window.parent !== window;
    }

    private requestTokenFromParent(): Promise<string | null> {
        return new Promise((resolve) => {
            let timer: number;

            const onMessage = (event: MessageEvent) => {
                const data: any = event?.data;
                if (data && data.type === PARENT_RESPONSE_MESSAGE
                    && typeof data.token === 'string' && data.token.length > 0) {
                    cleanup();
                    resolve(data.token);
                }
            };

            const cleanup = () => {
                window.clearTimeout(timer);
                window.removeEventListener('message', onMessage);
            };

            timer = window.setTimeout(() => {
                cleanup();
                resolve(null);
            }, PARENT_HANDSHAKE_TIMEOUT_MS);

            window.addEventListener('message', onMessage);
            window.parent.postMessage({ type: PARENT_REQUEST_MESSAGE }, '*');
        });
    }

    private async completeLogin(
        token: string,
        state: RouterStateSnapshot,
        ctx: IAuthPluginContext
    ): Promise<AuthPluginResult> {
        try {
            const response: any = await lastValueFrom(ctx.http.post(`${URL_SERVICES}/sso/login`, { token }));
            ctx.userService.savingStorage(response.id, response.token, response.user);
            ctx.router.navigate([state.url.split('?')[0]], { queryParams: {} });
            return 'authenticated';
        } catch (error) {
            return 'not-handled';
        }
    }

    private async fetchSsoStatus(ctx: IAuthPluginContext): Promise<any | null> {
        try {
            return await lastValueFrom(ctx.http.get(`${URL_SERVICES}/sso/status`));
        } catch (error) {
            return null;
        }
    }
}
