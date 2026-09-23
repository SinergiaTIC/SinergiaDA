import { Component, DoCheck, Input, OnDestroy, OnInit, ViewChild, ViewEncapsulation, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { Subscription } from "rxjs";
import { Menu, MenuModule } from "primeng/menu";
import { MenuItem } from "primeng/api";
import { TooltipModule } from "primeng/tooltip";
import { EdaPanel, EdaPanelType, EdaTitlePanel, EdaTabsPanel } from "@eda/models/model.index";
import { FileUtiles, StyleProviderService, DashboardService } from "@eda/services/service.index";
import { DashboardSidebarService } from "@eda/services/shared/dashboard-sidebar.service";
import { SHOW_CUSTOM_ACTION } from "@eda/configs/customizable/customizable_default";

/**
 * dashboard-menu-sda: replaces the three-dot (⠿) menu in the report header
 * with a horizontal toolbar. The only active plugin of type 'report-toolbar'.
 * Receives the DashboardPage instance as input and only depends on it
 * structurally (without refactoring DashboardSidebarComponent). In view mode
 * the toolbar collapses to the view/edit switch (see viewMode).
 */
@Component({
  selector: "dashboard-menu-sda",
  standalone: true,
  imports: [CommonModule, MenuModule, TooltipModule],
  templateUrl: "./dashboard-menu.component.html",
  styleUrls: ["./dashboard-menu.component.css"],
  // Unencapsulated on purpose: the global toast rule in the CSS
  // must apply outside this component.
  encapsulation: ViewEncapsulation.None
})
export class DashboardMenuSdaComponent implements OnInit, OnDestroy, DoCheck {
  @Input() dashboard: any = null;

  @ViewChild("addMenu") addMenu?: Menu;
  @ViewChild("moreMenu") moreMenu?: Menu;
  @ViewChild("filtersMenu") filtersMenu?: Menu;

  private fileUtils = inject(FileUtiles);
  private stylesProviderService = inject(StyleProviderService);
  private dashboardService = inject(DashboardService);
  private sidebarService = inject(DashboardSidebarService);
  private notSavedSub?: Subscription;

  public isEditable: boolean = false;
  public isReadOnly: boolean = true;
  public addMenuItems: MenuItem[] = [];
  public moreMenuItems: MenuItem[] = [];
  /** Items of the left flyout opened by the single "Filtros de informe" entry. */
  public filterMenuItems: MenuItem[] = [];

  public addLabel = $localize`:@@dashboardSidebarReportAdd:Añadir`;
  public saveLabel = $localize`:@@dashboardSidebarSave:Guardar`;
  public saveTooltip = $localize`:@@dashboardSidebarSaveTooltip:Guardar informe`;
  public moreLabel = $localize`:@@dashboardSidebarMoreOptions:Más`;
  public viewLabel = $localize`:@@dashboardMenuViewMode:Ver`;
  public viewTooltip = $localize`:@@dashboardMenuViewModeTooltip:Pasar a modo ver (oculta la edición)`;
  public editModeLabel = $localize`:@@dashboardMenuEditMode:Editar`;
  public editModeTooltip = $localize`:@@dashboardMenuEditModeTooltip:Volver a modo edición`;
  /** Tooltips of the single download icon row (Informe section). */
  public downloadPdfLabel = $localize`:@@dashboardSidebarDownloadPDF:Descargar PDF`;
  public downloadImageLabel = $localize`:@@dashboardSidebarDownloadImage:Descargar Imagen`;
  public downloadExcelLabel = $localize`:@@dashboardSidebarDownloadExcel:Descargar Excel`;
  public downloadWordLabel = $localize`:@@dashboardSidebarDownloadWord:Descargar Word`;
  /** true when the report has unsaved changes. */
  public hasUnsavedChanges: boolean = false;
  /**
   * View mode: hides all editing WITHOUT touching the core. Hot levers:
   * - `panel.readonly=true` (switches off everything governed by `isEditable()` in panels),
   * - `gridsterOptions.draggable/resizable.enabled=false` (stops move/resize),
   * - `dsm-view-mode` class on #myDashboard + global CSS (chrome without flags),
   * - own toolbar collapsed to the switch. Everything is restored on exit.
   */
  public viewMode: boolean = true;
  private viewModeInit = false;
  private viewModeTouched = false;
  private viewModeBackup = new Map<string, any>();
  private viewModeCompBackup = new Map<string, any>();
  private gridsterBackup: { draggable?: boolean; resizable?: boolean } = {};
  /** localStorage key prefix for the per-report view/edit preference. */
  private readonly VIEW_MODE_STORAGE_PREFIX = 'dsm-view-mode:';

  private readonly ANONIM_ID = "135792467811111111111112";
  private readonly ADMIN_ID = "135792467811111111111110";
  private readonly OBSERVER_ID = "135792467811111111111113";

  ngOnInit(): void {
    this.isEditable = this.canIedit();
    this.isReadOnly = this.isReadOnlyCheck();
    this.notSavedSub = this.dashboardService.notSaved.subscribe(v => this.hasUnsavedChanges = !!v);
    this.buildAddMenu();
    this.buildMoreMenu();
  }

  ngOnDestroy(): void {
    this.notSavedSub?.unsubscribe();
    if (this.viewMode) this.restoreEditMode();
  }

  /**
   * Re-asserts the view-mode flags on every cycle: panels can be replaced
   * (e.g. reload with auto-refresh) without going through the plugin.
   * Idempotent and cheap: only touches what differs.
   */
  ngDoCheck(): void {
    // The report loads async AFTER this plugin is created, so permissions,
    // menus and the stored per-report mode can only be resolved once the
    // dashboard id is available. Never touches a mode the user already set.
    if (!this.viewModeInit && (this.dashboard?.dashboardId || this.dashboard?.dashboard?._id)) {
      this.viewModeInit = true;
      this.isEditable = this.canIedit();
      this.isReadOnly = this.isReadOnlyCheck();
      if (!this.viewModeTouched) {
        this.viewMode = this.isEditable && this.readStoredViewMode();
      }
      this.buildAddMenu();
      this.buildMoreMenu();
    }
    if (!this.viewModeInit) return; // never touch panels before knowing the report mode
    if (!this.viewMode) return;
    this.ensureViewFlags();
    this.syncViewModeClass();
  }

  /** View/edit switch (edit permission only). */
  public toggleViewMode(): void {
    this.setViewMode(!this.viewMode);
  }

  /** Enables or disables view mode, applying or restoring its flags. */
  public setViewMode(enabled: boolean): void {
    this.closeMenus();
    this.viewMode = enabled;
    this.viewModeTouched = true;
    this.storeViewMode(enabled);
    this.syncViewModeClass();
    if (enabled) {
      this.ensureViewFlags();
    } else {
      this.restoreEditMode();
    }
  }

  /** Storage key for this report (null when the dashboard id is unknown). */
  private viewModeStorageKey(): string | null {
    const id = this.dashboard?.dashboardId ?? this.dashboard?.dashboard?._id;
    return id ? `${this.VIEW_MODE_STORAGE_PREFIX}${id}` : null;
  }

  /** Last view-mode choice for this report; defaults to view (true). */
  private readStoredViewMode(): boolean {
    try {
      const key = this.viewModeStorageKey();
      if (!key) return true;
      return localStorage.getItem(key) !== 'edit';
    } catch {
      return true;
    }
  }

  private storeViewMode(enabled: boolean): void {
    try {
      const key = this.viewModeStorageKey();
      if (key) localStorage.setItem(key, enabled ? 'view' : 'edit');
    } catch { /* private mode etc.: preference simply not persisted */ }
  }

  private syncViewModeClass(): void {
    document.getElementById('myDashboard')?.classList.toggle('dsm-view-mode', this.viewMode);
  }

  /** Applies readonly + gridster off, stashing the previous values on first touch. */
  private ensureViewFlags(): void {
    for (const p of this.dashboard?.panels || []) {
      if (p && p.readonly !== true) {
        if (!this.viewModeBackup.has(p.id)) this.viewModeBackup.set(p.id, p.readonly);
        p.readonly = true;
      }
    }
    // Blank-panel chrome (lock, ...) reads the COMPONENT's readonly snapshot
    // taken in its ngOnInit, not the panel object: patch live instances too.
    // Components created later snapshot panel.readonly (already true here).
    for (const comp of this.dashboard?.edaPanels?.toArray?.() || []) {
      const compAny = comp as any;
      if (compAny && compAny.readonly !== true) {
        if (!this.viewModeCompBackup.has(compAny.panel?.id)) {
          this.viewModeCompBackup.set(compAny.panel?.id, compAny.readonly);
        }
        compAny.readonly = true;
      }
    }
    const g: any = this.dashboard?.gridsterOptions;
    if (!g) return;
    let changed = false;
    if (g.draggable && g.draggable.enabled !== false) {
      if (this.gridsterBackup.draggable === undefined) this.gridsterBackup.draggable = g.draggable.enabled;
      g.draggable.enabled = false;
      changed = true;
    }
    if (g.resizable && g.resizable.enabled !== false) {
      if (this.gridsterBackup.resizable === undefined) this.gridsterBackup.resizable = g.resizable.enabled;
      g.resizable.enabled = false;
      changed = true;
    }
    if (changed) g.api?.optionsChanged();
  }

  /** Restores the pre-view-mode values (only what view mode touched). */
  private restoreEditMode(): void {
    for (const p of this.dashboard?.panels || []) {
      if (!p || !this.viewModeBackup.has(p.id)) continue;
      p.readonly = this.viewModeBackup.get(p.id);
    }
    this.viewModeBackup.clear();
    for (const comp of this.dashboard?.edaPanels?.toArray?.() || []) {
      const compAny = comp as any;
      if (!compAny || !this.viewModeCompBackup.has(compAny.panel?.id)) continue;
      compAny.readonly = this.viewModeCompBackup.get(compAny.panel?.id);
    }
    this.viewModeCompBackup.clear();
    const g: any = this.dashboard?.gridsterOptions;
    if (g) {
      let changed = false;
      if (g.draggable && this.gridsterBackup.draggable !== undefined) {
        g.draggable.enabled = this.gridsterBackup.draggable;
        changed = true;
      }
      if (g.resizable && this.gridsterBackup.resizable !== undefined) {
        g.resizable.enabled = this.gridsterBackup.resizable;
        changed = true;
      }
      if (changed) g.api?.optionsChanged();
    }
    this.gridsterBackup = {};
  }

  /** Primary visible action: Save. */
  public async save(): Promise<void> {
    if (!this.dashboard) return;
    try {
      await this.dashboard.saveDashboard();
    } catch { /* the dashboard itself reports the error */ }
  }

  /** "Add" dropdown: new panel, filter, text, tabs and panel import. */
  private buildAddMenu(): void {
    this.addMenuItems = [
      {
        label: $localize`:@@newPanelTitle:Nuevo panel`,
        icon: "pi pi-plus-circle",
        visible: this.can('edit'),
        command: () => this.onAddWidget()
      },
      {
        label: $localize`:@@dashboardSidebarNewFilter:Nuevo filtro`,
        icon: "pi pi-filter",
        visible: this.can('edit'),
        command: () => this.dashboard?.globalFilter?.onShowGlobalFilter(true)
      },
      {
        label: $localize`:@@dashboardSidebarNewText:Nuevo texto`,
        icon: "pi pi-file-edit",
        visible: this.can('edit'),
        command: () => this.onAddTitle()
      },
      {
        label: $localize`:@@dashboardSidebarNewTabs:Nuevo navegador`,
        icon: "pi pi-folder",
        visible: this.can('edit'),
        command: () => this.onAddTabsPanel()
      },
      {
        label: $localize`:@@dashboardSidebarImportPanel:Importar panel`,
        icon: "pi pi-plus-circle",
        visible: this.can('edit'),
        command: () => this.sidebarService.invokeMethod("onImportPanel")
      }
    ];
  }

  /**
   * "More" dropdown: same actions as the original menu, laid out as a flat
   * list where the former section headers are replaced by thin separators
   * (joinSections). Each action's logic still lives in
   * DashboardSidebarComponent; here it is only delegated, not refactored.
   */
  private buildMoreMenu(): void {
    const sidebar = () => this.dashboard?.sidebar;
    const sb = this.dashboard?.sidebar;
    const hide = () => this.moreMenu?.hide();

    // Each array is a former section; empty ones (all items hidden) drop out
    // along with their separator.
    const sections: MenuItem[][] = [
      [
        // Single entry instead of one per filter (the list could grow too
        // long). It opens a flyout to the LEFT with one button per filter,
        // keeping the "More" menu open (see onFiltersItemClick).
        {
          id: 'reportFilters',
          label: $localize`:@@dashboardMenuReportFilters:Filtros de informe`,
          icon: "pi pi-filter",
          visible: this.hasReportFilters()
        },
        {
          label: $localize`:@@dashboardSidebarDependentFilters:Filtros dependientes`,
          icon: "pi pi-sliders-h",
          command: () => sidebar()?.dependentFilters()
        }
      ],
      [
        {
          label: $localize`:@@dashboardSidebarSaveAs:Guardar como`,
          icon: "pi pi-copy",
          visible: this.can('edit'),
          command: () => { const s = sidebar(); if (s) s.isSaveAsDialogVisible = true; hide(); }
        },
        {
          label: $localize`:@@opcionMail:Enviar por email`,
          icon: "pi pi-envelope",
          visible: this.can('edit'),
          command: () => { const s = sidebar(); if (s) s.isMailConfigDialogVisible = true; hide(); }
        },
        ...(SHOW_CUSTOM_ACTION ? [{
          label: $localize`:@@dashboardSidebarCustomAction:Acción personalizada`,
          icon: "pi pi-cog",
          visible: this.can('edit'),
          command: () => { const s = sidebar(); if (s) s.isCustomActionDialogVisible = true; hide(); }
        }] : [])
      ],
      [
        // Own section: the 4 download formats render as a single icon row
        // (see the itemTemplate), not as 4 entries.
        { id: 'downloadGroup' }
      ],
      [
        {
          label: $localize`:@@dashboardSidebarEditStyles:Editar estilos`,
          icon: "pi pi-palette",
          visible: this.can('edit'),
          command: () => { const s = sidebar(); if (s) s.isEditStyleDialogVisible = true; hide(); }
        },
        {
          label: $localize`:@@dashboardSidebarDashboardPrivacity:Privacidad del informe`,
          icon: "pi pi-lock",
          visible: this.can('edit'),
          command: () => { const s = sidebar(); if (s) s.isVisibleModalVisible = true; hide(); }
        },
        {
          label: $localize`:@@addTag:Añadir etiqueta`,
          icon: "pi pi-tag",
          visible: this.can('edit'),
          command: () => { const s = sidebar(); if (s) s.isTagModalVisible = true; hide(); }
        }
      ],
      [
        {
          label: sb?.clickFiltersEnabled
            ? $localize`:@@enableFilters:Click en filtros habilitado`
            : $localize`:@@disableFilters:Click en filtros deshabilitado`,
          icon: sb?.clickFiltersEnabled ? "pi pi-bolt" : "pi pi-ban",
          command: () => { sidebar()?.toggleClickFilters(); this.buildMoreMenu(); }
        },
        {
          label: sb?.clickPanelLockButton
            ? $localize`:@@enablePanelLockButton:Bloquear los paneles`
            : $localize`:@@disablePanelLockButton:Desbloquear los paneles`,
          icon: sb?.clickPanelLockButton ? "pi pi-lock-open" : "pi pi-lock",
          visible: this.can('edit'),
          command: () => { sidebar()?.panelLockButton(); this.buildMoreMenu(); }
        },
        {
          label: sb?.onlyIcanEdit
            ? $localize`:@@onlyIcanEditTagEnable:Edición privada habilitada`
            : $localize`:@@onlyIcanEditTagDisable:Edición privada deshabilitada`,
          icon: sb?.onlyIcanEdit ? "pi pi-check" : "pi pi-ban",
          visible: this.can('edit'),
          command: () => { sidebar()?.toggleEdit(); this.buildMoreMenu(); }
        }
      ],
      [
        {
          label: $localize`:@@dashboardSidebarDeleteDashboard:Eliminar informe`,
          icon: "pi pi-trash",
          visible: this.can('edit'),
          command: () => sidebar()?.removeDashboard()
        }
      ]
    ];

    this.moreMenuItems = this.joinSections(sections);
  }

  /**
   * Flattens sections into a single p-menu list, dropping hidden items and
   * empty sections, and inserting one separator between the remaining ones.
   * p-menu only renders headers for items with `items`; not using those keeps
   * the menu flat so separators (and our custom itemTemplate) work.
   */
  private joinSections(sections: MenuItem[][]): MenuItem[] {
    const visibleSections = sections
      .map(items => items.filter(i => i.visible !== false))
      .filter(items => items.length > 0);

    const out: MenuItem[] = [];
    visibleSections.forEach((items, idx) => {
      if (idx > 0) out.push({ separator: true });
      out.push(...items);
    });
    return out;
  }

  /** Whether the report currently has any global filter. */
  private hasReportFilters(): boolean {
    return (this.dashboard?.globalFilter?.globalFilters || []).length > 0;
  }

  /** Flyout items: one per report filter, opening its edit dialog. */
  private editFilterItems(): MenuItem[] {
    const sidebar = () => this.dashboard?.sidebar;
    const filters = this.dashboard?.globalFilter?.globalFilters || [];
    return filters.map((f: any) => ({
      label: f?.selectedColumn?.display_name?.default || f?.column?.value?.description?.default,
      icon: "pi pi-check",
      command: () => sidebar()?.handleSpecificFilter(f)
    }));
  }

  /**
   * Opens the left flyout listing the report filters. p-menu can only render
   * one level (an item with `items` becomes a non-clickable header), so the
   * flyout is a separate popup. Its position is set manually afterwards
   * (positionFlyoutLeft), because p-menu's own alignment only flips left when
   * the overlay would overflow the viewport and otherwise overlaps the anchor.
   */
  private openFiltersFlyout(event?: Event): void {
    this.filterMenuItems = this.editFilterItems();
    const moreContainer = (this.moreMenu as any)?.container as HTMLElement | undefined;
    const anchor = moreContainer || (event?.currentTarget as HTMLElement);
    if (!anchor) return;
    this.filtersMenu?.show({ currentTarget: anchor } as any);
    setTimeout(() => this.positionFlyoutLeft(anchor), 0);
  }

  /** Places the flyout so its right edge sits just left of the anchor. */
  private positionFlyoutLeft(anchor: HTMLElement): void {
    const container = (this.filtersMenu as any)?.container as HTMLElement | undefined;
    if (!container) return;
    const rect = anchor.getBoundingClientRect();
    const gap = 8;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft || 0;
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    container.style.marginTop = '0';
    container.style.left = `${Math.max(0, rect.left + scrollLeft - container.offsetWidth - gap)}px`;
    container.style.top = `${rect.top + scrollTop}px`;
  }

  /**
   * Click on the single "Filtros de informe" entry. Handled from the custom
   * itemTemplate (not via `command`) and stops propagation so p-menu does NOT
   * run its usual click -> command -> hide sequence: the "More" menu stays
   * open while the flyout shows to its left. Clicking again toggles it.
   */
  public onFiltersItemClick(event: Event, item: MenuItem): void {
    if (item?.id !== 'reportFilters') return;
    event.stopPropagation();
    if (this.filtersMenu?.visible) {
      this.filtersMenu.hide();
      return;
    }
    this.openFiltersFlyout(event);
  }

  /** Closes the flyout (e.g. when the "More" menu hides for any reason). */
  public closeFiltersFlyout(): void {
    this.filtersMenu?.hide();
  }

  /** Downloads the report in one of the supported formats (Informe section). */
  public exportReport(format: 'pdf' | 'image' | 'excel' | 'word'): void {
    const sidebar = this.dashboard?.sidebar;
    switch (format) {
      case 'pdf': sidebar?.exportAsPDF(); break;
      case 'image': sidebar?.exportAsJPEG(); break;
      case 'excel': sidebar?.exportDashboardAsExcel(); break;
      case 'word': sidebar?.exportDashboardAsWord(); break;
    }
  }

  /** Rebuilds the "More" menu (to refresh toggle labels) and opens it. */
  public openMoreMenu(event: Event): void {
    this.buildMoreMenu();
    this.moreMenu?.toggle(event);
  }
  /** Checks an action permission ('edit' supported, anything else falls back to isEditable). */
  public can(action: string): boolean {
    if (!this.dashboard) return false;
    if (action === "edit") return this.canIedit();
    return this.isEditable;
  }

  private currentUser(): any {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }

  public isReadOnlyCheck(): boolean {
    const user = this.currentUser();
    if (!user || !this.dashboard?.dashboard) return true;
    const userId = user._id;
    const imProperty = userId === this.dashboard.dashboard.user;
    const isObserver = (user.role || []).includes(this.OBSERVER_ID);
    const onlyIcanEdit = this.dashboard.dashboard.config.onlyIcanEdit ?? true;
    return userId === this.ANONIM_ID || (!onlyIcanEdit && !imProperty) || isObserver;
  }

  public isEditableCheck(): boolean {
    const user = this.currentUser();
    if (!user || !this.dashboard?.dashboard) return false;
    const userId = user._id;
    const isAdmin = (user.role || []).includes(this.ADMIN_ID);
    const imProperty = userId === this.dashboard.dashboard.user;
    return !this.dashboard.dashboard.config.onlyIcanEdit || imProperty || isAdmin;
  }

  public canIedit(): boolean {
    return this.dashboard?.canIedit() ?? false;
  }

  public isAdmin(): boolean {
    const user = this.currentUser();
    return !!user && (user.role || []).includes(this.ADMIN_ID);
  }

  public isObserver(): boolean {
    const user = this.currentUser();
    return !!user && (user.role || []).includes(this.OBSERVER_ID);
  }

  public isAnonim(): boolean {
    const user = this.currentUser();
    return !!user && user._id === this.ANONIM_ID;
  }

  // ---- Creation actions (same logic as DashboardSidebarComponent) ----

  public onAddWidget(): void {
    const panel = new EdaPanel({
      id: this.fileUtils.generateUUID(),
      title: $localize`:@@newPanelTitle:Nuevo Panel`,
      type: EdaPanelType.BLANK,
      w: 20,
      h: 10,
      cols: 20,
      rows: 10,
      resizable: true,
      dragAndDrop: true,
      x: 0,
      y: 0
    });
    this.dashboard.panels.push(panel);
    this.stylesProviderService.loadedPanels++;
  }

  public onAddTitle(): void {
    const panel = new EdaTitlePanel({
      id: this.fileUtils.generateUUID(),
      title: $localize`:@@newTitlePanel:Titulo Panel`,
      type: EdaPanelType.TITLE,
      w: 20,
      h: 1,
      cols: 20,
      rows: 1,
      resizable: true,
      dragAndDrop: true,
      fontsize: "22px",
      color: "#000000",
      backgroundColor: "#ffffff"
    });
    this.dashboard.panels.push(panel);
  }

  public onAddTabsPanel(): void {
    const panel = new EdaTabsPanel({
      id: this.fileUtils.generateUUID(),
      title: $localize`:@@newTabsPanel:Tabs`,
      type: EdaPanelType.TABS,
      w: 40,
      h: 2,
      cols: 40,
      rows: 2,
      resizable: true,
      dragAndDrop: true
    });
    this.dashboard.panels.push(panel);
  }

  public closeMenus(): void {
    this.addMenu?.hide();
    this.moreMenu?.hide();
  }
}