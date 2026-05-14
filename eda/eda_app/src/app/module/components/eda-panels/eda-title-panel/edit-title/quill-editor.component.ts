import { Component, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { Editor } from 'primeng/editor';
import { DomSanitizer } from '@angular/platform-browser';
import * as _ from 'lodash';
import Quill from 'quill';
import { VerticalAlign } from '@eda/models/dashboard-models/eda-title-panel';

// SDA CUSTOM - Custom font sizes in px for Quill editor
const Size = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '42px', '48px'];
Quill.register(Size, true);
// END SDA CUSTOM

@Component({
	selector: 'app-title-dialog',
	templateUrl: './quill-editor.component.html',
	// SDA CUSTOM - Styles identical to kpi-options-shell
	styles: [`
		/* Main shell - copied from kpi-options-shell */
		.title-options-shell {
			border: 1px solid #d7dde6;
			border-radius: 10px;
			background: #f7f9fc;
			padding: 10px 10px 8px 10px;
			height: auto;
			align-self: flex-start;
		}

		.title-options-shell__header {
			border-bottom: 1px solid #e3e8ef;
			margin-bottom: 8px;
			padding-bottom: 6px;
		}

		.title-options-title {
			margin: 0;
			font-size: 14px;
			line-height: 1.2;
			font-weight: 600;
			color: #495057;
		}

		/* Config panel - copied from kpi-config-panel */
		.title-config-panel {
			max-height: 34vh;
			overflow-y: auto;
			padding-right: 4px;
			display: flex;
			flex-direction: column;
			gap: 4px;
			font-size: 12px;
		}

		/* Sections - copied from kpi-config-section */
		.title-config-section {
			padding: 6px 8px 8px 8px;
			border: 1px solid #d9e0ea;
			border-radius: 8px;
			background: #ffffff;
			overflow: visible;
		}

		/* Section header - copied from kpi-section-head */
		.title-section-head {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: 8px;
			margin-bottom: 4px;
			padding: 6px 8px;
			border: 1px solid #dfe6f1;
			border-radius: 6px;
			background: #f4f7fb;
			cursor: pointer;
			transition: background-color 0.15s ease, border-color 0.15s ease;
		}

		.title-section-head:hover {
			background: #eef3fb;
			border-color: #cfd9e8;
		}

		.title-config-section.is-expanded .title-section-head {
			background: #eef3fb;
			border-color: #c7d4e8;
		}

		/* Section actions - copied from kpi-section-actions */
		.title-section-actions {
			display: inline-flex;
			align-items: center;
			gap: 4px;
		}

		.title-section-actions .pi {
			font-size: 13px;
			color: #43546a;
		}

		/* Section title - copied from custom-border-b1 in kpi */
		.title-section-head h6 {
			margin: 0;
			border-bottom: none;
			font-size: 12px;
			line-height: 1.1;
			font-weight: bold;
			color: #495057;
			flex: 1;
		}

		/* Section content */
		.title-section-content {
			padding-top: 4px;
		}

		/* Config rows - same style as kpi */
		.config-row {
			display: flex;
			align-items: center;
			padding: 2px 0;
		}

		.config-row label {
			font-size: 12px;
			color: #495057;
			cursor: pointer;
			margin-left: 6px;
		}

		/* Compact radio buttons */
		.config-row .p-radiobutton {
			width: 16px;
			height: 16px;
		}

		.config-row .p-radiobutton .p-radiobutton-box {
			width: 16px;
			height: 16px;
		}

		.config-row .p-radiobutton .p-radiobutton-box .p-radiobutton-icon {
			width: 8px;
			height: 8px;
		}

		/* Compact checkbox */
		.config-row .p-checkbox {
			width: 16px;
			height: 16px;
		}

		.config-row .p-checkbox .p-checkbox-box {
			width: 16px;
			height: 16px;
			border-radius: 3px;
		}

		/* Editor styles */
		:host ::ng-deep .p-editor-container {
			height: 100%;
			border: 1px solid #d7dde6;
			border-radius: 10px;
		}

		:host ::ng-deep .p-editor-content {
			border-bottom-left-radius: 10px;
			border-bottom-right-radius: 10px;
		}

		/* SDA CUSTOM - Options rows styles (copied from kpi-dialog) */
		.chart-color-row {
			display: grid;
			grid-template-columns: minmax(0, 1fr) minmax(110px, 160px);
			align-items: center;
			gap: 4px;
			min-height: 24px;
		}

		@container (max-width: 320px) {
			.chart-color-row {
				grid-template-columns: 1fr;
			}
		}

		.chart-color-row--spaced {
			margin-top: 2px;
		}

		.chart-color-label {
			white-space: normal;
			min-width: 0;
			overflow-wrap: break-word;
			word-break: break-word;
			line-height: 1.2;
			font-size: 12px;
			color: #495057;
		}

		.chart-color-controls {
			display: flex;
			align-items: center;
			gap: 4px;
			justify-content: flex-end;
			width: 100%;
		}

		/* Switch styles - same as kpi-config-panel */
		:host ::ng-deep .title-config-panel .p-inputswitch {
			height: 18px;
			width: 34px;
		}

		:host ::ng-deep .title-config-panel .p-inputswitch .p-inputswitch-slider::before {
			width: 14px;
			height: 14px;
			margin-top: -7px;
			margin-left: -7px;
		}

		/* SDA CUSTOM - Color picker styles (copied from kpi-dialog) */
		:host ::ng-deep .chart-color-picker .p-colorpicker-preview {
			width: 26px;
			height: 26px;
			border-radius: 4px;
			border: 1px solid #d9e0ea;
		}

		:host ::ng-deep .chart-color-input {
			width: 90px;
			padding: 4px 8px;
			font-size: 12px;
			border: 1px solid #d9e0ea;
			border-radius: 4px;
		}
	`]
	// END SDA CUSTOM
})

export class TitleDialogComponent extends EdaDialogAbstract {
	@ViewChild('Editor') editor: Editor;
	public dialog: EdaDialog;
	public title: string;
/* SDA CUSTOM */	public backgroundTransparent: boolean = false;
/* SDA CUSTOM */	public baseWidth: number; // Base width of the panel for proportional scaling
/* SDA CUSTOM */	public verticalAlign: VerticalAlign = 'center'; // Vertical alignment of the title
/* SDA CUSTOM */	public isAppearanceExpanded: boolean = true; // State of the Appearance section
/* SDA CUSTOM */	public isAlignmentExpanded: boolean = true; // State of the Alignment section
/* SDA CUSTOM */	public textColor: string = '#000000'; // Text color of the title
/* SDA CUSTOM */	public borderColor: string = '#d7dde6'; // Border color of the panel
/* SDA CUSTOM */	public showBorder: boolean = true; // Show/hide panel border
	constructor(private sanitizer: DomSanitizer) {
		super();
		this.dialog = new EdaDialog({
			show: () => this.onShow(),
			hide: () => this.onClose(EdaDialogCloseEvent.NONE),
			// SDA CUSTOM - Title updated to reflect panel options
			title: $localize`:@@PanelOptions:PANEL OPTIONS`
		});
		this.dialog.style = { width: '80%', height: '70%', top: "-4em", left: '1em' };
	}

	public onShow(): void {
		this.title = this.controller.params.title;
/* SDA CUSTOM */		this.backgroundTransparent = this.controller.params.backgroundTransparent || false;
/* SDA CUSTOM */		this.baseWidth = this.controller.params.baseWidth;
/* SDA CUSTOM */		this.verticalAlign = this.controller.params.verticalAlign || 'center';
/* SDA CUSTOM */		this.textColor = this.controller.params.textColor || '#000000';
/* SDA CUSTOM */		this.borderColor = this.controller.params.borderColor || '#d7dde6';
/* SDA CUSTOM */		this.showBorder = this.controller.params.showBorder !== false; // default true
		const urlImage = document.querySelector('#qlUrlImage');
		urlImage.addEventListener('click', ($event) => this.urlImageHandler(event));
	}

	public onClose(event: EdaDialogCloseEvent, response?: any): void {
		return this.controller.close(event, response);
	}

	public saveChartConfig(): void {
/* SDA CUSTOM */		this.onClose(EdaDialogCloseEvent.UPDATE, { title: this.title, backgroundTransparent: this.backgroundTransparent, baseWidth: this.baseWidth, verticalAlign: this.verticalAlign, textColor: this.textColor, borderColor: this.borderColor, showBorder: this.showBorder });
	}

	public urlImageHandler(event?: any): void {
		let left = 0;
		if (event) {
			left = _.subtract(event.x, 228);
		}

		const quill = this.editor.getQuill();
		const tooltip = quill.theme.tooltip;
		const originalSave = tooltip.save;
		const originalHide = tooltip.hide;

		tooltip.save = () => {
			const range = quill.getSelection(true);
			const value = tooltip.textbox.value;
			if (value) {
				quill.insertEmbed(range.index, 'image', value, 'user');
			}
		};
		// Called on hide and save.
		tooltip.hide = () => {
			tooltip.save = originalSave;
			tooltip.hide = originalHide;
			tooltip.hide();
		};
		tooltip.edit('image');
		tooltip.textbox.placeholder = 'URL';

		let qlTooltip: any = document.querySelector('.ql-tooltip');
		if (qlTooltip) {
			qlTooltip.style.left = left + 'px';
			qlTooltip.style.top = '-10px';
		}

	}

	public closeChartConfig(): void {
		this.onClose(EdaDialogCloseEvent.NONE);
	}

/* SDA CUSTOM */	// Toggles expansion/collapse of a section
/* SDA CUSTOM */	toggleSection(section: 'appearance' | 'alignment'): void {
/* SDA CUSTOM */		if (section === 'appearance') {
/* SDA CUSTOM */			this.isAppearanceExpanded = !this.isAppearanceExpanded;
/* SDA CUSTOM */		} else if (section === 'alignment') {
/* SDA CUSTOM */			this.isAlignmentExpanded = !this.isAlignmentExpanded;
/* SDA CUSTOM */		}
/* SDA CUSTOM */	}

}