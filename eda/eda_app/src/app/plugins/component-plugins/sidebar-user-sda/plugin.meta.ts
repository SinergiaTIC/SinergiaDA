/**
 * Meta-data for the side-menu user plugin "sidebar-user-sda".
 *
 * Shows the current user (avatar with initials + full name in the tooltip) at
 * the bottom of the left side menu.
 *
 * Fields:
 * - type:            Plugin type. The side menu mounts the plugin declaring
 *                    'sidebar-user' (see main-left-sidebar).
 * - label:           Human-readable name.
 * - permissions:     Access control (see IComponentPlugin). Left empty: the
 *                    side menu already hides the badge for anonymous users.
 * - componentFile:   Relative path (from the plugin folder) to the TS file
 *                    that contains the Angular component.
 * - componentExport: Exact name of the exported component class.
 */
export const meta = {
    type: 'sidebar-user',
    label: 'Usuario en el menú lateral',
    permissions: [],
    componentFile: './sidebar-user.component',
    componentExport: 'SidebarUserSdaComponent',
};
