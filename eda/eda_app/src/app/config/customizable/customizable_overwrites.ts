/** place here the variables you want to overwrittes */

// export const SHOW_LOCK_IN_PANEL_HEADER: boolean = true; // true → lock button visible in panel header | false → lock in context menu
export const SHOW_LOCK_IN_PANEL_HEADER: boolean = true; // true → lock button visible in panel header | false → lock in context menu
export const ALLOW_NON_ADMIN_MANAGE_PUBLIC_REPORTS: boolean = false; // true → public visibility option shown in dashboard creation/edit UIs | false → hidden
export const QUERY_MODE: string[] = ['TREE', 'SQL']; // QUERY_MODE Order matters; the first value "QUERY_MODE[0]" is considered the default query mode
export const USE_VALUE_LIST_CODE_FOR_FILTERS: boolean = true; // true -> For using the filters with code values.