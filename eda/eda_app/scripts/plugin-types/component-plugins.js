'use strict';

module.exports = {
    requiredFields: ['selector', 'label', 'componentFile', 'componentExport'],
    describe: (p) => p.selector,

    buildOutput(plugins) {
        const imports = plugins
            .map((p) => `import { ${p.componentExport} } from './${p.dir}/${p.componentFile.replace(/^\.\//, '')}';`)
            .join('\n');

        const entries = plugins
            .map((p) => `    { selector: '${p.selector}', label: '${p.label}', component: ${p.componentExport} },`)
            .join('\n');

        return `// AUTO-GENERADO por scripts/generate-plugins.js — no editar a mano.
// Para agregar un component plugin nuevo, crea una carpeta en component-plugins con su
// plugin.meta.ts y componente, y vuelve a correr \`npm start\` / \`npm run build:prod\`.
import { ComponentPluginRegistryEntry } from './plugin-component.interface';
${imports}

export const COMPONENT_PLUGINS: ComponentPluginRegistryEntry[] = [
${entries}
];
`;
    },
};
