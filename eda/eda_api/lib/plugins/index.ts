import * as fs from 'fs';
import * as path from 'path';
import { PluginRegistry } from './plugin-registry';
import type { IEDAPlugin } from './plugin.interface';
import { isFirstWorker } from '../utils/cluster.util';

interface IPluginMetadata {
    type: string;
    alwaysEnabled?: boolean;
    requiredConfigFile?: string;
}

function isEDAPlugin(value: any): value is IEDAPlugin {
    return value && typeof value === 'object'
        && (value.kind === 'datasource' || value.kind === 'feature' || value.kind === 'auth')
        && typeof value.type === 'string';
}

function isPluginMetadata(value: any): value is IPluginMetadata {
    return value && typeof value === 'object'
        && typeof value.type === 'string';
}

// First-party plugins expose activation metadata in plugin.meta.ts. Custom SinergiaDA
// plugins provide their metadata in a separate NO CORE layer; until then they keep the
// legacy behavior so the CORE layer is usable on its own.
const legacyCustomPluginDirs = new Set(['SdaInfoPlugin', 'SinergiaAuthPlugin', 'updateModel']);
const pluginConfig = require('../../config/plugins.config');
const enabledPluginTypes = new Set(
    Array.isArray(pluginConfig.ENABLED_PLUGINS)
        ? pluginConfig.ENABLED_PLUGINS.filter((type: any) => typeof type === 'string').map((type: string) => type.toLowerCase())
        : []
);
const pluginDirs = fs
    .readdirSync(__dirname, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

for (const dir of pluginDirs) {
    try {
        const metadataPath = path.join(__dirname, dir, 'plugin.meta');
        const hasMetadata = fs.existsSync(`${metadataPath}.js`) || fs.existsSync(`${metadataPath}.ts`);
        let expectedType: string | null = null;

        if (!hasMetadata && !legacyCustomPluginDirs.has(dir)) {
            if (isFirstWorker()) console.warn(`[PluginRegistry] La carpeta "${dir}" no tiene metadatos, se omite.`);
            continue;
        }

        if (hasMetadata) {
            const metadata = require(metadataPath).pluginMetadata;

            if (!isPluginMetadata(metadata)) {
                if (isFirstWorker()) console.warn(`[PluginRegistry] La carpeta "${dir}" no exporta metadatos válidos, se omite.`);
                continue;
            }

            expectedType = metadata.type;
            const requiredConfigPath = metadata.requiredConfigFile
                ? path.resolve(__dirname, '../../config', metadata.requiredConfigFile)
                : null;
            const isEnabled = metadata.alwaysEnabled
                || (requiredConfigPath && fs.existsSync(requiredConfigPath))
                || enabledPluginTypes.has(metadata.type.toLowerCase());

            if (!isEnabled) continue;
        }

        const pluginModule = require(path.join(__dirname, dir));
        const plugin = Object.values(pluginModule).find(isEDAPlugin) as IEDAPlugin | undefined;

        if (plugin) {
            if (expectedType && plugin.type !== expectedType) {
                if (isFirstWorker()) console.warn(`[PluginRegistry] El tipo de "${dir}" no coincide con sus metadatos, se omite.`);
            } else {
                PluginRegistry.register(plugin);
            }
        } else if (isFirstWorker()) {
            console.warn(`[PluginRegistry] La carpeta "${dir}" no exporta un IEDAPlugin válido, se omite.`);
        }
    } catch (error) {
        console.error(`[PluginRegistry] Error al cargar el plugin "${dir}", se omite.`, error);
    }
}

export { PluginRegistry };
