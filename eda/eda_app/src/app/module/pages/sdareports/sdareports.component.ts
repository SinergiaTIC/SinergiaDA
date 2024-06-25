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
  public selectedTag: any;
  public filteringByName: boolean = false;

  // Propiedades para la gestión de usuarios y grupos
  public groups: IGroup[] = [];
  public isAdmin: boolean;
  public IsDataSourceCreator: boolean;
  public isObserver: boolean = false;
  public tags: Array<any> = [];
  public grups: Array<any> = [];

  // Etiquetas para los filtros
  public noTagLabel = $localize`:@@NoTag:Sin Etiqueta`;
  public AllTags = $localize`:@@AllTags:Todos`;
  public NoneTags = $localize`:@@NoneTags:Ninguno`;

  constructor(
    private dashboardService: DashboardService,
    private sidebarService: SidebarService,
    private router: Router,
    private alertService: AlertService,
    private groupService: GroupService,
    private stylesProviderService: StyleProviderService
  ) {
    // Inicialización de servicios
    this.sidebarService.getDataSourceNames();
    this.sidebarService.getDataSourceNamesForDashboard();
    this.stylesProviderService.setStyles(this.stylesProviderService.generateDefaultStyles());
    this.viewMode = localStorage.getItem('preferredViewMode') as 'table' | 'card' || 'table';

  }

  public ngOnInit() {
    // Inicialización del componente
    this.init();
    this.ifAnonymousGetOut();
  }

  private init() {
    // Inicialización de datos
    this.initDatasources();
    this.initDashboards();
  }

  // Verifica si el usuario es un observador
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

  // Redirige a la página de login si el usuario es anónimo
  private ifAnonymousGetOut(): void {
    const user = sessionStorage.getItem("user");
    const userName = JSON.parse(user).name;

    if (userName === "edaanonim" || userName === "EDA_RO") {
      this.router.navigate(["/login"]);
    }
  }

  // Inicializa las fuentes de datos
  private initDatasources(): void {
    this.sidebarService.currentDatasourcesDB.subscribe(
      data => (this.dss = data),
      err => this.alertService.addError(err)
    );
  }

  // Inicializa los dashboards
  private initDashboards(): void {
    this.dashboardService.getDashboards().subscribe(
      res => {
        // Procesa y organiza los dashboards recibidos
        this.allDashboards = [
          ...res.publics.map(d => ({ ...d, type: "common" })),
          ...res.shared.map(d => ({ ...d, type: "public" })),
          ...res.group.map(d => ({ ...d, type: "group" })),
          ...res.dashboards.map(d => ({ ...d, type: "private" }))
        ].sort((a, b) => (a.config.title > b.config.title ? 1 : b.config.title > a.config.title ? -1 : 0));

        this.groups = _.map(_.uniqBy(res.group, "group._id"), "group");
        this.isAdmin = res.isAdmin;
        this.IsDataSourceCreator = res.isDataSourceCreator;

        // Procesa las etiquetas para el filtrado
        this.tags = Array.from(new Set(this.allDashboards.map(db => db.config.tag))).sort();
        this.tags = this.tags.map(tag => {
          return { value: tag, label: tag };
        });
        this.tags.unshift({ label: this.noTagLabel, value: 0 });
        this.tags.push({ label: this.AllTags, value: 1 });
        this.tags = this.tags.filter(tag => tag.value !== null);
        sessionStorage.setItem("tags", JSON.stringify(this.tags));
        this.filterDashboards({ label: this.AllTags, value: 1 });

        this.setIsObserver();
      },
      err => this.alertService.addError(err)
    );
  }

  // Inicializa el diálogo para crear un nuevo dashboard
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

  // Elimina un dashboard
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

  // Navega a un dashboard específico
  public goToDashboard(dashboard): void {
    if (dashboard) {
      this.router.navigate(["/dashboard", dashboard._id]);
    } else {
      this.alertService.addError($localize`:@@ErrorMessage:Ha ocurrido un error`);
    }
  }

  // Obtiene los nombres de los grupos de un dashboard
  public getGroupsNamesByDashboard(group: any[]): string {
    return group.map((elem: any) => elem.name).join(" , ");
  }

  // Filtra los dashboards por etiqueta
  public filterDashboards(tag: any) {
    this.selectedTag = tag.value;
    if (tag.value === 0) tag.value = null;
    if (tag.value === 1) {
      this.visibleDashboards = [...this.allDashboards];
    } else {
      this.visibleDashboards = this.allDashboards.filter(db => db.config.tag === tag.value);
    }
    this.sortTable(this.sortColumn);
  }

  // Filtra los dashboards por título
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

  // Verifica si el usuario puede editar un dashboard
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

  // Obtiene el nombre del autor del dashboard
  public getAuthorName(user: string | { name: string }): string {
    if (typeof user === "string") {
      return `Usuario ${user}`;
    } else if (user && typeof user === "object" && "name" in user) {
      return user.name;
    } else {
      return "Autor desconocido";
    }
  }

  // Ordena la tabla de dashboards
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

  // Obtiene una propiedad anidada de un objeto
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => (o && o[key] !== undefined) ? o[key] : null, obj);
  }

  // Cambia el modo de visualización
  public toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'card' : 'table';
  }

  public setViewMode(mode: 'table' | 'card'): void {
    this.viewMode = mode;
    localStorage.setItem('preferredViewMode', mode);
  }

  public getDashboardTypeClass(type: string): string {
    switch (type) {
      case 'public':
        return 'card-border-danger';
      case 'common':
        return 'card-border-primary';
      case 'group':
      case 'private':
        return 'card-border-default';
      default:
        return '';
    }
  }

}
