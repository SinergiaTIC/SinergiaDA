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
    modifiedFontPoints: number = 0;
    auxFontPoints: number = 0;
    deltaFontPoints: number = 0;
    alertLimits: any[] = [];
    roundedBars: boolean = true;
    // forks mode only: show the hover +/- resize buttons (driven by eda-blank-panel's editable/lock state)
    showResizeControls: boolean = false;
}
