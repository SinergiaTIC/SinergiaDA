// AUTO-GENERADO por scripts/generate-plugins.js — no editar a mano.
// Para agregar un component plugin nuevo, crea una carpeta en component-plugins con su
// plugin.meta.ts y componente, y vuelve a correr `npm start` / `npm run build:prod`.
import { ComponentPluginRegistryEntry } from './plugin-component.interface';
import { ZoomSdaComponent } from './zoom-sda/zoom.component';

export const COMPONENT_PLUGINS: ComponentPluginRegistryEntry[] = [
    { selector: 'zoom-sda', label: 'Zoom', component: ZoomSdaComponent },
];
