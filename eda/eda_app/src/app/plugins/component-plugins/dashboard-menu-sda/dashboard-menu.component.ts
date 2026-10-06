import { Component, DoCheck, ElementRef, Input, OnDestroy, OnInit, ViewChild, ViewEncapsulation, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { FocusOnShowDirective } from "@eda/shared/directives/autofocus.directive";
import { Subscription } from "rxjs";
import { Menu, MenuModule } from "primeng/menu";
import { MenuItem } from "primeng/api";
import { TooltipModule } from "primeng/tooltip";
import { EdaPanel, EdaPanelType, EdaTitlePanel, EdaTabsPanel } from "@eda/models/model.index";
import { FileUtiles, StyleProviderService, DashboardService } from "@eda/services/service.index";
import { DashboardSidebarService } from "@eda/services/shared/dashboard-sidebar.service";
import { IconService } from "@eda/services/utils/icons.service";
// "Acción personalizada" hidden by design decision in SinergiaDA (see buildMoreMenu).
// Restore together with its menu entry below.
// import { SHOW_CUSTOM_ACTION } from "@eda/configs/customizable/customizable_default";
import { ZoomSdaComponent } from "../../../module/pages/dashboard/zoom-control/zoom.component";

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
  imports: [CommonModule, FormsModule, MenuModule, TooltipModule, ZoomSdaComponent, FocusOnShowDirective],
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
  private iconService = inject(IconService);
  private host = inject(ElementRef);
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
  /** Live Dashboard: auto-refresh interval input (seconds). */
  public liveDashboardOpen: boolean = false;
  public refreshTime: number | null = null;
  public liveDashboardLabel = $localize`:@@dashboardSidebarLiveDashboard:Live Dashboard`;
  public secondsToRefreshPlaceholder = $localize`:@@secondsToRefresh:Segundos para refrescar`;
  public renameLabel = $localize`:@@renameReportTooltip:Editar nombre`;
  public panelTitlePlaceholder = $localize`:@@panelTitlePlaceholder:Título del panel`;
  /** Tooltip of the pencil injected next to every report filter. */
  public filterEditLabel = $localize`:@@editFilterTooltip:Editar filtro`;
  /** Bare pencil injected after the report title (core owns the title markup). */
  private titlePencil?: HTMLElement;
  private titleEl?: HTMLElement;
  private titleInput?: HTMLInputElement;
  private titleEditing = false;
  private titleOriginalText = '';
  /** Pencil injected into each filter card, keyed by the core's card node. */
  private filterPencils = new Map<HTMLElement, HTMLButtonElement>();
  /** Last hovered filter card: keeps its pencil until another card takes over. */
  private stickyFilterCard: HTMLElement | null = null;
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
    this.teardownTitleAffordance();
    this.teardownFilterAffordances();
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
    this.syncTitleAffordance();
    this.syncFilterEditAffordances();
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

  /**
   * Zoom control is hosted by this plugin because it replaces the sidebar.
   * Shown only when the report is editable, not in view mode, and the page is
   * configured to place the zoom in the sidebar (otherwise the page renders it
   * itself in the filters bar). Hidden in view mode, like the rest of editing.
   */
  public get showZoomControl(): boolean {
    return this.isEditable && !this.viewMode && !!this.dashboard?.showZoomInSidebar;
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

  /**
   * Click on the Live Dashboard menu row: toggles the seconds input without
   * closing the "More" menu (stopPropagation, same trick as report filters).
   */
  public onLiveDashboardClick(event: Event): void {
    event.stopPropagation();
    if (!this.liveDashboardOpen) {
      this.refreshTime = this.dashboard?.dashboard?.config?.refreshTime ?? null;
    }
    this.liveDashboardOpen = !this.liveDashboardOpen;
  }

  /**
   * Applies the auto-refresh interval: persists it on the report config (same
   * field the sidebar uses) and restarts the page timer. A value under 5s is
   * clamped to 5; empty or 0 stops the refresh.
   */
  public applyLiveDashboard(): void {
    if (!this.dashboard?.dashboard?.config) return;
    let value: number | null = Number(this.refreshTime);
    if (!value || value <= 0) {
      value = null;
    } else if (value < 5) {
      value = 5;
    }
    this.refreshTime = value;
    this.dashboard.dashboard.config.refreshTime = value;
    this.dashboardService.setNotSaved(true);
    // The page owns the countdown; triggerTimer() restarts it from the config.
    this.dashboard?.triggerTimer?.();
    this.liveDashboardOpen = false;
    this.closeMenus();
  }

  /** Primary visible action: Save. */
  public async save(): Promise<void> {
    if (!this.dashboard) return;
    try {
      await this.dashboard.saveDashboard();
    } catch { /* the dashboard itself reports the error */ }
  }

  /**
   * Replicates the panel-title edit pattern on the report header title:
   * an <eda-icon name="pencil"> button right after the <h1>, and on click an
   * <input> with the same look/placement as the panel's (px-3 py-2 bg-gray-100
   * rounded-md, width 15vw, placeholder "Título del panel"), preloaded with the
   * current title. Core renders the title, so this is a deliberate, fragile DOM
   * hook (revisit if core changes the header). The pencil shows only in edit mode.
   */
  private syncTitleAffordance(): void {
    if (this.titleEditing) return; // don't fight the input while editing
    const header = this.host?.nativeElement?.parentElement as HTMLElement | null;
    const title = header?.querySelector('h1') as HTMLElement | null;
    if (!title) return;

    // Re-inject if core re-created the title node or the pencil was removed.
    if (this.titleEl !== title || !this.titlePencil?.isConnected) {
      this.teardownTitleAffordance();
      this.titleEl = title;
      title.classList.add('dsm-title');

      // Same affordance as the panel header: a button wrapping eda-icon pencil.
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dsm-title-pencil rounded-md cursor-pointer hover:bg-muted h-fit';
      button.setAttribute('aria-label', this.renameLabel);
      button.setAttribute('title', this.renameLabel);

      // Same icon markup the panel uses (eda-icon renders IconService SVG into a span).
      const icon = document.createElement('span');
      icon.className = 'pointer-events-none inline-block h-5 w-5';
      icon.innerHTML = this.iconService.getIcon('pencil');
      button.appendChild(icon);
      button.addEventListener('click', () => this.startTitleEdit());

      title.insertAdjacentElement('afterend', button);
      this.titlePencil = button;
    }

    this.titlePencil.style.display = (this.isEditable && !this.viewMode) ? '' : 'none';
  }

  /** Removes the injected pencil (and any pending edit) from the title. */
  private teardownTitleAffordance(): void {
    if (this.titleEditing) this.finishTitleEdit(true);
    this.titleEl?.classList.remove('dsm-title');
    this.titlePencil?.remove();
    this.titlePencil = undefined;
    this.titleEl = undefined;
  }

  /**
   * Mirrors syncTitleAffordance for the report filters: injects a pencil into
   * every filter card so a filter can be edited from the filter itself, not
   * only from "More" > "Filtros de informe" (which is kept). Core renders the
   * filter markup, so this is a deliberate DOM hook (revisit if core changes
   * .filter-card / .filter-label-top). The card is already position:relative,
   * so the button floats over its top-right corner, next to the label.
   */
  private syncFilterEditAffordances(): void {
    const visible = this.isEditable && !this.viewMode;

    // Nothing injected and nothing to show: skip the DOM query entirely.
    if (!visible && this.filterPencils.size === 0) return;

    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('#myDashboard .filter-card')
    );

    // Drop pencils whose card is gone (filters deleted, report reloaded...).
    for (const [card, button] of this.filterPencils) {
      if (!card.isConnected || !cards.includes(card)) {
        button.remove();
        card.classList.remove('dsm-has-pencil', 'dsm-sticky');
        this.filterPencils.delete(card);
      }
    }

    if (!visible) {
      for (const button of this.filterPencils.values()) button.style.display = 'none';
      return;
    }

    // Pair each card with its filter by label, consuming each filter once so
    // duplicated labels still map to different cards in render order.
    const available = this.editableFilterList();
    const matched = new Set<HTMLElement>();
    for (const card of cards) {
      const index = available.findIndex((filter: any) => this.cardLabelMatches(card, filter));
      if (index === -1) continue;
      const [filter] = available.splice(index, 1);
      this.attachFilterPencil(card, filter);
      matched.add(card);
    }

    // Drop pencils whose filter is no longer present/editable this cycle.
    for (const [card, button] of this.filterPencils) {
      if (matched.has(card)) continue;
      button.remove();
      card.classList.remove('dsm-has-pencil', 'dsm-sticky');
      this.filterPencils.delete(card);
    }

    // Sticky pencil: the last hovered card keeps its affordance until another
    // card's pencil is shown, so it stays reachable without any hide timer.
    const hoveredCard = cards.find(card => this.filterPencils.has(card) && card.matches(':hover'));
    if (hoveredCard && hoveredCard !== this.stickyFilterCard) {
      this.stickyFilterCard?.classList.remove('dsm-sticky');
      this.stickyFilterCard = hoveredCard;
      hoveredCard.classList.add('dsm-sticky');
    }
    if (this.stickyFilterCard && !this.filterPencils.has(this.stickyFilterCard)) {
      this.stickyFilterCard.classList.remove('dsm-sticky');
      this.stickyFilterCard = null;
    }
  }

  /** Report filters the current user is allowed to edit. */
  private editableFilterList(): any[] {
    const globalFilter = this.dashboard?.globalFilter;
    const filters = globalFilter?.globalFilters || [];
    return filters.filter((filter: any) => !globalFilter?.disableGlobalFilter?.(filter));
  }

  /** Whether a card's rendered label corresponds to the given filter. */
  private cardLabelMatches(card: HTMLElement, filter: any): boolean {
    const labelEl = card.querySelector('.filter-label-top');
    if (!labelEl) return false;
    const domLabel = (labelEl.textContent || '').trim().replace(/:$/, '');
    const globalFilter = this.dashboard?.globalFilter;
    const filterLabel = globalFilter?.getFilterLabel
      ? globalFilter.getFilterLabel(filter)
      : (filter?.selectedColumn?.display_name?.default || filter?.column?.label || '');
    return !!filterLabel && domLabel === String(filterLabel).trim();
  }

  /** Creates (once) or refreshes the pencil of a filter card. */
  private attachFilterPencil(card: HTMLElement, filter: any): void {
    let button = this.filterPencils.get(card);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'dsm-filter-pencil';
      button.setAttribute('aria-label', this.filterEditLabel);
      button.setAttribute('title', this.filterEditLabel);

      // Same icon markup the panel/title use (eda-icon renders IconService SVG).
      const icon = document.createElement('span');
      icon.className = 'pointer-events-none inline-block h-3.5 w-3.5';
      icon.innerHTML = this.iconService.getIcon('pencil');
      button.appendChild(icon);

      button.addEventListener('click', (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = (button as any).__dsmFilter;
        if (target) this.dashboard?.sidebar?.handleSpecificFilter(target);
      });

      card.classList.add('dsm-has-pencil');
      card.appendChild(button);
      this.filterPencils.set(card, button);
    }
    // Resolved every cycle: the card node is stable per filter_id, the object is not.
    (button as any).__dsmFilter = filter;
    button.style.display = '';
  }

  /** Removes every injected filter pencil. */
  private teardownFilterAffordances(): void {
    for (const [card, button] of this.filterPencils) {
      button.remove();
      card.classList.remove('dsm-has-pencil', 'dsm-sticky');
    }
    this.filterPencils.clear();
    this.stickyFilterCard = null;
  }

  /**
   * Swaps the <h1> for an <input> replicating the panel-title edit control
   * (same classes, width and placeholder), preloaded with the current title.
   */
  private startTitleEdit(): void {
    const title = this.titleEl;
    if (!title || this.titleEditing) return;
    this.titleEditing = true;
    this.titleOriginalText = title.textContent ?? '';
    title.style.display = 'none';

    const input = document.createElement('input');
    input.type = 'text';
    // Same look & placement as the panel-title editor.
    input.className = 'dsm-title-input px-3 py-2 bg-gray-100 rounded-md focus:outline-none';
    input.value = (this.dashboard?.title ?? this.titleOriginalText).trim();
    input.setAttribute('placeholder', this.panelTitlePlaceholder);
    input.addEventListener('blur', () => this.finishTitleEdit(false));
    input.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        input.blur();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        this.finishTitleEdit(true);
      }
    });
    title.insertAdjacentElement('afterend', input);
    this.titleInput = input;
    input.focus();
    input.select();
  }

  /** Commits (or reverts) the title edit and restores the <h1>. */
  private finishTitleEdit(revert: boolean): void {
    if (!this.titleEditing) return;
    const input = this.titleInput;
    const title = this.titleEl;
    const value = (input?.value || '').trim();
    this.titleInput?.remove();
    this.titleInput = undefined;
    this.titleEditing = false;
    if (title) title.style.display = '';
    if (!revert && value && value !== (this.dashboard?.title ?? '').trim()) {
      this.dashboard.title = value;
      this.dashboardService.setNotSaved(true);
    }
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
      // "Importar panel" hidden in SinergiaDA until the feature is considered mature.
      // {
      //   label: $localize`:@@dashboardSidebarImportPanel:Importar panel`,
      //   icon: "pi pi-plus-circle",
      //   visible: this.can('edit'),
      //   command: () => this.sidebarService.invokeMethod("onImportPanel")
      // }
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
        // Read-only report data-source name, as shown in the old sidebar.
        {
          id: 'dataSourceInfo',
          label: this.dashboard?.dataSource?.name,
          icon: "pi pi-database",
          disabled: true,
          visible: !!this.dashboard?.dataSource?.name
        }
      ],
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
        // Temporarily hidden in SinergiaDA until the feature is considered mature.
        // See https://github.com/SinergiaTIC/SinergiaDA/issues/626
        // {
        //   label: $localize`:@@dashboardSidebarDependentFilters:Filtros dependientes`,
        //   icon: "pi pi-sliders-h",
        //   command: () => sidebar()?.dependentFilters()
        // }
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
        // "Acción personalizada" hidden by design decision in SinergiaDA.
        // Restore by uncommenting this block (and the SHOW_CUSTOM_ACTION import above).
        // ...(SHOW_CUSTOM_ACTION ? [{
        //   label: $localize`:@@dashboardSidebarCustomAction:Acción personalizada`,
        //   icon: "pi pi-cog",
        //   visible: this.can('edit'),
        //   command: () => { const s = sidebar(); if (s) s.isCustomActionDialogVisible = true; hide(); }
        // }] : [])
      ],
      [
        // Own section: the 4 download formats render as a single icon row
        // (see the itemTemplate), not as 4 entries.
        { id: 'downloadGroup' }
      ],
      [
        // Live Dashboard: auto-refresh interval. Handled from the custom
        // itemTemplate (keeps the menu open while the seconds input shows).
        {
          id: 'liveDashboard',
          label: this.liveDashboardLabel,
          icon: "pi pi-desktop",
          visible: this.can('edit')
        }
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