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
  // KPI chart (kpibar / kpiline / kpiarea) display options
  useGradient: boolean;
  useRoundedBars: boolean;
  chartAnimation: boolean;
  labelColorMode: string;
  labelCustomColor: string;
  // KPI chart line/axis/label-background options (kpiline / kpiarea)
  lineWidth: number;
  lineStyle: string;
  showXAxis: boolean;
  showXAxisLabels: boolean;
  xAxisLabelCount: number;
  labelBackgroundColor: string;

  constructor(colors: Array<{}>, chartType:string, addTrend:boolean, addComparative:boolean, showLabels:boolean, showLabelsPercent:boolean, numberOfColumns:number, assignedColors: any[], showPointLines:boolean, showPredictionLines:boolean, chartLegend:boolean = true, showGridLines:boolean = true,
    useGradient: boolean = true, useRoundedBars: boolean = true, chartAnimation: boolean = true, labelColorMode: string = 'series', labelCustomColor: string = '#000000',
    lineWidth: number = 2, lineStyle: string = 'solid', showXAxis: boolean = true, showXAxisLabels: boolean = true, xAxisLabelCount: number = 0, labelBackgroundColor: string = '') {
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
    this.useGradient = useGradient;
    this.useRoundedBars = useRoundedBars;
    this.chartAnimation = chartAnimation;
    this.labelColorMode = labelColorMode;
    this.labelCustomColor = labelCustomColor;
    this.lineWidth = lineWidth;
    this.lineStyle = lineStyle;
    this.showXAxis = showXAxis;
    this.showXAxisLabels = showXAxisLabels;
    this.xAxisLabelCount = xAxisLabelCount;
    this.labelBackgroundColor = labelBackgroundColor;
  }
}
