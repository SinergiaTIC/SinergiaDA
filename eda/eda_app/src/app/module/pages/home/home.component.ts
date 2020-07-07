import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService, DashboardService, SidebarService } from '@eda/services/service.index';
import { EdaDialogController, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { IGroup } from '@eda/services/api/group.service';
import Swal from 'sweetalert2';
import * as _ from 'lodash';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['../../../../assets/eda-styles/components/home.component.css']
})
export class HomeComponent implements OnInit {
    public dashController: EdaDialogController;
    public dss: any[];
    public dashboards = {
        publics: [],
        privats: [],
        grups: [],
        shared:[]
    };
    public groups: IGroup[] = [];
    public isAdmin: boolean;
    public toLitle: boolean = false;

    constructor(
        private dashboardService: DashboardService,
        private sidebarService: SidebarService,
        private router: Router,
        private alertService: AlertService
    ) {
        this.sidebarService.getDataSourceNames();

        if (window.innerWidth < 1000) {
            this.toLitle = true;
        }

    }

    public ngOnInit() {
        this.init();
        this.ifAnonymousGetOut();
    }

    private init() {
        this.initDatasources();
        this.initDashboards();
    }

    private ifAnonymousGetOut(): void {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user).name;

         if ( userName === 'edaanonim') {
            this.router.navigate(['/login']);
        }
    }

    private initDatasources(): void {
        this.sidebarService.currentDatasources.subscribe(
            data =>  this.dss = data,
            err => this.alertService.addError(err)
        );
    }

    private initDashboards(): void {
        this.dashboardService.getDashboards().subscribe(
            res => {
                this.dashboards.privats = res.dashboards;
                this.dashboards.publics = res.publics;
                this.dashboards.grups = res.group;
                this.dashboards.shared = res.shared;
                this.groups = _.map(_.uniqBy(res.group, 'group._id'), 'group');

                this.isAdmin = res.isAdmin;
            },
            err => this.alertService.addError(err)
        );
    }

    public initDialog(): void {
        this.dashController = new EdaDialogController({
            params: {dataSources: this.dss},
            close: (event, response) => {
                if ( !_.isEqual(event, EdaDialogCloseEvent.NONE) ) {
                    this.initDashboards();
                    this.goToDashboard(response);
                }
                this.dashController = undefined;
            }
        });
    }

    public deleteDashboard(dashboard): void {
        Swal.fire({
            title: '¿Estas seguro?',
            text: `Estás a punto de borrar el informe ${dashboard.config.title}`,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Si, Eliminalo!',
            cancelButtonText: 'Cancelar'
        }).then(borrado => {
            if ( borrado.value ) {
                this.dashboardService.deleteDashboard(dashboard._id).subscribe(
                    () => {
                        Swal.fire('Eliminado!', 'Informe eliminado correctamente.', 'success');
                        this.initDashboards();
                    }, err => this.alertService.addError(err)
                );
            }
        });

    }

    public goToDashboard(dashboard): void {
        if (dashboard) {
            this.router.navigate(['/dashboard', dashboard._id]);
        } else {
            this.alertService.addError('Ha ocurrido un error');
        }
    }

    public getGroupsNamesByDashboard(group: any[]): string {
        return group.map((elem: any) => elem.name).join(' , ');
    }

}
