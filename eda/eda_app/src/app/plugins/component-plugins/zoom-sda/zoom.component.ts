import { Component, Input, OnDestroy, OnInit } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';

const ZOOM_STORAGE_KEY = 'dashboardZoomLevel';
const ZOOM_MIN = 25;
const ZOOM_MAX = 100;
const ZOOM_STEP = 5;
// Only the gridster (the "DASHBOARD CONTENT" grid of panels) is scaled;
// the header and filters above it must stay static.
const ZOOM_TARGET_SELECTOR = 'gridster.dashboard-grid';

@Component({
    standalone: true,
    selector: 'zoom-sda',
    imports: [CommonModule, FormsModule, ButtonModule, TooltipModule],
    templateUrl: './zoom.component.html',
    styleUrls: ["./zoom.component.css"]
})

export class ZoomSdaComponent implements OnInit, OnDestroy {

    // Host dashboard page (passed as `[dashboard]="this"`), used to read
    // dashboard state such as edit permissions.
    @Input() dashboard: any;

    public zoomLevel: number = 100;
    private zoomInterval: any;

    constructor() { }

    ngOnInit() {
        const saved = Number(localStorage.getItem(ZOOM_STORAGE_KEY));
        if (saved >= ZOOM_MIN && saved <= ZOOM_MAX) {
            this.zoomLevel = saved;
            this.applyZoom();
        }
    }

    ngOnDestroy() {
        this.stopContinuousZoom();
    }

    public canIedit(): boolean {
        return !!this.dashboard?.canIedit?.();
    }

    public zoomIn(): void {
        this.setZoom(this.zoomLevel + ZOOM_STEP);
    }

    public zoomOut(): void {
        this.setZoom(this.zoomLevel - ZOOM_STEP);
    }

    public resetZoom(): void {
        this.setZoom(100);
    }

    public startContinuousZoom(direction: 'in' | 'out'): void {
        this.stopContinuousZoom();
        this.zoomInterval = setInterval(() => {
            direction === 'in' ? this.zoomIn() : this.zoomOut();
        }, 150);
    }

    public stopContinuousZoom(): void {
        if (this.zoomInterval) {
            clearInterval(this.zoomInterval);
            this.zoomInterval = null;
        }
    }

    private setZoom(value: number): void {
        const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value));
        if (clamped === this.zoomLevel) return;
        this.zoomLevel = clamped;
        this.applyZoom();
        localStorage.setItem(ZOOM_STORAGE_KEY, String(this.zoomLevel));
    }

    private applyZoom(): void {
        const target = document.querySelector<HTMLElement>(ZOOM_TARGET_SELECTOR);
        if (!target) return;
        target.style.transition = 'transform 0.9s cubic-bezier(0.19, 1, 0.22, 1), box-shadow 0.2s, outline-color 0.2s';
        target.style.transform = `scale(${this.zoomLevel / 100})`;
        target.style.transformOrigin = 'top left';

        if (this.zoomLevel < 100) {
            target.style.setProperty('outline', '0.5px solid rgba(198, 219, 243, 1)', 'important');
            target.style.setProperty('outline-offset', '0.5px', 'important');
            target.style.setProperty('box-shadow', '0 0 20px 1px rgba(198, 219, 243, 1)', 'important');
        } else {
            target.style.removeProperty('outline');
            target.style.removeProperty('outline-offset');
            target.style.removeProperty('box-shadow');
        }
    }
}
