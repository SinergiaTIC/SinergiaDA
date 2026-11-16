# Authentication plugins (frontend)

Extension point that lets a fork open a SinergiaDA session without the local login
form (corporate SSO, magic links, external tokens, redirect-based providers...).

The login guard (`src/app/services/guards/login-guard.guard.ts`) runs the
registered plugins on **every navigation**, before the `isLogged()` shortcut, so a
new credential can win over an existing session (for example, switching user).

## Create a plugin

1. Create the folder `src/app/plugins/auth-plugins/<name>/`.

2. Add `plugin.meta.ts`:

   ```ts
   export const meta = {
       type: '<name>',                        // unique identifier (used in logs)
       pluginFile: './<name>.auth-plugin',    // file with the class
       pluginExport: '<Name>AuthPlugin',      // exported class name
   };
   ```

3. Add `<name>.auth-plugin.ts`:

   ```ts
   import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
   import { AuthPluginResult, IAuthPlugin, IAuthPluginContext } from '../auth-plugin.interface';

   export class MyAuthPlugin implements IAuthPlugin {
       public type = '<name>';
       // public priority = 10;          // higher runs first (default 0)
       // public enabled = () => true;   // return false to skip the plugin

       async tryAuthenticate(
           route: ActivatedRouteSnapshot,
           state: RouterStateSnapshot,
           ctx: IAuthPluginContext
       ): Promise<AuthPluginResult> {
           const token = route.queryParams['t'];
           if (!token) {
               return 'not-handled';
           }
           // ... exchange the token with your backend through ctx.http ...
           // ctx.userService.savingStorage(id, sessionToken, user);
           return 'authenticated';
       }
   }
   ```

4. Run `npm run generate-plugins` (it also runs on `prestart` and `build:prod`).
   It rewrites `auth-plugin-registry.ts`; **do not edit that file by hand**.

## Contract

| Member | Required | Meaning |
|---|---|---|
| `type` | yes | Identifier used in logs |
| `tryAuthenticate(route, state, ctx)` | yes | Try to open a session |
| `enabled()` | no | Return `false` to skip the plugin (enabled by default) |
| `priority` | no | Higher values run first (default `0`) |

`tryAuthenticate` returns one of:

- `authenticated`: a session has been created; the guard stops.
- `redirecting`: the browser is being sent elsewhere to continue the flow; the
  guard stops.
- `not-handled`: not applicable; the next plugin (or the local login) takes over.

The context provides:

- `userService`: current session (`savingStorage(...)`, `isLogged()`, ...).
- `http`: Angular `HttpClient` (already with the application interceptors).
- `router`: the Angular router.
- `logger`: logger for plugin messages (the guard passes `console`).

## Notes

- The registry is generated from the plugin folders: removing a folder and
  re-running the generator removes the plugin.
- There is **no per-plugin route registration**. A redirect-based flow (OAuth,
  SAML) can use the application root as its `redirect_uri` (the guard runs there)
  or a page-plugin route; if it needs a dedicated callback route, add it to the
  core routes.
- The legacy third-party token flow (`?token=` + `POST /tp/url/check`) runs before
  the plugins and is kept for backward compatibility.
- A plugin can ask its own backend whether it is configured (the bundled
  SinergiaCRM SSO plugin queries `GET /sso/status`) and return `not-handled` when
  it is disabled.
