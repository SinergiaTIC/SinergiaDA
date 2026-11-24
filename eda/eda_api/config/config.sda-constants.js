/**
 * SinergiaDA PRODUCT constants: custom_behaviour values that must be identical in
 * EVERY instance of the product.
 *
 * Unlike config.overwrite.js (gitignored, per-instance configuration), this file IS
 * tracked in the repository and distributed automatically with every update: changing
 * product behaviour only requires a PR on this file, with no need to edit each
 * instance's config.overwrite.js.
 *
 * Each instance's config.overwrite.js delegates the custom_behaviour block here: it
 * must not declare its own values for that block.
 */
module.exports = {
    eda_api_config: {
        custom_behaviour: {
            ALLOW_NON_ADMIN_MANAGE_PUBLIC_REPORTS: false, // true -> non-admin users can manage "open" reports.
            AVG_DECIMALS: 2,
            USE_VALUE_LIST_CODE_FOR_FILTERS: true, // true -> filters use code values.
            USE_RECURSIVE_PERMISSIONS: false, // false -> getFlatPermissions (SDA). true -> getRecursivePermissions (EDA).
            RESTRICT_TABLE_TO_GRANTED_COLUMN: false, // true -> closed model: granting one column hides the rest of the table.
            SHOW_EMPTY_VALUE_IN_FILTERS: true, // true -> selectors always include an empty row.
            ENFORCE_PERMISSIONS_ON_LINK_TABLES: false, // false -> tables matching CLOSED_MODEL_EXEMPT_TABLE_REGEX are never forbidden.
            CLOSED_MODEL_EXEMPT_TABLE_REGEX: '^sda_l_|__',
            AND_PERMISSIONS_WITHIN_TABLE: false, // false -> permissions grouped by table: OR within table, AND across tables (SDA).
        },
    },
};
