/* SDA CUSTOM - new-feature-tooltip */
import { Injectable } from '@angular/core';

interface FeatureInfo {
    key: string;
    registeredAt: number;
    days: number;
    dismissedAt: number | null;
}

@Injectable()
export class NewFeatureService {
    private readonly STORAGE_KEY = 'sda_new_features';

    registerFeature(key: string, days: number = 30): void {
        /* SDA CUSTOM */
        const features = this.getAllFeatures();
        if (!features.find(f => f.key === key)) {
            features.push({ key, registeredAt: Date.now(), days, dismissedAt: null });
            this.saveAllFeatures(features);
        }
    }

    dismissFeature(key: string): void {
        /* SDA CUSTOM */
        const features = this.getAllFeatures();
        const feature = features.find(f => f.key === key);
        if (feature) {
            feature.dismissedAt = Date.now();
            this.saveAllFeatures(features);
        }
    }

    shouldShow(key: string): boolean {
        /* SDA CUSTOM */
        const feature = this.getAllFeatures().find(f => f.key === key);
        if (!feature) return true;
        if (feature.dismissedAt !== null) return false;
        const expiryTime = feature.registeredAt + (feature.days * 24 * 60 * 60 * 1000);
        return Date.now() < expiryTime;
    }

    getFeatureInfo(key: string): FeatureInfo | null {
        /* SDA CUSTOM */
        return this.getAllFeatures().find(f => f.key === key) || null;
    }

    clearExpired(): void {
        /* SDA CUSTOM */
        const all = this.getAllFeatures();
        const active = all.filter(f => {
            if (f.dismissedAt !== null) return true;
            const expiryTime = f.registeredAt + (f.days * 24 * 60 * 60 * 1000);
            return Date.now() < expiryTime;
        });
        if (active.length !== all.length) {
            this.saveAllFeatures(active);
        }
    }

    init(): void {
        /* SDA CUSTOM */
        this.clearExpired();
    }

    private getAllFeatures(): FeatureInfo[] {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    }

    private saveAllFeatures(features: FeatureInfo[]): void {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(features));
    }
}