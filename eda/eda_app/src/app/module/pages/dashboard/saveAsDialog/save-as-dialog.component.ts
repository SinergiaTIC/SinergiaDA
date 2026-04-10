import { Component } from "@angular/core";
import { UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { AlertService, DashboardService, GroupService, IGroup } from "@eda/services/service.index";
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { SelectItem } from "primeng/api";
// SDA CUSTOM - import Swal for duplicate title confirmation
/* SDA CUSTOM */ import Swal from 'sweetalert2';
// END SDA CUSTOM

@Component({
  selector: 'save-as-dialog',
  templateUrl: './save-as-dialog.component.html',

})

export class SaveAsDialogComponent extends EdaDialogAbstract {

  public dialog: EdaDialog;
  public form: UntypedFormGroup;
  public grups: IGroup[] = [];
  public visibleTypes: SelectItem[] = [];
  public display = {
    groups: false
  };

  constructor(
    private formBuilder: UntypedFormBuilder, 
    private groupService: GroupService,
    /* SDA CUSTOM */ private dashboardService: DashboardService,
    private alertService: AlertService) {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@SaveAs:GUARDAR COMO...`,
    });
    this.dialog.style = { width: '70%', height:'40%' };
    this.initializeForm();
    this.loadGroups();
  }

  onShow(): void {
    
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  private initializeForm(): void {
    this.form = this.formBuilder.group({
      name: [null, Validators.required],
      visible: [null, Validators.required],
      group: [null]
    });

    this.visibleTypes = [
      { label: $localize`:@@commonPanel:Común`, value: 'public', icon: 'fa fa-fw fa-globe' },
      { label: $localize`:@@groupPanel:Grupo`, value: 'group', icon: 'fa fa-fw fa-users' },
      { label: $localize`:@@privatePanel:Privado`, value: 'private', icon: 'fa fa-fw fa-lock' },
    ];

    this.form.controls['visible'].setValue(this.visibleTypes[2].value);

  }

  private loadGroups(): void {

    this.groupService.getGroupsByUser().subscribe(
        res => {
            this.grups = res;

            if (this.grups.length === 0) {
                this.visibleTypes.splice(1, 1);
            }
        }, err => {
            this.alertService.addError(err)
        }
    );
}

  public createNewDashboard(): void {
    const title = this.form.value.name.trim();
    // SDA CUSTOM - check for duplicate title before creating save-as dashboard
    /* SDA CUSTOM */ this.dashboardService.checkTitle(title).subscribe({
    /* SDA CUSTOM */   next: (res) => {
    /* SDA_CUSTOM */     if (res.exists) {
    /* SDA_CUSTOM */       Swal.fire({
    /* SDA_CUSTOM */         title: $localize`:@@duplicateTitleWarning:Título duplicado`,
    /* SDA_CUSTOM */         text: $localize`:@@duplicateTitleMessage:Ya existe un informe con este nombre. ¿Desea continuar?`,
    /* SDA_CUSTOM */         icon: 'warning',
    /* SDA_CUSTOM */         showCancelButton: true,
    /* SDA_CUSTOM */         confirmButtonText: $localize`:@@duplicateTitleConfirm:Continuar`,
    /* SDA_CUSTOM */         cancelButtonText: $localize`:@@cancelarBtn:Cancelar`
    /* SDA_CUSTOM */       }).then((proceed) => {
    /* SDA_CUSTOM */         if (proceed.isConfirmed) {
    /* SDA_CUSTOM */           this.doCreateResponse();
    /* SDA_CUSTOM */         }
    /* SDA_CUSTOM */       });
    /* SDA_CUSTOM */     } else {
    /* SDA_CUSTOM */       this.doCreateResponse();
    /* SDA_CUSTOM */     }
    /* SDA_CUSTOM */   },
    /* SDA_CUSTOM */   error: () => {
    /* SDA_CUSTOM */     this.doCreateResponse();
    /* SDA_CUSTOM */   }
    /* SDA_CUSTOM */ });
    // END SDA CUSTOM
  }

  // SDA CUSTOM - extracted response creation
  /* SDA_CUSTOM */ private doCreateResponse(): void {
  /* SDA_CUSTOM */   const response = {
  /* SDA_CUSTOM */     name: this.form.value.name.trim(),
  /* SDA_CUSTOM */     visible: this.form.value.visible,
  /* SDA_CUSTOM */     group: this.form.value.group
  /* SDA_CUSTOM */   };
  /* SDA_CUSTOM */   this.onClose(EdaDialogCloseEvent.NEW, response);
  /* SDA_CUSTOM */ }
  // END SDA CUSTOM

  public handleSelectedBtn(event): void {
    const groupControl = this.form.get('group');
    this.display.groups = event.value === 'group';

    if (this.display.groups) {
      groupControl.setValidators(Validators.required);
    }

    if (!this.display.groups) {

      groupControl.setValidators(null);
      groupControl.setValue(null);
    }

  }

  public closeDialog(): void {
    this.form.reset();
    this.onClose(EdaDialogCloseEvent.NONE);
  }
}