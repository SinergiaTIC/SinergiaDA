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
    backgroundColor: string;
    kpiColor: string;
    prefixImage: string;
    /** Used only when USE_EDA_KPI_SIZE_LOGIC is false (SDA mode) */
    fontScale?: number;
}
