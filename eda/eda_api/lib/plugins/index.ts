import { PluginRegistry } from './plugin-registry';
import { GoogleAnalyticsPlugin } from './google-analytics';
import { OdooPlugin } from './odoo';
import { HoldedPlugin } from './holded';
import { UpdateModelPlugin } from './updateModel';

PluginRegistry.register(GoogleAnalyticsPlugin);
PluginRegistry.register(OdooPlugin);
PluginRegistry.register(HoldedPlugin);
PluginRegistry.register(UpdateModelPlugin);

export { PluginRegistry };
