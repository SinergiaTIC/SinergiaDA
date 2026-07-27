import { SpinnerService } from '../../../../services/shared/spinner.service';
import { TreeNode } from 'primeng/api';
import { AfterViewInit, Component, ComponentRef, OnInit, OnDestroy, ViewChild, ViewContainerRef } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { AlertService, DataSourceService } from '@eda/services/service.index';
import Swal, { SweetAlertOptions } from 'sweetalert2';
import { DataSourceDetailComponent as BaseDataSourceDetailComponent } from '../data-source-detail/data-source-detail.component';
import { COMPONENT_PLUGINS } from '../../../../plugins/component-plugins/component-plugin-registry';
import { PrimengModule } from 'app/core/primeng.module';
import { DatasourceSaveAsDialog } from '../data-source-save-as/datasource-save-as.dialog';

import * as _ from 'lodash';

// SDA CUSTOM: If there is a registered plugin for 'app-data-source-detail' (e.g.
// component-plugins/data-source-detail-sda, with the restrictions specific to SinergiaDA
// via SDA_SYNC_MODEL_ID) that one is used; otherwise, it falls to the base component without breaking the build.
const DataSourceDetailComponent =
    COMPONENT_PLUGINS.find(p => p.selector === 'app-data-source-detail')?.component ?? BaseDataSourceDetailComponent;

@Component({
    standalone: true,
    selector: 'app-data-source-list',
    templateUrl: './data-source-list.component.html',
    imports: [ PrimengModule, DatasourceSaveAsDialog ],
    styleUrls: ['./data-source-list.component.css']
})
export class DataSourceListComponent implements OnInit, AfterViewInit, OnDestroy {
    // SDA CUSTOM: DataSourceDetailComponent is resolved dynamically (see the `const` above),
    // Therefore, it cannot be declared in the `imports` array of @Component (it must be statically imported).
    // (parsable). It is created manually with ViewContainerRef in ngAfterViewInit instead.
    @ViewChild('dataSourceDetailHost', { read: ViewContainerRef, static: true })
    dataSourceDetailHost: ViewContainerRef;
    private dataSourceDetailRef: ComponentRef<InstanceType<typeof DataSourceDetailComponent>>;

    public treeData: any[] = [];
    public selectedFile: TreeNode;
    public id: string;
    public navigationSubscription: any;
    public selectedNode : TreeNode;
    public isSaveAsDialogVisible = false;
    public searchTerm = '';

    get filteredTreeData(): any[] {
        if (!this.searchTerm.trim()) return this.treeData;
        return this.filterNodes(this.treeData, this.searchTerm.toLowerCase());
    }

    private filterNodes(nodes: any[], term: string): any[] {
        return nodes.reduce((acc: any[], node: any) => {
            const filteredChildren = node.children ? this.filterNodes(node.children, term) : [];
            if (node.label?.toLowerCase().includes(term) || filteredChildren.length) {
                acc.push({ ...node, children: filteredChildren, expanded: filteredChildren.length > 0 });
            }
            return acc;
        }, []);
    }


    //Strings
    public refreshSTR = $localize`:@@Refresh:Volver a cargar el modelo de datos almacenado`;
    public saveModelSTR = $localize`:@@saveModel:Guardar modelo de datos`;
    public saveAsModelSTR = $localize`:@@saveAsModel:Guardar como, para el modelo de datos`;
    public updateModelSTR = $localize`:@@updateModel:Actualizar modelo de datos desde la base de datos origen para buscar nuevas tablas y columnas`;
    public updateModelXLCSV = $localize`:@@updateModelXLCSV:Actualizar el fichero origen para buscar nuevas tablas y columnas`;
    public deleteModelSTR = $localize`:@@deleteModel:Borrar modelo de datos`;
    public unsaved : string;
    public connectionType: string;


    constructor(public dataModelService: DataSourceService,
                private alertService: AlertService,
                private route: ActivatedRoute,
                private spinnerService: SpinnerService,
                private router: Router) {

        this.navigationSubscription = this.router.events.subscribe(
            (e: any) => {
                if (e instanceof NavigationEnd) {
                    this.ngOnInit();
                }
            }, (err) => this.alertService.addError(err)
        );

    }

    ngOnInit(): void {
      this.getDataSourceId();
        this.dataModelService.currentTreeData.subscribe(
            (data) => {
                this.treeData = data;
                // We retrieve the connection type to display it in the title
                this.connectionType = this.dataModelService.getConnectionType();
            },
            (err) => this.alertService.addError(err)
        );
        this.dataModelService.unsaved.subscribe(
            (data) => {
                this.unsaved = data ? $localize`:@@notSavedChanges:Hay cambios sin guardar...` : ''
            },
            (err) => this.alertService.addError(err)
        )
        this.dataModelService.getModelById(this.id);
    }

    ngAfterViewInit(): void {
        this.dataSourceDetailRef = this.dataSourceDetailHost.createComponent(DataSourceDetailComponent);
        this.dataSourceDetailRef.instance.onTableCreated.subscribe(() => this.reLoadModelFromDb());
    }

    ngOnDestroy(): void {
        if (this.navigationSubscription) {
            this.navigationSubscription.unsubscribe();
            this.navigationSubscription.complete();
        }
        this.dataSourceDetailRef?.destroy();
    }

    getDataSourceId() {
        this.route.paramMap.subscribe(
            (params) => this.id = params.get('id'),
            (err) => this.alertService.addError(err)
        );
    }

    deleteDatasource() {

        const options =
        {
            title: $localize`:@@Sure:¿Estás seguro?`,
            text: $localize`:@@SureInfo:Estás a punto de borrar el modelo de datos y todos los dashboards asociados, el cambio es irreversible`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: $localize`:@@ConfirmDeleteModel:Si, ¡Eliminalo!`
        } as SweetAlertOptions
        Swal.fire(options).then(borrado => {
            if (borrado.value) {
                this.spinnerService.on();
                this.dataModelService.deleteModel(this.id).subscribe(
                    () => {
                        Swal.fire($localize`:@@Deleted:¡Eliminado!`, $localize`:@@DeleteSuccess:Modelo eliminado correctamente.`, 'success');
                        this.dataModelService.cleanAll();
                        this.router.navigate(['', 'home']);
                        this.spinnerService.off();
                    }, err => {
                        this.alertService.addError(err);
                        this.spinnerService.off();
                    }
                );
            }
        });
    }

    nodeSelect(event: { node: any; }) {
        this.selectedNode = event.node;
        this.removehiglight(this.treeData[0])
        event.node.type = 'selected'
        event.node.data === 'tabla' ? this.dataModelService.editTable(event.node) :
            event.node.data === 'columna' ? this.dataModelService.editColumn(event.node) : this.dataModelService.editModel(event.node);
    }

    removehiglight(node){
        if(node.children.length === 0)
        {
            node.type = 'unselected';
            return;
        }
        else
        {
            node.type = 'unselected';
            node.children.forEach(node =>{
                this.removehiglight(node)
            } )
        }
    }


    nodeUnselect(event: any) {
        console.log('Unselected:', event.node)
    }

    refreshModel() {
        this.dataModelService.cleanAll();
        this.ngOnInit();
    }

    reLoadModelFromDb(){
        this.spinnerService.on();
        this.dataModelService.realoadModelFromDb(this.id).subscribe(
            () => {
                this.refreshModel();
                this.alertService.addSuccess($localize`:@@UpdateModelSucess:Modelo actualizado correctamente`);
                this.spinnerService.off()},
            err => {
                this.alertService.addError(err);
                this.spinnerService.off()},
        );
    }

    openUpdateFilePage(): void {
        this.router.navigate(['/data-source', this.id, 'update-file']);
    }

    dataModelServiceSaveAs() {
        this.isSaveAsDialogVisible = true;
    }

    saveDatasourceAs(result: { name: string } | null) {
        this.isSaveAsDialogVisible = false;
        if (!result?.name) return;
        this.spinnerService.on();
        this.dataModelService.copyDataSource(this.id, result.name).subscribe({
            next: (res) => {
                this.spinnerService.off();
                this.alertService.addSuccess($localize`:@@ModelSaved:Modelo guardado correctamente`);
                this.router.navigate(['/data-source', res.data_source_id]);
            },
            error: (err) => {
                this.spinnerService.off();
                this.alertService.addError(err);
            }
        });
    }

}
