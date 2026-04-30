/* SDA CUSTOM */ import { Component, HostListener, Input, ChangeDetectorRef } from '@angular/core';
/* SDA CUSTOM */ import { SdaUiHintsService } from '../../../services/utils/sda-ui-hints.service';

/* SDA CUSTOM */ export interface SdaHighlightConfig {
/* SDA CUSTOM */     selector: string;
/* SDA CUSTOM */     title: string;
/* SDA CUSTOM */     text: string;
/* SDA CUSTOM */     storageKey: string;
/* SDA CUSTOM */ }

/* SDA CUSTOM */ @Component({
/* SDA CUSTOM */     selector: 'sda-highlight',
/* SDA CUSTOM */     templateUrl: './sda-highlight.component.html',
/* SDA CUSTOM */     styleUrls: ['./sda-highlight.component.css']
/* SDA CUSTOM */ })
/* SDA CUSTOM */ export class SdaHighlightComponent {
/* SDA CUSTOM */     @Input() public config!: SdaHighlightConfig;

/* SDA CUSTOM */     public active: boolean = false;
/* SDA CUSTOM */     public visible: boolean = false;
/* SDA CUSTOM */     public tooltipInsetBlockStart: number = 0;
/* SDA CUSTOM */     public tooltipInsetInlineStart: number = 0;
/* SDA CUSTOM */     public arrowDir: 'up' | 'down' = 'up';
/* SDA CUSTOM */     public arrowOffset: number = 24;
/* SDA CUSTOM */     public spotlightInsetBlockStart: number = 0;
/* SDA CUSTOM */     public spotlightInsetInlineStart: number = 0;
/* SDA CUSTOM */     public spotlightInlineSize: number = 0;
/* SDA CUSTOM */     public spotlightBlockSize: number = 0;

/* SDA CUSTOM */     private highlightedEl: HTMLElement | null = null;

/* SDA CUSTOM */     constructor(
/* SDA CUSTOM */         private hintsService: SdaUiHintsService,
/* SDA CUSTOM */         private cdr: ChangeDetectorRef
/* SDA CUSTOM */     ) { }

/* SDA CUSTOM */     public autoStart(): void {
/* SDA CUSTOM */         if (!this.config || !this.config.storageKey) {
/* SDA CUSTOM */             return;
/* SDA CUSTOM */         }
/* SDA CUSTOM */         if (this.hintsService.isSeen(this.config.storageKey)) {
/* SDA CUSTOM */             return;
/* SDA CUSTOM */         }
/* SDA CUSTOM */         this.startWithRetries();
/* SDA CUSTOM */     }

/* SDA CUSTOM */     public start(): void {
/* SDA CUSTOM */         this.startWithRetries();
/* SDA CUSTOM */     }

/* SDA CUSTOM */     public dismiss(): void {
/* SDA CUSTOM */         if (this.config?.storageKey) {
/* SDA CUSTOM */             this.hintsService.markSeen(this.config.storageKey);
/* SDA CUSTOM */         }
/* SDA CUSTOM */         this.close();
/* SDA CUSTOM */     }

/* SDA CUSTOM */     @HostListener('window:resize')
/* SDA CUSTOM */     @HostListener('window:scroll')
/* SDA CUSTOM */     public onViewportChange(): void {
/* SDA CUSTOM */         if (this.active && this.visible && this.highlightedEl) {
/* SDA CUSTOM */             this.computePosition(this.highlightedEl);
/* SDA CUSTOM */             this.cdr.detectChanges();
/* SDA CUSTOM */         }
/* SDA CUSTOM */     }

/* SDA CUSTOM */     @HostListener('window:keydown', ['$event'])
/* SDA CUSTOM */     public onKeydown(event: KeyboardEvent): void {
/* SDA CUSTOM */         if (!this.active) {
/* SDA CUSTOM */             return;
/* SDA CUSTOM */         }
/* SDA CUSTOM */         if (event.key === 'Escape' || event.key === 'Enter') {
/* SDA CUSTOM */             event.preventDefault();
/* SDA CUSTOM */             this.dismiss();
/* SDA CUSTOM */         }
/* SDA CUSTOM */     }

/* SDA CUSTOM */     private startWithRetries(): void {
/* SDA CUSTOM */         this.active = true;
/* SDA CUSTOM */         this.visible = false;
/* SDA CUSTOM */         let attempts = 0;
/* SDA CUSTOM */         const retry = () => {
/* SDA CUSTOM */             attempts++;
/* SDA CUSTOM */             const target = this.findTarget();
/* SDA CUSTOM */             if (target) {
/* SDA CUSTOM */                 this.render(target);
/* SDA CUSTOM */                 return;
/* SDA CUSTOM */             }
/* SDA CUSTOM */             if (attempts < 8) {
/* SDA CUSTOM */                 setTimeout(retry, 220);
/* SDA CUSTOM */             } else {
/* SDA CUSTOM */                 this.close();
/* SDA CUSTOM */             }
/* SDA CUSTOM */         };
/* SDA CUSTOM */         setTimeout(retry, 120);
/* SDA CUSTOM */     }

/* SDA CUSTOM */     private render(target: HTMLElement): void {
/* SDA CUSTOM */         this.clearHighlight();
/* SDA CUSTOM */         this.highlightedEl = target;
/* SDA CUSTOM */         target.classList.add('sda-highlight-target');
/* SDA CUSTOM */         target.scrollIntoView({ behavior: 'smooth', block: 'center' });
/* SDA CUSTOM */         setTimeout(() => {
/* SDA CUSTOM */             this.computePosition(target);
/* SDA CUSTOM */             this.visible = true;
/* SDA CUSTOM */             this.cdr.detectChanges();
/* SDA CUSTOM */             requestAnimationFrame(() => {
/* SDA CUSTOM */                 if (this.highlightedEl) {
/* SDA CUSTOM */                     this.computePosition(this.highlightedEl);
/* SDA CUSTOM */                     this.cdr.detectChanges();
/* SDA CUSTOM */                 }
/* SDA CUSTOM */             });
/* SDA CUSTOM */             setTimeout(() => {
/* SDA CUSTOM */                 if (this.highlightedEl) {
/* SDA CUSTOM */                     this.computePosition(this.highlightedEl);
/* SDA CUSTOM */                     this.cdr.detectChanges();
/* SDA CUSTOM */                 }
/* SDA CUSTOM */             }, 260);
/* SDA CUSTOM */         }, 140);
/* SDA CUSTOM */     }

/* SDA CUSTOM */     private computePosition(target: HTMLElement): void {
/* SDA CUSTOM */         const rect = target.getBoundingClientRect();
/* SDA CUSTOM */         const tooltipWidth = 390;
/* SDA CUSTOM */         const spacing = 12;

/* SDA CUSTOM */         this.spotlightInsetBlockStart = rect.top - 8;
/* SDA CUSTOM */         this.spotlightInsetInlineStart = rect.left - 8;
/* SDA CUSTOM */         this.spotlightInlineSize = rect.width + 16;
/* SDA CUSTOM */         this.spotlightBlockSize = rect.height + 16;

/* SDA CUSTOM */         const left = Math.min(
/* SDA CUSTOM */             Math.max(rect.left + rect.width / 2 - tooltipWidth / 2, 12),
/* SDA CUSTOM */             window.innerWidth - tooltipWidth - 12
/* SDA CUSTOM */         );
/* SDA CUSTOM */         const topBelow = rect.bottom + spacing + 12;
/* SDA CUSTOM */         const topAbove = rect.top - 228;
/* SDA CUSTOM */         const placeAbove = topBelow > (window.innerHeight - 240);
/* SDA CUSTOM */         const safeTop = placeAbove ? Math.max(topAbove, 12) : topBelow;

/* SDA CUSTOM */         this.tooltipInsetBlockStart = safeTop;
/* SDA CUSTOM */         this.tooltipInsetInlineStart = left;
/* SDA CUSTOM */         this.arrowDir = placeAbove ? 'down' : 'up';
/* SDA CUSTOM */         this.arrowOffset = Math.min(Math.max((rect.left + rect.width / 2) - left, 26), tooltipWidth - 26);
/* SDA CUSTOM */     }

/* SDA CUSTOM */     private findTarget(): HTMLElement | null {
/* SDA CUSTOM */         if (!this.config?.selector) {
/* SDA CUSTOM */             return null;
/* SDA CUSTOM */         }
/* SDA CUSTOM */         const matches = Array.from(document.querySelectorAll(this.config.selector)) as HTMLElement[];
/* SDA CUSTOM */         if (!matches.length) {
/* SDA CUSTOM */             return null;
/* SDA CUSTOM */         }
/* SDA CUSTOM */         const visible = matches.filter(candidate => {
/* SDA CUSTOM */             const style = window.getComputedStyle(candidate);
/* SDA CUSTOM */             if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
/* SDA CUSTOM */                 return false;
/* SDA CUSTOM */             }
/* SDA CUSTOM */             const rect = candidate.getBoundingClientRect();
/* SDA CUSTOM */             return rect.width > 0 && rect.height > 0;
/* SDA CUSTOM */         });
/* SDA CUSTOM */         if (!visible.length) {
/* SDA CUSTOM */             return null;
/* SDA CUSTOM */         }
/* SDA CUSTOM */         const viewportCenterY = window.innerHeight / 2;
/* SDA CUSTOM */         const viewportCenterX = window.innerWidth / 2;
/* SDA CUSTOM */         visible.sort((a, b) => {
/* SDA CUSTOM */             const ra = a.getBoundingClientRect();
/* SDA CUSTOM */             const rb = b.getBoundingClientRect();
/* SDA CUSTOM */             const da = Math.abs((ra.top + ra.height / 2) - viewportCenterY) + Math.abs((ra.left + ra.width / 2) - viewportCenterX) * 0.25;
/* SDA CUSTOM */             const db = Math.abs((rb.top + rb.height / 2) - viewportCenterY) + Math.abs((rb.left + rb.width / 2) - viewportCenterX) * 0.25;
/* SDA CUSTOM */             return da - db;
/* SDA CUSTOM */         });
/* SDA CUSTOM */         return visible[0] || null;
/* SDA CUSTOM */     }

/* SDA CUSTOM */     private close(): void {
/* SDA CUSTOM */         this.active = false;
/* SDA CUSTOM */         this.visible = false;
/* SDA CUSTOM */         this.clearHighlight();
/* SDA CUSTOM */     }

/* SDA CUSTOM */     private clearHighlight(): void {
/* SDA CUSTOM */         if (this.highlightedEl) {
/* SDA CUSTOM */             this.highlightedEl.classList.remove('sda-highlight-target');
/* SDA CUSTOM */             this.highlightedEl = null;
/* SDA CUSTOM */         }
/* SDA CUSTOM */     }
/* SDA CUSTOM */ }
