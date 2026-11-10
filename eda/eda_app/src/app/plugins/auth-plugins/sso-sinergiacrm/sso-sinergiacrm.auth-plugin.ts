import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { URL_SERVICES } from '@eda/configs/config';
import { AuthPluginResult, IAuthPlugin, IAuthPluginContext } from '../auth-plugin.interface';

const SSO_QUERY_PARAM = 't';
const PARENT_REQUEST_MESSAGE = 'sda-sso-request';
const PARENT_RESPONSE_MESSAGE = 'sda-sso-token';
const PARENT_HANDSHAKE_TIMEOUT_MS = 4000;
const SSO_BOUNCE_KEY = 'sda-sso-bounce';
const SSO_BOUNCE_TTL_MS = 60000;

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

        // do not treat a logged-in user as a bounce; only the redirect round-trip sets the bounce
        if (ctx.userService.isLogged()) {
            return 'not-handled';
        }

        const tokenFromUrl = this.readTokenFromUrl(route);
        if (tokenFromUrl) {
            return this.completeLogin(tokenFromUrl, state, ctx);
        }

        // a pending bounce means we already redirected once without getting a token:
        // clear it so future attempts can retry, but do not redirect again on this load (anti-loop)
        if (this.isBouncePending()) {
            this.clearBounce();
            return 'not-handled';
        }

        if (this.isEmbedded()) {
            const tokenFromParent = await this.requestTokenFromParent();
            if (tokenFromParent) {
                return this.completeLogin(tokenFromParent, state, ctx);
            }
        }

        const status = await this.fetchSsoStatus(ctx);
        if (status?.enabled) {
            this.rememberBounce();
            const returnUrl = encodeURIComponent(state.url);
            // SDA CUSTOM - bounce to the CRM without Referer: SinergiaCRM (SuiteCRM
            // SugarApplication::checkHTTPReferer) replies with its XSRF page whenever the
            // navigation to action=sdaRedirect comes from a foreign host, which is exactly
            // how a plain location.href from SinergiaDA reads on production domains.
            this.startSsoBounceWithoutReferer(`${URL_SERVICES}/sso/redirect?return=${returnUrl}`);
            /* SDA CUSTOM */ return 'redirecting';
        }

        return 'not-handled';
    }

    /**
     * SDA CUSTOM - Opens the given SSO bounce URL without sending Referer.
     *
     * SinergiaCRM (SuiteCRM) blocks with its "Cross Site Request Forgery (XSRF)"
     * page every request to a logged-in action whose Referer points to a foreign
     * host (SugarApplication::checkHTTPReferer). The SDA->CRM bounce triggered
     * with window.location.href carries the SinergiaDA origin as Referer, so on
     * real deployment domains the CRM rejected the flow before minting the
     * token. A programmatic <a rel="noreferrer"> navigation drops the Referer
     * for the whole redirect chain, and SuiteCRM accepts referer-less requests.
     */
    private startSsoBounceWithoutReferer(url: string): void {
        /* SDA CUSTOM */ const anchor = document.createElement('a');
        /* SDA CUSTOM */ anchor.href = url;
        /* SDA CUSTOM */ anchor.rel = 'noreferrer';
        /* SDA CUSTOM */ anchor.style.display = 'none';
        /* SDA CUSTOM */ document.body.appendChild(anchor);
        /* SDA CUSTOM */ anchor.click();
        /* SDA CUSTOM */ document.body.removeChild(anchor);
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
        this.stripTokenFromUrl();
        const previousEmail = this.currentEmail();
        const previousRoles = this.currentRoles();
        try {
            const response: any = await lastValueFrom(ctx.http.post(`${URL_SERVICES}/sso/login`, { token }));
            ctx.userService.savingStorage(response.id, response.token, response.user);
            this.clearBounce();

            // A changed user or a changed permission (e.g. the CRM switching the
            // user to read-only) needs a full reload: the side menu and the open
            // pages compute their permissions on load.
            if (previousEmail && (previousEmail !== response?.user?.email
                || previousRoles !== this.rolesOf(response?.user))) {
                window.location.replace(window.location.pathname + window.location.hash);
                return 'authenticated';
            }

            ctx.router.navigate([state.url.split('?')[0]], { queryParams: {} });
            return 'authenticated';
        } catch (error) {
            this.clearBounce();
            return 'not-handled';
        }
    }

    private currentEmail(): string {
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored)?.email || '' : '';
    }

    /** Sorted group ids of the stored session user, to detect permission changes. */
    private currentRoles(): string {
        const stored = localStorage.getItem('user');
        return stored ? this.rolesOf(JSON.parse(stored)) : '';
    }

    private rolesOf(user: any): string {
        return (user?.role || []).map(String).sort().join(',');
    }

    private stripTokenFromUrl(): void {
        const url = new URL(window.location.href);
        if (!url.searchParams.has(SSO_QUERY_PARAM)) {
            return;
        }
        url.searchParams.delete(SSO_QUERY_PARAM);
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }

    private isBouncePending(): boolean {
        const sentAt = Number(window.sessionStorage.getItem(SSO_BOUNCE_KEY));
        return !!sentAt && Date.now() - sentAt < SSO_BOUNCE_TTL_MS;
    }

    private rememberBounce(): void {
        window.sessionStorage.setItem(SSO_BOUNCE_KEY, String(Date.now()));
    }

    private clearBounce(): void {
        window.sessionStorage.removeItem(SSO_BOUNCE_KEY);
    }

    private async fetchSsoStatus(ctx: IAuthPluginContext): Promise<any | null> {
        try {
            return await lastValueFrom(ctx.http.get(`${URL_SERVICES}/sso/status`));
        } catch (error) {
            return null;
        }
    }
}
