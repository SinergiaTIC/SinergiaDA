import { Component, OnInit, OnDestroy, Input, EventEmitter, Output, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, HostBinding } from '@angular/core';
import { StyleProviderService } from '@eda/services/service.index';
import { formatNumber, registerLocaleData } from '@angular/common';
import { EdaKpi } from './eda-kpi';
import es from '@angular/common/locales/es';
import { EdaChartComponent } from '../eda-chart/eda-chart.component';
import { USE_EDA_KPI_SIZE_LOGIC } from '@eda/configs/customizable/customizable_merged';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'eda-kpi',
    templateUrl: './eda-kpi.component.html',
    imports: [FormsModule, CommonModule, EdaChartComponent]
})

export class EdaKpiComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() inject: EdaKpi;
    @Output() onNotify: EventEmitter<any> = new EventEmitter();

    @HostBinding('style.display') readonly hostDisplay = 'block';
    @HostBinding('style.position') readonly hostPosition = 'relative';
    @HostBinding('style.width') readonly hostWidth = '100%';
    @HostBinding('style.height') readonly hostHeight = '100%';
    @HostBinding('style.background-color') get hostBg() { return this.inject?.backgroundColor || ''; }
    @ViewChild('kpiContainer') kpiContainer: ElementRef;
    @ViewChild('sufixContainer') sufixContainer: ElementRef;
    @ViewChild('EdaChart', { static: false }) edaChartComponent: EdaChartComponent;
    sufixClick: boolean = false;
    color: string = this.styleProviderService.panelFontColor.source['_value'];
    family: string = this.styleProviderService.panelFontFamily.source['_value'];
    defaultColor = '#67757c';
    warningColor = '#ff8100';
    containerHeight: number = 20;
    containerWidth: number = 20;

    /** true → EDA mode (numeric input in the KPI dialog) | false → SDA mode (hover +/- buttons over the KPI) */
    public readonly useHoverResize: boolean = !USE_EDA_KPI_SIZE_LOGIC;
    /** Smallest size we are willing to render (below it the text is clipped with an ellipsis). */
    private readonly minFontSize = 10;
    /** The fit is already the maximum: the manual scale can only make the value smaller. */
    private readonly minFontScale = 0.3;
    private readonly maxFontScale = 1.0;
    private readonly fontScaleStep = 0.1;
    /** Safety margin so sub-pixel rounding never makes the text overflow. */
    private readonly fitSafety = 0.98;
    public isHovered = false;

    /** Reusable canvas context used to measure the rendered text (no layout thrashing). */
    private measureCanvas?: HTMLCanvasElement;
    /** Cache of the last fit calculation: getFontSize() runs several times per change detection. */
    private fitCache = { key: '', size: 0 };
    private resizeObserver?: ResizeObserver;

    constructor(private styleProviderService : StyleProviderService, private cdr: ChangeDetectorRef) { }

    ngAfterViewInit() {
        this.initDimensions();
        this.observeContainerResize();
        // The web font may load after the first paint: the measured width changes,
        // so the fit has to be recalculated once the font is ready.
        (document as any).fonts?.ready
            ?.then(() => this.cdr.detectChanges())
            .catch(() => undefined);
        this.cdr.detectChanges();
    }

    ngOnDestroy() {
        this.resizeObserver?.disconnect();
    }

    /** Recalculates the size whenever the value box changes (panel resize, zoom, chart on/off...). */
    private observeContainerResize(): void {
        const el: HTMLElement | undefined = this.kpiContainer?.nativeElement;
        if (!el || typeof ResizeObserver === 'undefined') return;
        this.resizeObserver = new ResizeObserver(() => {
            this.initDimensions();
            this.cdr.detectChanges();
        });
        this.resizeObserver.observe(el);
    }

    ngOnInit() {
        try {
            registerLocaleData(es);

            if (this.inject.kpiColor) {
                this.defaultColor = this.inject.kpiColor;
                this.color = this.inject.kpiColor;
            }

            if (this.useHoverResize && typeof this.inject.fontScale !== 'number') {
                this.inject.fontScale = 1;
            }

            if (this.inject.alertLimits?.length > 0) {
                this.inject.alertLimits.forEach(alert => {
                    const operand = alert.operand, warningColor = alert.color;
                    const value1 = this.inject.value, value2 = alert.value;
                    if (this.color !== this.defaultColor) this.defaultColor = this.color;
                    switch (operand) {
                        case '<': this.color = value1 < value2 ? warningColor : this.defaultColor; break;
                        case '=': this.color = value1 === value2 ? warningColor : this.defaultColor; break;
                        case '>': this.color = value1 > value2 ? warningColor : this.defaultColor; break;
                        default: this.color = this.defaultColor;
                    }
                });
            }

        } catch (e) {
            console.log('No alert limits defined (alertLimits)');
            console.log(e);
        }
    }


    public initDimensions() {
        if (this.kpiContainer) {
            // Move up three levels from the original container
            const realContainer = this.kpiContainer.nativeElement
                ?.parentElement
                ?.parentElement
                ?.parentElement;

            const widthKpiContainer = realContainer.offsetWidth;
            const heightKpiContainer = realContainer.offsetHeight;
            const sufixContainerReference = this.sufixContainer.nativeElement;

            if (widthKpiContainer > 0) {
                this.containerHeight = heightKpiContainer;
                this.containerWidth = widthKpiContainer;
            }

            // Auto margin
            sufixContainerReference.style.margin = "auto";
        }
    }

    setSufix(): void {
        this.sufixClick = !this.sufixClick;
        if (this.useHoverResize) {
            this.onNotify.emit({ sufix: this.inject.sufix, fontScale: this.inject.fontScale });
        } else {
            this.onNotify.emit({ sufix: this.inject.sufix });
        }
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

    getStyle(): any {
        return {
            'font-weight': 'bold',
            'font-size': this.getFontSize(),
            'line-height': '1',
            color: this.color,
            'font-family': this.family,
        };
    }

    getImageStyle(): any {
        const size = this.getFontSize();
        const maxW = this.containerWidth > 0 ? `${Math.round(this.containerWidth * 0.5)}px` : '50%';
        return {
            height: size,
            'max-height': size,
            width: 'auto',
            'max-width': maxW,
            'object-fit': 'contain',
            'flex-shrink': '0',
            display: 'block',
        };
    }

    /**
     * Font size of the KPI value: the largest size at which the rendered text fits the
     * value box both horizontally and vertically, so it always fills the container and
     * never overflows nor wraps. The manual scale (hover +/- buttons) can only shrink it.
     * @returns {string} font size in px
     */
    getFontSize(): string {
        return `${this.getEffectiveSize()}px`;
    }

    /** Rendered size in px: the scale applied to the fit, never below the readability floor. */
    private getEffectiveSize(): number {
        const fit = this.getFitSize();
        if (this.useHoverResize) return this.sizeForScale(this.currentScale());

        // EDA mode: additive offset (from the KPI dialog), but never above the size that fits
        const points = this.inject?.modifiedFontPoints;
        const size = points ? Math.min(fit, fit + points) : fit;
        return Math.max(this.minFontSize, Math.round(size));
    }

    /** Current manual scale, normalised to the allowed range (the fit itself is 100%). */
    private currentScale(): number {
        const scale = typeof this.inject?.fontScale === 'number' ? this.inject.fontScale : 1;
        return Math.min(1, Math.max(this.minFontScale, scale));
    }

    /** Size in px for a given scale, applying the readability floor. */
    private sizeForScale(scale: number): number {
        const clamped = Math.min(1, Math.max(this.minFontScale, scale));
        return Math.max(this.minFontSize, Math.round(this.getFitSize() * clamped));
    }

    /** Text exactly as the template renders it (number pipe + suffix). */
    private getDisplayText(): string {
        const raw: any = this.inject?.value;
        const sufix = (this.inject?.sufix ?? '').toString().trim();
        if (raw === null || raw === undefined || raw === '') return sufix;

        const numeric = Array.isArray(raw) ? Number(raw[0]) : Number(raw);
        let text: string;
        try {
            text = Number.isFinite(numeric) ? formatNumber(numeric, 'es', '1.0-10') : String(raw);
        } catch {
            text = String(raw);
        }
        return sufix ? `${text} ${sufix}` : text;
    }

    /** Width in px of the text at the given font size (canvas metrics, no layout impact). */
    private measureTextWidth(text: string, fontSize: number): number {
        if (!this.measureCanvas) this.measureCanvas = document.createElement('canvas');
        const ctx = this.measureCanvas.getContext('2d');
        if (!ctx) return text.length * fontSize * 0.6; // rough fallback
        ctx.font = `700 ${fontSize}px ${this.family || 'Questrial'}`;
        return ctx.measureText(text).width;
    }

    /**
     * Largest font size (px) that fits the value box. Glyph widths scale linearly with
     * the font size, so a single measurement at a reference size is enough:
     *   sizeByWidth = availableWidth / widthAtReference * reference
     *   sizeByHeight = availableHeight / lineHeight   (line-height is 1 in getStyle())
     */
    private computeFitSize(): number {
        const el: HTMLElement | undefined = this.kpiContainer?.nativeElement;
        const width = el?.clientWidth ?? this.containerWidth;
        const height = el?.clientHeight ?? this.containerHeight;
        const text = this.getDisplayText();
        if (!text || width <= 0 || height <= 0) return this.minFontSize;

        // The optional inline image takes part of the line.
        const availableWidth = this.inject?.prefixImage ? width * 0.8 : width;

        const reference = 100;
        const widthAtReference = this.measureTextWidth(text, reference) || 1;
        const sizeByWidth = (availableWidth * reference) / widthAtReference;
        const sizeByHeight = height; // line-height: 1 → the line box is one em tall

        return Math.max(this.minFontSize, Math.floor(Math.min(sizeByWidth, sizeByHeight) * this.fitSafety));
    }

    /** computeFitSize() with a cache: getFontSize() is evaluated several times per CD cycle. */
    private getFitSize(): number {
        const el: HTMLElement | undefined = this.kpiContainer?.nativeElement;
        const width = el?.clientWidth ?? this.containerWidth;
        const height = el?.clientHeight ?? this.containerHeight;
        const key = `${this.getDisplayText()}|${width}|${height}|${this.inject?.prefixImage ? 1 : 0}|${this.family}`;
        if (this.fitCache.key !== key) {
            this.fitCache = { key, size: this.computeFitSize() };
        }
        return this.fitCache.size;
    }

    increaseFont(): void {
        const next = this.nextScaleWithSize(1);
        if (next !== null) this.applyScale(next);
    }

    decreaseFont(): void {
        const next = this.nextScaleWithSize(-1);
        if (next !== null) this.applyScale(next);
    }

    /**
     * Percentage actually rendered, relative to the size that fits (100% = as big as
     * the container allows). It is the effective value, so when the 10 px floor is
     * active the label stops at that percentage instead of showing a scale that is
     * not being applied.
     */
    getScalePercent(): number {
        const fit = this.getFitSize();
        if (fit <= 0) return 100;
        return Math.min(100, Math.round((this.getEffectiveSize() / fit) * 100));
    }

    /** False when no bigger size is reachable (already at the fit). */
    canIncreaseFont(): boolean {
        return this.useHoverResize && this.nextScaleWithSize(1) !== null;
    }

    /** False when no smaller size is reachable (minimum scale or 10 px floor). */
    canDecreaseFont(): boolean {
        return this.useHoverResize && this.nextScaleWithSize(-1) !== null;
    }

    /**
     * Next scale (in the direction given) that actually changes the rendered size.
     * Steps that fall inside the 10 px floor (or that round to the same pixels) are
     * skipped, so the buttons never look stuck on very small panels.
     */
    private nextScaleWithSize(direction: 1 | -1): number | null {
        const fit = this.getFitSize();
        if (fit <= 0) return null;
        const currentSize = this.getEffectiveSize();
        let scale = this.currentScale();
        for (let i = 0; i < 50; i++) {
            scale = +(scale + direction * this.fontScaleStep).toFixed(2);
            if (scale > 1 + 1e-9 || scale < this.minFontScale - 1e-9) return null;
            scale = Math.min(1, Math.max(this.minFontScale, scale));
            const size = Math.max(this.minFontSize, Math.round(fit * scale));
            if (direction > 0 ? size > currentSize : size < currentSize) return scale;
        }
        return null;
    }

    private applyScale(scale: number): void {
        this.inject.fontScale = Math.min(this.maxFontScale, Math.max(this.minFontScale, scale));
        this.onNotify.emit({ sufix: this.inject.sufix, fontScale: this.inject.fontScale });
    }

    public updateChart(): void {
        if (this.inject.edaChart && this.edaChartComponent) {
            this.edaChartComponent.updateChart();
        }
    }

}
