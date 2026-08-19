import { DateUtils } from './../../../services/utils/date-utils.service';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { SelectItem } from 'primeng/api';
import { DatePickerConfig } from './datePickerConfig';
import { locales } from './date-locales';
import { rangeDateFormats } from './date-picker.index';
import { ChartUtilsService, FilterType } from '@eda/services/service.index';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Calendar, CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button'; 
import { RippleModule } from 'primeng/ripple'; 



@Component({
	standalone: true,
	selector: 'date-picker',
	templateUrl: './date-picker.component.html',
	styleUrls: ['./date-picker.component.css'], 
	imports: [
		CommonModule, FormsModule,
		CalendarModule, DropdownModule,
		ButtonModule, RippleModule, 
  	],
})

export class DatePickerComponent implements OnChanges {

	@ViewChild(Calendar) datePickerRef: Calendar;

	@Input() inject: DatePickerConfig;
	@Input() autoRemove: boolean = false;
	@Input() autoClear: boolean = false;
	@Input() hideCalendarGrid: boolean = true;
	@Output() onDatesChanges = new EventEmitter<any>();
	@Output() onRemove = new EventEmitter<void>();

	public active: boolean = false;
	public locale: {};
	public firstDayOfWeek: number = 1;
	public selectionMode: 'single' | 'multiple' | 'range' = 'single';

	public filterTypesOptions: Array<FilterType> = [];
	public filterTypeSelected: FilterType;
	public showDateFormatSelecter: boolean = true;

	public ranges: Array<SelectItem> = [...rangeDateFormats];

	public selectedRange: SelectItem;
	public rangePlaceholder: string = $localize`:@@DateSelectRange:Selecciona un rango`;
	public rangeDates: any;
	private _allRanges: Array<SelectItem>;

	constructor(
		private dateUtilsService: DateUtils,
		private chartUtils: ChartUtilsService) {
		const url = window.location.href;
		let lan_ca = new RegExp('\/ca\/', 'i');
		let lan_es = new RegExp('\/es\/', 'i');
		this.locale = lan_ca.test(url) ? locales.ca : lan_es.test(url) ? locales.es : locales.en;
		//this.firstDayOfWeek = lan_es.test(url) || lan_ca.test(url) ? 1 : 0;
		this.firstDayOfWeek = lan_es.test(url) || lan_ca.test(url) ? 1 : 1;
		this._allRanges = [...this.ranges];

		// Operators for date type, same list used by the old date-format-dialog
		this.filterTypesOptions = this.chartUtils.filterTypes.filter(ft => ft.value !== 'like' && ft.value !== 'not_like');
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (this.inject) {
			if (!this.selectedRange && this.inject.range) {
				this.selectedRange = this.ranges.filter(r => r.value === this.inject.range)[0].value;
				this.getRange();
			} else if (this.inject.dateRange.length > 0) {
				this.rangeDates = this.inject.dateRange;
			}
		}
	}

	public handleFilterChange(filterTypeSelected: FilterType): void {
		this.showDateFormatSelecter = true;
		this.hideCalendarGrid = true;
		this.selectedRange = null;
		this.ranges = [...this._allRanges];

		if (!filterTypeSelected) {
			this.ranges = [];
			return;
		}

		if (['=', '!=', '>', '<', '>=', '<='].includes(filterTypeSelected.value)) {
			this.ranges = this._allRanges.filter(r => ['beforeYesterday', 'yesterday', 'today', 'tomorrow', 'pastTomorrow', 'customDate'].includes(r.value));
			this.selectionMode = 'single';
			return;
		}

		if (['in', 'not_in'].includes(filterTypeSelected.value)) {
			this.ranges = this._allRanges.filter(r => !['beforeYesterday', 'yesterday', 'today', 'tomorrow', 'pastTomorrow'].includes(r.value));
			this.selectionMode = 'multiple';
			return;
		}

		if (['between', 'not_between'].includes(filterTypeSelected.value)) {
			this.showDateFormatSelecter = false;
			this.selectedRange = <any>'customDate';
			this.selectionMode = 'range';
			this.hideCalendarGrid = false;
			return;
		}

		if (['not_null', 'not_null_nor_empty', 'null_or_empty'].includes(filterTypeSelected.value)) {
			this.showDateFormatSelecter = false;
			return;
		}
	}

	public get isReadyForConfirmation(): boolean {
		if (!this.filterTypeSelected) return false;
		const noDateNeeded = ['not_null', 'not_null_nor_empty', 'null_or_empty'];
		if (noDateNeeded.includes(this.filterTypeSelected.value)) return true;
		if (!this.selectedRange) return false;
		if (<any>this.selectedRange === 'customDate') return !!this.rangeDates;
		return true;
	}

	public confirm(): void {
		if (!this.isReadyForConfirmation) return;
		this.emitChanges();
		this.datePickerRef?.hideOverlay();
		this.resetConfig();
	}

	public handleOutsideClick(event: MouseEvent): void {
		const target = event.target as HTMLElement;
		if (target?.closest('.p-dropdown-panel, .p-dropdown-item')) {
			return;
		}
		this.resetConfig();
	}

	public clean(): void {
		this.resetConfig();
		this.onDatesChanges.emit({ dates: null, range: null });
	}

	public resetConfig(): void {
		this.filterTypeSelected = null;
		this.selectedRange = null;
		this.rangeDates = null;
		this.ranges = [...this._allRanges];
		this.showDateFormatSelecter = true;
		this.hideCalendarGrid = true;
		this.selectionMode = 'single';
		this.active = false;
	}

	private emitChanges(): void {
		let dates = this.rangeDates;
		if (this.selectionMode === 'single' && dates && !Array.isArray(dates)) dates = [dates, dates];
		this.onDatesChanges.emit({ dates: this.rangeDates, range: this.selectedRange });
	}

	public remove() {
		this.onRemove.emit();
	}

	public activate() {
		this.active = true;
	}

	public getRange() {
		const value = <any>this.selectedRange;
		if (value === 'customDate') {
			this.hideCalendarGrid = false;
			return;
		}
		this.hideCalendarGrid = true;
		const dates = this.dateUtilsService.getRange(value);
		this.rangeDates = this.selectionMode === 'single' ? dates[0] : dates;
	}
}