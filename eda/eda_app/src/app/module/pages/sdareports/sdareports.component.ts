import { GroupService } from "./../../../services/api/group.service";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AlertService, DashboardService, SidebarService, StyleProviderService } from "@eda/services/service.index";
import { EdaDialogController, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { IGroup } from "@eda/services/api/group.service";
import Swal from "sweetalert2";
import * as _ from "lodash";

@Component({
  selector: "app-sdareports",
  templateUrl: "./sdareports.component.html",
  styleUrls: ["./sdareports.component.css"]
})
export class SdareportsComponent implements OnInit {
  // Propiedades para el manejo de dashboards
  public dashController: EdaDialogController;
  public dss: any[];
  public allDashboards: Array<any> = [];
  public visibleDashboards: Array<any> = [];

  // Propiedades para el modo de visualización
  public viewMode: 'table' | 'card' = 'table';

  // Propiedades para el ordenamiento y filtrado
  public sortColumn: string = "config.title";
  public sortDirection: "asc" | "desc" = "asc";
  public filteringByName: boolean = false;

  // Propiedades para la gestión de usuarios y grupos
  public groups: IGroup[] = [];
  public isAdmin: boolean;
  public IsDataSourceCreator: boolean;
  public isObserver: boolean = false;
  public grups: Array<any> = [];

  // Propiedades para el filtro de etiquetas
  public tags: Array<any> = [];
  public selectedTags: Array<any> = [];
  public filteredTags: Array<any> = [];
  public tagSearchTerm: string = '';

  // Nuevas propiedades para el filtro de grupos
  public groupOptions: Array<any> = [];
  public selectedGroups: Array<any> = [];
  public filteredGroups: Array<any> = [];
  public groupSearchTerm: string = '';

  // Propiedades para el filtro por tipo con iconos
  public dashboardTypes: Array<{type: string, label: string, active: boolean, icon: string, color: string}> = [
    {type: 'common', label: 'Común', active: true, icon: 'fa-globe', color: '#007bff'},
    {type: 'public', label: 'Público', active: true, icon: 'fa-share', color: '#dc3545'},
    {type: 'group', label: 'Grupo', active: true, icon: 'fa-users', color: '#28a745'},
    {type: 'private', label: 'Privado', active: true, icon: 'fa-lock', color: '#ffc107'},
    // {type: 'archived', label: 'Archivado', active: true, icon: 'fa-archive', color: '#6c757d'}
  ];

  // Etiquetas para los filtros
  public noTagLabel = $localize`:@@NoTag:Sin Etiqueta`;
  public AllTags = $localize`:@@AllTags:Todos`;
  public NoneTags = $localize`:@@NoneTags:Ninguno`;
  public noGroupLabel = $localize`:@@NoGroup:Sin Grupo`;

  constructor(
    private dashboardService: DashboardService,
    private sidebarService: SidebarService,
    private router: Router,
    private alertService: AlertService,
    private groupService: GroupService,
    private stylesProviderService: StyleProviderService
  ) {
    this.sidebarService.getDataSourceNames();
    this.sidebarService.getDataSourceNamesForDashboard();
    this.stylesProviderService.setStyles(this.stylesProviderService.generateDefaultStyles());
    this.viewMode = localStorage.getItem('preferredViewMode') as 'table' | 'card' || 'table';
  }

  public ngOnInit() {
    this.init();
    this.ifAnonymousGetOut();
  }

  private init() {
    this.initDatasources();
    this.initDashboards();
    this.initTags();
    this.initGroups();
  }

  private setIsObserver = async () => {
    this.groupService.getGroupsByUser().subscribe(
      res => {
        const user = sessionStorage.getItem("user");
        const userID = JSON.parse(user)._id;
        this.grups = res;
        this.isObserver =
          this.grups.filter(group => group.name === "EDA_RO" && group.users.includes(userID)).length !== 0;
      },
      err => this.alertService.addError(err)
    );
  };

  private ifAnonymousGetOut(): void {
    const user = sessionStorage.getItem("user");
    const userName = JSON.parse(user).name;

    if (userName === "edaanonim" || userName === "EDA_RO") {
      this.router.navigate(["/login"]);
    }
  }

  private initDatasources(): void {
    this.sidebarService.currentDatasourcesDB.subscribe(
      data => (this.dss = data),
      err => this.alertService.addError(err)
    );
  }

  private initDashboards(): void {
    this.dashboardService.getDashboards().subscribe(
      res => {
        this.allDashboards = [
          ...res.publics.map(d => ({ ...d, type: "common" })),
          ...res.shared.map(d => ({ ...d, type: "public" })),
          ...res.group.map(d => ({ ...d, type: "group" })),
          ...res.dashboards.map(d => ({ ...d, type: "private" }))
        ].sort((a, b) => (a.config.title > b.config.title ? 1 : b.config.title > a.config.title ? -1 : 0));

        this.groups = _.map(_.uniqBy(res.group, "group._id"), "group");
        console.log('Grupos obtenidos del servicio:', this.groups); // Nuevo log

        this.isAdmin = res.isAdmin;
        this.IsDataSourceCreator = res.isDataSourceCreator;

        this.initTags();
        this.initGroups();
        this.filterDashboards();

        this.setIsObserver();
      },
      err => this.alertService.addError(err)
    );
  }

  private initTags(): void {
    const uniqueTags = Array.from(new Set(this.allDashboards.map(db => db.config.tag))).sort();
    this.tags = [
      { value: null, label: this.noTagLabel },
      ...uniqueTags.map(tag => ({ value: tag, label: tag }))
    ];
    this.filteredTags = [...this.tags];
  }

  private initGroups(): void {
    const uniqueGroups = Array.from(new Set(
      this.allDashboards
        .filter(db => db.group && db.group.name) // Aseguramos que group y name existan
        .map(db => db.group.name)
    )).sort();

    console.log('Grupos únicos encontrados:', uniqueGroups); // Nuevo log

    this.groupOptions = [
      { value: null, label: this.noGroupLabel },
      ...uniqueGroups.map(group => ({ value: group, label: group }))
    ];

    console.log('Opciones de grupo:', this.groupOptions); // Nuevo log

    this.filteredGroups = [...this.groupOptions];
  }

  public initDialog(): void {
    this.dashController = new EdaDialogController({
      params: { dataSources: this.dss },
      close: (event, response) => {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
          this.initDashboards();
          this.goToDashboard(response);
        }
        this.dashController = undefined;
      }
    });
  }

  public deleteDashboard(dashboard): void {
    let text = $localize`:@@deleteDashboardWarning: Estás a punto de borrar el informe: `;
    Swal.fire({
      title: $localize`:@@Sure:¿Estás seguro?`,
      text: `${text} ${dashboard.config.title}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: $localize`:@@ConfirmDeleteModel:Si, ¡Eliminalo!`,
      cancelButtonText: $localize`:@@DeleteGroupCancel:Cancelar`
    }).then(borrado => {
      if (borrado.value) {
        this.dashboardService.deleteDashboard(dashboard._id).subscribe(
          () => {
            Swal.fire(
              $localize`:@@Deleted:¡Eliminado!`,
              $localize`:@@DashboardDeletedInfo:Informe eliminado correctamente.`,
              "success"
            );
            this.initDashboards();
          },
          err => this.alertService.addError(err)
        );
      }
    });
  }

  public goToDashboard(dashboard): void {
    if (dashboard) {
      this.router.navigate(["/dashboard", dashboard._id]);
    } else {
      this.alertService.addError($localize`:@@ErrorMessage:Ha ocurrido un error`);
    }
  }

  public getGroupsNamesByDashboard(group: any[]): string {
    return group.map((elem: any) => elem.name).join(" , ");
  }

  public filterTags() {
    this.filteredTags = this.tags.filter(tag =>
      tag.label.toLowerCase().includes(this.tagSearchTerm.toLowerCase())
    );
  }

  public filterGroups() {
    this.filteredGroups = this.groupOptions.filter(group =>
      group.label.toLowerCase().includes(this.groupSearchTerm.toLowerCase())
    );
  }

  public toggleTagSelection(tag: any) {
    const index = this.selectedTags.findIndex(t => t.value === tag.value);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tag);
    }
    this.filterDashboards();
  }

  public toggleGroupSelection(group: any) {
    const index = this.selectedGroups.findIndex(g => g.value === group.value);
    if (index > -1) {
      this.selectedGroups.splice(index, 1);
    } else {
      this.selectedGroups.push(group);
    }
    this.filterDashboards();
  }

  public toggleTypeSelection(type: string) {
    this.dashboardTypes.forEach(typeObj => {
      if (typeObj.type === type) {
        typeObj.active = !typeObj.active;
      } else {
        typeObj.active = false;
      }
    });
    this.filterDashboards();
  }

  public filterDashboards() {
    // Si ningún tipo está activo, mostramos todos los dashboards
    const anyTypeActive = this.dashboardTypes.some(t => t.active);

    if (!anyTypeActive) {
      this.visibleDashboards = [...this.allDashboards];
    } else {
      // Filtramos por el tipo activo
      this.visibleDashboards = this.allDashboards.filter(db =>
        this.dashboardTypes.find(t => t.type === db.type && t.active)
      );
    }

    // Aplicamos el filtro de etiquetas
    if (this.selectedTags.length > 0) {
      this.visibleDashboards = this.visibleDashboards.filter(db =>
        this.selectedTags.some(tag => tag.value === db.config.tag || (tag.value === null && !db.config.tag))
      );
    }

    // Aplicamos el filtro de grupos
  if (this.selectedGroups.length > 0) {
    this.visibleDashboards = this.visibleDashboards.filter(db =>
      this.selectedGroups.some(group =>
        (group.value === null && (!db.group || !db.group.name)) ||
        (db.group && db.group.name === group.value)
      )
    );
  }

    this.sortTable(this.sortColumn);
  }

  public filterTitle(text: any) {
    const stringToFind = text.target.value.toString().toUpperCase();
    if (stringToFind.length > 1) {
      this.visibleDashboards = this.allDashboards.filter(
        db => db.config.title.toUpperCase().indexOf(stringToFind) >= 0
      );
      this.filteringByName = true;
    } else {
      this.visibleDashboards = [...this.allDashboards];
      if (stringToFind.length == 0) {
        this.filteringByName = false;
      }
    }
    this.sortTable(this.sortColumn);
  }

  public canIEdit(dashboard): boolean {
    let result: boolean = false;
    result = this.isAdmin;
    if (result == false) {
      if (dashboard.config.onlyIcanEdit === true) {
        if (sessionStorage.getItem("user") == dashboard.user) {
          result = true;
        }
      } else {
        result = true;
      }
    }
    return result;
  }

  public getAuthorName(user: string | { name: string }): string {
    if (typeof user === "string") {
      return `Usuario ${user}`;
    } else if (user && typeof user === "object" && "name" in user) {
      return user.name;
    } else {
      return "Autor desconocido";
    }
  }

  public sortTable(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.visibleDashboards.sort((a, b) => {
      let valueA = this.getNestedProperty(a, column);
      let valueB = this.getNestedProperty(b, column);

      if (typeof valueA === 'string') valueA = valueA.toLowerCase();
      if (typeof valueB === 'string') valueB = valueB.toLowerCase();

      if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : null, obj);
  }

  public setViewMode(mode: 'table' | 'card'): void {
    this.viewMode = mode;
    localStorage.setItem('preferredViewMode', mode);
  }

  public getDashboardTypeClass(type: string): string {
    const dashboardType = this.dashboardTypes.find(t => t.type === type);
    return dashboardType ? `card-border-${dashboardType.type}` : '';
  }

  public getDashboardTypeColor(type: string): string {
    const dashboardType = this.dashboardTypes.find(t => t.type === type);
    return dashboardType ? dashboardType.color : '';
  }
}
