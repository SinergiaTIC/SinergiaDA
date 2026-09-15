'use strict';

module.exports = {
    requiredFields: ['type', 'label', 'componentFile', 'componentExport'],

    buildOutput(plugins) {
        const imports = plugins
            .map((p) => `import { ${p.componentExport} } from './${p.dir}/${p.componentFile.replace(/^\.\//, '')}';`)
            .join('\n');

        const entries = plugins
            .map(
                (p) => [
                    `    {`,
                    `        type: '${p.type}',`,
                    `        label: '${p.label}',`,
                    `        i18n: '${p.i18n || ''}',`,
                    `        menuIcon: '${p.menuIcon || ''}',`,
                    `        permissions: [${(p.permissions || []).map((x) => `'${x}'`).join(', ')}],`,
                    `        component: ${p.componentExport},`,
                    `    },`,
                ].join('\n')
            )
            .join('\n');

        return `// AUTO-GENERADO por scripts/generate-plugins.js — no editar a mano.
// Para agregar un plugin de menú de informe nuevo, crea una carpeta en
// dashboard-menu-plugins con su plugin.meta.ts y componente, y vuelve a correr
// \`npm start\` / \`npm run build:prod\`.
import { IDashboardMenuPlugin } from './dashboard-menu-plugin.interface';
${imports}

export const DASHBOARD_MENU_PLUGINS: IDashboardMenuPlugin[] = [
${entries}
];
`;
    },
};