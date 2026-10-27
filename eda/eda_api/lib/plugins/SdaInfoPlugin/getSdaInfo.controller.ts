import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { createConnection } from 'mysql2/promise';
import Group from '../../module/admin/groups/model/group.model';
import { updateModel } from '../updateModel/updateModel.controller';

const sinergiaDatabase = require('../../../config/sinergiacrm.config');

// The shared date-format.service.ts doesn't zero-pad hours/minutes/seconds,
// which doesn't match the "YYYY-MM-DD HH:mm:ss" format the old app used (via moment).
function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Provides information about the current SinergiaDA installation (versions, ports,
 * last synchronization with SinergiaCRM) for the "Acerca de" page.
 * Each piece of information is fetched independently so a single missing file/query
 * doesn't prevent the rest of the info from being returned.
 */
export class GetSdaInfoController {
  public static async getinfo(req: Request, res: Response) {
    const info: Record<string, string> = {
      sinergiaDaVersion: 'N/D',
      edaApiVersion: 'N/D',
      edaApiPort: 'N/D',
      lastUpdateModelRun: 'N/D',
      lastRebuildDate: 'N/D',
    };

    // SinergiaDA version, stamped at deploy time.
    try {
      const versions = require('./SdaVersion.js');
      info.sinergiaDaVersion = versions.SdaVersion;
    } catch (error) {
      console.error('[getSdaInfo] Could not read SdaVersion.js', error);
    }

    // EDA API version, from this package's package.json.
    try {
      const packageJsonPath = path.join(__dirname, '../../../package.json');
      info.edaApiVersion = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')).version;
    } catch (error) {
      console.error('[getSdaInfo] Could not read package.json', error);
    }

    // EDA API port, parsed out of server.ts.
    try {
      const serverTsPath = path.join(__dirname, '../../../lib/server.ts');
      const serverSrc = fs.readFileSync(serverTsPath, 'utf8');
      const match = serverSrc.match(/const PORT = (\d+);/);
      if (match) info.edaApiPort = match[1];
    } catch (error) {
      console.error('[getSdaInfo] Could not read server.ts', error);
    }

    // Last updateModel run, taken from metadata.json's modification time.
    try {
      const metadataPath = path.join(__dirname, '../../../metadata.json');
      const stats = fs.statSync(metadataPath);
      info.lastUpdateModelRun = formatDate(stats.ctime);
    } catch (error) {
      console.error('[getSdaInfo] Could not read metadata.json', error);
    }

    // Last rebuild date, read from SinergiaCRM's own config table.
    try {
      const connection = await createConnection({
        host: sinergiaDatabase.sinergiaConn.host,
        port: sinergiaDatabase.sinergiaConn.port,
        user: sinergiaDatabase.sinergiaConn.user,
        password: sinergiaDatabase.sinergiaConn.password,
        database: sinergiaDatabase.sinergiaConn.database,
      });
      try {
        const [rows]: any = await connection.query(
          "SELECT value FROM sda_def_config WHERE `key` = 'last_rebuild';"
        );
        info.lastRebuildDate = rows.length > 0 ? rows[0].value : 'N/D';
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('[getSdaInfo] Error querying SinergiaCRM', error);
    }

    // Connection details are only relevant to admins.
    const groups = await Group.find({ users: { $in: req.user._id } }).exec();
    const isAdmin = groups.filter(g => g.role === 'EDA_ADMIN_ROLE').length > 0;
    if (isAdmin) {
      info.sinergiaCRMDatabaseName =
        `${sinergiaDatabase.sinergiaConn.host}:${sinergiaDatabase.sinergiaConn.port}/${sinergiaDatabase.sinergiaConn.database}`;
    }

    res.json({ info });
  }

  /**
   * Keys whose value must never leave the API: credentials, connection strings and
   * host/database details (config.overwrite.js holds them, see sinergiacrm_config).
   */
  /**
   * Keys whose value must never leave the API: credentials, connection strings and
   * host/database details (config.overwrite.js holds them, see sinergiacrm_config).
   * Matched per key name, so "port" must be a real key (REPORTS must not match it).
   */
  private static readonly HIDDEN_CONFIG_KEY: RegExp[] = [
    /pass(word|wd)?/i,          // password, passwd
    /secret/i,                  // SECRET, client_secret
    /token/i,                   // token, accessToken
    /(api|private)[_-]?key/i,   // api_key, privateKey
    /client[_-]?id/i,           // CLIENT_ID
    /conn/i,                    // sinergiaConn, connectionLimit
    /dsn/i,                     // data source name
    /url/i,                     // CRM_URL, server_apiURL
    /(^|[_-])uri$/i,            // uri
    /(^|[_-])host/i,            // host, bbdd_host
    /database/i,                // database, databaseName
    /(^|[_-])port$/i,           // port
    /(^|[_-])user(name)?$/i,    // user, username, user_id
    /login/i,                   // login, userLogin
  ];

  /** True when the key holds a credential or a connection detail. */
  private static isHiddenConfigKey(key: string): boolean {
    return GetSdaInfoController.HIDDEN_CONFIG_KEY.some(pattern => pattern.test(key));
  }

  /** Recursively copies an object dropping the keys matched by HIDDEN_CONFIG_KEY. */
  private static sanitizeOverwriteConfig(value: any): any {
    if (Array.isArray(value)) {
      return value.map(item => GetSdaInfoController.sanitizeOverwriteConfig(item));
    }
    if (value && typeof value === 'object') {
      const clean: Record<string, any> = {};
      for (const [key, item] of Object.entries(value)) {
        if (GetSdaInfoController.isHiddenConfigKey(key)) continue;
        clean[key] = GetSdaInfoController.sanitizeOverwriteConfig(item);
      }
      return GetSdaInfoController.pruneEmptyConfig(clean);
    }
    return value;
  }

  /**
   * Removes branches that became empty because every key they had was hidden, so the
   * response does not show empty sections (e.g. sso_config with only SECRET/CRM_URL).
   */
  private static pruneEmptyConfig(value: any): any {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const pruned: Record<string, any> = {};
    for (const [key, item] of Object.entries(value)) {
      const child = GetSdaInfoController.pruneEmptyConfig(item);
      const isEmptyObject = child && typeof child === 'object' && !Array.isArray(child)
        && Object.keys(child).length === 0;
      if (isEmptyObject) continue;
      pruned[key] = child;
    }
    return pruned;
  }

  /**
   * Returns the plugins registered in the API at boot time (lib/plugins/index.ts),
   * so administrators can see which ones are loaded in this instance.
   */
  public static async getPlugins(req: Request, res: Response) {
    try {
      // The registry is populated when lib/plugins/index.ts runs at startup.
      const { PluginRegistry } = require('../plugin-registry');
      const plugins = PluginRegistry.getAll()
        .map(plugin => ({
          type: plugin.type,
          kind: plugin.kind,
          routerPath: plugin.routerPath ?? null,
          sync: !!plugin.syncService,
          schedule: plugin.scheduleExpression ?? null,
        }))
        .sort((a, b) => a.type.localeCompare(b.type));
      return res.status(200).json({ ok: true, plugins });
    } catch (error) {
      console.error('[getSdaInfo] Error reading the plugin registry', error?.message || error);
      return res.status(500).json({ ok: false, plugins: [] });
    }
  }

  /**
   * Returns the values currently set in eda_api/config/config.overwrite.js (only the keys
   * that file overrides), so administrators can review the instance configuration. Keys
   * that hold credentials or connection details are omitted.
   */
  public static async getOverwriteConfig(req: Request, res: Response) {
    try {
      const overwrite = require('../../../config/config.overwrite.js') || {};
      const config = GetSdaInfoController.sanitizeOverwriteConfig(overwrite);
      // Sections that only held credentials: report their name, never their content.
      const hiddenSections = Object.keys(overwrite).filter(section => !(section in config));
      return res.status(200).json({ ok: true, config, hiddenSections });
    } catch (error) {
      // The file is gitignored: a deployment may not have it, which is not an error.
      console.warn('[getSdaInfo] config.overwrite.js not available', error?.message || error);
      return res.status(200).json({ ok: true, config: {}, hiddenSections: [], available: false });
    }
  }

  /** Prevents two updateModel runs started from this endpoint from overlapping. */
  private static updateModelRunning = false;

  /**
   * Runs the SinergiaCRM data-model update (the same job the scheduled
   * /updatemodel/update runs), so an administrator can launch it from the
   * "Acerca de" page instead of waiting for the next schedule.
   *
   * It reuses the core implementation (it writes the response itself:
   * {status:'ok'} / {status:'ko'} and logs the acting user) without modifying it.
   * Only EDA_ADMIN_ROLE can launch it: it rewrites the whole data model.
   */
  public static async runUpdateModel(req: Request, res: Response) {
    try {
      const groups = await Group.find({ users: { $in: req.user._id } }).exec();
      const isAdmin = groups.filter(g => g.role === 'EDA_ADMIN_ROLE').length > 0;
      if (!isAdmin) {
        return res.status(403).json({ ok: false, error: 'admin-required' });
      }
      if (GetSdaInfoController.updateModelRunning) {
        return res.status(409).json({ ok: false, error: 'already-running' });
      }

      GetSdaInfoController.updateModelRunning = true;
      try {
        await updateModel.update(req, res);
      } finally {
        GetSdaInfoController.updateModelRunning = false;
      }
    } catch (error) {
      console.error('[getSdaInfo] updateModel failed', error?.message || error);
      if (!res.headersSent) {
        return res.status(500).json({ ok: false, error: 'update-model-failed' });
      }
    }
  }
}
