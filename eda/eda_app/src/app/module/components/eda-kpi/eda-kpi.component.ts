import { Component, OnInit, Input, EventEmitter, Output, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, HostBinding } from '@angular/core';
import { StyleProviderService } from '@eda/services/service.index';
import { registerLocaleData } from '@angular/common';
import { EdaKpi } from './eda-kpi';
import es from '@angular/common/locales/es';
import { EdaChartComponent } from '../eda-chart/eda-chart.component';
import { USE_EDA_KPI_SIZE_LOGIC } from '@eda/configs/customizable/customizable_default';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
    standalone: true,
    selector: 'eda-kpi',
    templateUrl: './eda-kpi.component.html',
    imports: [FormsModule, CommonModule, EdaChartComponent]
})

export class EdaKpiComponent implements OnInit, AfterViewInit {
    @Input() inject: EdaKpi;
    @Output() onNotify: EventEmitter<any> = new EventEmitter();

    @HostBinding('style.display') readonly hostDisplay = 'block';
    @HostBinding('style.position') readonly hostPosition = 'relative';
    @HostBinding('style.width') readonly hostWidth = '100%';
    @HostBinding('style.height') readonly hostHeight = '100%';
    @HostBinding('style.background-color') get hostBg() { return this.inject?.backgroundColor || ''; }
    @ViewChild('kpiContainer') kpiContainer: ElementRef;
    @ViewChild('sufixContainer') sufixContainer: ElementRef;
    @ViewChild('EdaChart', { static: false }) edaChartComponent: EdaChartComponent;
    sufixClick: boolean = false;
    color: string = this.styleProviderService.panelFontColor.source['_value'];
    family: string = this.styleProviderService.panelFontFamily.source['_value'];
    defaultColor = '#67757c';
    warningColor = '#ff8100';
    containerHeight: number = 20;
    containerWidth: number = 20;
    baseResultSize: number = 0;
    showChart: boolean = true;

    /** true → EDA mode (numeric input in the KPI dialog) | false → SDA mode (hover +/- buttons over the KPI) */
    public readonly useHoverResize: boolean = !USE_EDA_KPI_SIZE_LOGIC;
    private readonly minFontScale = 0.6;
    private readonly maxFontScale = 2.0;
    private readonly fontScaleStep = 0.1;
    private readonly scaleTolerance = 0.15;
    private baseWidth: number | undefined;
    public isHovered = false;

    constructor(private styleProviderService : StyleProviderService, private cdr: ChangeDetectorRef) { }

    ngAfterViewInit() {
        this.initDimensions();
        this.baseResultSize = this.computeBaseSize();
        this.cdr.detectChanges();
    }

    ngOnInit() {
        try {
            registerLocaleData(es);

            if (this.inject.kpiColor) {
                this.defaultColor = this.inject.kpiColor;
                this.color = this.inject.kpiColor;
            }

            if (this.useHoverResize && typeof this.inject.fontScale !== 'number') {
                this.inject.fontScale = 1;
            }

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
            // Move up three levels from the original container
            const realContainer = this.kpiContainer.nativeElement
                ?.parentElement
                ?.parentElement
                ?.parentElement;

            const widthKpiContainer = realContainer.offsetWidth;
            const heightKpiContainer = realContainer.offsetHeight;
            const sufixContainerReference = this.sufixContainer.nativeElement;

            if (widthKpiContainer > 0) {
                this.containerHeight = heightKpiContainer;
                this.containerWidth = widthKpiContainer;
                if (this.useHoverResize && !this.baseWidth) {
                    this.baseWidth = widthKpiContainer;
                }
            }

            // Auto margin
            sufixContainerReference.style.margin = "auto";
        }
    }

    private computeBaseSize(): number {
        let resultSize: number = this.containerHeight / 2;
        const sufix = this.inject.sufix || '';
        const ratio = (this.containerHeight / this.containerWidth);
        const textLongitude = this.inject.value.toString().length;
        let textWidth = textLongitude * resultSize;
        if ((textWidth > this.containerWidth) && (sufix.length < 4)) resultSize = (this.containerWidth / textLongitude) * 1.4;
        if (resultSize > this.containerHeight && ratio < 0.4) resultSize = this.containerHeight;
        if (textLongitude * resultSize > this.containerWidth * 1.2 && ratio < 0.4) resultSize = resultSize / 1.5;
        if (sufix.length > 4 && this.containerHeight < (resultSize * 4) && this.containerWidth < textWidth) {
            resultSize = resultSize / 1.8;
        }
        if (this.showChart) {
            resultSize = resultSize / 1.8;
        }
        return resultSize;
    }

    setSufix(): void {
        this.sufixClick = !this.sufixClick;
        if (this.useHoverResize) {
            this.onNotify.emit({ sufix: this.inject.sufix, fontScale: this.inject.fontScale });
        } else {
            this.onNotify.emit({ sufix: this.inject.sufix });
        }
    }

    onMouseEnter(): void {
        this.isHovered = true;
    }

    onMouseLeave(): void {
        this.isHovered = false;
    }

    shouldShowControls(): boolean {
        return this.useHoverResize && !!this.inject?.showResizeControls && this.isHovered;
    }

    getStyle(): any {
        return {
            'font-weight': 'bold',
            'font-size': this.getFontSize(),
            'line-height': '1',
            color: this.color,
            'font-family': this.family,
        };
    }

    getImageStyle(): any {
        const size = this.getFontSize();
        const maxW = this.containerWidth > 0 ? `${Math.round(this.containerWidth * 0.5)}px` : '50%';
        return {
            height: size,
            'max-height': size,
            width: 'auto',
            'max-width': maxW,
            'object-fit': 'contain',
            'flex-shrink': '0',
            display: 'block',
        };
    }

    /**
     * This function returns a string with the given font size (in px) based on the panel width and height 
     * @returns {string}
    */
    getFontSize(): string {
        this.initDimensions();

        let resultSize: number = this.containerHeight / 3;
        let textLongitude = (this.inject.value + this.inject.sufix).length;
        const ratio = (  this.containerHeight / this.containerWidth ) ;

        const sufix = this.inject.sufix || '';

        textLongitude = this.inject.value.toString().length

        // Checks
        let textWidth = textLongitude * resultSize;
        // Resize based on width
        if ( ( textWidth > this.containerWidth )  && ( sufix.length < 4 ) ) resultSize = (this.containerWidth / textLongitude) * 1.4;
        // Resize based on height
        if (resultSize > this.containerHeight   && ratio < 0.4  ) resultSize = this.containerHeight;
        // Final check
        if (textLongitude * resultSize > this.containerWidth * 1.2   && ratio < 0.4  )  resultSize = resultSize / 1.5;
        // If there is a suffix and it is very large, check that it does not overflow
        if (sufix.length > 4 && this.containerHeight < (resultSize * 4) && this.containerWidth < textWidth) {
            resultSize = resultSize / 1.8;
        }
        // If there is a chart, make it smaller
        if (this.inject.showChart) {
            resultSize = resultSize / 1.8;
        }
        const isMobile = window.innerWidth < 640;
        if(isMobile) {
            resultSize = 40;
        }
        if (this.useHoverResize) {
            // SDA mode: multiplicative factor adjusted via hover +/- buttons
            resultSize *= this.getEffectiveScale();
        } else if (this.inject.modifiedFontPoints) {
            // EDA mode: additive offset set from the KPI dialog
            resultSize += this.inject.modifiedFontPoints;
        }
        return resultSize.toFixed().toString() + 'px';
    }

    increaseFont(): void {
        this.updateFontScale(this.fontScaleStep);
    }

    decreaseFont(): void {
        this.updateFontScale(-this.fontScaleStep);
    }

    private updateFontScale(delta: number): void {
        const current = typeof this.inject.fontScale === 'number' ? this.inject.fontScale : 1;
        const next = this.clampFontScale(current + delta);
        this.inject.fontScale = next;
        if (this.containerWidth > 0) {
            this.baseWidth = this.containerWidth;
        }
        this.onNotify.emit({ sufix: this.inject.sufix, fontScale: this.inject.fontScale });
    }

    private clampFontScale(value: number): number {
        return Math.max(this.minFontScale, Math.min(this.maxFontScale, value));
    }

    private getEffectiveScale(): number {
        const scale = typeof this.inject.fontScale === 'number' ? this.inject.fontScale : 1;
        if (!this.baseWidth || this.baseWidth <= 0 || this.containerWidth <= 0) {
            return scale;
        }
        const ratio = this.containerWidth / this.baseWidth;
        const withinTolerance = ratio >= (1 - this.scaleTolerance) && ratio <= (1 + this.scaleTolerance);
        return withinTolerance ? scale : 1;
    }

    public updateChart(): void {
        if (this.inject.edaChart && this.edaChartComponent) {
            this.edaChartComponent.updateChart();
        }
    }

}
