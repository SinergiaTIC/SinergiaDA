import { ChartJsConfig } from "./chart-js-config";
import { KPI_CONFIG } from '@eda/configs/customizable/customizable_merged';

export class KpiConfig {
    sufix: string = '';
    assignedColors: any[] = [];
    alertLimits: any[] = [];
    edaChart: ChartJsConfig;
    modifiedFontPoints: number = 0;
    /** Multiplicative font-size factor used in forks mode (hover +/- buttons). Only applies when KPI_CONFIG.USE_EDALITICS_SIZE_LOGIC is false. */
    fontScale: number = KPI_CONFIG.DEFAULT_FONT_SCALE;
    backgroundColor: string = '';
    kpiColor: string = '';
    prefixImage: string = '';
    /** kpideviation only */
    positiveColor: string = '';
    negativeColor: string = '';
    /** kpitrend/kpideviation only: there's no dedicated config class for them, this is the single shared KPI config. */
    roundedBars: boolean = true;
    /** kpitrend/kpideviation only: independent percentage scales (10% steps) for auxiliary texts and the increment/decrement row - same mechanism as plain kpi's image/value/suffix scales below. */
    auxFontScale: number = KPI_CONFIG.DEFAULT_FONT_SCALE;
    deltaFontScale: number = KPI_CONFIG.DEFAULT_FONT_SCALE;
    /** Edalitics mode only (KPI_CONFIG.USE_EDALITICS_SIZE_LOGIC true) for plain kpi, where it's a width-share; also reused as-is by kpideviation (both modes), where it instead scales the image's own fill fraction within its fixed-width column. */
    imageScale: number = KPI_CONFIG.IMAGE_DEFAULT_SCALE;
    valueFontScale: number = KPI_CONFIG.DEFAULT_FONT_SCALE;
    sufixFontScale: number = KPI_CONFIG.DEFAULT_FONT_SCALE;
    constructor(init?: Partial<KpiConfig>) {
        this.edaChart = new ChartJsConfig(
            init?.edaChart?.colors || [],
            init?.edaChart?.chartType || '',
            init?.edaChart?.addTrend || false,
            init?.edaChart?.addComparative || false,
            init?.edaChart?.showLabels || false,
            init?.edaChart?.showLabelsPercent || false,
            init?.edaChart?.numberOfColumns || 0,
            init?.edaChart?.assignedColors || [],
            init?.edaChart?.showPointLines || false,
            init?.edaChart?.showPredictionLines || false,
            init?.edaChart?.chartLegend ?? true,
            init?.edaChart?.showGridLines ?? true,
            init?.edaChart?.lineWidth ?? 2,
            init?.edaChart?.lineStyle || 'solid',
            init?.edaChart?.showXAxis ?? true,
            init?.edaChart?.showXAxisLabels ?? true,
            init?.edaChart?.xAxisLabelCount || 0,
            init?.edaChart?.labelColor || '#000000',
            init?.edaChart?.labelBackgroundColor || '',
            init?.edaChart?.chartLineColor || '',
            init?.edaChart?.chartFillColor || '',
            init?.edaChart?.showAllXAxisLabels ?? true,
        );
        
        Object.assign(this, init);


    }
}