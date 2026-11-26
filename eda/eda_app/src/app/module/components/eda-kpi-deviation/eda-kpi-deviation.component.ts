import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, HostBinding,
         ChangeDetectorRef, AfterViewInit, Self, ElementRef, Inject, LOCALE_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EdaKpiDeviation } from './eda-kpi-deviation';
import { StyleProviderService } from '@eda/services/service.index';
import { KPI_CONFIG } from '@eda/configs/customizable/customizable_merged';

@Component({
    standalone: true,
    selector: 'eda-kpi-deviation',
    templateUrl: './eda-kpi-deviation.component.html',
    styleUrls: ['./eda-kpi-deviation.component.css'],
    imports: [CommonModule]
})
export class EdaKpiDeviationComponent implements OnInit, OnChanges, AfterViewInit {
    @Input() inject: EdaKpiDeviation;
    @Output() onNotify: EventEmitter<any> = new EventEmitter();

    @HostBinding('style.display') readonly hostDisplay = 'block';
    @HostBinding('style.position') readonly hostPosition = 'relative';
    @HostBinding('style.width') readonly hostWidth = '100%';
    @HostBinding('style.height') readonly hostHeight = '100%';

    displayValue: number = 0;
    displayVsPercent: number | null = null;
    displayHeader: string = '';
    displayReferenceLabel: string = '';
    positiveColor: string = '#22a55b';
    negativeColor: string = '#e53e3e';

    // Deviation bar
    barFillLeft: number = 50;
    barFillWidth: number = 0;
    markerLeft: number = 50;
    barScale: number = 100;

    color: string = '#67757c';
    family: string = 'inherit';

    /** true → forks mode: hover +/- buttons on the value itself (Edalitics adjusts the same field from the dialog instead). */
    public readonly useHoverResize: boolean = !KPI_CONFIG.USE_EDALITICS_SIZE_LOGIC;
    public isHovered: boolean = false;
    private readonly fontPointsStep = 2;
    private readonly fontPointsMin = -90;
    private readonly fontPointsMax = 300;

    constructor(
        private styleProviderService: StyleProviderService,
        private cdr: ChangeDetectorRef,
        @Self() private hostRef: ElementRef,
        @Inject(LOCALE_ID) private locale: string
    ) {
        this.color = this.styleProviderService.panelFontColor.source['_value'] || '#67757c';
        this.family = this.styleProviderService.panelFontFamily.source['_value'] || 'inherit';

        this.styleProviderService.panelFontColor.subscribe(color => {
            this.color = this.inject?.kpiColor
                || color
                || ((this.displayVsPercent ?? 0) >= 0 ? this.positiveColor : this.negativeColor);
            this.cdr.detectChanges();
        });
        this.styleProviderService.panelFontFamily.subscribe(family => {
            this.family = family || 'inherit';
            this.cdr.detectChanges();
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['inject'] && this.inject) {
            this._syncFromInject();
        }
    }

    ngOnInit(): void {
        this._syncFromInject();
    }

    ngAfterViewInit(): void {
        this.cdr.detectChanges();
    }

    private _syncFromInject(): void {
        if (!this.inject) return;

        this.displayValue = this.inject.value ?? 0;
        this.displayVsPercent = this.inject.vsPercent ?? null;
        this.displayHeader = this.inject.header || '';
        this.displayReferenceLabel = this.inject.referenceLabel || '';
        this.positiveColor = this.inject.positiveColor || '#22a55b';
        this.negativeColor = this.inject.negativeColor || '#e53e3e';

        this.color = this.inject.kpiColor
            || ((this.displayVsPercent ?? 0) >= 0 ? this.positiveColor : this.negativeColor);

        this._computeBar();
    }

    /**
     * Fixed center at 50% (the "0" reference point never moves), filling right for a positive
     * deviation or left for a negative one - unlike a sliding 0/scale layout, the scale at both
     * ends stays comparable (-barScale% .. +barScale%) regardless of the value's sign.
     */
    private _computeBar(): void {
        if (this.displayVsPercent === null) {
            this.barFillLeft = 50;
            this.barFillWidth = 0;
            this.markerLeft = 50;
            this.barScale = 100;
            return;
        }
        this.barScale = Math.max(100, Math.ceil(Math.abs(this.displayVsPercent) / 100) * 100);
        const half = Math.min(Math.abs(this.displayVsPercent) / this.barScale, 1) * 50;

        if (this.displayVsPercent >= 0) {
            this.barFillLeft = 50;
            this.barFillWidth = half;
            this.markerLeft = 50 + half;
        } else {
            this.barFillLeft = 50 - half;
            this.barFillWidth = half;
            this.markerLeft = 50 - half;
        }
    }

    get fillColor(): string {
        return (this.displayVsPercent ?? 0) >= 0 ? this.positiveColor : this.negativeColor;
    }

    /** Track color (bar background): soft tint of the fill color */
    get trackColor(): string {
        return this.fillColor + '28';
    }

    get isPositive(): boolean {
        return (this.displayVsPercent ?? 0) >= 0;
    }

    /** Deviation bar corner roundness: on/off, same as kpitrend's "Bordes redondeados". */
    get barRadius(): string {
        return (this.inject?.roundedBars ?? true) ? '3px' : '0px';
    }

    getContainerStyle(): any {
        return { 'font-size': this._computeValueFontSize() };
    }

    getValueStyle(): any {
        const c = this._alertColor()
            || this.inject?.kpiColor
            || ((this.displayVsPercent ?? 0) >= 0 ? this.positiveColor : this.negativeColor);
        return { color: c, 'font-family': this.family };
    }

    private _alertColor(): string | null {
        const limits: any[] = this.inject?.alertLimits;
        if (!limits?.length || this.displayVsPercent === null) return null;
        const pct = this.displayVsPercent;
        for (const a of limits) {
            const thr = Number(a.value);
            if (a.operand === '<' && pct < thr) return a.color;
            if (a.operand === '=' && pct === thr) return a.color;
            if (a.operand === '>' && pct > thr) return a.color;
        }
        return null;
    }

    /** Auxiliary texts: header label + bar scale labels (-%, 0, +%), independently resizable */
    getAuxLabelStyle(): any {
        return { 'font-size': this._auxFontSize(11) + 'px' };
    }

    getAuxScaleLabelStyle(): any {
        return { 'font-size': this._auxFontSize(12) + 'px' };
    }

    /** Increment/decrement row ("Vs. <ref> ▲ XX%"), independently resizable */
    getDeltaStyle(): any {
        return { 'font-size': this._deltaFontSize(12) + 'px' };
    }

    private _auxFontSize(base: number): number {
        return Math.max(6, base + (this.inject?.auxFontPoints || 0));
    }

    private _deltaFontSize(base: number): number {
        return Math.max(6, base + (this.inject?.deltaFontPoints || 0));
    }

    private _computeValueFontSize(): string {
        try {
            const host = this.hostRef.nativeElement as HTMLElement;
            const panelH = host.offsetHeight || 120;
            const panelW = host.offsetWidth || 200;
            const text = this.formatValue(this.displayValue);
            const charCount = Math.max(text.length, 1);
            let size = Math.min(panelH * 0.3, panelW / charCount * 1.5);
            size = Math.max(14, Math.min(size, 52));
            size = Math.max(8, size + (this.inject?.modifiedFontPoints || 0));
            return size.toFixed(0) + 'px';
        } catch {
            return '28px';
        }
    }

    formatValue(value: number): string {
        if (value == null) return '';
        const abs = Math.abs(value);
        const sign = value < 0 ? '-' : '';
        if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
        if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
        return sign + abs.toLocaleString(this.locale);
    }

    public updateChart(): void {
        this._syncFromInject();
        this.cdr.detectChanges();
    }

    onMouseEnter(): void {
        this.isHovered = true;
    }

    onMouseLeave(): void {
        this.isHovered = false;
    }

    shouldShowControls(): boolean {
        return this.useHoverResize && !!this.inject?.showResizeControls && this.isHovered;
    }

    increaseFont(): void {
        this._applyFontPoints((this.inject?.modifiedFontPoints || 0) + this.fontPointsStep);
    }

    decreaseFont(): void {
        this._applyFontPoints((this.inject?.modifiedFontPoints || 0) - this.fontPointsStep);
    }

    canIncreaseFont(): boolean {
        return (this.inject?.modifiedFontPoints || 0) < this.fontPointsMax;
    }

    canDecreaseFont(): boolean {
        return (this.inject?.modifiedFontPoints || 0) > this.fontPointsMin;
    }

    private _applyFontPoints(value: number): void {
        const clamped = Math.min(this.fontPointsMax, Math.max(this.fontPointsMin, value));
        if (this.inject) this.inject.modifiedFontPoints = clamped;
        this.cdr.detectChanges();
        this.onNotify.emit({ modifiedFontPoints: clamped });
    }
}
