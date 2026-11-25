export class KpiTrendConfig {
    sufix: string = '';
    backgroundColor: string = '';
    kpiColor: string = '';
    assignedColors: any[] = [];
    modifiedFontPoints: number = 0;
    prefixImage: string = '';
    roundedBars: boolean = true;
    alertLimits: any[] = [];

    constructor(init?: Partial<KpiTrendConfig>) {
        Object.assign(this, init);
    }
}
