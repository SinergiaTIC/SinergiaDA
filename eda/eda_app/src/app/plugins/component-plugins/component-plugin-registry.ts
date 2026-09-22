// AUTO-GENERADO por scripts/generate-plugins.js — no editar a mano.
// Para agregar un component plugin nuevo, crea una carpeta en
// component-plugins con su plugin.meta.ts y componente, y vuelve a correr
// `npm start` / `npm run build:prod`.
import { IComponentPlugin } from './component-plugin.interface';
import { DashboardMenuSdaComponent } from './dashboard-menu-sda/dashboard-menu.component';

export const COMPONENT_PLUGINS: IComponentPlugin[] = [
    {
        type: 'report-toolbar',
        label: 'Menú del informe',
        i18n: 'dashboardMenuLabel',
        menuIcon: 'pi-bars',
        permissions: ['edit'],
        component: DashboardMenuSdaComponent,
    },
];
