import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { FormsModule, ReactiveFormsModule, UntypedFormBuilder, } from "@angular/forms";
import { AlertService, DashboardService } from "@eda/services/service.index";
import { SharedModule } from "@eda/shared/shared.module";
import { MultiSelectModule } from "primeng/multiselect";
import { FloatLabelModule } from 'primeng/floatlabel';
import { SelectButtonModule } from "primeng/selectbutton";
import { DashboardPage } from "../dashboard.page";
import { EdaDialog2Component } from "@eda/shared/components/shared-components.index";

@Component({
  selector: 'app-dashboard-tag-modal',
  standalone: true,
  templateUrl: './dashboard-tag.modal.html',
  styleUrls: ['./dashboard-tag.modal.css'],
  imports: [SharedModule, ReactiveFormsModule, FormsModule, SelectButtonModule, MultiSelectModule, FloatLabelModule, EdaDialog2Component]
})

export class DashboardTagModal implements OnInit {
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Input() dashboard: DashboardPage;
  public display: boolean = false;

  public newTag: any;
  public tags: any[] = [];
  public selectedTags: any[] = [];

  // Synthetic entries the home page's tag bar adds on top of real tags — never real tags.
  private readonly nonAssignableTagLabels = [
    $localize`:@@NoTag:Sin Etiqueta`,
    $localize`:@@AllTagsFlat:Todo`,
    $localize`:@@AllTagsGrouped:Todo agrupado`,
  ];

  constructor(private alertService: AlertService, private dashboardService: DashboardService) { }

  ngOnInit(): void {
    const tags = this.dashboard.selectedTags;
    this.selectedTags = tags == null ? [] : (Array.isArray(tags) ? tags : [tags]);
    this.tags = this.localTags(); // Avoids showing "null" before the full catalog loads.

    this.loadExistingTags();
  }

  private localTags(): any[] {
    return this.selectedTags
      .filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '')
      .map(tag => ({ label: tag, value: tag }));
  }

  // No shared tag catalog exists, so build it from every visible dashboard.
  private loadExistingTags(): void {
    this.dashboardService.getDashboards().subscribe((resp: any) => {
      const allDashboards = [
        ...(resp?.open || []),
        ...(resp?.common || []),
        ...(resp?.group || []),
        ...(resp?.private || []),
      ];

      const remoteTags = allDashboards
        .flatMap(db => db?.config?.tag)
        .filter(tag => tag !== null && tag !== undefined)
        .flatMap(tag => Array.isArray(tag) ? tag : [tag])
        .filter(tag => typeof tag !== 'string' || tag.trim() !== '')
        .map(tag => typeof tag === 'string' ? { label: tag, value: tag } : tag);

      this.tags = Array.from(new Map([...remoteTags, ...this.localTags(), ...this.tags].map(item => [item.label, item])).values())
        .filter(tag => !this.nonAssignableTagLabels.includes(tag.label));
    });
  }

  public setNewTag() {
    const trimmed = (this.newTag || '').trim();
    const repeated = this.tags.some(tag => (trimmed.toUpperCase() === String(tag.value).toUpperCase()));

    if (trimmed.length === 0) {
      this.newTag = '';
      this.alertService.addError($localize`:@@emptyTag:Este tag esta vacío`);
    } else if (repeated) {
      this.newTag = '';
      this.alertService.addError($localize`:@@existentTag:Este tag ya existe`);
    } else {
      const tag = { label: trimmed, value: trimmed };
      this.tags = [...this.tags, tag];
      this.newTag = '';
      this.alertService.addSuccess($localize`:@@tagCreated:Etiqueta creada correctamente`);
      this.selectedTags = [...(this.selectedTags || []), tag.label];
    }
  }

  public onApply() {
    this.display = false;
    // Convert tag objects to strings, dropping empty/null selections
    const normalizedTags = this.selectedTags
      .map(tag => (typeof tag === 'string' ? tag : (tag?.value ?? tag?.label)))
      .map(tag => typeof tag === 'string' ? tag.trim() : tag)
      .filter(tag => tag !== null && tag !== undefined && tag !== '');
    this.close.emit(normalizedTags);
    this.alertService.addSuccess($localize`:@@tagAssigned:Etiqueta asignada correctamente`);
  }

  public disableApply(): boolean {
    return false;
  }

  public onClose(): void {
    this.display = false;
    this.close.emit();
  }
}
