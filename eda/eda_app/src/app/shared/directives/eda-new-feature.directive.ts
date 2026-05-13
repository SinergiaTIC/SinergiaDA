/* SDA CUSTOM - new-feature-tooltip */
import {
    Directive,
    ElementRef,
    Input,
    OnInit,
    OnDestroy,
    Renderer2,
    Inject,
    PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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

    private backdropElement: HTMLElement | null = null;
    private hostElement: HTMLElement;
    private styleInjected: boolean = false;
    private isBrowser: boolean;
    private dismissHandler: (() => void) | null = null;

    constructor(
        private el: ElementRef,
        private renderer: Renderer2,
        private newFeatureService: NewFeatureService,
        @Inject(PLATFORM_ID) platformId: object
    ) {
        this.hostElement = this.el.nativeElement;
        this.isBrowser = isPlatformBrowser(platformId);
    }

    ngOnInit(): void {
        /* SDA CUSTOM */
        if (!this.isBrowser) return;
        this.injectStyles();
        this.newFeatureService.registerFeature(this.featureKey, this.featureDays);
        if (this.newFeatureService.shouldShow(this.featureKey)) {
            this.newFeatureService.registerTooltip(
                this.featureKey,
                () => this.showTooltip(),
                () => this.hideTooltip()
            );
        }
    }

    ngOnDestroy(): void {
        /* SDA CUSTOM */
        this.hideTooltip();
        if (this.dismissHandler) {
            this.dismissHandler();
        }
    }

    private getTranslation(key: string): string {
        /* SDA CUSTOM */
        const translations: { [key: string]: string } = {
            'newFeatureTitle': 'Nuevo en SinergiaDA',
            'newFeatureDismiss': 'Haz clic para cerrar',
            'newFeatureClearAllFilters': 'Botón para eliminar todos los filtros activos del dashboard',
            'newFeatureLogViewerMenu': 'Aquí se encuentra el nuevo visor de logs de la aplicación. Permite consultar los registros de actividad del sistema y detectar incidencias.'
        };
        return translations[key] || key;
    }

    private injectStyles(): void {
        /* SDA CUSTOM */
        if (this.styleInjected || !this.isBrowser) return;
        this.styleInjected = true;

        const styleId = 'eda-new-feature-styles';
        if (document.getElementById(styleId)) return;

        const styleEl = this.renderer.createElement('style');
        styleEl.id = styleId;
        styleEl.textContent = `
            .eda-new-feature-backdrop {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                bottom: 0 !important;
                background: rgba(0, 0, 0, 0.6) !important;
                z-index: 999999 !important;
                animation: eda-fade-in 0.3s ease !important;
                cursor: pointer !important;
            }
            @keyframes eda-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .eda-new-feature-tooltip {
                position: absolute !important;
                background: #ffffff !important;
                border: 3px solid #ff6b00 !important;
                border-radius: 16px !important;
                box-shadow: 0 12px 40px rgba(255, 107, 0, 0.3) !important;
                padding: 24px 28px !important;
                max-width: 380px !important;
                min-width: 280px !important;
                z-index: 1000000 !important;
                animation: eda-slide-up 0.4s ease !important;
                cursor: default !important;
            }
            @keyframes eda-slide-up {
                from { opacity: 0; transform: translateY(30px) scale(0.95); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .eda-new-feature-tooltip-arrow {
                position: absolute !important;
                width: 20px !important;
                height: 20px !important;
                z-index: 1000001 !important;
                background: #ffffff !important;
            }
            .eda-new-feature-tooltip-arrow.arrow-bottom {
                bottom: -14px !important;
                transform: rotate(45deg) !important;
                border-right: 3px solid #ff6b00 !important;
                border-bottom: 3px solid #ff6b00 !important;
                border-left: none !important;
                border-top: none !important;
            }
            .eda-new-feature-tooltip-arrow.arrow-top {
                top: -14px !important;
                transform: rotate(45deg) !important;
                border-left: 3px solid #ff6b00 !important;
                border-top: 3px solid #ff6b00 !important;
                border-right: none !important;
                border-bottom: none !important;
            }
            .eda-new-feature-tooltip-title {
                color: #ff6b00 !important;
                font-weight: 700 !important;
                font-size: 22px !important;
                margin-bottom: 14px !important;
                display: flex !important;
                align-items: center !important;
                gap: 10px !important;
            }
            .eda-new-feature-tooltip-title-icon {
                font-size: 26px !important;
                color: #ff6b00 !important;
            }
            .eda-new-feature-tooltip-desc {
                color: #555555 !important;
                font-size: 16px !important;
                line-height: 1.6 !important;
                margin-bottom: 16px !important;
            }
            .eda-new-feature-tooltip-hint {
                color: #999999 !important;
                font-size: 14px !important;
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                justify-content: center !important;
                padding-top: 12px !important;
                border-top: 1px solid #f0f0f0 !important;
            }
            .eda-new-feature-tooltip-close {
                position: absolute !important;
                top: 10px !important;
                right: 10px !important;
                background: #f5f5f5 !important;
                border: none !important;
                border-radius: 50% !important;
                cursor: pointer !important;
                color: #666666 !important;
                font-size: 16px !important;
                width: 28px !important;
                height: 28px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                transition: all 0.2s ease !important;
            }
            .eda-new-feature-tooltip-close:hover {
                background: #ff6b00 !important;
                color: #ffffff !important;
            }
            .eda-new-feature-highlight {
                position: relative !important;
                z-index: 1000001 !important;
                box-shadow: 0 0 0 6px #ff6b00, 0 0 0 9999px rgba(0, 0, 0, 0.6) !important;
                border-radius: 8px !important;
                animation: eda-highlight-pulse 2s infinite !important;
            }
            @keyframes eda-highlight-pulse {
                0%, 100% { box-shadow: 0 0 0 6px #ff6b00, 0 0 0 9999px rgba(0, 0, 0, 0.6); }
                50% { box-shadow: 0 0 0 8px #ff8533, 0 0 0 9999px rgba(0, 0, 0, 0.5); }
            }
        `;
        this.renderer.appendChild(document.head, styleEl);
    }

    private showTooltip(): void {
        /* SDA CUSTOM */
        this.hideTooltip();

        const rect = this.hostElement.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const tooltipHeight = 250;
        const showBelow = spaceBelow > tooltipHeight;
        const arrowPosition = showBelow ? 'arrow-top' : 'arrow-bottom';

        this.renderer.addClass(this.hostElement, 'eda-new-feature-highlight');

        this.backdropElement = this.renderer.createElement('div');
        this.backdropElement.className = 'eda-new-feature-tooltip-backdrop';

        const tooltip = this.renderer.createElement('div');
        tooltip.className = 'eda-new-feature-tooltip';

        const arrow = this.renderer.createElement('div');
        arrow.className = `eda-new-feature-tooltip-arrow ${arrowPosition}`;

        const closeBtn = this.renderer.createElement('button');
        closeBtn.className = 'eda-new-feature-tooltip-close';
        this.renderer.setProperty(closeBtn, 'textContent', '\u00D7');

        const title = this.renderer.createElement('div');
        title.className = 'eda-new-feature-tooltip-title';
        title.innerHTML = `<span class="pi pi-star eda-new-feature-tooltip-title-icon"></span><span>${this.getTranslation('newFeatureTitle')}</span>`;

        const desc = this.renderer.createElement('div');
        desc.className = 'eda-new-feature-tooltip-desc';
        this.renderer.setProperty(desc, 'textContent', this.getTranslation(this.featureDescriptionLabel));

        const hint = this.renderer.createElement('div');
        hint.className = 'eda-new-feature-tooltip-hint';
        hint.innerHTML = `<span class="pi pi-times-circle"></span><span>${this.getTranslation('newFeatureDismiss')}</span>`;

        this.renderer.appendChild(tooltip, arrow);
        this.renderer.appendChild(tooltip, closeBtn);
        this.renderer.appendChild(tooltip, title);
        this.renderer.appendChild(tooltip, desc);
        this.renderer.appendChild(tooltip, hint);
        this.renderer.appendChild(this.backdropElement, tooltip);
        this.renderer.appendChild(document.body, this.backdropElement);

        setTimeout(() => {
            const tooltipRect = tooltip.getBoundingClientRect();
            const hostRect = this.hostElement.getBoundingClientRect();
            const hostCenterX = hostRect.left + hostRect.width / 2;
            let tooltipLeft = hostCenterX - tooltipRect.width / 2;

            // Keep tooltip within viewport
            if (tooltipLeft < 20) tooltipLeft = 20;
            if (tooltipLeft + tooltipRect.width > window.innerWidth - 20) {
                tooltipLeft = window.innerWidth - tooltipRect.width - 20;
            }

            if (showBelow) {
                tooltip.style.left = `${tooltipLeft}px`;
                tooltip.style.top = `${hostRect.bottom + 20}px`;
            } else {
                tooltip.style.left = `${tooltipLeft}px`;
                tooltip.style.top = `${hostRect.top - tooltipRect.height - 20}px`;
            }

            // Position arrow pointing to the exact center of the button
            const arrowCenterX = hostCenterX - tooltipLeft;
            arrow.style.left = `${arrowCenterX - 10}px`;
        }, 50);

        const dismiss = () => {
            this.newFeatureService.dismissFeature(this.featureKey);
            this.hideTooltip();
        };

        this.renderer.listen(closeBtn, 'click', (e) => {
            e.stopPropagation();
            dismiss();
        });

        this.renderer.listen(this.backdropElement, 'click', (e) => {
            if (e.target === this.backdropElement) {
                dismiss();
            }
        });

        this.dismissHandler = dismiss;
    }

    private hideTooltip(): void {
        /* SDA CUSTOM */
        this.renderer.removeClass(this.hostElement, 'eda-new-feature-highlight');
        if (this.backdropElement && this.backdropElement.parentNode) {
            this.backdropElement.parentNode.removeChild(this.backdropElement);
        }
        this.backdropElement = null;
    }
}