import { KPI_CONFIG } from '@eda/configs/customizable/customizable_merged';

export class EdaKpiDeviation {
    header: string;
    value: number;
    referenceValue: number | null = null;
    referenceLabel: string = '';
    vsPercent: number | null = null;
    decimals: number = 0;
    backgroundColor: string = '';
    kpiColor: string = '';
    positiveColor: string = '#22a55b';
    negativeColor: string = '#e53e3e';
    prefixImage: string = '';
    sufix: string = '';
    /** Percentage scales (10% steps, bounded by KPI_CONFIG.MIN/MAX_FONT_SCALE) - same mechanism as plain KPI's independent image/value/suffix scales. valueFontScale drives the main value's own hover +/-, exactly like plain kpi. */
    valueFontScale: number = KPI_CONFIG.DEFAULT_FONT_SCALE;
    auxFontScale: number = KPI_CONFIG.DEFAULT_FONT_SCALE;
    deltaFontScale: number = KPI_CONFIG.DEFAULT_FONT_SCALE;
    sufixFontScale: number = KPI_CONFIG.DEFAULT_FONT_SCALE;
    /** Prefix image's width-share of the row - same field/mechanism as plain KPI's imageScale. */
    imageScale: number = KPI_CONFIG.IMAGE_DEFAULT_SCALE;
    alertLimits: any[] = [];
    roundedBars: boolean = true;
    // forks mode only: show the hover +/- resize buttons (driven by eda-blank-panel's editable/lock state)
    showResizeControls: boolean = false;
}
