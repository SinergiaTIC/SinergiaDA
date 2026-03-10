import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot, ActivatedRoute } from '@angular/router';
import { UserService } from '../api/user.service';
import { DashboardService } from '../api/dashboard.service';
import { User } from '@eda/models/model.index';
@Injectable()
export class LoginGuardGuard implements CanActivate {

    constructor(
        public userService: UserService, 
        private route: ActivatedRoute,
/*SDA CUSTOM*/ private dashboardService: DashboardService,
        public router: Router) { }

/*SDA CUSTOM*/canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> | boolean  {

        const token = route.queryParams.token; 

        if (this.userService.isLogged()) {
            return true;
        } else {
            if(token){
                this.userService.tokenUrl(token).subscribe(() => {
                    const urlInforme = state.url.split('?')[0];
                    this.router.navigate([urlInforme], { queryParams: route.queryParams });
                })
                return false;
            } else {
/*SDA CUSTOM*/  const dashboardMatch = state.url.match(/\/dashboard\/([^?/]+)/);
/*SDA CUSTOM*/  const loginUrl = { returnUrl: state.url.split('?')[0], params: state.url.split('?')[1] };
/*SDA CUSTOM*/  const goLogin = () => this.router.navigate(['/login'], { queryParams: loginUrl });
/*SDA CUSTOM*/  if (dashboardMatch) {
/*SDA CUSTOM*/      return new Promise((resolve) => {
/*SDA CUSTOM*/          this.dashboardService.getDashboardVisibility(dashboardMatch[1]).subscribe({
/*SDA CUSTOM*/              next: (res: any) => {
/*SDA CUSTOM*/                  if (!res.isAccessible) { goLogin(); return resolve(false);}
/*SDA CUSTOM*/                  const anonymousUser = new User(null, 'edaanonim@jortilles.com', '_-(··)-_edanonymous_-(··)-_');
/*SDA CUSTOM*/                  this.userService.login(anonymousUser, false).subscribe({
/*SDA CUSTOM*/                      next: () => { resolve(true); },
/*SDA CUSTOM*/                      error: (e) => { console.error(e); goLogin(); resolve(false); }
/*SDA CUSTOM*/                  });
/*SDA CUSTOM*/              },
/*SDA CUSTOM*/              error: (e) => { console.error(e); goLogin(); resolve(false); }
/*SDA CUSTOM*/          });
/*SDA CUSTOM*/      });
/*SDA CUSTOM*/  }
/*SDA CUSTOM*/  goLogin();
/*SDA CUSTOM*/  return false;
            }

        }

    }
}
