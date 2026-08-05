import { ChartJsConfig } from "./chart-js-config";

export class KpiConfig {
    sufix: string = '';
    assignedColors: any[] = [];
    alertLimits: any[] = [];
    edaChart: ChartJsConfig;
    modifiedFontPoints: number = 0;
    /** Used only when USE_EDA_KPI_SIZE_LOGIC is false (SDA mode; multiplicative alternative to modifiedFontPoints) */
    fontScale: number = 1;
    backgroundColor: string = '';
    kpiColor: string = '';
    prefixImage: string = '';
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
            init?.edaChart?.useGradient ?? true,
            init?.edaChart?.useRoundedBars ?? true,
            init?.edaChart?.chartAnimation ?? true,
            init?.edaChart?.labelColorMode || 'series',
            init?.edaChart?.labelCustomColor || '#000000',
            init?.edaChart?.lineWidth ?? 2,
            init?.edaChart?.lineStyle || 'solid',
            init?.edaChart?.showXAxis ?? true,
            init?.edaChart?.showXAxisLabels ?? true,
            init?.edaChart?.xAxisLabelCount || 0,
            init?.edaChart?.labelBackgroundColor || '',
        );

        Object.assign(this, init);


    }
}
