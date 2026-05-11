import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { UserService } from '../api/user.service';
import { GroupService } from '../api/group.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReadonlyUserGuard implements CanActivate {

  constructor(
    public userService: UserService,
    public groupService: GroupService,
    public router: Router
  ) { }

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    return new Promise((resolve) => {
      const user = this.userService.user;
      if (!user || !user._id) {
        this.router.navigate(['/login']);
        resolve(false);
        return;
      }

      this.groupService.getGroupsByUser().subscribe(
        (groups: any[]) => {
          const isReadOnly = groups.some(g => g.name === 'EDA_RO' && g.users.includes(user._id));
          
          if (isReadOnly) {
            this.router.navigate(['/home']);
            resolve(false);
            return;
          }
          
          resolve(true);
        },
        () => {
          this.router.navigate(['/login']);
          resolve(false);
        }
      );
    });
  }
}