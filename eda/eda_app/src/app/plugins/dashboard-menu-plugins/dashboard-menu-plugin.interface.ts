import { Type } from '@angular/core';

export type DashboardMenuPermission = 'admin' | 'owner' | 'observer' | 'anonim' | 'edit' | 'delete' | 'export';

/**
 * Runtime contract of a dashboard-menu plugin.
 *
 * The registry file (`dashboard-menu-plugin-registry.ts`) is auto-generated,
 * so this interface only describes the shape produced by `buildOutput` in
 * `scripts/plugin-types/dashboard-menu-plugins.js`.
 */
export interface IDashboardMenuPlugin {
    type: string;
    label: string;
    i18n?: string;
    menuIcon?: string;
    permissions?: DashboardMenuPermission[];
    component: Type<any>;
}