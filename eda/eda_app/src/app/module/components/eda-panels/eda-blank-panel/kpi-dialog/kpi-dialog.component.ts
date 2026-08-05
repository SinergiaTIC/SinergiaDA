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
    public assignedColors: Array<{value: string, color: string, opacity?: number}> = [];
    private originalAssignedColors: Array<{value: string, color: string, opacity?: number}> = [];

    public value: number;
    public operand: string;
    public color: string = '#ff0000';
    public alerts: Array<any> = [];
    private originalAlerts: Array<any> = [];
    public alertInfo: string = $localize`:@@alertsInfo: Cuando el valor del kpi sea (=, <,>) que el valor definido cambiará el color del texto`;
    public ptooltipViewAlerts: string = $localize`:@@ptooltipViewAlerts:Configurar alertas`;

    public modifiedFontPoints: number = 0;
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

    public currentAlert = null;
    public canIRunAlerts: boolean = false;
    public edaChart: any;
    public chartContent: any;
    public display: boolean = false;
    public activeTab: "aspecto" | "grafico" | "alerts" = "aspecto";
    public isKpiTrend: boolean = false;
    public isKpiDeviation: boolean = false;

    // Chart tab (kpibar / kpiline / kpiarea only) - options for the embedded mini-chart
    public showGraphTab: boolean = false;
    public isKpiBar: boolean = false;
    public showTrendComparative: boolean = false;
    public showComparative: boolean = false;
    public chartLegend: boolean = true;
    public showGridLines: boolean = true;
    public useGradient: boolean = true;
    public useRoundedBars: boolean = true;
    public chartAnimation: boolean = true;
    public showLabels: boolean = false;
    public showLabelsPercent: boolean = false;
    public labelColorMode: string = 'series';
    public labelCustomColor: string = '#000000';
    public showPointLines: boolean = false;
    public addTrend: boolean = false;
    public addComparative: boolean = false;
    // Extra options (kpiline/kpiarea) not present in the EDA reference dialog, added on top of it
    public showLineSettings: boolean = false;
    public lineWidth: number = 2;
    public lineStyle: string = 'solid';
    public showXAxis: boolean = true;
    public showXAxisLabels: boolean = true;
    public showAllXAxisLabels: boolean = true;
    public xAxisLabelCount: number = 0;
    public labelBackgroundColor: string = '';
    public lineStyleOptions = [
        { label: $localize`:@@lineStyleSolid:Sólida`, value: 'solid' },
        { label: $localize`:@@lineStyleDashed:Discontinua`, value: 'dashed' },
        { label: $localize`:@@lineStyleDotted:Punteada`, value: 'dotted' }
    ];

    public selectedPalette: { name: string; paleta: any } | null = null;
    public allPalettes: any = this.stylesProviderService.ChartsPalettes;
    public title: string = $localize`:@@ChartProps:PROPIEDADES DEL GRAFICO`;
    private colorsLoaded: boolean = false;

    // Getter for template compatibility (keep series to avoid breaking the HTML)
    get series() {
        return this.assignedColors;
    }

    get tabCount(): number {
        return 1 + (this.showGraphTab ? 1 : 0) + (!this.isKpiTrend ? 1 : 0);
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

        // Chart tab (kpibar / kpiline / kpiarea only) - options belong to the embedded chart, not
        // the KPI, so they live under config.edaChart, same as the series colors do.
        this.showGraphTab = ['kpibar', 'kpiline', 'kpiarea'].includes(this.edaChart);
        this.isKpiBar = this.edaChart === 'kpibar';
        this.showTrendComparative = this.edaChart === 'kpiline' || this.edaChart === 'kpiarea';
        // showComparative additionally needs a query shape (date field aggregated by month/week/day)
        this.showComparative = this.showTrendComparative && this.allowComparative(this.panelChartConfig.query);
        const edaCfg: any = config.edaChart || {};
        this.chartLegend = edaCfg.chartLegend ?? true;
        this.showGridLines = edaCfg.showGridLines ?? true;
        this.useGradient = edaCfg.useGradient ?? true;
        this.useRoundedBars = edaCfg.useRoundedBars ?? true;
        this.chartAnimation = edaCfg.chartAnimation ?? true;
        this.showLabels = edaCfg.showLabels ?? false;
        this.showLabelsPercent = edaCfg.showLabelsPercent ?? false;
        this.labelColorMode = edaCfg.labelColorMode ?? 'series';
        this.labelCustomColor = edaCfg.labelCustomColor ?? '#000000';
        this.showPointLines = edaCfg.showPointLines ?? false;
        this.addTrend = edaCfg.addTrend ?? false;
        this.addComparative = edaCfg.addComparative ?? false;

        // Extra options (kpiline/kpiarea) not present in the EDA reference dialog
        this.showLineSettings = this.showTrendComparative;
        this.lineWidth = edaCfg.lineWidth ?? 2;
        this.lineStyle = edaCfg.lineStyle || 'solid';
        this.showXAxis = edaCfg.showXAxis ?? true;
        this.showXAxisLabels = edaCfg.showXAxisLabels ?? true;
        this.xAxisLabelCount = edaCfg.xAxisLabelCount || 0;
        this.showAllXAxisLabels = !this.xAxisLabelCount || this.xAxisLabelCount <= 0;
        this.labelBackgroundColor = edaCfg.labelBackgroundColor || '';

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

    setActiveTab(tab: "aspecto" | "grafico" | "alerts"): void {
        this.activeTab = tab;
        // Defensive: the "Gráfico" tab's series list depends on chartContent/assignedColors
        // already being loaded (normally done lazily in ngAfterViewChecked on first render) -
        // make sure it's populated whenever this tab is opened, even if that first load hasn't
        // run yet (e.g. dialog opened straight onto a tab switch before the preview settled).
        if (tab === 'grafico' && this.chartContent && this.assignedColors.length === 0) {
            this.loadChartColors();
        }
    }

    private buildGraphFieldsPatch(): any {
        return {
            chartLegend: this.chartLegend,
            showGridLines: this.showGridLines,
            useGradient: this.useGradient,
            useRoundedBars: this.useRoundedBars,
            chartAnimation: this.chartAnimation,
            showLabels: this.showLabels,
            showLabelsPercent: this.showLabelsPercent,
            labelColorMode: this.labelColorMode,
            labelCustomColor: this.labelCustomColor,
            showPointLines: this.showPointLines,
            addTrend: this.addTrend,
            addComparative: this.addComparative,
            lineWidth: this.lineWidth,
            lineStyle: this.lineStyle,
            showXAxis: this.showXAxis,
            showXAxisLabels: this.showXAxisLabels,
            xAxisLabelCount: this.xAxisLabelCount,
            labelBackgroundColor: this.labelBackgroundColor,
        };
    }

    saveChartConfig() {
        // Save assignedColors in the chart
        if (this.chartContent && this.assignedColors.length > 0) {
            this.applyColorsToChart();
        }

        this.onClose(EdaDialogCloseEvent.UPDATE, {
            alerts: this.alerts,
            sufix: this.panelChartComponent.componentRef.instance.inject.sufix || '',
            edaChart: this.edaChart,
            chartType: this.panelChartConfig.chartType,
            chartSubType: this.panelChartConfig.edaChart,
            assignedColors: [...this.assignedColors],
            modifiedFontPoints: this.modifiedFontPoints,
            fontScale: this.panelChartComponent.componentRef.instance.inject.fontScale ?? 1,
            backgroundColor: this.kpiBackgroundColor,
            kpiColor: this.kpiTextColor,
            prefixImage: this.prefixImage,
            graphOptions: this.showGraphTab ? this.buildGraphFieldsPatch() : undefined,
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

            const entry: any = {
                value: ds.label,
                color: existingColor?.color || backgroundColor
            };
            if (this.edaChart === 'kpiarea') entry.opacity = existingColor?.opacity ?? 100;
            return entry;
        });

        this.originalAssignedColors = this.assignedColors.map(c => ({ ...c }));
    }

    applyColorsToChart() {
        if (!this.chartContent) return;
        if (!this.panelChartComponent?.componentRef?.instance?.inject?.edaChart) return;

        const dataset = this.chartContent.chartDataset;
        const isAreaOrRadar = this.edaChart === 'kpiarea';

        for (let i = 0; i < dataset.length; i++) {
            const colorConfig = this.assignedColors.find(c => c.value === dataset[i].label);

            if (colorConfig) {
                dataset[i].backgroundColor = isAreaOrRadar ? this.hex2rgb(colorConfig.color, colorConfig.opacity ?? 100) : colorConfig.color;
                dataset[i].borderColor = this.hex2rgb(colorConfig.color, 100);
                this.chartContent.chartColors[i] = {
                    backgroundColor: dataset[i].backgroundColor,
                    borderColor: dataset[i].borderColor
                };
            }
        }

        this.panelChartComponent.componentRef.instance.inject.edaChart.chartDataset = [...dataset];
        this.panelChartComponent.componentRef.instance.updateChart();
    }

    stepOpacity(idx: number, delta: number): void {
        const current = this.assignedColors[idx].opacity ?? 100;
        this.assignedColors[idx].opacity = Math.min(100, Math.max(0, current + delta));
        this.handleInputColor(this.assignedColors[idx]);
    }

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
            if (item.opacity !== undefined) colorConfig.opacity = item.opacity;
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
            color: interpolatedColors[i % interpolatedColors.length].color,
            ...(this.edaChart === 'kpiarea' ? { opacity: this.assignedColors[i]?.opacity ?? 100 } : {}),
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

    // --- Chart tab (kpibar/kpiline/kpiarea): options that require a rebuild of the mini-chart ---

    private syncGraphFields(): void {
        if (!this.panelChartConfig?.config) return;
        const cfg: any = this.panelChartConfig.config.getConfig();
        cfg.edaChart = { ...(cfg.edaChart || {}), ...this.buildGraphFieldsPatch() };
    }

    /**
     * Every "Gráfico" tab toggle needs a full rebuild of the mini-chart (not just a mutate +
     * updateChart()): trend/comparative change the dataset itself, and several Chart.js options
     * (animation, per-type datalabels formatter) are baked in as closures by initChartOptions()
     * at build time.
     */
    private refreshGraphPreview(): void {
        this.syncGraphFields();
        this.panelChartConfig = new PanelChart(this.panelChartConfig);
        setTimeout(() => {
            this.panelChartComponent?.changeChartType();
            const nextEdaChart = this.panelChartComponent?.componentRef?.instance?.inject?.edaChart;
            if (nextEdaChart) {
                this.chartContent = nextEdaChart;
                if (Array.isArray(this.chartContent?.chartDataset)) {
                    this.loadChartColors();
                }
            }
        });
    }

    setChartLegend(): void { this.refreshGraphPreview(); }
    setShowGridLines(): void { this.refreshGraphPreview(); }
    setUseGradient(): void { this.refreshGraphPreview(); }
    setUseRoundedBars(): void { this.refreshGraphPreview(); }
    setChartAnimation(): void { this.refreshGraphPreview(); }
    setShowLabels(): void { this.refreshGraphPreview(); }
    setShowLabelsPercent(): void { this.refreshGraphPreview(); }
    setLabelColor(): void { this.refreshGraphPreview(); }
    setShowPointLines(): void { this.refreshGraphPreview(); }
    setAddTrend(): void { this.refreshGraphPreview(); }
    setAddComparative(): void { this.refreshGraphPreview(); }

    // Extra options (kpiline/kpiarea) not present in the EDA reference dialog
    setLineWidth(): void { this.refreshGraphPreview(); }
    setLineStyle(): void { this.refreshGraphPreview(); }
    setShowXAxis(): void { this.refreshGraphPreview(); }
    setShowXAxisLabels(): void { this.refreshGraphPreview(); }
    setLabelBackgroundColor(): void { this.refreshGraphPreview(); }

    toggleAllXAxisLabels(): void {
        if (this.showAllXAxisLabels) {
            this.xAxisLabelCount = 0;
        } else if (!this.xAxisLabelCount || this.xAxisLabelCount <= 0) {
            this.xAxisLabelCount = Math.min(5, this.chartContent?.chartLabels?.length || 5);
        }
        this.refreshGraphPreview();
    }

    handleXAxisLabelCountInput(): void {
        if (this.xAxisLabelCount && this.xAxisLabelCount > 0) {
            this.showAllXAxisLabels = false;
        }
        this.refreshGraphPreview();
    }

    labelColorButtonClass(mode: string): Record<string, boolean> {
        return { 'kpi-tab-btn--active': this.labelColorMode === mode };
    }

    // comparativa only makes sense with a date field aggregated by month/week/day, exactly 2 query columns
    private allowComparative(query: any[]): boolean {
        if (!query) return false;
        const dateFields = query.filter(field => field.column_type === 'date');
        const haveDate = dateFields.length > 0;
        const monthformat = haveDate && ['month', 'week', 'day'].includes(dateFields[0].format);
        const onlyTwoCols = query.length === 2;
        const aggregation = query.filter(col => col.column_type === 'numeric')
            .map(col => col.aggregation_type.filter(agg => agg.selected === true && agg.value !== 'none').map(agg => agg.selected))
            .reduce((a, b) => a || b, false)[0];
        return haveDate && onlyTwoCols && monthformat && aggregation;
    }
}
