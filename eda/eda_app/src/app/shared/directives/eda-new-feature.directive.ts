/* SDA CUSTOM - new-feature-tooltip */
import {
    Directive,
    ElementRef,
    Input,
    OnInit,
    OnDestroy,
    Renderer2
} from '@angular/core';
import { NewFeatureService } from '../../services/utils/new-feature.service';

@Directive({
    selector: '[edaNewFeature]'
})
export class EdaNewFeatureDirective implements OnInit, OnDestroy {
    /* SDA CUSTOM */
    @Input() featureKey: string;
    /* SDA CUSTOM */
    @Input() featureDays: number = 30;
    /* SDA CUSTOM */
    @Input() featureDescriptionLabel: string;

    private badgeElement: HTMLElement | null = null;
    private tooltipElement: HTMLElement | null = null;
    private clickRemoveFn: (() => void) | null = null;
    private mouseEnterRemoveFn: (() => void) | null = null;
    private mouseLeaveRemoveFn: (() => void) | null = null;
    private hostElement: HTMLElement;
    private styleInjected: boolean = false;

    constructor(
        private el: ElementRef,
        private renderer: Renderer2,
        private newFeatureService: NewFeatureService
    ) {
        this.hostElement = this.el.nativeElement;
    }

    ngOnInit(): void {
        /* SDA CUSTOM */
        this.injectStyles();
        this.newFeatureService.registerFeature(this.featureKey, this.featureDays);
        if (this.newFeatureService.shouldShow(this.featureKey)) {
            this.injectBadge();
            this.injectTooltip();
        }
    }

    ngOnDestroy(): void {
        /* SDA CUSTOM */
        this.removeBadge();
        this.removeTooltip();
        if (this.clickRemoveFn) {
            this.clickRemoveFn();
        }
        if (this.mouseEnterRemoveFn) {
            this.mouseEnterRemoveFn();
        }
        if (this.mouseLeaveRemoveFn) {
            this.mouseLeaveRemoveFn();
        }
    }

    private injectStyles(): void {
        /* SDA CUSTOM */
        if (this.styleInjected) return;
        this.styleInjected = true;

        const styleId = 'eda-new-feature-styles';
        if (document.getElementById(styleId)) return;

        const styleEl = this.renderer.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
            .eda-new-feature-badge {
                position: absolute;
                top: -8px;
                right: -8px;
                background-color: #3b8132;
                color: #ffffff;
                font-size: 10px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 4px;
                cursor: pointer;
                z-index: 9999;
                animation: eda-pulse 2s infinite;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .eda-new-feature-badge:hover {
                background-color: #2d6630;
            }
            @keyframes eda-pulse {
                0% { box-shadow: 0 0 0 0 rgba(59, 129, 50, 0.7); }
                70% { box-shadow: 0 0 0 6px rgba(59, 129, 50, 0); }
                100% { box-shadow: 0 0 0 0 rgba(59, 129, 50, 0); }
            }
            .eda-new-feature-tooltip {
                position: absolute;
                top: calc(100% + 8px);
                right: -8px;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                padding: 12px 16px;
                max-width: 280px;
                min-width: 200px;
                z-index: 9998;
                display: none;
            }
            .eda-new-feature-tooltip-title {
                color: #3b8132;
                font-weight: bold;
                font-size: 14px;
                margin-bottom: 8px;
                display: flex;
                align-items: center;
            }
            .eda-new-feature-tooltip-desc {
                color: #333333;
                font-size: 12px;
                line-height: 1.4;
                margin-bottom: 10px;
            }
            .eda-new-feature-tooltip-hint {
                color: #888888;
                font-size: 11px;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .eda-new-feature-tooltip-hint i {
                font-size: 12px;
            }
        `;
        this.renderer.appendChild(document.head, styleEl);
    }

    private injectBadge(): void {
        /* SDA CUSTOM */
        this.badgeElement = this.renderer.createElement('span');
        this.badgeElement.className = 'eda-new-feature-badge';
        this.renderer.appendChild(this.hostElement, this.badgeElement);
        this.renderer.setStyle(this.hostElement, 'position', 'relative');

        this.clickRemoveFn = this.renderer.listen(this.badgeElement, 'click', () => this.onDismiss());
    }

    private injectTooltip(): void {
        /* SDA CUSTOM */
        this.tooltipElement = this.renderer.createElement('div');
        this.tooltipElement.className = 'eda-new-feature-tooltip';
        this.tooltipElement.innerHTML = `
            <div class="eda-new-feature-tooltip-title">
                <i class="pi pi-star" style="margin-right: 6px;"></i>
                <span>{{ 'newFeatureTitle' | translate }}</span>
            </div>
            <div class="eda-new-feature-tooltip-desc">{{ '${this.featureDescriptionLabel}' | translate }}</div>
            <div class="eda-new-feature-tooltip-hint">
                <i class="pi pi-times-circle"></i>
                <span>{{ 'newFeatureClickToDismiss' | translate }}</span>
            </div>
        `;
        this.renderer.appendChild(this.hostElement, this.tooltipElement);
        this.renderer.setStyle(this.tooltipElement, 'display', 'none');

        this.mouseEnterRemoveFn = this.renderer.listen(this.badgeElement, 'mouseenter', () => this.showTooltip());
        this.mouseLeaveRemoveFn = this.renderer.listen(this.badgeElement, 'mouseleave', () => this.hideTooltip());
    }

    private showTooltip(): void {
        /* SDA CUSTOM */
        if (this.tooltipElement) {
            this.renderer.setStyle(this.tooltipElement, 'display', 'block');
        }
    }

    private hideTooltip(): void {
        /* SDA CUSTOM */
        if (this.tooltipElement) {
            this.renderer.setStyle(this.tooltipElement, 'display', 'none');
        }
    }

    private onDismiss(): void {
        /* SDA CUSTOM */
        this.newFeatureService.dismissFeature(this.featureKey);
        this.removeBadge();
        this.removeTooltip();
    }

    private removeBadge(): void {
        /* SDA CUSTOM */
        if (this.badgeElement && this.badgeElement.parentNode) {
            this.renderer.removeChild(this.hostElement, this.badgeElement);
            this.badgeElement = null;
        }
    }

    private removeTooltip(): void {
        /* SDA CUSTOM */
        if (this.tooltipElement && this.tooltipElement.parentNode) {
            this.renderer.removeChild(this.hostElement, this.tooltipElement);
            this.tooltipElement = null;
        }
    }
}