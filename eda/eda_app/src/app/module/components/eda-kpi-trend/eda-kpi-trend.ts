import { KPI_CONFIG } from '@eda/configs/customizable/customizable_merged';

export interface TrendPeriodGroup {
    key: string;
    label: string;
    entries: { period: number; value: number }[];
}

export class EdaKpiTrend {
    header: string;
    // KPI display values
    kpiValue: number;
    spyValue: number | null;
    vsPercent: number | null;
    currentPeriodLabel: string;
    previousPeriodLabel: string;
    periodTitle: string;
    comparisonLabel: string;
    // Style
    sufix: string = '';
    decimals: number = 0;
    backgroundColor: string = '';
    kpiColor: string = '';
    prefixImage: string = '';
    roundedBars: boolean = true;
    alertLimits: any[] = [];
    currentYearColor: string = '';
    previousYearColor: string = '';
    // Dropdown / recalculation data
    dateFormat: string = 'month';
    currentKey: string;
    selectedComparisonKey: string;
    availableComparisons: { key: string; label: string }[];
    periodGroups: TrendPeriodGroup[];
    assignedColors: any[];
    // Chart
    edaChart: any;
    // Font size offset (from kpi-dialog)
    modifiedFontPoints: number = 0;
    // Independent percentage scales (10% steps) for auxiliary texts (period title, spy value, comparison label) and the increment/decrement row - same mechanism as plain kpi's image/value/suffix scales
    auxFontScale: number = KPI_CONFIG.DEFAULT_FONT_SCALE;
    deltaFontScale: number = KPI_CONFIG.DEFAULT_FONT_SCALE;
    // forks mode only: show the hover +/- resize buttons (driven by eda-blank-panel's editable/lock state)
    showResizeControls: boolean = false;
}
