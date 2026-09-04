import { EdaDialogCloseEvent, EdaDialog2Component } from '@eda/shared/components/shared-components.index';
import { AfterViewChecked, AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { KpiMailConfigModal } from '@eda/components/kpi-mail-config/kpi-mail-config.modal';
import { PanelChartComponent } from '../panel-charts/panel-chart.component';
import { PanelChart } from '../panel-charts/panel-chart';
import { UserService } from '@eda/services/service.index';
import { StyleProviderService, ChartUtilsService } from '@eda/services/service.index';
import * as _ from 'lodash';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ColorPickerModule } from 'primeng/colorpicker';
import { DropdownModule } from 'primeng/dropdown';
import { USE_EDA_KPI_SIZE_LOGIC } from '@eda/configs/customizable/customizable_default';

@Component({
    standalone: true,
    selector: 'app-kpi-dialog',
    templateUrl: './kpi-dialog.component.html',
    styleUrls: ['./kpi-dialog.component.css'],
    imports: [FormsModule, CommonModule, EdaDialog2Component, ColorPickerModule, PanelChartComponent, KpiMailConfigModal, DropdownModule]
})
export class KpiEditDialogComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
    @Input() controller: any;
    @ViewChild('PanelChartComponent', { static: false }) panelChartComponent: PanelChartComponent;
    @ViewChild('mailConfig', { static: false }) mailConfig: any;
    @ViewChild('previewContainer', { static: false }) previewContainer: ElementRef;
    public mailConfigOpen: boolean = false;

    public panelChartConfig: PanelChart = new PanelChart();
    
    // Use assignedColors instead of series
    public assignedColors: Array<{value: string, color: string}> = [];
    private originalAssignedColors: Array<{value: string, color: string}> = [];

    public value: number;
    public operand: string;
    public color: string = '#ff0000';
    public alerts: Array<any> = [];
    private originalAlerts: Array<any> = [];
    public alertInfo: string = $localize`:@@alertsInfo: Cuando el valor del kpi sea (=, <,>) que el valor definido cambiará el color del texto`;
    public ptooltipViewAlerts: string = $localize`:@@ptooltipViewAlerts:Configurar alertas`;

    public modifiedFontPoints: number = 0;
    /** true → EDA mode (numeric input below) | false → SDA mode (hover +/- buttons on the KPI itself) */
    public readonly useHoverResize: boolean = !USE_EDA_KPI_SIZE_LOGIC;
    public panelBaseResultSize: number = 0;
    public previewAspectRatio: string = '4/3';
    public previewBoxStyle: any = {};
    public panelTitle: string = '';
    private panelWidth: number = 400;
    private panelHeight: number = 300;
    private resizeObserver: ResizeObserver;

    public kpiBackgroundColor: string = '';
    public kpiTextColor: string = '';
    public prefixImage: string = '';

    // --- KPI+chart options (kpibar/kpiline/kpiarea only) ---
    public lineWidth: number = 2;
    public lineStyle: 'solid' | 'dashed' | 'dotted' = 'solid';
    public lineStyleOptions = [
        { label: $localize`:@@lineStyleSolid:Sólida`, value: 'solid' },
        { label: $localize`:@@lineStyleDashed:Discontinua`, value: 'dashed' },
        { label: $localize`:@@lineStyleDotted:Punteada`, value: 'dotted' }
    ];
    public showXAxis: boolean = true;
    public showXAxisLabels: boolean = true;
    public xAxisLabelCount: number = 0;
    public showAllXAxisLabels: boolean = true;
    private axisTicksOverrideWasActive: boolean = false;
    public showLabels: boolean = false;
    public showLabelsPercent: boolean = false;
    public labelColor: string = '#000000';
    public labelBackgroundColor: string = '';
    public showLineSettings: boolean = false;
    public showAxisAndLabelSettings: boolean = false;
    /** Independent border color for kpibar/kpiarea, on top of "Color de la serie". */
    public chartLineColor: string = '';
    public showChartLineColor: boolean = false;
    /** Independent fill color for kpiarea, on top of the border color. */
    public chartFillColor: string = '';
    public showChartFillColor: boolean = false;
    private initialLineState: { lineWidth: number, lineStyle: 'solid' | 'dashed' | 'dotted', chartLineColor: string, chartFillColor: string } = null;
    private initialAxisState: { showXAxis: boolean, showXAxisLabels: boolean, showAllXAxisLabels: boolean, xAxisLabelCount: number } = null;
    private initialLabelsState: { showLabels: boolean, showLabelsPercent: boolean, labelColor: string, labelBackgroundColor: string } = null;
    // --- END KPI+chart options ---

    public currentAlert = null;
    public canIRunAlerts: boolean = false;
    public edaChart: any;
    public chartContent: any;
    public display: boolean = false;
    public activeTab: "aspecto" | "alerts" = "aspecto";
    public isKpiTrend: boolean = false;
    public isKpiDeviation: boolean = false;
    public selectedPalette: { name: string; paleta: any } | null = null;
    public allPalettes: any = this.stylesProviderService.ChartsPalettes;
    public title: string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;
    private colorsLoaded: boolean = false;

    // Getter for template compatibility (keep series to avoid breaking the HTML)
    get series() {
        return this.assignedColors;
    }

    constructor(
        private userService: UserService,
        private stylesProviderService: StyleProviderService,
        private ChartUtilsService: ChartUtilsService
    ) {
        this.canIRunAlerts = this.userService.user.name !== "edaanonim";
    }

    ngAfterViewInit(): void {
        setTimeout(() => this.computePreviewBox(), 50);
        this.resizeObserver = new ResizeObserver(() => this.computePreviewBox());
        if (this.previewContainer) {
            this.resizeObserver.observe(this.previewContainer.nativeElement);
        }
    }

    ngOnDestroy(): void {
        this.resizeObserver?.disconnect();
    }

    private computePreviewBox(): void {
        if (!this.previewContainer) return;
        const el = this.previewContainer.nativeElement;
        const padding = 48; // 1.5rem * 2 sides * 16px
        const cw = el.offsetWidth - padding;
        const ch = el.offsetHeight - padding;
        if (cw <= 0 || ch <= 0) return;
        const scale = Math.min(cw / this.panelWidth, ch / this.panelHeight);
        this.previewBoxStyle = {
            width: `${Math.round(this.panelWidth * scale)}px`,
            height: `${Math.round(this.panelHeight * scale)}px`,
        };
    }

    ngAfterViewChecked(): void {
        if (!this.colorsLoaded && this.panelChartComponent?.componentRef?.instance?.inject?.edaChart.chartType) {
            this.chartContent = this.panelChartComponent.componentRef.instance.inject.edaChart;
            if (this.assignedColors.length === 0) {
                setTimeout(() => {
                    this.loadChartColors();
                    this.colorsLoaded = true;
                }, 0);
            }
        }
    }

    ngOnInit(): void {
        this.panelChartConfig = this.controller.params.panelChart;
        this.edaChart = this.controller.params.panelChart.edaChart;
        this.panelBaseResultSize = this.controller.params.panelBaseResultSize || 0;
        this.panelWidth = this.controller.params.panelWidth || 400;
        this.panelHeight = this.controller.params.panelHeight || 300;
        this.panelTitle = this.controller.params.panelTitle || '';
        this.previewAspectRatio = `${this.panelWidth} / ${this.panelHeight}`;
        const config: any = this.panelChartConfig.config.getConfig();

        this.originalAlerts = [...(config.alertLimits || [])];
        this.alerts = [...this.originalAlerts];
        this.modifiedFontPoints = config.modifiedFontPoints || 0;
        this.kpiBackgroundColor = config.backgroundColor || '';
        this.kpiTextColor = config.kpiColor || '';
        this.prefixImage = config.prefixImage || '';
        this.isKpiTrend = this.panelChartConfig.chartType === 'kpitrend';
        this.isKpiDeviation = this.panelChartConfig.chartType === 'kpideviation';
        this.activeTab = 'aspecto';

        // --- KPI+chart options (kpibar/kpiline/kpiarea only) ---
        this.showLineSettings = ['kpiline', 'kpiarea'].includes(this.panelChartConfig.chartType);
        this.showAxisAndLabelSettings = !['kpi', 'kpitrend', 'kpideviation'].includes(this.panelChartConfig.chartType);
        this.lineWidth = config.edaChart?.lineWidth ?? 2;
        this.lineStyle = config.edaChart?.lineStyle || 'solid';
        this.showXAxis = config.edaChart?.showXAxis ?? true;
        this.showXAxisLabels = config.edaChart?.showXAxisLabels ?? true;
        this.xAxisLabelCount = config.edaChart?.xAxisLabelCount || 0;
        this.showAllXAxisLabels = config.edaChart?.showAllXAxisLabels ?? true;
        this.axisTicksOverrideWasActive = this.showAllXAxisLabels || this.xAxisLabelCount > 0;
        this.showLabels = config.edaChart?.showLabels ?? false;
        this.showLabelsPercent = config.edaChart?.showLabelsPercent ?? false;
        this.labelColor = config.edaChart?.labelColor || '#000000';
        this.labelBackgroundColor = config.edaChart?.labelBackgroundColor || '';
        this.showChartLineColor = ['kpibar', 'kpiarea'].includes(this.panelChartConfig.chartType);
        this.chartLineColor = config.edaChart?.chartLineColor || this.getKpiChartLineColor();
        this.showChartFillColor = this.panelChartConfig.chartType === 'kpiarea';
        this.chartFillColor = config.edaChart?.chartFillColor || this.getKpiChartFillColor();

        // Snapshot for the per-section "Restaurar" buttons
        this.initialLineState = { lineWidth: this.lineWidth, lineStyle: this.lineStyle, chartLineColor: this.chartLineColor, chartFillColor: this.chartFillColor };
        this.initialAxisState = { showXAxis: this.showXAxis, showXAxisLabels: this.showXAxisLabels, showAllXAxisLabels: this.showAllXAxisLabels, xAxisLabelCount: this.xAxisLabelCount };
        this.initialLabelsState = { showLabels: this.showLabels, showLabelsPercent: this.showLabelsPercent, labelColor: this.labelColor, labelBackgroundColor: this.labelBackgroundColor };
        // --- END KPI+chart options ---

        if (this.panelBaseResultSize > 0) {
        setTimeout(() => {
            const kpiInstance = this.panelChartComponent?.componentRef?.instance;
                if (kpiInstance) {
                    kpiInstance.baseResultSize = this.panelBaseResultSize;
                    this.panelChartComponent.componentRef.changeDetectorRef.detectChanges();
                }
            }, 100);
        }
    }

    setActiveTab(tab: "aspecto" | "alerts"): void {
        this.activeTab = tab;
    }

    saveChartConfig() {
        // Save assignedColors in the chart
        if (this.chartContent && this.assignedColors.length > 0) {
            this.applyColorsToChart();
        }

        const kpiInject = this.panelChartComponent?.componentRef?.instance?.inject;
        const savedConfig: any = this.panelChartConfig?.config?.getConfig?.() || {};
        const fontScale = kpiInject?.fontScale ?? savedConfig.fontScale ?? 1;

        this.onClose(EdaDialogCloseEvent.UPDATE, {
            alerts: this.alerts,
            sufix: this.panelChartComponent.componentRef.instance.inject.sufix || '',
            // Bug fix: this used to emit `this.edaChart` (the chart subtype string, e.g. 'bar'),
            // but the close handler (onCloseKpiProperties) expects an object with chartColors/chartType/etc.
            // `this.chartContent` is the real chart-options object (inject.edaChart).
            edaChart: this.chartContent,
            chartType: this.panelChartConfig.chartType,
            chartSubType: this.panelChartConfig.edaChart,
            assignedColors: [...this.assignedColors],
            modifiedFontPoints: this.modifiedFontPoints,
            fontScale,
            backgroundColor: this.kpiBackgroundColor,
            kpiColor: this.kpiTextColor,
            prefixImage: this.prefixImage,
        });
    }

    closeChartConfig() {
        this.alerts = [...this.originalAlerts];

        try {
            this.assignedColors = this.originalAssignedColors.map(c => ({ ...c }));
            this.applyColorsToChart();
        } catch (_) {}

        this.onClose(EdaDialogCloseEvent.NONE);
    }

    loadChartColors() {
        if (!this.chartContent) return;

        const existingColors = this.panelChartConfig.config.getConfig()['assignedColors'] || [];
        const dataset = this.chartContent.chartDataset;

        // Create assignedColors from the dataset
        this.assignedColors = dataset.map((ds, index) => {
            const existingColor = existingColors.find(c => c.value === ds.label);
            const backgroundColor = this.rgb2hex(ds.backgroundColor) || ds.backgroundColor;
            
            return {
                value: ds.label,
                color: existingColor?.color || backgroundColor
            };
        });

        this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
    }

    applyColorsToChart() {
        const chartContent = this.getLiveChartContent();
        if (!chartContent) return;

        const dataset = chartContent.chartDataset;

        for (let i = 0; i < dataset.length; i++) {
            const colorConfig = this.assignedColors.find(c => c.value === dataset[i].label);

            if (colorConfig) {
                dataset[i].backgroundColor = this.hex2rgb(colorConfig.color, 90);
                dataset[i].borderColor = this.hex2rgb(colorConfig.color, 100);
                chartContent.chartColors[i] = {
                    backgroundColor: dataset[i].backgroundColor,
                    borderColor: dataset[i].borderColor
                };
            }
        }

        chartContent.chartDataset = [...dataset];
        this.commitChartContentChange();
    }

    // --- KPI+chart options (kpibar/kpiline/kpiarea only) ---

    /**
     * `this.chartContent` is only captured once (in ngAfterViewChecked) and can end up stale —
     * always re-fetch the actually-rendered instance's chart object before mutating it, or edits
     * can silently land on a disconnected/no-longer-rendered object (invisible in the preview,
     * but still correctly picked up on "Confirmar" since that always does a full fresh re-render).
     */
    private getLiveChartContent(): any {
        const live = this.panelChartComponent?.componentRef?.instance?.inject?.edaChart;
        if (live) {
            this.chartContent = live;
        }
        return this.chartContent;
    }

    /**
     * Reassigns inject.edaChart to a new top-level object reference (not just mutating nested
     * properties in place) so Angular's Input binding — and ng2-charts' own change-driven sync —
     * actually notices the change, in addition to the direct Chart.js update() call below.
     */
    private commitChartContentChange(): void {
        const instance = this.panelChartComponent?.componentRef?.instance;
        if (!instance?.inject || !this.chartContent) return;
        instance.inject.edaChart = { ...this.chartContent };
        this.chartContent = instance.inject.edaChart;
        instance.updateChart?.();
    }

    applyLineStyle(): void {
        const chartContent = this.getLiveChartContent();
        if (!chartContent?.chartDataset) return;
        const dash = this.getLineDash(this.lineStyle);
        chartContent.chartDataset.forEach(dataset => {
            dataset.borderWidth = this.lineWidth;
            dataset.borderDash = dash;
        });
        chartContent.lineWidth = this.lineWidth;
        chartContent.lineStyle = this.lineStyle;
        this.commitChartContentChange();
    }

    private getLineDash(style: string): number[] {
        switch (style) {
            case 'dashed': return [8, 4];
            case 'dotted': return [2, 4];
            case 'solid':
            default: return [];
        }
    }

    toggleAllXAxisLabels(): void {
        if (this.showAllXAxisLabels) {
            this.xAxisLabelCount = 0;
        } else if (!this.xAxisLabelCount || this.xAxisLabelCount <= 0) {
            this.xAxisLabelCount = Math.min(5, this.chartContent?.chartLabels?.length || 5);
        }
        this.applyXAxisSettings();
    }

    handleXAxisLabelCountInput(): void {
        if (this.xAxisLabelCount && this.xAxisLabelCount > 0) {
            this.showAllXAxisLabels = false;
        }
        this.applyXAxisSettings();
    }

    applyXAxisSettings(): void {
        const chartContent = this.getLiveChartContent();
        if (!chartContent?.chartOptions) return;
        const chartLabels = chartContent.chartLabels || [];
        const labelsLength = chartLabels.length || 0;

        // Shallow-clone chartOptions too (not just the top-level edaChart object committed below)
        // so Chart.js's own scale-recalculation reliably picks up the change.
        const opts = { ...chartContent.chartOptions, scales: { ...chartContent.chartOptions.scales } };
        opts.scales.x = { ...opts.scales.x, ticks: { ...opts.scales.x?.ticks }, grid: { ...opts.scales.x?.grid } };
        // Y axis is never shown for KPI+chart (matches develop), regardless of X axis settings.
        opts.scales.y = { ...opts.scales.y, display: false };

        opts.scales.x.display = this.showXAxis || this.showXAxisLabels;
        // grid.display = vertical gridlines, kept off (matches develop); "mostrar eje X" only toggles drawBorder, which Chart.js 3 draws independently.
        opts.scales.x.grid.display = false;
        opts.scales.x.grid.drawBorder = this.showXAxis;
        opts.scales.x.ticks.display = this.showXAxisLabels;

        if (this.showAllXAxisLabels) {
            // Explicit "mostrar todas las etiquetas" (like develop) — force every label to render
            // unskipped, even if that overlaps with many categories. Off by default.
            opts.scales.x.ticks.maxTicksLimit = labelsLength;
            opts.scales.x.ticks.autoSkip = false;
            opts.scales.x.ticks.callback = this.buildXAxisTickCallback(true, labelsLength, this.xAxisLabelCount, chartLabels);
            this.axisTicksOverrideWasActive = true;
        } else if (this.xAxisLabelCount > 0) {
            // Explicit label count — take over tick selection ourselves.
            opts.scales.x.ticks.maxTicksLimit = this.xAxisLabelCount;
            opts.scales.x.ticks.autoSkip = false;
            opts.scales.x.ticks.callback = this.buildXAxisTickCallback(false, labelsLength, this.xAxisLabelCount, chartLabels);
            this.axisTicksOverrideWasActive = true;
        } else if (this.axisTicksOverrideWasActive) {
            // Neither flag set now — only reset back to Chart.js's smart defaults if an override
            // was actually active before, otherwise leave whatever initChartOptions() set alone.
            opts.scales.x.ticks.maxTicksLimit = undefined;
            opts.scales.x.ticks.autoSkip = true;
            opts.scales.x.ticks.callback = undefined;
            this.axisTicksOverrideWasActive = false;
        }

        chartContent.chartOptions = opts;
        chartContent.showXAxis = this.showXAxis;
        chartContent.showXAxisLabels = this.showXAxisLabels;
        chartContent.xAxisLabelCount = this.xAxisLabelCount;
        chartContent.showAllXAxisLabels = this.showAllXAxisLabels;
        this.commitChartContentChange();
    }

    private buildXAxisTickCallback(useAll: boolean, labelsLength: number, labelCount: number, chartLabels: any[]): ((value: any, index: number) => string) | undefined {
        if (labelsLength === 0) return undefined;
        if (useAll || !labelCount || labelCount <= 0) {
            return (value, index) => {
                const label = Array.isArray(chartLabels) ? (chartLabels[index] ?? chartLabels[value]) : value;
                return `${label ?? ''}`;
            };
        }
        const maxCount = Math.min(labelCount, labelsLength);
        if (maxCount <= 1) {
            return (value, index) => {
                if (index !== 0) return '';
                const label = Array.isArray(chartLabels) ? (chartLabels[index] ?? chartLabels[value]) : value;
                return `${label ?? ''}`;
            };
        }
        const indices = this.getXAxisLabelIndices(labelsLength, maxCount);
        return (value, index) => {
            if (!indices.has(index)) return '';
            const label = Array.isArray(chartLabels) ? (chartLabels[index] ?? chartLabels[value]) : value;
            return `${label ?? ''}`;
        };
    }

    private getXAxisLabelIndices(labelsLength: number, labelCount: number): Set<number> {
        const indices = new Set<number>();
        if (labelsLength <= 0) return indices;
        if (labelCount <= 1) {
            indices.add(0);
            return indices;
        }
        const steps = labelCount - 1;
        for (let i = 0; i < labelCount; i += 1) {
            const index = Math.round((i * (labelsLength - 1)) / steps);
            indices.add(index);
        }
        indices.add(0);
        indices.add(labelsLength - 1);
        return indices;
    }

    applyLabelStyle(): void {
        const chartContent = this.getLiveChartContent();
        if (!chartContent?.chartOptions) return;
        const opts = { ...chartContent.chartOptions, plugins: { ...chartContent.chartOptions.plugins, datalabels: { ...chartContent.chartOptions.plugins?.datalabels } } };
        opts.plugins.datalabels.color = this.labelColor;
        opts.plugins.datalabels.backgroundColor = this.labelBackgroundColor || null;
        chartContent.chartOptions = opts;
        chartContent.labelColor = this.labelColor;
        chartContent.labelBackgroundColor = this.labelBackgroundColor;
        this.commitChartContentChange();
    }

    applyChartLineColor(): void {
        const chartContent = this.getLiveChartContent();
        if (!this.showChartLineColor || !chartContent?.chartDataset) return;
        const borderColor = this.hex2rgb(this.chartLineColor, 100);
        chartContent.chartDataset = chartContent.chartDataset.map(dataset => ({
            ...dataset,
            borderColor,
            borderWidth: dataset.borderWidth ?? 2,
        }));
        if (Array.isArray(chartContent.chartColors)) {
            chartContent.chartColors = chartContent.chartColors.map(c => ({ backgroundColor: c.backgroundColor, borderColor }));
        }
        chartContent.chartLineColor = this.chartLineColor;
        this.commitChartContentChange();
    }

    applyChartFillColor(): void {
        const chartContent = this.getLiveChartContent();
        if (!this.showChartFillColor || !chartContent?.chartDataset) return;
        const fillColor = this.hex2rgb(this.chartFillColor, 90);
        chartContent.chartDataset = chartContent.chartDataset.map(dataset => ({
            ...dataset,
            backgroundColor: fillColor,
            fill: true,
        }));
        if (Array.isArray(chartContent.chartColors)) {
            chartContent.chartColors = chartContent.chartColors.map(c => ({ backgroundColor: fillColor, borderColor: c.borderColor }));
        }
        chartContent.chartFillColor = this.chartFillColor;
        this.commitChartContentChange();
    }

    private getKpiChartLineColor(): string {
        const chartColors = this.chartContent?.chartColors || this.controller?.params?.edaChart?.chartColors || [];
        const border = chartColors[0]?.borderColor || this.chartContent?.chartDataset?.[0]?.borderColor || this.controller?.params?.edaChart?.chartDataset?.[0]?.borderColor;
        return this.normalizeHexColor(border, '');
    }

    private getKpiChartFillColor(): string {
        const chartColors = this.chartContent?.chartColors || this.controller?.params?.edaChart?.chartColors || [];
        const background = chartColors[0]?.backgroundColor || this.chartContent?.chartDataset?.[0]?.backgroundColor || this.controller?.params?.edaChart?.chartDataset?.[0]?.backgroundColor;
        return this.normalizeHexColor(background, '');
    }

    private normalizeHexColor(color: any, fallback: string = ''): string {
        const resolvedColor = Array.isArray(color) ? color[0] : color;
        if (typeof resolvedColor !== 'string') return fallback;
        const trimmed = resolvedColor.trim();
        const shortHexMatch = /^#([0-9a-fA-F]{3})$/.exec(trimmed);
        if (shortHexMatch) {
            const [r, g, b] = shortHexMatch[1].split('');
            return `#${r}${r}${g}${g}${b}${b}`;
        }
        if (/^#([0-9a-fA-F]{6})$/.test(trimmed)) return trimmed;
        if (/^rgba?\(/i.test(trimmed)) return this.rgb2hex(trimmed) || fallback;
        return fallback;
    }

    /**
     * showLabels/showLabelsPercent change which datalabels formatter Chart.js uses (not just a
     * display flag), so unlike the other KPI+chart options this needs a full rebuild of the
     * preview chart instead of an in-place mutation.
     */
    setShowLabels(): void {
        this.rebuildChartPreview();
    }

    setShowLabelsPercent(): void {
        this.rebuildChartPreview();
    }

    private rebuildChartPreview(): void {
        const config: any = this.panelChartConfig?.config?.getConfig?.();
        if (!config) return;
        if (!config.edaChart) config.edaChart = {};
        config.edaChart.lineWidth = this.lineWidth;
        config.edaChart.lineStyle = this.lineStyle;
        config.edaChart.showXAxis = this.showXAxis;
        config.edaChart.showXAxisLabels = this.showXAxisLabels;
        config.edaChart.xAxisLabelCount = this.xAxisLabelCount;
        config.edaChart.showAllXAxisLabels = this.showAllXAxisLabels;
        config.edaChart.labelColor = this.labelColor;
        config.edaChart.labelBackgroundColor = this.labelBackgroundColor;
        config.edaChart.showLabels = this.showLabels;
        config.edaChart.showLabelsPercent = this.showLabelsPercent;
        config.edaChart.chartLineColor = this.chartLineColor;
        config.edaChart.chartFillColor = this.chartFillColor;
        // Preserve any color edits made in this dialog session that haven't been saved yet,
        // so the rebuild doesn't visually revert them.
        if (this.assignedColors.length > 0) {
            config['assignedColors'] = [...this.assignedColors];
        }
        this.panelChartComponent?.changeChartType();
        const nextEdaChart = this.panelChartComponent?.componentRef?.instance?.inject?.edaChart;
        if (nextEdaChart) {
            this.chartContent = nextEdaChart;
        }
    }

    resetLineSection(): void {
        if (!this.initialLineState) return;
        this.lineWidth = this.initialLineState.lineWidth;
        this.lineStyle = this.initialLineState.lineStyle;
        this.chartLineColor = this.initialLineState.chartLineColor;
        this.chartFillColor = this.initialLineState.chartFillColor;
        this.applyLineStyle();
        if (this.showChartLineColor) this.applyChartLineColor();
        if (this.showChartFillColor) this.applyChartFillColor();
    }

    resetAxisSection(): void {
        if (!this.initialAxisState) return;
        this.showXAxis = this.initialAxisState.showXAxis;
        this.showXAxisLabels = this.initialAxisState.showXAxisLabels;
        this.showAllXAxisLabels = this.initialAxisState.showAllXAxisLabels;
        this.xAxisLabelCount = this.initialAxisState.xAxisLabelCount;
        this.applyXAxisSettings();
    }

    resetLabelsSection(): void {
        if (!this.initialLabelsState) return;
        const labelsChanged = this.showLabels !== this.initialLabelsState.showLabels || this.showLabelsPercent !== this.initialLabelsState.showLabelsPercent;
        this.showLabels = this.initialLabelsState.showLabels;
        this.showLabelsPercent = this.initialLabelsState.showLabelsPercent;
        this.labelColor = this.initialLabelsState.labelColor;
        this.labelBackgroundColor = this.initialLabelsState.labelBackgroundColor;
        if (labelsChanged) {
            this.rebuildChartPreview();
        } else {
            this.applyLabelStyle();
        }
    }

    // --- END KPI+chart options ---

    onClose(event: EdaDialogCloseEvent, response?: any): void {
        return this.controller.close(event, response);
    }

    addAlert() {
        this.alerts.push({
            value: this.value ? this.value : 0,
            operand: this.operand,
            color: this.color,
            mailing: { units: null, quantity: null, hours: null, minutes: null, users: [], mailMessage: null, enabled: false }
        });
    }

    deleteAlert(item) {
        this.alerts = this.alerts.filter(alert =>
            alert.operand !== item.operand || alert.value !== item.value || alert.color !== item.color
        );
    }

    rgb2hex(rgb): string {
        if (rgb) {
            rgb = rgb.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);
            return (rgb && rgb.length === 4) ? '#' +
                ('0' + parseInt(rgb[1], 10).toString(16)).slice(-2) +
                ('0' + parseInt(rgb[2], 10).toString(16)).slice(-2) +
                ('0' + parseInt(rgb[3], 10).toString(16)).slice(-2) : '';
        }
    }

    hex2rgb(hex, opacity = 100): string {
        if (hex) {
            hex = hex.replace('#', '');
            const r = parseInt(hex.substring(0, 2), 16);
            const g = parseInt(hex.substring(2, 4), 16);
            const b = parseInt(hex.substring(4, 6), 16);

            return 'rgba(' + r + ',' + g + ',' + b + ',' + opacity / 100 + ')';
        }
    }

    handleInputColor(item) {
        // Update the color in assignedColors
        const colorConfig = this.assignedColors.find(c => c.value === item.value);
        if (colorConfig) {
            colorConfig.color = item.color;
        }

        // Apply to the chart
        this.applyColorsToChart();
    }

    setColor(hex: string) {
        this.color = hex;
    }

    openConfigDialog(alert) {
        this.currentAlert = alert;
        this.mailConfigOpen = true;
    }

    onMailConfigApply(mailingConfig: any) {
        if (this.currentAlert) {
            this.currentAlert.mailing = mailingConfig;
        }
        this.mailConfigOpen = false;
        this.currentAlert = null;
    }

    closeMailingConfig() {
        this.currentAlert = null;
        this.mailConfigOpen = false;
    }

    onPaletteSelected() {
        if (!this.selectedPalette || !this.selectedPalette.paleta || !this.chartContent) return;

        const dataset = this.chartContent.chartDataset;
        const paletteColors = this.selectedPalette.paleta;
        let numColors = dataset.length;

        if (dataset.length > 0 && Array.isArray(dataset[0].backgroundColor)) {
            numColors = dataset[0].backgroundColor.length;
        }

        const interpolatedColors = this.ChartUtilsService.generateRGBColorGradientScaleD3(numColors, paletteColors);

        // Update assignedColors with the new colors
        this.assignedColors = dataset.map((d, i) => ({
            value: d.label,
            color: interpolatedColors[i % interpolatedColors.length].color
        }));

        // Apply colors
        this.applyColorsToChart();
    }

    updateKpiBackground() {
        const instance = this.panelChartComponent?.componentRef?.instance;
        if (instance) {
            instance.inject.backgroundColor = this.kpiBackgroundColor;
            this.panelChartComponent.componentRef.changeDetectorRef.detectChanges();
        }
    }

    updateKpiTextColor() {
        const instance = this.panelChartComponent?.componentRef?.instance;
        if (instance) {
            instance.inject.kpiColor = this.kpiTextColor;
            if (this.isKpiDeviation) {
                instance.updateChart?.();
            } else {
                instance.color = this.kpiTextColor || instance.defaultColor;
                this.panelChartComponent.componentRef.changeDetectorRef.detectChanges();
            }
        }
    }

    openPrefixImageInNewTab(): void {
        const win = window.open('', '_blank');
        win.document.write(`<html><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh"><img src="${this.prefixImage}" style="max-width:100%;max-height:100vh"></body></html>`);
        win.document.close();
    }

    onPrefixImageSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input?.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            this.prefixImage = reader.result as string;
            this.updatePrefixImage();
        };
        reader.readAsDataURL(file);
    }

    updatePrefixImage() {
        const instance = this.panelChartComponent?.componentRef?.instance;
        if (instance) {
            instance.inject.prefixImage = this.prefixImage;
            if (this.isKpiDeviation) {
                instance.updateChart?.();
            } else {
                this.panelChartComponent.componentRef.changeDetectorRef.detectChanges();
            }
        }
    }

    modifyKpiSize(newValue?: number) {
        const min = -90;
        const max = 300;
        if (newValue !== undefined) {
            this.modifiedFontPoints = Math.min(max, Math.max(min, newValue || 0));
        } else {
            this.modifiedFontPoints = Math.min(max, Math.max(min, this.modifiedFontPoints));
        }
        const instance = this.panelChartComponent.componentRef.instance;
        instance.inject.modifiedFontPoints = this.modifiedFontPoints;
        this.panelChartComponent.componentRef.changeDetectorRef.detectChanges();
    }
}
