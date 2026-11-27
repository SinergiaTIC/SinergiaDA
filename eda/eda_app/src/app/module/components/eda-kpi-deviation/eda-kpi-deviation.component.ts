import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, HostBinding,
         ChangeDetectorRef, AfterViewInit, Self, ElementRef, Inject, LOCALE_ID } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EdaKpiDeviation } from './eda-kpi-deviation';
import { StyleProviderService } from '@eda/services/service.index';
import { KPI_CONFIG } from '@eda/configs/customizable/customizable_merged';

@Component({
    standalone: true,
    selector: 'eda-kpi-deviation',
    templateUrl: './eda-kpi-deviation.component.html',
    styleUrls: ['./eda-kpi-deviation.component.css'],
    imports: [CommonModule, FormsModule]
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
    displaySufix: string = '';
    sufixClick: boolean = false;
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
    /** Same percentage-scale mechanism as plain kpi's value hover +/- (10% steps, KPI_CONFIG-bounded). */
    private readonly fontScaleStep = 0.1;

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
        this.displaySufix = this.inject.sufix || '';
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

    /**
     * The number(+suffix) column and the image column both need an explicit, shared row height to
     * anchor against: the number/suffix sit flush on its floor, the image centers within it. The
     * row grows to fit whichever of the two is taller, so a bigger image never gets clipped and
     * never breaks the number/suffix's floor anchor.
     */
    getContainerStyle(): any {
        const size = this._computeValueFontSizeNum();
        const boxHeight = this._baseBoxHeightNum();
        const imageHeight = this.inject?.prefixImage ? this._imageHeightNum() : 0;
        const height = Math.max(boxHeight, imageHeight);
        return { 'font-size': size.toFixed(0) + 'px', height: height.toFixed(0) + 'px' };
    }

    /** Base row height (before accounting for a possibly-taller scaled image). */
    private _baseBoxHeightNum(): number {
        return this._computeValueFontSizeNum() * 1.3;
    }

    /** Image's intended height in px: fills the base box at imageScale's default, scales from there. */
    private _imageHeightNum(): number {
        const scale = this.inject?.imageScale ?? KPI_CONFIG.IMAGE_DEFAULT_SCALE;
        return Math.round(this._baseBoxHeightNum() * (scale / KPI_CONFIG.IMAGE_DEFAULT_SCALE));
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

    /** Same percentage-scale mechanism as plain KPI's image/value/suffix scales (10% steps, KPI_CONFIG-bounded). */
    private _scale(raw: any): number {
        const value = typeof raw === 'number' ? raw : KPI_CONFIG.DEFAULT_FONT_SCALE;
        return Math.min(KPI_CONFIG.MAX_FONT_SCALE, Math.max(KPI_CONFIG.MIN_FONT_SCALE, value));
    }

    private _auxFontSize(base: number): number {
        return Math.max(6, Math.round(base * this._scale(this.inject?.auxFontScale)));
    }

    private _deltaFontSize(base: number): number {
        return Math.max(6, Math.round(base * this._scale(this.inject?.deltaFontScale)));
    }

    /**
     * Suffix: same base size as the main value (NOT its final rendered size - the +/- hover
     * control on the value must only grow/shrink the number itself, not the suffix or the image),
     * independently resizable on top via sufixFontScale (same field plain kpi uses).
     */
    getSufixStyle(): any {
        const base = this._fitSizeNum();
        const size = Math.max(6, Math.round(base * this._scale(this.inject?.sufixFontScale)));
        return { 'font-size': size + 'px', 'font-weight': 600 };
    }

    /**
     * Prefix image: the column it lives in is a FIXED 50% of the row (see the template) - it never
     * changes, so the number's column always starts exactly on the bar's 0 below regardless of the
     * image's size. imageScale instead sizes the <img> itself WITHIN that fixed box: at its default
     * (IMAGE_DEFAULT_SCALE) the image fills the base box (same percentage already shown in the
     * dialog, e.g. 50%/250%) - in absolute px, not a percentage of the row, since the row's own
     * height (getContainerStyle) is itself derived from this same number, growing to fit it.
     */
    getImageStyle(): any {
        return { height: this._imageHeightNum() + 'px', width: 'auto' };
    }

    /** Natural fit size (panel dimensions/char count only) - the base every element scales from, before the value's own +/- hover offset is added. */
    private _fitSizeNum(): number {
        try {
            const host = this.hostRef.nativeElement as HTMLElement;
            const panelH = host.offsetHeight || 120;
            const panelW = host.offsetWidth || 200;
            const text = this.formatValue(this.displayValue);
            const charCount = Math.max(text.length, 1);
            // No upper cap: a plain kpi's canvas-measured fit can grow as large as the panel
            // allows, and a fixed 52px ceiling here was keeping kpideviation's value/suffix tiny
            // on panels plain kpi would happily fill.
            let size = Math.min(panelH * 0.3, panelW / charCount * 1.5);
            size = Math.max(14, size);
            return size;
        } catch {
            return 28;
        }
    }

    /** Number's own rendered size: fit size × its own +/- hover scale (valueFontScale) - same mechanism as plain kpi's value hover. */
    private _computeValueFontSizeNum(): number {
        return Math.max(8, Math.round(this._fitSizeNum() * this._scale(this.inject?.valueFontScale)));
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

    getValueScalePercent(): number {
        return Math.round(this._scale(this.inject?.valueFontScale) * 100);
    }

    increaseFont(): void {
        this._applyValueScale(this._scale(this.inject?.valueFontScale) + this.fontScaleStep);
    }

    decreaseFont(): void {
        this._applyValueScale(this._scale(this.inject?.valueFontScale) - this.fontScaleStep);
    }

    canIncreaseFont(): boolean {
        return this._scale(this.inject?.valueFontScale) < KPI_CONFIG.MAX_FONT_SCALE - 1e-9;
    }

    canDecreaseFont(): boolean {
        return this._scale(this.inject?.valueFontScale) > KPI_CONFIG.MIN_FONT_SCALE - 1e-9;
    }

    private _applyValueScale(value: number): void {
        const clamped = +Math.min(KPI_CONFIG.MAX_FONT_SCALE, Math.max(KPI_CONFIG.MIN_FONT_SCALE, value)).toFixed(2);
        if (this.inject) this.inject.valueFontScale = clamped;
        this.cdr.detectChanges();
        this.onNotify.emit({ valueFontScale: clamped });
    }

    setSufix(): void {
        this.sufixClick = !this.sufixClick;
        this.displaySufix = this.inject?.sufix || '';
        this.onNotify.emit({ sufix: this.inject?.sufix || '' });
    }
}
