/**
 * Meta-data for the authentication plugin "sso-sinergiacrm".
 *
 * Fields:
 * - type:         Unique identifier of the integration.
 * - pluginFile:   Relative path (from the plugin folder) to the TS file that
 *                 contains the plugin class.
 * - pluginExport: Exact name of the exported class.
 */
export const meta = {
    type: 'sso-sinergiacrm',
    pluginFile: './sso-sinergiacrm.auth-plugin',
    pluginExport: 'SsoSinergiaCrmAuthPlugin',
};
