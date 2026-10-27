import { HttpClient } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { DialogModule } from "primeng/dialog";
import { User } from "@eda/models/model.index";
import { UserService } from "@eda/services/service.index";
import { IconComponent } from "@eda/shared/components/icon/icon.component";
import { ConfigEntry } from "./config-entry.model";
import { ConfigTableComponent } from "./config-table.component";
import * as customizableOverwrites from "@eda/configs/customizable/customizable_overwrites";

interface InfoResponse {
  info: {
    sinergiaDaVersion: string;
    edaApiVersion: string;
    edaApiPort: string;
    lastRebuildDate: string;
    sinergiaCRMDatabaseName: string;
    lastUpdateModelRun: string;
  };
}

/** Response of GET /getsdainfo/overwrite-config */
interface OverwriteConfigResponse {
  ok: boolean;
  /** false when the deployment has no config.overwrite.js */
  available?: boolean;
  config: Record<string, any>;
  /** Sections removed because all their keys were credentials/connection details */
  hiddenSections?: string[];
}

/** Response of GET /getsdainfo/plugins */
interface PluginsResponse {
  ok: boolean;
  plugins: {
    type: string;
    kind: string;
    routerPath: string | null;
    sync: boolean;
    schedule: string | null;
  }[];
}

/** Constants of customizable_overwrites.ts that are not listed (too long to be useful). */
const OMITTED_FRONT_KEYS = ["ChartsPalettes"];

/**
 * Component responsible for displaying information about the application, such as version details and last synchronization times.
 */
@Component({
  standalone: true,
  selector: "about-sda",
  imports: [CommonModule, FormsModule, DialogModule, IconComponent, ConfigTableComponent],
  templateUrl: "./about.component.html",
  styleUrls: ["./about.component.css"]
})
export class AboutSdaComponent implements OnInit {
  public lang: string;
  public user: User;
  public isAdmin: boolean;
  public sinergiaDaVersion: string = "XXXX";
  public edaApiVersion: string = "XXXX";
  public edaApiPort: string = "XXXX";
  public lastRebuildDate: string = "XXXX";
  public sinergiaCRMDatabaseName: string = "XXXX";
  public lastUpdateModelRun: string = "XXXX";

  // Instance configuration modal (admins only)
  public configModalVisible: boolean = false;
  public configModalTitle = $localize`:@@configViewerTitle:Configuración de la instancia`;
  public configFilter: string = "";

  public apiConfigEntries: ConfigEntry[] = [];
  public apiHiddenSections: string[] = [];
  public frontConfigEntries: ConfigEntry[] = [];
  public pluginsApiEntries: ConfigEntry[] = [];
  public pluginsFrontEntries: ConfigEntry[] = [];

  public apiConfigLoading: boolean = false;
  public apiConfigError: string = "";
  public apiConfigAvailable: boolean = true;
  public pluginsApiLoading: boolean = false;
  public pluginsApiError: string = "";
  public pluginsFrontError: string = "";

  // Maintenance: updateModel (admins only, same modal)
  public updateModelRunning: boolean = false;
  public updateModelConfirm: boolean = false;
  public updateModelResult: "ok" | "error" | "" = "";
  public updateModelError: string = "";

  constructor(
    private http: HttpClient,
    public userService: UserService
  ) {
    this.user = this.userService.getUserObject();
  }

  /**
   * OnInit lifecycle hook to initialize component data.
   * Fetches and sets application-related information such as version numbers and last synchronization details.
   */
  public ngOnInit(): void {
    this.user = this.userService.getUserObject();
    this.isAdmin = this.userService.isAdmin;

    // get lang
    let lang = window.location.pathname;
    lang = lang.replace(/[^a-zA-Z]/g, "");
    this.lang = lang || "es";

    // Variables overwritten in the front-end (customizable_overwrites.ts)
    this.frontConfigEntries = this.buildFrontConfigEntries();

    this.loadInfo();
  }

  /**
   * Fetches the installation information from the backend and updates the component
   * properties (also used to refresh the dates after running updateModel).
   */
  private loadInfo(): void {
    this.http.get<InfoResponse>(`/edapi/getsdainfo/getinfo?token=${this.userService.getToken()}`).subscribe({
      next: data => {
        this.sinergiaDaVersion = data.info.sinergiaDaVersion;
        this.edaApiVersion = data.info.edaApiVersion;
        this.edaApiPort = data.info.edaApiPort;
        this.lastRebuildDate = data.info.lastRebuildDate;
        this.lastUpdateModelRun = data.info.lastUpdateModelRun;
        // Conditionally displays the database name based on admin status.
        this.sinergiaCRMDatabaseName = this.userService.isAdmin ? data.info.sinergiaCRMDatabaseName : '';
      },
      error: error => {
        console.error("Error fetching information from the backend", error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Configuration modal
  // ---------------------------------------------------------------------------

  /** Opens the configuration modal and loads its data on first use. */
  public openConfigModal(): void {
    if (!this.isAdmin) return;
    this.configModalVisible = true;
    if (this.apiConfigEntries.length === 0 && !this.apiConfigError) {
      this.loadApiConfig();
    }
    if (this.pluginsApiEntries.length === 0 && !this.pluginsApiError && !this.pluginsFrontError) {
      this.loadPlugins();
    }
  }

  /** Entries of the API configuration once the search box has been applied. */
  public get filteredApiConfig(): ConfigEntry[] {
    return this.filterEntries(this.apiConfigEntries);
  }

  /** Entries of the front-end configuration once the search box has been applied. */
  public get filteredFrontConfig(): ConfigEntry[] {
    return this.filterEntries(this.frontConfigEntries);
  }

  /** API plugins once the search box has been applied. */
  public get filteredPluginsApi(): ConfigEntry[] {
    return this.filterEntries(this.pluginsApiEntries);
  }

  /** Front-end plugins once the search box has been applied. */
  public get filteredPluginsFront(): ConfigEntry[] {
    return this.filterEntries(this.pluginsFrontEntries);
  }

  /** Case-insensitive search on the variable name and its value. */
  private filterEntries(entries: ConfigEntry[]): ConfigEntry[] {
    const needle = (this.configFilter || "").trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter(entry =>
      entry.key.toLowerCase().includes(needle) || entry.value.toLowerCase().includes(needle)
    );
  }

  /** Fetches the variables overwritten in the API (config.overwrite.js). */
  public loadApiConfig(): void {
    this.apiConfigLoading = true;
    this.apiConfigError = "";
    this.http.get<OverwriteConfigResponse>(`/edapi/getsdainfo/overwrite-config?token=${this.userService.getToken()}`).subscribe({
      next: data => {
        this.apiConfigAvailable = data.available !== false;
        this.apiConfigEntries = this.flattenConfig(data.config);
        this.apiHiddenSections = data.hiddenSections ?? [];
        this.apiConfigLoading = false;
      },
      error: error => {
        console.error("Error fetching config.overwrite.js from the backend", error);
        this.apiConfigError = `HTTP ${error?.status ?? "?"}`;
        this.apiConfigEntries = [];
        this.apiHiddenSections = [];
        this.apiConfigLoading = false;
      }
    });
  }

  /** Loads the plugins registered in the API and in the front-end. */
  public async loadPlugins(): Promise<void> {
    this.pluginsApiLoading = true;
    this.pluginsApiError = "";
    this.pluginsFrontError = "";

    // Front-end plugins: read from the generated registries (loaded on demand so the
    // about page keeps its own bundle small).
    try {
      const [pages, components, datasources] = await Promise.all([
        import("../page-plugin-registry").then(m => m.PLUGIN_ROUTES),
        import("../../component-plugins/component-plugin-registry").then(m => m.COMPONENT_PLUGINS),
        import("../../datasource-plugins/datasource-plugin-registry").then(m => m.DATASOURCE_PLUGINS),
      ]);

      this.pluginsFrontEntries = [
        ...(pages as any[]).map(plugin =>
          this.toConfigEntry(
            `page.${plugin.path}`,
            `${plugin.data?.label ?? "-"} · ${plugin.data?.menuSection ? `menú ${plugin.data.menuSection}` : "sin menú"}`
          )
        ),
        ...(components as any[]).map(plugin =>
          this.toConfigEntry(
            `component.${plugin.type}`,
            `${plugin.label ?? "-"}${plugin.permissions?.length ? ` · permisos: ${plugin.permissions.join(", ")}` : ""}`
          )
        ),
        ...(datasources as any[]).map(plugin =>
          this.toConfigEntry(
            `datasource.${plugin.type}`,
            `${plugin.label ?? "-"}${plugin.apiBasePath ? ` · API ${plugin.apiBasePath}` : ""}`
          )
        ),
      ].sort((a, b) => a.key.localeCompare(b.key));
    } catch (error) {
      console.error("Error reading the front-end plugin registries", error);
      this.pluginsFrontError = "registros del frontend";
    }

    // API plugins: registered at boot time by lib/plugins/index.ts
    this.http.get<PluginsResponse>(`/edapi/getsdainfo/plugins?token=${this.userService.getToken()}`).subscribe({
      next: data => {
        this.pluginsApiEntries = (data.plugins ?? [])
          .map(plugin => this.toConfigEntry(
            `${plugin.type} (${plugin.kind})`,
            [plugin.routerPath ? `API ${plugin.routerPath}` : "sin ruta",
             plugin.sync ? "sincronización programada" : "",
             plugin.schedule ? plugin.schedule : ""]
              .filter(Boolean)
              .join(" · ")
          ))
          .sort((a, b) => a.key.localeCompare(b.key));
        this.pluginsApiLoading = false;
      },
      error: error => {
        console.error("Error fetching the API plugins", error);
        this.pluginsApiError = `HTTP ${error?.status ?? "?"}`;
        this.pluginsApiEntries = [];
        this.pluginsApiLoading = false;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Maintenance: updateModel
  // ---------------------------------------------------------------------------

  /** Asks for confirmation before running updateModel (it rewrites the data model). */
  public askRunUpdateModel(): void {
    if (this.updateModelRunning) return;
    this.updateModelResult = "";
    this.updateModelError = "";
    this.updateModelConfirm = true;
  }

  /** Closes the confirmation without running anything. */
  public cancelRunUpdateModel(): void {
    this.updateModelConfirm = false;
  }

  /**
   * Runs the SinergiaCRM data-model update through the API (the same job the
   * scheduled updatemodel runs). It can take minutes, so the button stays
   * disabled with a spinner until the API answers.
   */
  public runUpdateModel(): void {
    if (this.updateModelRunning) return;
    this.updateModelRunning = true;
    this.updateModelConfirm = false;
    this.updateModelResult = "";
    this.updateModelError = "";

    this.http.post<{ status?: string }>(`/edapi/getsdainfo/update-model?token=${this.userService.getToken()}`, {}).subscribe({
      next: data => {
        this.updateModelRunning = false;
        this.updateModelResult = data?.status === "ko" ? "error" : "ok";
        // The About page shows the last updateModel run: refresh it.
        this.loadInfo();
      },
      error: error => {
        console.error("Error running updateModel", error);
        this.updateModelRunning = false;
        this.updateModelResult = "error";
        this.updateModelError = error?.status === 409
          ? "already-running"
          : error?.status === 403
            ? "admin-required"
            : `HTTP ${error?.status ?? "?"}`;
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Reads the exported constants of customizable_overwrites.ts as key/value rows. */
  private buildFrontConfigEntries(): ConfigEntry[] {
    return Object.entries(customizableOverwrites as Record<string, unknown>)
      .filter(([key]) => !OMITTED_FRONT_KEYS.includes(key))
      .map(([key, value]) => this.toConfigEntry(key, value))
      .sort((a, b) => a.key.localeCompare(b.key));
  }

  /** Flattens a nested config object into dotted paths (a.b.c = value). */
  private flattenConfig(config: Record<string, any>, prefix: string = ""): ConfigEntry[] {
    if (!config || typeof config !== "object") return [];
    const entries: ConfigEntry[] = [];
    for (const [key, value] of Object.entries(config)) {
      const path = prefix ? `${prefix}.${key}` : key;
      const isPlainObject = value !== null && typeof value === "object" && !Array.isArray(value);
      if (isPlainObject) {
        entries.push(...this.flattenConfig(value, path));
      } else {
        entries.push(this.toConfigEntry(path, value));
      }
    }
    return entries;
  }

  /** Formats a configuration value for display (objects/arrays as pretty JSON). */
  private toConfigEntry(key: string, value: unknown): ConfigEntry {
    if (value === null || value === undefined) {
      return { key, value: String(value), multiline: false };
    }
    if (typeof value === "string") {
      return { key, value, multiline: value.includes("\n") };
    }
    if (typeof value === "object") {
      return { key, value: JSON.stringify(value, null, 2), multiline: true };
    }
    return { key, value: String(value), multiline: false };
  }
}
