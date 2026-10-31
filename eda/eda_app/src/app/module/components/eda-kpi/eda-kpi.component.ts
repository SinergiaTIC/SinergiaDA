import { Component, OnInit, OnDestroy, Input, EventEmitter, Output, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, HostBinding } from '@angular/core';
import { StyleProviderService } from '@eda/services/service.index';
import { formatNumber, registerLocaleData } from '@angular/common';
import { EdaKpi } from './eda-kpi';
import es from '@angular/common/locales/es';
import { EdaChartComponent } from '../eda-chart/eda-chart.component';
import { USE_EDA_KPI_SIZE_LOGIC, KPI_MIN_FONT_SCALE, KPI_MAX_FONT_SCALE, KPI_DEFAULT_FONT_SCALE, KPI_IMAGE_MIN_SCALE, KPI_IMAGE_MAX_SCALE, KPI_IMAGE_DEFAULT_SCALE } from '@eda/configs/customizable/customizable_merged';

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
    /** Scale limits and default, configurable per product via feature flags. */
    private readonly minFontScale = KPI_MIN_FONT_SCALE;
    private readonly maxFontScale = KPI_MAX_FONT_SCALE;
    private readonly defaultFontScale = KPI_DEFAULT_FONT_SCALE;
    private readonly fontScaleStep = 0.1;
    /** Edalitics mode only: width-share bounds for the prefix image (rest of the width goes to value/suffix). */
    private readonly minImageScale = KPI_IMAGE_MIN_SCALE;
    private readonly maxImageScale = KPI_IMAGE_MAX_SCALE;
    private readonly defaultImageScale = KPI_IMAGE_DEFAULT_SCALE;
    /** Edalitics mode only: fixed headroom so the up-front (pre-render) size estimate never overflows once actually rendered. */
    private readonly edaSafetyMargin = 0.9;
    /** Edalitics mode only: panel width/height ratio above which the value+suffix stay on one line (16:9, a "widescreen" shape). */
    private readonly edaStackRatio = 16 / 9;
    /** Safety margin so sub-pixel rounding never makes the text overflow. */
    private readonly fitSafety = 0.98;
    public isHovered = false;

    /** Reusable canvas context used to measure the rendered text (no layout thrashing). */
    private measureCanvas?: HTMLCanvasElement;
    /** Formatted value + suffix: formatNumber (Intl) is expensive and this runs on every CD. */
    private textCache = { value: undefined as any, sufix: '', text: '' };
    /** Fit for the current box size and text: getFontSize() is evaluated several times per CD. */
    private fitCache = { width: -1, height: -1, text: '', prefixImage: false, size: 0 };
    /** Percentage and +/- availability, cached per (fit, scale). */
    private controlsCache = { fit: -1, scale: -1, percent: KPI_DEFAULT_FONT_SCALE * 100, canUp: false, canDown: false };
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
                this.inject.fontScale = this.defaultFontScale;
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
            ...this.getTextStyle(),
        };
    }

    /** Text layout: one clipped line up to 100%, automatic wrapping above it. */
    public getTextStyle(): any {
        const wrap = this.shouldWrap();
        return {
            'white-space': wrap ? 'normal' : 'nowrap',
            'overflow-wrap': wrap ? 'anywhere' : 'normal',
            'word-break': wrap ? 'break-word' : 'normal',
            'text-overflow': wrap ? 'clip' : 'ellipsis',
            'width': wrap ? '100%' : null,
        };
    }

    /** True when the requested size exceeds the single-line fit and the text wraps. */
    public shouldWrap(): boolean {
        const fit = this.getFitSize();
        return fit > 0 && this.getEffectiveSize() > fit + 0.5;
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
     * value box both horizontally and vertically. Up to 100% it stays on one line; above
     * that it wraps and the panel clips it if there is not enough room.
     * @returns {string} font size in px
     */
    getFontSize(): string {
        return `${this.getEffectiveSize()}px`;
    }

    /** Rendered size in px: the scale applied to the fit, never below the readability floor. */
    private getEffectiveSize(): number {
        const fit = this.getFitSize();
        if (this.useHoverResize) return this.sizeForScale(this.currentScale());

        // EDA mode: default scale + additive offset (from the KPI dialog), never above the configured maximum
        const base = fit * this.defaultFontScale;
        const points = this.inject?.modifiedFontPoints;
        const target = points ? Math.min(fit * this.maxFontScale, base + points) : base;
        return Math.max(this.minFontSize, Math.round(target));
    }

    /** Current manual scale, normalised to the allowed range (100% = the fit). */
    private currentScale(): number {
        const scale = typeof this.inject?.fontScale === 'number' ? this.inject.fontScale : this.defaultFontScale;
        return Math.min(this.maxFontScale, Math.max(this.minFontScale, scale));
    }

    /** Size in px for a given scale, applying the readability floor. Above 100% the text wraps. */
    private sizeForScale(scale: number): number {
        const fit = this.getFitSize();
        const clamped = Math.min(this.maxFontScale, Math.max(this.minFontScale, scale));
        return Math.max(this.minFontSize, Math.round(fit * clamped));
    }

    /** Formats a raw KPI value the same way the template's `number` pipe would, for width measurement. */
    private formatValue(raw: any): string {
        if (raw === null || raw === undefined || raw === '') return '';
        const numeric = Array.isArray(raw) ? Number(raw[0]) : Number(raw);
        try {
            return Number.isFinite(numeric) ? formatNumber(numeric, 'es', '1.0-10') : String(raw);
        } catch {
            return String(raw);
        }
    }

    /** Text exactly as the template renders it (number pipe + suffix), cached per value. */
    private getDisplayText(): string {
        const raw: any = this.inject?.value;
        const sufix = (this.inject?.sufix ?? '').toString().trim();
        if (this.textCache.value === raw && this.textCache.sufix === sufix) return this.textCache.text;

        const text = this.formatValue(raw);
        const result = text && sufix ? `${text} ${sufix}` : (text || sufix);
        this.textCache = { value: raw, sufix, text: result };
        return result;
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
    private computeFitSize(width: number, height: number, text: string, prefixImage: boolean): number {
        if (!text || width <= 0 || height <= 0) return this.minFontSize;

        // The optional inline image takes part of the line.
        const availableWidth = prefixImage ? width * 0.8 : width;

        const reference = 100;
        const widthAtReference = this.measureTextWidth(text, reference) || 1;
        const sizeByWidth = (availableWidth * reference) / widthAtReference;
        const sizeByHeight = height; // line-height: 1 → the line box is one em tall

        return Math.max(this.minFontSize, Math.floor(Math.min(sizeByWidth, sizeByHeight) * this.fitSafety));
    }

    /** computeFitSize() memoised by box size and text (no formatting in the hot path). */
    private getFitSize(): number {
        const el: HTMLElement | undefined = this.kpiContainer?.nativeElement;
        const width = el?.clientWidth ?? this.containerWidth;
        const height = el?.clientHeight ?? this.containerHeight;
        const text = this.getDisplayText();
        const prefixImage = !!this.inject?.prefixImage;

        const cache = this.fitCache;
        if (cache.width === width && cache.height === height && cache.text === text && cache.prefixImage === prefixImage) {
            return cache.size;
        }
        const size = this.computeFitSize(width, height, text, prefixImage);
        this.fitCache = { width, height, text, prefixImage, size };
        return size;
    }

    // --- Edalitics mode only (!useHoverResize): image/value/suffix independently sized via the KPI dialog. ---

    public edaHasImage(): boolean {
        return !this.useHoverResize && !!this.inject?.prefixImage;
    }

    private edaImageScale(): number {
        const raw = this.inject?.imageScale;
        const value = typeof raw === 'number' ? raw : this.defaultImageScale;
        return Math.min(this.maxImageScale, Math.max(this.minImageScale, value));
    }

    private edaScale(raw: any): number {
        const value = typeof raw === 'number' ? raw : this.defaultFontScale;
        return Math.min(this.maxFontScale, Math.max(this.minFontScale, value));
    }

    private edaSizeForScale(fit: number, scale: number): number {
        return Math.max(this.minFontSize, Math.round(fit * scale));
    }

    /**
     * Box (px) available to the value/suffix block: the container, minus the image's width share
     * and its gap, shrunk by a fixed safety margin. The margin exists because every size below
     * is computed from a canvas text measurement *before* the DOM renders — it can't be perfectly
     * exact (web font not loaded yet, synthetic bold, sub-pixel rounding), so every fit is solved
     * for a slightly smaller box than the real one. That is the one and only place slack is added;
     * nothing downstream needs to re-check or correct anything.
     */
    private edaTextBoxSize(): { width: number; height: number } {
        const el: HTMLElement | undefined = this.kpiContainer?.nativeElement;
        const width = el?.clientWidth ?? this.containerWidth;
        const height = el?.clientHeight ?? this.containerHeight;
        const imageFraction = this.edaHasImage() ? this.edaImageScale() : 0;
        const imageGap = this.edaHasImage() ? 12 : 0; // matches the row's 0.75rem gap
        return {
            width: Math.max(0, (width - imageGap) * (1 - imageFraction)) * this.edaSafetyMargin,
            height: height * this.edaSafetyMargin,
        };
    }

    private edaValueText(): string {
        return this.formatValue(this.inject?.value);
    }

    public edaSufixText(): string {
        return (this.inject?.sufix ?? '').toString().trim();
    }

    /** Width-only fit (no height cap): used where the element may grow/wrap vertically instead of being capped by the box height. */
    private fitByWidth(text: string, width: number): number {
        if (!text || width <= 0) return this.minFontSize;
        const reference = 100;
        const widthAtReference = this.measureTextWidth(text, reference) || 1;
        return Math.max(this.minFontSize, Math.floor(((width * reference) / widthAtReference) * this.fitSafety));
    }

    /**
     * Stacked mode: value and suffix sit on top of each other, so they share the box height
     * instead of each independently claiming all of it. Each is sized by its own width-driven
     * fit, then — only if their natural sizes together would exceed the box height — both are
     * scaled down by the same factor so the pair always fits vertically.
     */
    private edaStackedFits(): { value: number; sufix: number } {
        const { width, height } = this.edaTextBoxSize();
        const valueByWidth = this.fitByWidth(this.edaValueText(), width);
        const sufixByWidth = this.fitByWidth(this.edaSufixText(), width);
        const naturalTotal = valueByWidth + sufixByWidth;
        const factor = naturalTotal > 0 ? Math.min(1, height / naturalTotal) : 1;
        return {
            value: Math.max(this.minFontSize, Math.floor(valueByWidth * factor)),
            sufix: Math.max(this.minFontSize, Math.floor(sufixByWidth * factor)),
        };
    }

    /** Inline mode: value and suffix share one line, sized together (both width and height capped). */
    private edaInlineFit(): number {
        const { width, height } = this.edaTextBoxSize();
        const value = this.edaValueText();
        const sufix = this.edaSufixText();
        const text = sufix ? `${value} ${sufix}` : value;
        return this.computeFitSize(width, height, text, false);
    }

    /**
     * Stacked (number above, suffix below) only when the suffix is long enough to read as a unit
     * (3+ chars) and the panel's shape is "square-ish" rather than elongated: a wide panel (16:9
     * or wider) keeps both on one line; a squarer one stacks them.
     */
    public edaShouldStack(): boolean {
        const sufix = this.edaSufixText();
        if (sufix.length < 3) return false;
        const el = this.edaRatioElement();
        const width = el?.clientWidth ?? this.containerWidth;
        const height = el?.clientHeight ?? this.containerHeight;
        if (width <= 0 || height <= 0) return false;
        return (width / height) < this.edaStackRatio;
    }

    /**
     * Element whose box best represents the panel's settled shape. While the panel is actively
     * being resized, gridster keeps the item itself following the cursor at raw pixel size (not
     * snapped) and instead shows a separate `<gridster-preview>` overlay snapped to the target
     * grid cell — that overlay is what we want, since it already is the shape the panel will have
     * once released, with no pixel-by-pixel flicker before it settles. Otherwise, the panel card
     * itself (data-eda-panel-root) is just as good, and avoids the header/padding skewing the
     * KPI's own (smaller) content box.
     */
    private edaRatioElement(): HTMLElement | null {
        const root: HTMLElement | undefined = this.kpiContainer?.nativeElement;
        if (!root) return null;
        const item = root.closest('gridster-item');
        if (item?.classList.contains('gridster-item-resizing')) {
            const preview = item.closest('gridster')?.querySelector('gridster-preview') as HTMLElement | null;
            if (preview) return preview;
        }
        return root.closest('[data-eda-panel-root]');
    }

    /**
     * Final rendered sizes, guaranteed to actually fit the box no matter how high the admin
     * pushes the value/suffix % controls: starts from the requested (fit × scale) sizes, then
     * measures what they would really need (accounting for the suffix wrapping onto extra lines
     * when stacked) and — only if that would overflow — scales both down together by the same
     * factor until the whole thing fits. Everything stays visible; nothing is ever clipped.
     */
    private edaFinalSizes(): { value: number; sufix: number } {
        const stacked = this.edaShouldStack();
        const baseFit = stacked ? this.edaStackedFits() : { value: this.edaInlineFit(), sufix: this.edaInlineFit() };
        let valueSize = this.edaSizeForScale(baseFit.value, this.edaScale(this.inject?.valueFontScale));
        let sufixSize = this.edaSizeForScale(baseFit.sufix, this.edaScale(this.inject?.sufixFontScale));

        const { width, height } = this.edaTextBoxSize();
        if (width <= 0 || height <= 0) return { value: valueSize, sufix: sufixSize };

        const valueText = this.edaValueText();
        const sufixText = this.edaSufixText();

        for (let i = 0; i < 4; i++) {
            const valueWidth = this.measureTextWidth(valueText, valueSize);
            let neededWidth: number;
            let neededHeight: number;
            if (stacked) {
                const sufixWidth = sufixText ? this.measureTextWidth(sufixText, sufixSize) : 0;
                const lines = sufixText ? Math.max(1, Math.ceil(sufixWidth / width)) : 0;
                neededWidth = valueWidth; // the value itself never wraps
                neededHeight = valueSize + (sufixText ? sufixSize * 1.15 * lines : 0);
            } else {
                const gap = sufixText ? sufixSize * 0.3 : 0;
                const sufixWidth = sufixText ? this.measureTextWidth(sufixText, sufixSize) : 0;
                neededWidth = valueWidth + gap + sufixWidth;
                neededHeight = Math.max(valueSize, sufixSize);
            }
            const factor = Math.min(1, width / Math.max(neededWidth, 1), height / Math.max(neededHeight, 1));
            if (factor >= 0.999) break;
            valueSize = Math.max(this.minFontSize, Math.floor(valueSize * factor));
            sufixSize = Math.max(this.minFontSize, Math.floor(sufixSize * factor));
        }
        return { value: valueSize, sufix: sufixSize };
    }

    private edaValueSize(): number {
        return this.edaFinalSizes().value;
    }

    private edaSufixSize(): number {
        return this.edaFinalSizes().sufix;
    }

    public edaImageWrapStyle(): any {
        const pct = this.edaImageScale() * 100;
        return {
            flex: `0 0 ${pct}%`,
            width: `${pct}%`,
            'max-width': `${pct}%`,
            height: '100%',
            display: 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'text-align': 'center',
            overflow: 'hidden',
        };
    }

    public edaImageTagStyle(): any {
        return {
            height: '100%',
            width: 'auto',
            'max-width': '100%',
            'object-fit': 'contain',
            'object-position': 'center',
            display: 'block',
            margin: 'auto',
        };
    }

    public edaTextWrapStyle(): any {
        const stacked = this.edaShouldStack();
        return {
            flex: '1 1 0%',
            'min-width': '0',
            height: '100%',
            display: 'flex',
            'flex-direction': stacked ? 'column' : 'row',
            'align-items': 'center',
            'justify-content': 'center',
            overflow: 'hidden',
        };
    }

    /**
     * The value never wraps: edaFinalSizes() already guarantees its font size fits the box on
     * one line, so nowrap + a (practically unreachable) ellipsis is the right pairing here —
     * letting it wrap would risk breaking a number mid-digit instead.
     */
    public edaValueStyle(): any {
        const stacked = this.edaShouldStack();
        const size = this.edaValueSize();
        return {
            'font-weight': 'bold',
            'font-size': `${size}px`,
            'line-height': '1',
            color: this.color,
            'font-family': this.family,
            'white-space': 'nowrap',
            'text-overflow': 'ellipsis',
            overflow: 'hidden',
            'max-width': '100%',
            'min-width': '0',
            'flex-shrink': stacked ? '1' : '0',
            'text-align': 'center',
            cursor: 'pointer',
        };
    }

    public edaSufixStyle(): any {
        const stacked = this.edaShouldStack();
        const size = this.edaSufixSize();
        return {
            'font-weight': 'bold',
            'font-size': `${size}px`,
            'line-height': '1.15',
            color: this.color,
            'font-family': this.family,
            'white-space': stacked ? 'normal' : 'nowrap',
            'overflow-wrap': stacked ? 'break-word' : 'normal',
            'word-break': 'normal',
            overflow: 'hidden',
            'max-width': '100%',
            'min-width': '0',
            'flex-shrink': '0',
            'text-align': 'center',
            'margin-top': stacked ? '0.1em' : '0',
            'margin-left': stacked ? '0' : '0.3em',
            cursor: 'pointer',
        };
    }

    // --- END Edalitics mode only ---

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
        return this.getControls().percent;
    }

    /** False when no bigger size is reachable (already at the fit). */
    canIncreaseFont(): boolean {
        return this.getControls().canUp;
    }

    /** False when no smaller size is reachable (minimum scale or 10 px floor). */
    canDecreaseFont(): boolean {
        return this.getControls().canDown;
    }

    /**
     * Percentage and +/- availability for the current fit and scale. It is computed
     * once per (fit, scale) because the three template bindings would otherwise
     * repeat the whole calculation several times per change detection cycle.
     */
    private getControls(): { percent: number; canUp: boolean; canDown: boolean } {
        const fit = this.getFitSize();
        const scale = this.currentScale();
        if (this.controlsCache.fit === fit && this.controlsCache.scale === scale) {
            return this.controlsCache;
        }
        const size = this.sizeForScale(scale);
        this.controlsCache = {
            fit,
            scale,
            percent: fit > 0 ? Math.min(this.maxFontScale * 100, Math.round((size / fit) * 100)) : Math.round(this.defaultFontScale * 100),
            canUp: this.useHoverResize && this.nextScaleWithSize(1) !== null,
            canDown: this.useHoverResize && this.nextScaleWithSize(-1) !== null,
        };
        return this.controlsCache;
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
            if (scale > this.maxFontScale + 1e-9 || scale < this.minFontScale - 1e-9) return null;
            scale = Math.min(this.maxFontScale, Math.max(this.minFontScale, scale));
            const size = this.sizeForScale(scale);
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
