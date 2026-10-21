import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserService } from '../api/user.service';

/**
 * Expels the user as soon as the API answers 401, no matter which component
 * started the request.
 *
 * A 401 means the session is no longer valid (expired token or a session
 * revoked from SinergiaCRM). Handling it per call is not enough: some pages
 * (for instance the report page) load their data without an error callback, so
 * the app used to stay stuck in a spinner instead of going back to the login.
 */
@Injectable()
export class AuthErrorInterceptor implements HttpInterceptor {

    constructor(private injector: Injector) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error?.status === 401 && !this.isAuthenticationEndpoint(req.url)) {
                    // Resolved lazily: UserService depends on HttpClient, which builds this chain.
                    this.injector.get(UserService).logout();
                }
                return throwError(() => error);
            })
        );
    }

    /**
     * The SSO endpoints report their own 401 (invalid or expired token) and the
     * auth plugin decides what to do, so they must not force a logout here.
     */
    private isAuthenticationEndpoint(url: string): boolean {
        return url.includes('/sso/login') || url.includes('/sso/status');
    }

}
