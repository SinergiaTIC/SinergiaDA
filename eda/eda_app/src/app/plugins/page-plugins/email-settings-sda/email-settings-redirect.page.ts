import { Component, inject } from "@angular/core"
import { Router } from "@angular/router"

/**
 * Stub that neutralizes the core 'admin/email-settings' route (page plugin
 * replacing it — see plugin.meta.ts).
 *
 * SinergiaDA does not expose the "Gestión de correo" section: the side-menu
 * entry is hidden in custom_extended.css and this plugin redirects anyone who
 * reaches the route (e.g. an old bookmark) to /home. The core
 * EmailSettingsPage component is never loaded.
 */
@Component({
  selector: "email-settings-redirect-sda",
  standalone: true,
  template: "",
})
export class EmailSettingsRedirectSdaPage {
  private router = inject(Router);

  constructor() {
    this.router.navigate(["/home"]);
  }
}
