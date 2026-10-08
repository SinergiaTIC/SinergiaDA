/**
 * Meta-data for the page plugin "profile-sda".
 *
 * Fields:
 * - path:           Angular route path (e.g. 'profile' → #/profile).
 *                   If another plugin declares the same path it will win
 *                   (plugins are loaded before core routes). This plugin
 *                   overrides the core 'profile' route (UserProfilePage).
 * - label:          Human-readable name.
 * - componentFile:  Relative path (from the plugin folder) to the TS file
 *                   that contains the Angular component.
 * - componentExport:Exact name of the exported component class.
 *
 * NOTE: no menuIcon/menuSection on purpose — 'profile' is reached from the
 * user menu, it must not add a new sidebar entry.
 */
export const meta = {
    path: 'profile',
    label: 'Perfil',
    componentFile: './profile.page',
    componentExport: 'ProfileSdaPage',
};
