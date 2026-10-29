import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserService } from '@eda/services/api/user.service';

/**
 * Outcome of an authentication plugin attempt:
 * - `authenticated`: a session has been created; the guard must stop.
 * - `redirecting`: the browser is being sent elsewhere to continue the flow.
 * - `not-handled`: this plugin cannot handle it; the next one (or the default
 *   login) takes over.
 */
export type AuthPluginResult = 'authenticated' | 'redirecting' | 'not-handled';

/**
 * Dependencies handed to the plugins by the login guard, so plugins do not need
 * to be registered in the Angular injector.
 */
export interface IAuthPluginContext {
    userService: UserService;
    http: HttpClient;
    router: Router;
}

/**
 * Runtime contract of an authentication plugin. The registry file
 * (`auth-plugin-registry.ts`) is auto-generated, so this interface only
 * describes the shape produced by `buildOutput` in
 * `scripts/plugin-types/auth-plugins.js`.
 */
export interface IAuthPlugin {
    type: string;
    tryAuthenticate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot,
        ctx: IAuthPluginContext
    ): Promise<AuthPluginResult>;
}

export interface IAuthPluginCtor {
    new (): IAuthPlugin;
}
