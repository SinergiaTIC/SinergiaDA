import { Component } from '@angular/core';
import { EdaDialogAbstract, EdaDialog, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { AlertService} from '@eda/services/service.index';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { SelectItem } from 'primeng/api';


@Component({
  selector: 'app-calculated-column-dialog',
  templateUrl: './calculated-column-dialog.component.html',
  styleUrls: ['../../../../../../assets/sass/eda-styles/components/dialog-component.css']
})

export class CalculatedColumnDialogComponent extends EdaDialogAbstract {

  public dialog: EdaDialog;
  public form: UntypedFormGroup;

  // Types
  public columnTypes: SelectItem[] = [
      { label: 'text', value: 'text' },
      { label: 'numeric', value: 'numeric' },
      { label: 'date', value: 'date' },
      { label: 'coordinate', value: 'coordinate' }
  ];

  // Default value
  public selectedcolumnType = 'numeric';
  public decimalNumberValue;
  public sqlExpressionString = '';

  constructor(
    private formBuilder: UntypedFormBuilder,
    private alertService: AlertService
  ) {
    super();

    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: $localize`:@@addCalculatedColTitle:Añadir columna calculada a la tabla `
    });
    this.dialog.style = { width: '55%', height: '60%', top:"-4em", left:'1em'};

    this.form = this.formBuilder.group({
      colName: [null, Validators.required],
      description: [null, Validators.required],
      sqlExpression: [null, Validators.required],
      typeSelector: [null, Validators.required],
      decimalNumber: [null, Validators.required],
    });
  }
  onShow(): void {
    const title = this.dialog.title;
    this.dialog.title = `${title} ${this.controller.params.table.name}`;
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  closeDialog() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  saveColumn() {
    if (this.form.invalid) {
      return this.alertService.addError($localize`:@@mandatoryFields:Recuerde llenar los campos obligatorios`);
    } else {

      // Check if the name is available
      const tables = this.controller.params.table.columns;
      if(tables.some((column) => column.column_name.trim().toLowerCase() === this.form.value.colName.trim().toLowerCase())) {
        return this.alertService.addError($localize`:@@mandatoryDiferentName:Este nombre de campo calculado ya existe. Intente con otro.`);
      }

      const column: any = {
        aggregation_type: [{ value: "none", display_name: "No" }],
        column_granted_roles: [],
        column_name: this.form.value.colName,
        column_type: this.selectedcolumnType,
        description: { default: this.form.value.description, localized: Array(0) },
        display_name: { default: this.form.value.colName, localized: Array(0) },
        row_granted_roles: [],
        SQLexpression: this.sqlExpressionString,
        computed_column : 'computed',
        minimumFractionDigits: this.decimalNumberValue,
        visible: true
      };


      // console.log('decimalNumberValue ===>>> ', this.decimalNumberValue);
      // console.log('selectedcolumnType ===>>> ', this.selectedcolumnType);
      // console.log('column ===>>> ', column);
      // debugger;

      this.onClose(EdaDialogCloseEvent.NEW, { column: column, table_name: this.controller.params.table.technical_name });
    }
    
  }

  onTypeChange(event: any) {
    const ctrl = this.form.get('decimalNumber');
    if (!ctrl) return;

    if (event.value === 'numeric') {
      ctrl.enable();
    } else {
      ctrl.reset();
      ctrl.disable();
    }
}


}