import { Type } from '@angular/core';

/**
 * Meta-data for a component plugin, read from each plugin's `plugin.meta.ts`
 * by scripts/generate-plugins.js (see scripts/plugin-types/component-plugins.js).
 *
 * Unlike page-plugins (routed pages) or datasource-plugins (forms picked by
 * type), component plugins are embedded directly by selector in an existing
 * template (e.g. `<zoom-sda [dashboard]="this"></zoom-sda>` in
 * dashboard.page.html) rather than resolved dynamically at runtime — the
 * generated registry (component-plugin-registry.ts) exists mainly for
 * discovery/documentation of what's available.
 *
 * Fields:
 * - selector:        The Angular selector used to embed the component.
 * - label:            Human-readable name.
 * - componentFile:    Relative path (from the plugin folder) to the TS file
 *                     that contains the Angular component.
 * - componentExport:  Exact name of the exported component class.
 */
export interface ComponentPluginMeta {
    selector: string;
    label: string;
    componentFile: string;
    componentExport: string;
}

/**
 * Shape of each entry in the AUTO-GENERADO component-plugin-registry.ts:
 * same as ComponentPluginMeta but with the actual component class resolved
 * (componentFile/componentExport collapse into `component`).
 */
export interface ComponentPluginRegistryEntry {
    selector: string;
    label: string;
    component: Type<any>;
}

/**
 * Contract every component plugin embedded in the dashboard receives: the
 * host page instance (`this`), so the plugin can read dashboard state
 * (e.g. `dashboard.canIedit()`) without re-implementing it.
 */
export interface ComponentPluginHost {
    dashboard: any;
}