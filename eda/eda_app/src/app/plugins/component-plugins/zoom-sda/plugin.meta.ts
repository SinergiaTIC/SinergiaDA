import { ComponentPluginMeta } from '../plugin-component.interface';

/**
 * Meta-data for the component plugin "zoom-sda".
 *
 * - selector:        Angular selector used to embed the component
 *                     (e.g. `<zoom-sda [dashboard]="this"></zoom-sda>`).
 * - label:            Human-readable name.
 * - componentFile:    Relative path (from the plugin folder) to the TS file
 *                     that contains the Angular component.
 * - componentExport:  Exact name of the exported component class.
 */
export const meta: ComponentPluginMeta = {
    selector: 'zoom-sda',
    label: 'Zoom',
    componentFile: './zoom.component',
    componentExport: 'ZoomSdaComponent',
};
