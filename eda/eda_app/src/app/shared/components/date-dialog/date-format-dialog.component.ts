import { Component, EventEmitter, OnInit, Output, Input  } from '@angular/core';
import { rangeDateFormats } from './date-format-dialog.index'
import { SelectItem } from 'primeng/api';

// Services
import { ChartUtilsService, FilterType } from '@eda/services/service.index';
import { EdaDatePickerConfig } from '@eda/shared/components/eda-date-picker/datePickerConfig';

interface dataFormatSettings {
  operator: string,
  dynamic: boolean,
  dynamicValue: string | null,
  dynamicLabel: string | null,
  dateValue: any | null
}

@Component({
  selector: 'date-format-dialog',
  templateUrl: './date-format-dialog.component.html',
  styleUrls: ['./date-format-dialog.component.css']
})

export class DateFormatDialogComponent implements OnInit {

  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Input() cleanButtonsAvailable: boolean = false;

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

  public showEdaDatePickerSingleSelection: boolean = false;
  public showEdaDatePickerMultipleSelection: boolean = false;

  public dateFormatSet: dataFormatSettings;
  public dateFormatCustomValue: any = {};
  
  public datePickerConfig: EdaDatePickerConfig;

  public get isReadyForConfirmation(): boolean {
    if (this.filterTypeSelected == null || this.dateFormatSelected == null) return true;
    const noDateNeeded = ['not_null', 'not_null_nor_empty', 'null_or_empty'];
    if (noDateNeeded.includes(this.filterTypeSelected.value)) return false;
    if (this.dateFormatSelected.value === 'customDate') {
      return !this.dateFormatCustomValue?.value1;
    }
    return false;
  }

  constructor(
    private chartUtils: ChartUtilsService,
  ) {

    // Operators for date type
    this.filter.types = this.chartUtils.filterTypes.filter((ft: any) => ft.value !== 'like' && ft.value !== 'not_like');

    // All the date formats
    this.rangeDateFormat.types = [...rangeDateFormats];
  }

  ngOnInit(): void {
  }
  
  public onApplyDateFormatDialog() {


      // Preparing the dateFormatSet
      const operator = this.filterTypeSelected.value;
      const dynamic = this.dateFormatSelected.value === 'customDate' ? false : true;
      const dynamicValue = dynamic ? this.dateFormatSelected.value : null;
      const dateValue = dynamic ? null : this.dateFormatCustomValue;

      const dynamicLabel = dynamic ? this.dateFormatSelected.value : null;
      this.dateFormatSet = { operator, dynamic, dynamicValue, dynamicLabel, dateValue }

      this.close.emit({
        dateFormatSet: this.dateFormatSet,
        filterSelected: this.filterTypeSelected,
      });

      // restoring values
      this.filterTypeSelected = null;
      this.dateFormatSelected = null;
  }

  public oncloseDateFormatDialog() {
      this.close.emit(false);
      
      // restoring values
      this.filterTypeSelected = null;
      this.dateFormatSelected = null;
  }



  processPickerEvent(event) {
    
    let filterValue: any = {};

    if (event.dates) {
      const dtf = new Intl.DateTimeFormat('en', { year: 'numeric', month: '2-digit', day: '2-digit' });
      const dates = Array.isArray(event.dates) ? event.dates : [event.dates, event.dates];

      if (!dates[1]) {
          dates[1] = dates[0];
      }

      this.filter.range = event.range;

      const isInFilter = this.filterTypeSelected?.value === 'in' || this.filterTypeSelected?.value === 'not_in';
      if (isInFilter) {
          // multiple selection mode: dates is an array of individually picked Date objects
          filterValue.value1 = dates
              .filter((d: any) => d != null)
              .map((date: any) => {
                  const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(new Date(date));
                  return `${ye}-${mo}-${da}`;
              });
      } else {
          const stringRange = [dates[0], dates[1]].map(date => {
              const [{ value: mo }, , { value: da }, , { value: ye }] = dtf.formatToParts(date);
              return `${ye}-${mo}-${da}`;
          });
          filterValue.value1 = stringRange[0];
          if (this.filterTypeSelected.value === 'between') {
              filterValue.value2 = stringRange[1];
          }
      }
    }

    // take the value of the new object
    this.dateFormatCustomValue = JSON.parse(JSON.stringify(filterValue));
  }





  public handleFilterChange(filterTypeSelected: FilterType) {

    this.showDateFormatSelecter = true;
    this.showEdaDatePicker = false;
    this.showEdaDatePickerSingleSelection = false;
    this.showEdaDatePickerMultipleSelection = false

    if (filterTypeSelected !== undefined && filterTypeSelected !== null) {
      this.isDateFormatAvailable = true 
    } else {
      // selection deleted
      this.dateFormatSelected = null;
      this.isDateFormatAvailable = false;
      this.rangeDateFormat.types = [];
      return
    }
    
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

    if(['between', 'not_between'].includes(filterTypeSelected.value)) {
      this.dateFormatSelected = {label: 'Seleccionar fecha', value: 'customDate'}
      this.showDateFormatSelecter = false;
      this.showEdaDatePicker = true;
      this.initDatePickerConfig();
      return;
    }

    if(['not_null', 'not_null_nor_empty', 'null_or_empty'].includes(filterTypeSelected.value)) {
      this.dateFormatSelected = {label: 'Seleccionar fecha', value: 'customDate'}
      this.showDateFormatSelecter = false;
      return;
    }

  }

  public handleDateFormatChange(dateFormatSelected: any) {
    this.showEdaDatePickerSingleSelection = false;
    this.showEdaDatePickerMultipleSelection = false;

    if (!dateFormatSelected) return;

    if(['=', '!=', '>', '<', '>=', '<='].includes(this.filterTypeSelected.value) && dateFormatSelected.value === 'customDate') {
      this.showEdaDatePickerSingleSelection = true;
      this.initDatePickerConfig();
      return;
    }

    if(['in', 'not_in'].includes(this.filterTypeSelected.value) && dateFormatSelected.value === 'customDate') {
      this.showEdaDatePickerMultipleSelection = true;
      this.initDatePickerConfig();
      return;
    }

  }

  private initDatePickerConfig(): void {
    this.datePickerConfig = new EdaDatePickerConfig();
    this.datePickerConfig.dateRange = [];
    this.datePickerConfig.range = null;

    if (this.dateFormatCustomValue?.value1) {
      const v1 = this.dateFormatCustomValue.value1;
      if (Array.isArray(v1)) {
        // multiple selection: array of date strings
        this.datePickerConfig.dateRange = v1.map((d: string) => new Date(d.replace(/-/g, '/')));
      } else {
        this.datePickerConfig.dateRange.push(new Date(v1.replace(/-/g, '/')));
        if (this.dateFormatCustomValue.value2) {
          this.datePickerConfig.dateRange.push(new Date(this.dateFormatCustomValue.value2.replace(/-/g, '/')));
        }
      }
    }
  }


}
