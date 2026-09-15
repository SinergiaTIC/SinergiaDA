import { Component, Input, OnInit, ViewChild, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { lastValueFrom } from "rxjs";
import { Menu, MenuModule } from "primeng/menu";
import { MenuItem } from "primeng/api";
import { TooltipModule } from "primeng/tooltip";
import { EdaPanel, EdaPanelType, EdaTitlePanel, EdaTabsPanel } from "@eda/models/model.index";
import { DashboardService, FileUtiles, StyleProviderService } from "@eda/services/service.index";
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
  styleUrls: ["./dashboard-menu.component.css"]
})
export class DashboardMenuSdaComponent implements OnInit {
  @Input() dashboard: any = null;

  @ViewChild("addMenu") addMenu?: Menu;
  @ViewChild("moreMenu") moreMenu?: Menu;

  private fileUtils = inject(FileUtiles);
  private stylesProviderService = inject(StyleProviderService);
  private dashboardService = inject(DashboardService);
  private sidebarService = inject(DashboardSidebarService);

  public isEditable: boolean = false;
  public isReadOnly: boolean = true;
  public addMenuItems: MenuItem[] = [];
  public moreMenuItems: MenuItem[] = [];

  public addLabel = $localize`:@@dashboardSidebarReportAdd:Añadir`;
  public reloadLabel = $localize`:@@dashboardSidebarRefreshDashboard:Recargar`;
  public reloadTooltip = $localize`:@@dashboardSidebarRefreshDashboardTooltip:Recargar informe`;
  public saveLabel = $localize`:@@dashboardSidebarSave:Guardar`;
  public saveTooltip = $localize`:@@dashboardSidebarSaveTooltip:Guardar informe`;
  public moreLabel = $localize`:@@dashboardSidebarMoreOptions:Más`;

  private readonly ANONIM_ID = "135792467811111111111112";
  private readonly ADMIN_ID = "135792467811111111111110";
  private readonly OBSERVER_ID = "135792467811111111111113";

  ngOnInit(): void {
    this.isEditable = this.canIedit();
    this.isReadOnly = this.isReadOnlyCheck();
    this.buildAddMenu();
    this.buildMoreMenu();
  }

  /**
   * Acciones primarias visibles: Recargar y Guardar.
   */
  public reload(): void {
    this.cleanPanelsCache();
  }

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
   * Dropdown "Más": resto de acciones disponibles en el menú actual. La lógica
   * de cada acción vive en DashboardSidebarComponent (que sigue montado); aquí
   * sólo se delega a su instancia vía métodos/flags públicos, sin refactorizarlo.
   */
  private buildMoreMenu(): void {
    const sidebar = () => this.dashboard?.sidebar;

    this.moreMenuItems = [
      {
        label: $localize`:@@dashboardSidebarEditFilter:Editar filtros`,
        icon: "pi pi-filter",
        command: () => sidebar()?.toggleGlobalFilter()
      },
      {
        label: $localize`:@@dashboardSidebarDependentFilters:Filtros dependientes`,
        icon: "pi pi-sliders-h",
        command: () => sidebar()?.dependentFilters()
      },
      {
        label: $localize`:@@dashboardSidebarSaveAs:Guardar como`,
        icon: "pi pi-copy",
        visible: this.can('edit'),
        command: () => { const s = sidebar(); if (s) s.isSaveAsDialogVisible = true; }
      },
      {
        label: $localize`:@@dashboardSidebarDownload:Descargar`,
        icon: "pi pi-download",
        items: [
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
          }
        ]
      },
      {
        label: $localize`:@@opcionMail:Enviar por email`,
        icon: "pi pi-envelope",
        visible: this.can('edit'),
        command: () => { const s = sidebar(); if (s) s.isMailConfigDialogVisible = true; }
      },
      ...(SHOW_CUSTOM_ACTION ? [{
        label: $localize`:@@dashboardSidebarCustomAction:Acción personalizada`,
        icon: "pi pi-cog",
        visible: this.can('edit'),
        command: () => { const s = sidebar(); if (s) s.isCustomActionDialogVisible = true; }
      }] : []),
      { separator: true },
      {
        label: $localize`:@@dashboardSidebarEditStyles:Editar estilos`,
        icon: "pi pi-palette",
        visible: this.can('edit'),
        command: () => { const s = sidebar(); if (s) s.isEditStyleDialogVisible = true; }
      },
      {
        label: $localize`:@@dashboardSidebarDashboardPrivacity:Privacidad del informe`,
        icon: "pi pi-lock",
        visible: this.can('edit'),
        command: () => { const s = sidebar(); if (s) s.isVisibleModalVisible = true; }
      },
      {
        label: $localize`:@@addTag:Añadir etiqueta`,
        icon: "pi pi-tag",
        visible: this.can('edit'),
        command: () => { const s = sidebar(); if (s) s.isTagModalVisible = true; }
      },
      {
        label: this.dashboard?.sidebar?.clickFiltersEnabled
          ? $localize`:@@enableFilters:Click en filtros habilitado`
          : $localize`:@@disableFilters:Click en filtros deshabilitado`,
        icon: "pi pi-bolt",
        command: () => sidebar()?.toggleClickFilters()
      },
      {
        label: this.dashboard?.sidebar?.clickPanelLockButton
          ? $localize`:@@enablePanelLockButton:Bloquear los paneles`
          : $localize`:@@disablePanelLockButton:Desbloquear los paneles`,
        icon: "pi pi-lock",
        visible: this.can('edit'),
        command: () => sidebar()?.panelLockButton()
      },
      {
        label: this.dashboard?.sidebar?.onlyIcanEdit
          ? $localize`:@@onlyIcanEditTagEnable:Edición privada habilitada`
          : $localize`:@@onlyIcanEditTagDisable:Edición privada deshabilitada`,
        icon: "pi pi-check",
        visible: this.can('edit'),
        command: () => sidebar()?.toggleEdit()
      },
      { separator: true },
      {
        label: $localize`:@@dashboardSidebarDeleteDashboard:Eliminar informe`,
        icon: "pi pi-trash",
        visible: this.can('edit'),
        command: () => sidebar()?.removeDashboard()
      }
    ];
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

  public async cleanPanelsCache(): Promise<void> {
    const queries: any[] = [];
    for (const panel of this.dashboard?.panels || []) {
      if (panel.content && panel.content.query && panel.content.query.query) {
        queries.push(panel.content.query.query);
      }
    }
    const body = {
      model_id: this.dashboard.dataSource?._id,
      queries
    };
    await lastValueFrom(this.dashboardService.cleanCache(body));
    this.dashboard?.loadDashboard?.();
  }

  public closeMenus(): void {
    this.addMenu?.hide();
    this.moreMenu?.hide();
  }
}