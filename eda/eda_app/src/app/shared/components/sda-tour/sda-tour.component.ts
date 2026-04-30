// SDA CUSTOM - Reusable guided tour component with spotlight and animated tooltip
import {
  Component,
  Input,
  HostListener,
  ChangeDetectorRef,
  OnDestroy,
  ViewEncapsulation
} from "@angular/core";

export interface SdaTourStep {
  selector: string;
  title: string;
  text: string;
}

/* SDA CUSTOM */  @Component({
/* SDA CUSTOM */    selector: "sda-tour",
/* SDA CUSTOM */    templateUrl: "./sda-tour.component.html",
/* SDA CUSTOM */    styleUrls: ["./sda-tour.component.css"],
/* SDA CUSTOM */    encapsulation: ViewEncapsulation.None
/* SDA CUSTOM */  })
/* SDA CUSTOM */  export class SdaTourComponent implements OnDestroy {
/* SDA CUSTOM */    @Input() public steps: SdaTourStep[] = [];
/* SDA CUSTOM */    @Input() public storageKey: string = "sdaTourCompleted_v1";

/* SDA CUSTOM */    public active: boolean = false;
/* SDA CUSTOM */    public visible: boolean = false;
/* SDA CUSTOM */    public stepIndex: number = 0;
/* SDA CUSTOM */    public title: string = "";
/* SDA CUSTOM */    public text: string = "";
/* SDA CUSTOM */    public tooltipTop: number = 0;
/* SDA CUSTOM */    public tooltipLeft: number = 0;
/* SDA CUSTOM */    public arrowDir: "up" | "down" = "up";
/* SDA CUSTOM */    public arrowOffset: number = 24;
/* SDA CUSTOM */    public spotlightTop: number = 0;
/* SDA CUSTOM */    public spotlightLeft: number = 0;
/* SDA CUSTOM */    public spotlightWidth: number = 0;
/* SDA CUSTOM */    public spotlightHeight: number = 0;

/* SDA CUSTOM */    private highlightedEl: HTMLElement | null = null;

/* SDA CUSTOM */    public get totalSteps(): number {
/* SDA CUSTOM */      return this.steps.length;
/* SDA CUSTOM */    }

/* SDA CUSTOM */    public get progressPercent(): number {
/* SDA CUSTOM */      return this.totalSteps > 0 ? ((this.stepIndex + 1) / this.totalSteps) * 100 : 0;
/* SDA CUSTOM */    }

/* SDA CUSTOM */    public get stepDots(): number[] {
/* SDA CUSTOM */      return this.steps.slice(0, 12).map((_, i) => i);
/* SDA CUSTOM */    }

/* SDA CUSTOM */    public get isFirst(): boolean {
/* SDA CUSTOM */      return this.stepIndex === 0;
/* SDA CUSTOM */    }

/* SDA CUSTOM */    public get isLast(): boolean {
/* SDA CUSTOM */      return this.stepIndex === this.totalSteps - 1;
/* SDA CUSTOM */    }

/* SDA CUSTOM */    constructor(private cdr: ChangeDetectorRef) {}

/* SDA CUSTOM */    public ngOnDestroy(): void {
/* SDA CUSTOM */      this.clearHighlight();
/* SDA CUSTOM */    }

/* SDA CUSTOM */    public start(): void {
/* SDA CUSTOM */      this.stepIndex = 0;
/* SDA CUSTOM */      this.active = true;
/* SDA CUSTOM */      this.visible = false;
/* SDA CUSTOM */      this.renderStep();
/* SDA CUSTOM */    }

/* SDA CUSTOM */    public autoStartIfNeeded(): void {
/* SDA CUSTOM */      const alreadyDone = localStorage.getItem(this.storageKey) === "true";
/* SDA CUSTOM */      if (!alreadyDone) {
/* SDA CUSTOM */        this.start();
/* SDA CUSTOM */      }
/* SDA CUSTOM */    }

/* SDA CUSTOM */    public next(): void {
/* SDA CUSTOM */      this.visible = false;
/* SDA CUSTOM */      this.stepIndex++;
/* SDA CUSTOM */      setTimeout(() => this.renderStep(), 80);
/* SDA CUSTOM */    }

/* SDA CUSTOM */    public previous(): void {
/* SDA CUSTOM */      this.visible = false;
/* SDA CUSTOM */      for (let i = this.stepIndex - 1; i >= 0; i--) {
/* SDA CUSTOM */        const el = document.querySelector(this.steps[i]?.selector) as HTMLElement;
/* SDA CUSTOM */        if (el && this.isElVisible(el)) {
/* SDA CUSTOM */          this.stepIndex = i;
/* SDA CUSTOM */          setTimeout(() => this.renderStep(), 80);
/* SDA CUSTOM */          return;
/* SDA CUSTOM */        }
/* SDA CUSTOM */      }
/* SDA CUSTOM */      this.stepIndex = 0;
/* SDA CUSTOM */      setTimeout(() => this.renderStep(), 80);
/* SDA CUSTOM */    }

/* SDA CUSTOM */    public skip(): void {
/* SDA CUSTOM */      localStorage.setItem(this.storageKey, "true");
/* SDA CUSTOM */      this.close();
/* SDA CUSTOM */    }

/* SDA CUSTOM */    public finish(): void {
/* SDA CUSTOM */      localStorage.setItem(this.storageKey, "true");
/* SDA CUSTOM */      this.close();
/* SDA CUSTOM */    }

/* SDA CUSTOM */    @HostListener("window:resize")
/* SDA CUSTOM */    @HostListener("window:scroll")
/* SDA CUSTOM */    public onViewportChange(): void {
/* SDA CUSTOM */      if (this.active && this.visible) {
/* SDA CUSTOM */        this.repositionTooltip();
/* SDA CUSTOM */      }
/* SDA CUSTOM */    }

/* SDA CUSTOM */    @HostListener("window:keydown", ["$event"])
/* SDA CUSTOM */    public onKeydown(event: KeyboardEvent): void {
/* SDA CUSTOM */      if (!this.active) return;
/* SDA CUSTOM */      if (event.key === "ArrowRight") {
/* SDA CUSTOM */        event.preventDefault();
/* SDA CUSTOM */        this.isLast ? this.finish() : this.next();
/* SDA CUSTOM */      } else if (event.key === "ArrowLeft") {
/* SDA CUSTOM */        event.preventDefault();
/* SDA CUSTOM */        this.previous();
/* SDA CUSTOM */      } else if (event.key === "Escape") {
/* SDA CUSTOM */        event.preventDefault();
/* SDA CUSTOM */        this.skip();
/* SDA CUSTOM */      }
/* SDA CUSTOM */    }

/* SDA CUSTOM */    private renderStep(): void {
/* SDA CUSTOM */      const nextIdx = this.findNextVisible(this.stepIndex);
/* SDA CUSTOM */      if (nextIdx === -1) {
/* SDA CUSTOM */        this.finish();
/* SDA CUSTOM */        return;
/* SDA CUSTOM */      }

/* SDA CUSTOM */      this.stepIndex = nextIdx;
/* SDA CUSTOM */      const step = this.steps[this.stepIndex];
/* SDA CUSTOM */      const target = document.querySelector(step.selector) as HTMLElement;

/* SDA CUSTOM */      if (!target || !this.isElVisible(target)) {
/* SDA CUSTOM */        this.stepIndex++;
/* SDA CUSTOM */        this.renderStep();
/* SDA CUSTOM */        return;
/* SDA CUSTOM */      }

/* SDA CUSTOM */      this.clearHighlight();
/* SDA CUSTOM */      this.highlightedEl = target;
/* SDA CUSTOM */      target.classList.add("sda-tour-highlight");

/* SDA CUSTOM */      this.title = step.title;
/* SDA CUSTOM */      this.text = step.text;

/* SDA CUSTOM */      target.scrollIntoView({ behavior: "smooth", block: "center" });

/* SDA CUSTOM */      setTimeout(() => {
/* SDA CUSTOM */        this.computePosition(target);
/* SDA CUSTOM */        this.visible = true;
/* SDA CUSTOM */        this.cdr.detectChanges();
/* SDA CUSTOM */      }, 150);
/* SDA CUSTOM */    }

/* SDA CUSTOM */    private repositionTooltip(): void {
/* SDA CUSTOM */      if (!this.highlightedEl) return;
/* SDA CUSTOM */      this.computePosition(this.highlightedEl);
/* SDA CUSTOM */      this.cdr.detectChanges();
/* SDA CUSTOM */    }

/* SDA CUSTOM */    private computePosition(target: HTMLElement): void {
/* SDA CUSTOM */      const rect = target.getBoundingClientRect();
/* SDA CUSTOM */      const TW = 380;
/* SDA CUSTOM */      const TPad = 12;
/* SDA CUSTOM */      const padding = 8;

/* SDA CUSTOM */      this.spotlightTop = rect.top - padding;
/* SDA CUSTOM */      this.spotlightLeft = rect.left - padding;
/* SDA CUSTOM */      this.spotlightWidth = rect.width + padding * 2;
/* SDA CUSTOM */      this.spotlightHeight = rect.height + padding * 2;

/* SDA CUSTOM */      const left = Math.min(
/* SDA CUSTOM */        Math.max(rect.left + rect.width / 2 - TW / 2, TPad),
/* SDA CUSTOM */        window.innerWidth - TW - TPad
/* SDA CUSTOM */      );
/* SDA CUSTOM */      const topBelow = rect.bottom + padding + 16;
/* SDA CUSTOM */      const topAbove = rect.top - padding - 290;
/* SDA CUSTOM */      const shouldPlaceAbove = topBelow > window.innerHeight - 310;
/* SDA CUSTOM */      const safeTop = shouldPlaceAbove ? Math.max(topAbove, 12) : topBelow;

/* SDA CUSTOM */      const targetCenter = rect.left + rect.width / 2;
/* SDA CUSTOM */      const arrowOffset = Math.min(Math.max(targetCenter - left, 24), TW - 24);

/* SDA CUSTOM */      this.tooltipTop = safeTop;
/* SDA CUSTOM */      this.tooltipLeft = left;
/* SDA CUSTOM */      this.arrowDir = shouldPlaceAbove ? "down" : "up";
/* SDA CUSTOM */      this.arrowOffset = arrowOffset;
/* SDA CUSTOM */    }

/* SDA CUSTOM */    private findNextVisible(from: number): number {
/* SDA CUSTOM */      for (let i = from; i < this.steps.length; i++) {
/* SDA CUSTOM */        const el = document.querySelector(this.steps[i]?.selector) as HTMLElement;
/* SDA CUSTOM */        if (el && this.isElVisible(el)) return i;
/* SDA CUSTOM */      }
/* SDA CUSTOM */      return -1;
/* SDA CUSTOM */    }

/* SDA CUSTOM */    private isElVisible(el: HTMLElement): boolean {
/* SDA CUSTOM */      if (!el) return false;
/* SDA CUSTOM */      const s = window.getComputedStyle(el);
/* SDA CUSTOM */      if (s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
/* SDA CUSTOM */      const r = el.getBoundingClientRect();
/* SDA CUSTOM */      return r.width > 0 && r.height > 0;
/* SDA CUSTOM */    }

/* SDA CUSTOM */    private close(): void {
/* SDA CUSTOM */      this.active = false;
/* SDA CUSTOM */      this.visible = false;
/* SDA CUSTOM */      this.clearHighlight();
/* SDA CUSTOM */    }

/* SDA CUSTOM */    private clearHighlight(): void {
/* SDA CUSTOM */      if (this.highlightedEl) {
/* SDA CUSTOM */        this.highlightedEl.classList.remove("sda-tour-highlight");
/* SDA CUSTOM */        this.highlightedEl = null;
/* SDA CUSTOM */      }
/* SDA CUSTOM */    }
/* SDA CUSTOM */  }
// END SDA CUSTOM
