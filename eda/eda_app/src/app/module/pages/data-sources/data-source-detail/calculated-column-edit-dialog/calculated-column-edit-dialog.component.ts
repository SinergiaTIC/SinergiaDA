import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';

@Component({
  selector: 'app-calculated-column-edit-dialog',
  templateUrl: './calculated-column-edit-dialog.component.html',
  styleUrls: ['./calculated-column-edit-dialog.component.css']
})
export class CalculatedColumnEditDialogComponent implements OnInit {

  @Input() column: any;
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  
  public display: boolean = false;

  constructor() { }

  ngOnInit(): void {

    console.log('Columna recibida:', this.column);

  }

  onApplyCalculatedColumn(){
    console.log('onApplyCalculatedColumn')

  }

  onCloseCalculatedColumn(){
    this.close.emit();
  }


}
