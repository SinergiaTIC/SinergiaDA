/**
 * Meta-data for the page plugin "email-settings-sda".
 *
 * SinergiaDA does not expose the core "Gestión de correo" section (the
 * SMTP/Gmail settings page). It is removed entirely from the fork side,
 * without touching core files, with two pieces:
 *
 * - This plugin overrides the core 'admin/email-settings' route with a stub
 *   that redirects to /home, so the page is unreachable even by direct URL
 *   (the core EmailSettingsPage component is never loaded). Plugin routes are
 *   registered before the core ones, so the override wins automatically.
 * - The side-menu entry ("Gestión de email") is hidden with a CSS rule in
 *   src/app/config/customizable/custom_extended.css — the same customization
 *   layer that already hides the 'Perfil' submenu entry.
 *
 * Fields:
 * - path:            Angular route path. Same as the core route it replaces.
 * - label:           Human-readable name (shown in the About plugin table).
 * - componentFile:   Relative path (from the plugin folder) to the TS file
 *                    that contains the Angular component.
 * - componentExport: Exact name of the exported component class.
 *
 * NOTE: no menuIcon/menuSection on purpose — the entry is hidden, this plugin
 * must not add a new sidebar item.
 */
export const meta = {
    path: 'admin/email-settings',
    label: 'Gestión de correo oculta (redirige a inicio)',
    componentFile: './email-settings-redirect.page',
    componentExport: 'EmailSettingsRedirectSdaPage',
};
