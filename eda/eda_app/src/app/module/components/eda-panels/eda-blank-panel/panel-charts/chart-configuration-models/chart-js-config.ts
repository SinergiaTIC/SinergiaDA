export class ChartJsConfig {
  colors: Array<{}>;
  chartType: string;
  addTrend : boolean;
  addComparative:boolean;
  showLabels:boolean;
  showLabelsPercent:boolean;
  showPointLines:boolean;
  showPredictionLines:boolean;
  numberOfColumns: number;
  assignedColors: any[];
  chartLegend: boolean;
  showGridLines: boolean;
  /** Line border width in px (kpiline/kpiarea only). */
  lineWidth: number;
  /** Line border dash style (kpiline/kpiarea only). */
  lineStyle: 'solid' | 'dashed' | 'dotted';
  /** Whether the X axis line itself is drawn. */
  showXAxis: boolean;
  /** Whether the X axis tick labels are drawn. */
  showXAxisLabels: boolean;
  /** How many X axis labels to show, evenly spaced. 0 = show all. */
  xAxisLabelCount: number;
  /** Data label (value) text color. */
  labelColor: string;
  /** Data label (value) background color. */
  labelBackgroundColor: string;
  /** Border/line color override for kpibar/kpiarea, independent of the series ("Color de la serie") color. Empty = no override. */
  chartLineColor: string;
  /** Fill color override for kpiarea, independent of the border color. Empty = no override. */
  chartFillColor: string;
  /**
   * true (default) → force every X axis label to render, unskipped — develop's literal "mostrar
   * todas" behavior. false → leave Chart.js's own smart auto-skip alone, unless xAxisLabelCount
   * is explicitly set.
   */
  showAllXAxisLabels: boolean;

  constructor(colors: Array<{}>, chartType:string, addTrend:boolean, addComparative:boolean, showLabels:boolean, showLabelsPercent:boolean, numberOfColumns:number, assignedColors: any[], showPointLines:boolean, showPredictionLines:boolean, chartLegend:boolean = true, showGridLines:boolean = true, lineWidth: number = 2, lineStyle: 'solid' | 'dashed' | 'dotted' = 'solid', showXAxis: boolean = true, showXAxisLabels: boolean = true, xAxisLabelCount: number = 0, labelColor: string = '#000000', labelBackgroundColor: string = '', chartLineColor: string = '', chartFillColor: string = '', showAllXAxisLabels: boolean = true) {
    this.colors = colors;
    this.chartType = chartType;
    this.addTrend = addTrend;
    this.addComparative = addComparative;
    this.showLabels = showLabels;
    this.showLabelsPercent = showLabelsPercent;
    this.numberOfColumns = numberOfColumns;
    this.assignedColors = assignedColors;
    this.showPointLines = showPointLines;
    this.showPredictionLines = showPredictionLines;
    this.chartLegend = chartLegend;
    this.showGridLines = showGridLines;
    this.lineWidth = lineWidth;
    this.lineStyle = lineStyle;
    this.showXAxis = showXAxis;
    this.showXAxisLabels = showXAxisLabels;
    this.xAxisLabelCount = xAxisLabelCount;
    this.labelColor = labelColor;
    this.labelBackgroundColor = labelBackgroundColor;
    this.chartLineColor = chartLineColor;
    this.chartFillColor = chartFillColor;
    this.showAllXAxisLabels = showAllXAxisLabels;
  }
}