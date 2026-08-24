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
	@Input() summaryLabel: string = '';
	@Input() summaryOperator: string = '';
	@Input() showNativeTooltip: boolean = true;
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
	// hideOverlay() closes async (animation); the resulting (onClose) can arrive after a
	// restoreFromInject() already ran for a fresh inject, wiping it out. Set before any
	// self-triggered close so the delayed (onClose) knows not to reset again.
	private suppressNextClose = false;

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
		this.restoreFromInject();
	}

	private restoreFromInject(): void {
		if (!this.inject || this.filterTypeSelected) return;

		const operator = this.filterTypesOptions.find(f => f.value === this.inject.dateFilterType);
		if (!operator) return;

		this.filterTypeSelected = operator;
		this.handleFilterChange(operator);

		if (this.inject.range) {
			// Only restore the dropdown selection — NOT rangeDates. Populating rangeDates would
			// surface the literal computed date in the closed input (p-calendar shows its bound
			// value over the placeholder), hiding the dynamic label (summaryLabel/summaryOperator)
			// that's supposed to show for a variable range like "Avui" instead of a frozen date.
			this.selectedRange = this.ranges.find(r => r.value === this.inject.range)?.value ?? null;
		} else if (this.inject.dateRange?.length > 0) {
			this.selectedRange = <any>'customDate';
			this.hideCalendarGrid = false;
			this.rangeDates = this.inject.dateRange;
		}
	}

	public handleFilterChange(filterTypeSelected: FilterType): void {
		this.showDateFormatSelecter = true;
		this.hideCalendarGrid = true;
		this.selectedRange = null;
		this.rangeDates = null;
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
		this.suppressNextClose = true;
		this.datePickerRef?.hideOverlay();
		this.resetConfig();
	}

	public handleOutsideClick(event: MouseEvent): void {
		const target = event.target as HTMLElement;
		if (target?.closest('.p-dropdown-panel, .p-dropdown-item')) {
			return;
		}
		this.suppressNextClose = true;
		this.resetConfig();
	}

	public clean(): void {
		this.suppressNextClose = true;
		this.resetConfig();
		this.onDatesChanges.emit({ dates: null, range: null, operator: null });
	}

	/** Bound to (onClose) — fires late (animation-driven), so a self-triggered close is
	 * suppressed once to avoid stomping on a restoreFromInject() that ran in the meantime. */
	public handleClose(): void {
		if (this.suppressNextClose) {
			this.suppressNextClose = false;
			return;
		}
		this.resetConfig();
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
		const isExplicit = <any>this.selectedRange === 'customDate';
		let dates = this.rangeDates;
		// A restored dynamic range doesn't prefill rangeDates (see restoreFromInject) — compute it now if confirming as-is
		if (!isExplicit && !dates && this.selectedRange) {
			dates = this.dateUtilsService.getRange(<any>this.selectedRange);
		}
		if (this.selectionMode === 'single' && dates && !Array.isArray(dates)) dates = [dates, dates];
		this.onDatesChanges.emit({ dates, range: isExplicit ? null : this.selectedRange, operator: this.filterTypeSelected?.value });
	}

	public remove() {
		this.onRemove.emit();
	}

	public activate() {
		this.active = true;
		this.restoreFromInject();
	}

	public getRange() {
		const value = <any>this.selectedRange;
		if (value === 'customDate') {
			this.hideCalendarGrid = false;
			return;
		}
		this.hideCalendarGrid = true;
		// Don't assign rangeDates here — it's bound to the calendar's own value and would show
		// the computed date immediately. The actual value is only supposed to apply on confirm;
		// emitChanges() computes it lazily from selectedRange at that point.
		this.rangeDates = null;
	}
}