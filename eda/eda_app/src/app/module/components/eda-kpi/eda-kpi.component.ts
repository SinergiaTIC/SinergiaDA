/*SDA CUSTOM*/import { Component, OnInit, Input, EventEmitter, Output, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import { EdaKpi } from './eda-kpi';
import es from '@angular/common/locales/es';
import { EdaChartComponent } from '../component.index';

@Component({
    selector: 'eda-kpi',
    templateUrl: './eda-kpi.component.html'
})

/*SDA CUSTOM*/export class EdaKpiComponent implements OnInit, AfterViewInit {
    @Input() inject: EdaKpi;
    @Output() onNotify: EventEmitter<any> = new EventEmitter();
    @ViewChild('kpiContainer') kpiContainer: ElementRef;
    @ViewChild('sufixContainer') sufixContainer: ElementRef;
    @ViewChild('EdaChart', { static: false }) edaChartComponent: EdaChartComponent;
    sufixClick: boolean = false;
    color: string;
    defaultColor = '#67757c';
    warningColor = '#ff8100';
    containerHeight: number = 20;
    containerWidth: number = 20;
/*SDA CUSTOM*/baseResultSize: number = 0;

    showChart: boolean = true;

/*SDA CUSTOM*/constructor(private cdr: ChangeDetectorRef) { }

    ngAfterViewInit() {
        this.initDimensions();
/*SDA CUSTOM*/this.baseResultSize = this.computeBaseSize();
/*SDA CUSTOM*/this.cdr.detectChanges();
    }

    ngOnInit() {
        try {
            registerLocaleData(es);

            if (this.inject.alertLimits?.length > 0) {
                this.inject.alertLimits.forEach(alert => {
                    const operand = alert.operand, warningColor = alert.color;
                    const value1 = this.inject.value, value2 = alert.value;
                    if (this.color !== this.defaultColor) this.defaultColor = this.color;
                    switch (operand) {
                        case '<': this.color = value1 < value2 ? warningColor : this.defaultColor; break;
                        case '=': this.color = value1 === value2 ? warningColor : this.defaultColor; break;
                        case '>': this.color = value1 > value2 ? warningColor : this.defaultColor; break;
                        default: this.color = this.defaultColor;
                    }
                });
            }

        } catch (e) {
            console.log('No alert limits defined (alertLimits)');
            console.log(e);
        }
    }

    public initDimensions() {
        if (this.kpiContainer) {
            const widthKpiContainer = this.kpiContainer.nativeElement.offsetWidth;
            const heightKpiContainer = this.kpiContainer.nativeElement.offsetHeight;
            const sufixContainerReference = this.sufixContainer.nativeElement;
    
            if (widthKpiContainer > 0) {
                this.containerHeight = heightKpiContainer;
                this.containerWidth = widthKpiContainer;
            }
    
            //Auto margin
            sufixContainerReference.style.margin = "auto"
        }
    }

    setSufix(): void {
        this.sufixClick = !this.sufixClick;
        this.onNotify.emit({ sufix: this.inject.sufix })
    }

    getStyle(): any {
        return { 'font-weight': 'bold', 'font-size': this.getFontSize(), display: 'flex', 'justify-content': 'center', color: this.color }
    }

/*SDA CUSTOM*/    private computeBaseSize(): number {
        let resultSize: number = this.containerHeight / 2;
        const sufix = this.inject.sufix || '';
/*SDA CUSTOM*/const ratio = (this.containerHeight / this.containerWidth);
/*SDA CUSTOM*/const textLongitude = this.inject.value.toString().length;
        let textWidth = textLongitude * resultSize;
/*SDA CUSTOM*/if ((textWidth > this.containerWidth) && (sufix.length < 4)) resultSize = (this.containerWidth / textLongitude) * 1.4;
/*SDA CUSTOM*/if (resultSize > this.containerHeight && ratio < 0.4) resultSize = this.containerHeight;
/*SDA CUSTOM*/if (textLongitude * resultSize > this.containerWidth * 1.2 && ratio < 0.4) resultSize = resultSize / 1.5;
        if (sufix.length > 4 && this.containerHeight < (resultSize * 4) && this.containerWidth < textWidth) {
            resultSize = resultSize / 1.8;
        }
        if (this.showChart) {
            resultSize = resultSize / 1.8;
        }
/*SDA CUSTOM*/return resultSize;
    }

    /**
     * This function returns a string with the given font size (in px) based on the panel width and height
     * @returns {string}
    */
/*SDA CUSTOM*/    getFontSize(): string {
/*SDA CUSTOM*/if (this.baseResultSize === 0) {
/*SDA CUSTOM*/    this.initDimensions();
/*SDA CUSTOM*/    this.baseResultSize = this.computeBaseSize();
/*SDA CUSTOM*/}
/*SDA CUSTOM*/const resultSize = this.baseResultSize * (1 + (this.inject.modifiedFontPoints || 0) / 100);
        return resultSize.toFixed().toString() + 'px';
    }

    public updateChart(): void {
        if (this.inject.edaChart && this.edaChartComponent) {
            this.edaChartComponent.updateChart();
        }
    }

}
