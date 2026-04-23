import { Component, EventEmitter, OnInit, Output, Input  } from '@angular/core'; 
import { rangeDateFormats } from './date-format-dialog.index'
import { SelectItem } from 'primeng/api';

// Services
import { ChartUtilsService, FilterType } from '@eda/services/service.index';


@Component({
  selector: 'date-format-dialog',
  templateUrl: './date-format-dialog.component.html',
  styleUrls: ['./date-format-dialog.component.css']
})

export class DateFormatDialogComponent implements OnInit {

  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  public display: boolean = false;
  public filterTypeSelected: FilterType;
  public filter = {
    switch: false,
    types: [],
    forDisplay: [],
    selecteds: [],
    range: null
  };

  public isDateFormatAvailable: boolean = false;
  public dateFormatSelected: any;
  public rangeDateFormat: any = {
    types: [],
  }
  
  public showDateFormatSelecter: boolean = true;
  public showEdaDatePicker: boolean = false;

  constructor(
    private chartUtils: ChartUtilsService,
  ) {

    // Operators for date type
    this.filter.types = this.chartUtils.filterTypes.filter((ft: any) => ft.value !== 'like' && ft.value !== 'not_like');
    console.log('filter.types: ', this.filter);
    console.log('filterTypeSelected: ', this.filterTypeSelected);
    
    // All the date formats
    this.rangeDateFormat.types = [...rangeDateFormats];
    console.log('dateFormatSelected: ', this.dateFormatSelected);
  }

  ngOnInit(): void {
  }
  
  public onApplyDateFormatDialog() {
      console.log('Aplicando los cambios de fecha')
      this.close.emit();
  }

  public oncloseDateFormatDialog() {
      console.log('Cancelando los cambios de fecha')
      this.close.emit();
  }

  public handleFilterChange(filterTypeSelected: FilterType) {

    console.log('filterTypeSelected ==> : ', filterTypeSelected);
    this.showDateFormatSelecter = true;
    this.showEdaDatePicker = false;

    if (filterTypeSelected !== undefined && filterTypeSelected !== null) {
      this.isDateFormatAvailable = true 
    } else {
      // selection deleted
      this.dateFormatSelected = null;
      this.isDateFormatAvailable = false;
      this.rangeDateFormat.types = [];
      return
    }
    
    console.log('isDateFormatAvailable: ', this.isDateFormatAvailable);

    ////////////////////////////////// Selection control //////////////////////////////////
    if(['=', '!=', '>', '<', '>=', '<='].includes(filterTypeSelected.value)) {
      this.dateFormatSelected = null;
      this.rangeDateFormat.types = rangeDateFormats.filter((ft: any, index: number) => index<5);
      this.rangeDateFormat.types.push(rangeDateFormats[rangeDateFormats.length-1]);
      return;
    }

    if(['in', 'not_in'].includes(filterTypeSelected.value)) {
      this.dateFormatSelected = null;
      this.rangeDateFormat.types = rangeDateFormats.filter((ft: any, index: number) => index>=5);
      return;
    }

    if(['between'].includes(filterTypeSelected.value)) {
      this.showDateFormatSelecter = false;
      this.showEdaDatePicker = true;
      return;
    }

    if(['not_null',  'not_null_nor_empty', 'null_or_empty'].includes(filterTypeSelected.value)) {
      this.showDateFormatSelecter = false;
      return;
    }
    
  }

  public handleDateFormatChange(dateFormatSelected: any) {
    console.log('dateFormatSelected: ', dateFormatSelected);

  }


}
