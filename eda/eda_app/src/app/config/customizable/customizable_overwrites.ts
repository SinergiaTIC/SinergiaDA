/** place here the variables you want to overwrittes */

export const APPLICATION_NAME: string = 'Sinergia Data Analytics'; // application name shown in the browser tab title
export const SHOW_LOCK_IN_PANEL_HEADER: boolean = true; // true → lock button visible in panel header | false → lock in context menu
export const ALLOW_NON_ADMIN_MANAGE_PUBLIC_REPORTS: boolean = false; // true → public visibility option shown in dashboard creation/edit UIs | false → hidden
export const USE_VALUE_LIST_CODE_FOR_FILTERS: boolean = true; // true -> For using the filters with code values.
export const SHOW_HIDDEN_FIELDS: 'disabled' | 'admin-only' | 'all' = 'admin-only'; // 'disabled' → button hidden for everyone | 'admin-only' → only admins see the button | 'all' → all users see it
export const ALLOWED_QUERY_MODES: string[] = ['TREE', 'SQL']; // ALLOWED_QUERY_MODES Order matters; the first value "ALLOWED_QUERY_MODES[0]" is considered the default query mode
export const SHOW_WHAT_IF: boolean = false; // SDA: sin escenarios "What If"
export const ALLOWED_JOIN_TYPES: string[] = ['left', 'inner']; 
export const SHOW_CUSTOM_ACTION: boolean = false;
export const SHOW_ZOOM_IN_SIDEBAR: boolean = false;
export const USE_EDA_KPI_SIZE_LOGIC: boolean = false;
export const PRIVATE_EDITION_ACTIVATED: boolean =  false;

/** Feature flags - data-source page */
/** Data model - General configuration*/
export const PROTECTED_MODEL_AI_CONTROL_ENABLED: boolean = false; // true → AI Control enabled | false → AI Control unavailable
export const PROTECTED_MODEL_SSL_CONNECTION_SWITCH_BUTTON_ENABLED: boolean = false; // true → SSL connection enabled | false → SSL connection unavailable
export const PROTECTED_MODEL_ADD_VIEW_BUTTON_ENABLED: boolean = false; // true → Add view enabled | false → Add view unavailable
export const PROTECTED_MODEL_ADD_TABLE_FROM_CSV_BUTTON_ENABLED: boolean = false; // true → Add table from CSV enabled | false → Add table from CSV unavailable
export const PROTECTED_MODEL_ADD_TAG_BUTTON_ENABLED: boolean = false; // true → Add tag enabled | false → Add tag unavailable
/** Data model - Table configuration*/
export const PROTECTED_MODEL_TABLE_TYPES_BUTTON_GROUP_ENABLED: boolean = true; // false → Table types group unavailable | true → Table types group enabled
export const PROTECTED_MODEL_ADD_RELATIONSHIP_TO_TABLE_BUTTON_ENABLED: boolean = false; // true → Relationship to table enabled | false → Relationship to table unavailable
export const PROTECTED_MODEL_HIDE_ALL_COLUMNS_BUTTON_ENABLED: boolean = false; // true → hide all columns enabled | false → hide all columns unavailable
/** Data model - Column configuration => Calculated Fields*/
export const PROTECTED_MODEL_DEFINE_LIST_OF_POSSIBLE_VALUES_BUTTON_ENABLED: boolean = false; // true → Define a list of possible values enabled | false → Define a list of possible values unavailable
export const PROTECTED_MODEL_ADD_PERMISSION_BUTTON_ENABLED: boolean = false; // true → Add permission enabled | false → Add permission unavailable
/** Data model - Protected data sources*/
export const PROTECTED_MODEL_DATA_SOURCES_ARRAY: string[] = ['111111111111111111111111']; // Array of all the protected data sources