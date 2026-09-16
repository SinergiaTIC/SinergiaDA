import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { DataSourceService, GroupService } from "@eda/services/service.index";
import { EdaDialog, EdaDialog2Component } from "@eda/shared/components/shared-components.index";
import { CommonModule } from "@angular/common";
import { MultiSelectModule } from "primeng/multiselect";
import { FormsModule } from '@angular/forms';

// SDA CUSTOM: In SinergiaDA, table permissions are managed only by group;
// there are no permissions for individual users.
@Component({
    standalone: true,
    selector: 'app-table-permission-dialog',
    templateUrl: './table-permission-dialog.component.html',
    styleUrls: ['./table-permission-dialog.component.css'],
    imports: [EdaDialog2Component, CommonModule, MultiSelectModule, FormsModule]
})

export class TablePermissionDialogComponent implements OnInit {
    public display: boolean = false;
    @Input() table: any;
    @Output() close: EventEmitter<any> = new EventEmitter<any>();

    public title = $localize`:@@addPermission:Añadir permiso`;

    public dialog: EdaDialog;

    /*model */
    public dbModel: any;

    /* MultiSelect Vars */
    public roles: Array<object>;
    public selectedRoles: Array<any> = [];

    public anyoneCanSee: boolean = false;
    public permission: boolean = true;
    public none: boolean = false;

    public groupsLabel = $localize`:@@groupsPersmissions:Permisos de grupo`;
    public groupsDefaultLabel = $localize`:@@groups:Grupos`;

    constructor(
        public dataSourceService: DataSourceService,
        private groupService: GroupService
    ) {}

    ngOnInit() {
        this.load();
    }

    load() {
        this.loadDataSource();
        this.loadGroups();
    }

    loadDataSource() {
    }

    loadGroups() {
        this.groupService.getGroups().subscribe(
            res => this.roles = res.map(group => ({ label: group.name, value: group })),
            err => console.log(err)
        );
    }

    savePermission() {
        const permissionFilter = {
            groups: this.selectedRoles.map(usr => usr._id),
            groupsName: this.selectedRoles.map(usr => usr.name),
            none: this.none ? true : false,
            table: this.table.technical_name,
            column: "fullTable",
            global: true,
            permission: this.permission,
            type: 'groups'
        };

        this.onClose(permissionFilter);
    }

    closeDialog() {
        this.selectedRoles = [];
        this.onClose();
    }

    onClose(response?: any): void {
        this.display = false;
        this.close.emit(response);
    }

}
