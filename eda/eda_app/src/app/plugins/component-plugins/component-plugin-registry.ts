// AUTO-GENERADO por scripts/generate-plugins.js — no editar a mano.
// Para agregar un component plugin nuevo, crea una carpeta en component-plugins con su
// plugin.meta.ts y componente, y vuelve a correr `npm start` / `npm run build:prod`.
import { ComponentPluginRegistryEntry } from './plugin-component.interface';
import { DataSourceDetailComponent } from './data-source-detail-sda/data-source-detail.component';

export const COMPONENT_PLUGINS: ComponentPluginRegistryEntry[] = [
    { selector: 'app-data-source-detail', label: 'Data Source Detail', component: DataSourceDetailComponent },
];
