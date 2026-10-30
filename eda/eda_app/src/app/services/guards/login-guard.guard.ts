import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, ActivatedRoute, UrlTree } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { UserService } from '../api/user.service';
import { DashboardService } from '../api/dashboard.service';
import { User } from '@eda/models/model.index';
import { AUTH_PLUGINS } from '../../plugins/auth-plugins/auth-plugin-registry';
import { AuthPluginResult, IAuthPluginContext } from '../../plugins/auth-plugins/auth-plugin.interface';

@Injectable()
export class LoginGuardGuard implements CanActivate {

    constructor(
        public userService: UserService,
        private route: ActivatedRoute,
        private dashboardService: DashboardService,
        private http: HttpClient,
        public router: Router) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> | boolean | UrlTree {

        const token = route.queryParams.token;

        if (token && !this.userService.isLogged()) {
            this.userService.tokenUrl(token).subscribe(() => {
                const urlInforme = state.url.split('?')[0];
                this.router.navigate([urlInforme], { queryParams: route.queryParams });
            })
            return false;
        }

        return this.runAuthPlugins(route, state).then((result: AuthPluginResult) => {
            if (result === 'authenticated' || result === 'redirecting') {
                return false;
            }

            if (this.userService.isLogged()) {
                return this.isRootUrl(state) ? this.router.createUrlTree(['/home']) : true;
            }

            return this.resolveLogin(state);
        });
    }

    /**
     * Gives the registered authentication plugins (plugins/auth-plugins) the
     * chance to open a session before falling back to the login page.
     */
    private async runAuthPlugins(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<AuthPluginResult> {
        const ctx: IAuthPluginContext = {
            userService: this.userService,
            http: this.http,
            router: this.router,
        };

        for (const Plugin of AUTH_PLUGINS) {
            const plugin = new Plugin();
            try {
                const result = await plugin.tryAuthenticate(route, state, ctx);
                if (result !== 'not-handled') {
                    return result;
                }
            } catch (error) {
                console.warn(`[auth-plugins] ${plugin.type} could not authenticate the user`, error);
            }
        }

        return 'not-handled';
    }

    /** Default behaviour: public dashboards open as anonymous, the rest goes to the login page. */
    private resolveLogin(state: RouterStateSnapshot): boolean | UrlTree | Promise<boolean | UrlTree> {
        if (this.isRootUrl(state)) {
            return true;
        }
        const dashboardMatch = state.url.match(/\/dashboard\/([^?/]+)/);
        const loginUrl = { returnUrl: state.url.split('?')[0], params: state.url.split('?')[1] };
        const loginUrlTree = this.router.createUrlTree(['/login'], { queryParams: loginUrl });
        if (dashboardMatch) {
            return new Promise((resolve) => {
                this.dashboardService.getDashboardVisibility(dashboardMatch[1]).subscribe({
                    next: (res: any) => {
                        if (!res.isAccessible) { return resolve(loginUrlTree); }
                        const anonymousUser = new User(null, 'edaanonim@jortilles.com', '_-(··)-_edanonymous_-(··)-_');
                        this.userService.login(anonymousUser, false).subscribe({
                            next: () => { resolve(true); },
                            error: (e) => { console.error(e); resolve(loginUrlTree); }
                        });
                    },
                    error: (e) => { console.error(e); resolve(loginUrlTree); }
                });
            });
        }
        return loginUrlTree;
    }

    private isRootUrl(state: RouterStateSnapshot): boolean {
        const path = state.url.split('?')[0];
        return path === '' || path === '/';
    }
}
