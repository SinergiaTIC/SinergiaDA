import { ComponentPluginMeta } from '../plugin-component.interface';

/**
 * Meta-data for the component plugin "data-source-detail-sda".
 *
 * - selector:        Angular selector used to embed the component
 *                     (e.g. `<app-data-source-detail></app-data-source-detail>`).
 * - label:            Human-readable name.
 * - componentFile:    Relative path (from the plugin folder) to the TS file
 *                     that contains the Angular component.
 * - componentExport:  Exact name of the exported component class.
 */
export const meta: ComponentPluginMeta = {
    selector: 'app-data-source-detail',
    label: 'Data Source Detail',
    componentFile: './data-source-detail.component',
    componentExport: 'DataSourceDetailComponent',
};
