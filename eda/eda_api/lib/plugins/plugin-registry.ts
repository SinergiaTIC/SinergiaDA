import { AbstractConnection } from '../services/connection/abstract-connection';
import { IAuthPlugin, IDatasourcePlugin, IEDAPlugin, IFeaturePlugin, isAuthPlugin, isDatasourcePlugin } from './plugin.interface';
import { isFirstWorker } from '../utils/cluster.util';

export class PluginRegistry {
    private static plugins = new Map<string, IEDAPlugin>();

    static register(plugin: IEDAPlugin): void {
        this.plugins.set(plugin.type, plugin);
        if (isFirstWorker()) console.log(`[PluginRegistry] Registered plugin: ${plugin.type}`);
    }

    static get(type: string): IEDAPlugin | undefined {
        return this.plugins.get(type);
    }

    static getAll(): IEDAPlugin[] {
        return Array.from(this.plugins.values());
    }

    static getDatasourcePlugins(): IDatasourcePlugin[] {
        return this.getAll().filter((p): p is IDatasourcePlugin => isDatasourcePlugin(p));
    }

    static getFeaturePlugins(): IFeaturePlugin[] {
        return this.getAll().filter((p): p is IFeaturePlugin => p.kind === 'feature');
    }

    static getAuthPlugins(): IAuthPlugin[] {
        return this.getAll().filter((p): p is IAuthPlugin => isAuthPlugin(p));
    }

    /** Runs the session checks of every plugin that defines one. Fails closed on errors. */
    static async rejectsSession(payload: any): Promise<boolean> {
        for (const plugin of this.plugins.values()) {
            if (!plugin.validateSession) {
                continue;
            }
            try {
                if (!(await plugin.validateSession(payload))) {
                    return true;
                }
            } catch (error) {
                console.error(`[PluginRegistry] Session check of "${plugin.type}" failed`, error);
                return true;
            }
        }
        return false;
    }

    static getDatasource(type: string): IDatasourcePlugin | undefined {
        const plugin = this.plugins.get(type);
        return plugin && isDatasourcePlugin(plugin) ? plugin : undefined;
    }

    static getConnection(type: string, config: any): AbstractConnection | null {
        const plugin = this.plugins.get(type);
        if (!plugin || !isDatasourcePlugin(plugin)) return null;
        return new plugin.connectionClass(config);
    }
}