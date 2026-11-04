import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { coreRoutes } from './core/pages/core-pages.routes';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { PrimengModule } from './core/primeng.module';
import { CoreModule } from './core/core.module';
import { AppModule } from './app.module';
import { AuthErrorInterceptor } from './services/interceptors/auth-error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      coreRoutes,
      withHashLocation(), // Enable hash-based navigation
    ),
    provideHttpClient(withInterceptorsFromDi()),
    provideAnimations(),
    // Global session handling: any 401 sends the user back to the login.
    { provide: HTTP_INTERCEPTORS, useClass: AuthErrorInterceptor, multi: true },
    importProvidersFrom(PrimengModule),
    importProvidersFrom(AppModule)
  ]
};
