import { EdaChart } from "../eda-chart/eda-chart";

export class EdaKpi {
    header: string;
    value: number;
    sufix: string;
    styleClass: any;
    style: any;
    alertLimits : Array<{value:number, operand:string, color:string}>;
    edaChart: EdaChart;
    showChart: boolean;
    modifiedFontPoints: number;
    /** Multiplicative font-size factor used in SDA mode (hover +/- buttons). Only applies when USE_EDA_KPI_SIZE_LOGIC is false. */
    fontScale: number;
    /** Whether the hover +/- resize buttons should be shown (SDA mode only, computed from edit/lock state by the panel). */
    showResizeControls?: boolean;
    backgroundColor: string;
    kpiColor: string;
    prefixImage: string;
}
