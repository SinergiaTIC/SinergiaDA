import { Component, Input, OnDestroy, OnInit, ViewChild, ViewEncapsulation, inject } from "@angular/core";
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
 * dashboard-menu-sda: sustituye al menú de los tres puntos (⠿) en la cabecera
 * del informe por un toolbar horizontal. Único plugin activo de tipo
 * 'report-toolbar'. Recibe la instancia DashboardPage como input y sólo
 * depende de ella de forma estructural (sin refactorizar DashboardSidebarComponent).
 */
@Component({
  selector: "dashboard-menu-sda",
  standalone: true,
  imports: [CommonModule, MenuModule, TooltipModule],
  templateUrl: "./dashboard-menu.component.html",
  styleUrls: ["./dashboard-menu.component.css"],
  // Sin encapsulación a propósito: la regla de toasts globales del CSS
  // debe aplicar fuera de este componente.
  encapsulation: ViewEncapsulation.None
})
export class DashboardMenuSdaComponent implements OnInit, OnDestroy {
  @Input() dashboard: any = null;

  @ViewChild("addMenu") addMenu?: Menu;
  @ViewChild("moreMenu") moreMenu?: Menu;

  private fileUtils = inject(FileUtiles);
  private stylesProviderService = inject(StyleProviderService);
  private dashboardService = inject(DashboardService);
  private sidebarService = inject(DashboardSidebarService);
  private notSavedSub?: Subscription;

  public isEditable: boolean = false;
  public isReadOnly: boolean = true;
  public addMenuItems: MenuItem[] = [];
  public moreMenuItems: MenuItem[] = [];

  public addLabel = $localize`:@@dashboardSidebarReportAdd:Añadir`;
  public saveLabel = $localize`:@@dashboardSidebarSave:Guardar`;
  public saveTooltip = $localize`:@@dashboardSidebarSaveTooltip:Guardar informe`;
  public moreLabel = $localize`:@@dashboardSidebarMoreOptions:Más`;
  /** true cuando el informe tiene cambios pendientes de guardar. */
  public hasUnsavedChanges: boolean = false;

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
  }

  /**
   * Acción primaria visible: Guardar.
   */
  public async save(): Promise<void> {
    if (!this.dashboard) return;
    try {
      await this.dashboard.saveDashboard();
    } catch { /* el propio dashboard informa del error */ }
  }

  /**
   * Dropdown "Añadir": nuevo panel, filtro, texto, navegador e importar panel.
   */
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
   * Dropdown "Más": mismas acciones que el menú original, agrupadas por sección
   * con el patrón estándar de p-menu (grupo = cabecera no clicable + items).
   * Agrupar TODO es obligatorio: p-menu entra en modo agrupado en cuanto un
   * item tiene `items`, y en ese modo un item suelto se pinta como cabecera
   * muerta (no clicable). La lógica de cada acción sigue viviendo en
   * DashboardSidebarComponent; aquí sólo se delega, sin refactorizarlo.
   */
  private buildMoreMenu(): void {
    const sidebar = () => this.dashboard?.sidebar;
    const sb = this.dashboard?.sidebar;
    const hide = () => this.moreMenu?.hide();

    const groups: MenuItem[] = [
      {
        label: $localize`:@@dashboardMenuSectionFilters:Filtros`,
        items: [
          // Igual que el original: un item por filtro que abre su diálogo
          // de edición (DashboardSidebarComponent.handleSpecificFilter).
          ...this.editFilterItems(),
          {
            label: $localize`:@@dashboardSidebarDependentFilters:Filtros dependientes`,
            icon: "pi pi-sliders-h",
            command: () => sidebar()?.dependentFilters()
          }
        ]
      },
      {
        label: $localize`:@@dashboardMenuSectionReport:Informe`,
        items: [
          {
            label: $localize`:@@dashboardSidebarSaveAs:Guardar como`,
            icon: "pi pi-copy",
            visible: this.can('edit'),
            command: () => { const s = sidebar(); if (s) s.isSaveAsDialogVisible = true; hide(); }
          },
          {
            label: $localize`:@@dashboardSidebarDownloadPDF:Descargar PDF`,
            icon: "pi pi-file-pdf",
            command: () => sidebar()?.exportAsPDF()
          },
          {
            label: $localize`:@@dashboardSidebarDownloadImage:Descargar Imagen`,
            icon: "pi pi-image",
            command: () => sidebar()?.exportAsJPEG()
          },
          {
            label: $localize`:@@dashboardSidebarDownloadExcel:Descargar Excel`,
            icon: "pi pi-file-excel",
            command: () => sidebar()?.exportDashboardAsExcel()
          },
          {
            label: $localize`:@@dashboardSidebarDownloadWord:Descargar Word`,
            icon: "pi pi-file-word",
            command: () => sidebar()?.exportDashboardAsWord()
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
        ]
      },
      {
        label: $localize`:@@dashboardMenuSectionCustomize:Personalizar`,
        items: [
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
        ]
      },
      {
        label: $localize`:@@dashboardMenuSectionBehaviour:Interacción`,
        items: [
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
        ]
      },
      { separator: true },
      {
        label: $localize`:@@dashboardMenuSectionDelete:Eliminar`,
        items: [
          {
            label: $localize`:@@dashboardSidebarDeleteDashboard:Eliminar informe`,
            icon: "pi pi-trash",
            visible: this.can('edit'),
            command: () => sidebar()?.removeDashboard()
          }
        ]
      }
    ];

    this.moreMenuItems = this.withoutEmptyGroups(groups);
  }

  /** Elimina grupos sin items visibles y separadores huérfanos (inicio/fin/dobles). */
  private withoutEmptyGroups(groups: MenuItem[]): MenuItem[] {
    const kept = groups.filter(g => {
      if (g.separator || !g.items) return true;
      return (g.items as MenuItem[]).some(i => i.visible !== false);
    });
    const out: MenuItem[] = [];
    for (const g of kept) {
      if (g.separator && (out.length === 0 || out[out.length - 1].separator)) continue;
      out.push(g);
    }
    while (out.length > 0 && out[out.length - 1].separator) out.pop();
    return out;
  }

  /** Items de la sección "Filtros": uno por filtro, abre su diálogo de edición. */
  private editFilterItems(): MenuItem[] {
    const sidebar = () => this.dashboard?.sidebar;
    const filters = this.dashboard?.globalFilter?.globalFilters || [];
    return filters.map((f: any) => ({
      label: f?.selectedColumn?.display_name?.default || f?.column?.value?.description?.default,
      icon: "pi pi-check",
      command: () => sidebar()?.handleSpecificFilter(f)
    }));
  }

  /** Reconstruye el menú "Más" (para refrescar labels de toggles) y lo abre. */
  public openMoreMenu(event: Event): void {
    this.buildMoreMenu();
    this.moreMenu?.toggle(event);
  }
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

  // ---- Acciones de creación (misma lógica que DashboardSidebarComponent) ----

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
      title: "Titulo Panel",
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
      title: "Tabs",
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