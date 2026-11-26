export class KpiDeviationConfig {
    backgroundColor: string = '';
    kpiColor: string = '';
    positiveColor: string = '';
    negativeColor: string = '';
    prefixImage: string = '';
    modifiedFontPoints: number = 0;
    /** Independent size offsets (points) for auxiliary texts (header/bar scale labels) and the increment/decrement row. */
    auxFontPoints: number = 0;
    deltaFontPoints: number = 0;
    alertLimits: any[] = [];
    roundedBars: boolean = true;

    constructor(init?: Partial<KpiDeviationConfig>) {
        Object.assign(this, init);
    }
}
