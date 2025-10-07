import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';
import { UntypedFormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { SelectItem } from 'primeng/api';
import { AlertService } from '@eda/services/service.index';

@Component({
  selector: 'app-calculated-column-edit-dialog',
  templateUrl: './calculated-column-edit-dialog.component.html',
  styleUrls: ['./calculated-column-edit-dialog.component.css']
})
export class CalculatedColumnEditDialogComponent implements OnInit {

  @Input() column: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  
  public display: boolean = false;
  public form: UntypedFormGroup;

  // Types
  public columnTypes: SelectItem[] = [
      { label: 'text', value: 'text' },
      { label: 'numeric', value: 'numeric' },
      { label: 'date', value: 'date' },
      { label: 'coordinate', value: 'coordinate' }
  ];

  // Default value
  public name = '';
  public description = '';
  public sqlExpressionString = '';  
  public selectedcolumnType = '';
  public decimalNumberValue;

  constructor(
    private formBuilder: UntypedFormBuilder,
      private alertService: AlertService,
) {

    this.form = this.formBuilder.group({
      colName: [null, Validators.required],
      description: [null, Validators.required],
      sqlExpression: [null, Validators.required],
      typeSelector: [null, Validators.required],
      decimalNumber: [null, Validators.required],
    });

  }

  ngOnInit(): void {

    const column = this.column;
    this.initForm(column);

    // this.selectedcolumnType = this.column.
  }

  initForm(column) {

    console.log('column:', column);

    this.name = column.name;
    this.description = column.description;
    this.sqlExpressionString = column.SQLexpression;  
    this.selectedcolumnType = column.column_type;
    this.decimalNumberValue = column.minimumFractionDigits;


    console.log('name: ', this.name)
    console.log('description: ', this.description)
    console.log('sqlExpressionString: ', this.sqlExpressionString)
    console.log('selectedcolumnType: ', this.selectedcolumnType)
    console.log('decimalNumberValue: ', this.decimalNumberValue)

    if(this.selectedcolumnType !== 'numeric') {
      this.decimalNumberValue = null;
      const ctrl = this.form.get('decimalNumber');
      ctrl.reset();
      ctrl.disable();    
    }
    
}

  onApplyCalculatedColumn(){
    console.log('Aplicando los cambios aqui::::::::::::::::  ');

    if(this.form.invalid) {
      return this.alertService.addError($localize`:@@formDialogCalculatedColumn:Recuerde rellenar todos los campos`);
    } else {
      console.log('FORMULARIO CORRECTO....')
    }

    // console.log('name: ', this.name)
    // console.log('description: ', this.description)
    // console.log('sqlExpressionString: ', this.sqlExpressionString)
    // console.log('selectedcolumnType: ', this.selectedcolumnType)
    // console.log('decimalNumberValue: ', this.decimalNumberValue)

  }

  onCloseCalculatedColumn(){
    this.close.emit();
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
