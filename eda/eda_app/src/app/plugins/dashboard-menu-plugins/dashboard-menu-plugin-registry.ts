// AUTO-GENERADO por scripts/generate-plugins.js — no editar a mano.
// Para agregar un plugin de menú de informe nuevo, crea una carpeta en
// dashboard-menu-plugins con su plugin.meta.ts y componente, y vuelve a correr
// `npm start` / `npm run build:prod`.
import { IDashboardMenuPlugin } from './dashboard-menu-plugin.interface';
import { DashboardMenuSdaComponent } from './dashboard-menu-sda/dashboard-menu.component';

export const DASHBOARD_MENU_PLUGINS: IDashboardMenuPlugin[] = [
    {
        type: 'report-toolbar',
        label: 'Menú del informe',
        i18n: 'dashboardMenuLabel',
        menuIcon: 'pi-bars',
        permissions: ['edit'],
        component: DashboardMenuSdaComponent,
    },
];
