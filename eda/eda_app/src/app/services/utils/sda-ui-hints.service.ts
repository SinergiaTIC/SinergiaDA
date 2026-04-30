/* SDA CUSTOM */ import { Injectable } from '@angular/core';

/* SDA CUSTOM */ @Injectable({ providedIn: 'root' })
/* SDA CUSTOM */ export class SdaUiHintsService {
/* SDA CUSTOM */     public isSeen(storageKey: string): boolean {
/* SDA CUSTOM */         return localStorage.getItem(storageKey) === 'true';
/* SDA CUSTOM */     }

/* SDA CUSTOM */     public markSeen(storageKey: string): void {
/* SDA CUSTOM */         localStorage.setItem(storageKey, 'true');
/* SDA CUSTOM */     }

/* SDA CUSTOM */     public reset(storageKey: string): void {
/* SDA CUSTOM */         localStorage.removeItem(storageKey);
/* SDA CUSTOM */     }
/* SDA CUSTOM */ }
