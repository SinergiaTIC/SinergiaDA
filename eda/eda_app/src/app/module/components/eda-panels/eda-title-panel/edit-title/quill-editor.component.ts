import { Component, Input, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { Editor } from 'primeng/editor';
import { DomSanitizer } from '@angular/platform-browser';
import { DialogModule } from 'primeng/dialog';
import { PanelChartComponent } from '../../eda-blank-panel/panel-charts/panel-chart.component';
import { EdaContextMenuComponent } from '@eda/shared/components/shared-components.index';
import * as _ from 'lodash';
import { EditorModule } from 'primeng/editor';
import Quill from 'quill';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { ColorPickerModule } from 'primeng/colorpicker';
import { InputSwitchModule } from 'primeng/inputswitch';
import { RadioButtonModule } from 'primeng/radiobutton';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { VerticalAlign } from '@eda/models/dashboard-models/eda-title-panel';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Override Quill Link to open in same tab instead of new tab
const Link = Quill.import('formats/link') as any;
class SameTabLink extends Link {
	static create(value: string) {
		const node = super.create(value);
		node.removeAttribute('target');
		return node;
	}
}
Quill.register('formats/link', SameTabLink, true);

// Custom font sizes in px for the Quill editor
const Size = Quill.import('attributors/style/size') as any;
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '42px', '48px'];
Quill.register(Size, true);

@Component({
	standalone: true,
	selector: 'app-title-dialog',
	templateUrl: './quill-editor.component.html',
	styles: [`
		/* Options side panel */
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

		.title-config-panel {
			max-height: 34vh;
			overflow-y: auto;
			padding-right: 4px;
			display: flex;
			flex-direction: column;
			gap: 4px;
			font-size: 12px;
		}

		.title-config-section {
			padding: 6px 8px 8px 8px;
			border: 1px solid #d9e0ea;
			border-radius: 8px;
			background: #ffffff;
			overflow: visible;
		}

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

		.title-section-actions {
			display: inline-flex;
			align-items: center;
			gap: 4px;
		}

		.title-section-actions .pi {
			font-size: 13px;
			color: #43546a;
		}

		.title-section-head h6 {
			margin: 0;
			border-bottom: none;
			font-size: 12px;
			line-height: 1.1;
			font-weight: bold;
			color: #495057;
			flex: 1;
		}

		.title-section-content {
			padding-top: 4px;
		}

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

		.config-row .p-radiobutton,
		.config-row .p-radiobutton .p-radiobutton-box {
			width: 16px;
			height: 16px;
		}

		.config-row .p-radiobutton .p-radiobutton-box .p-radiobutton-icon {
			width: 8px;
			height: 8px;
		}

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

		.ql-custom-color-btn {
			height: 24px;
			width: 28px;
			padding: 3px 5px;
			border: none;
			background: transparent;
			cursor: pointer;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			vertical-align: middle;
		}

		.ql-custom-color-btn svg {
			width: 18px;
			height: 18px;
		}

		.ql-custom-color-btn:hover .ql-stroke {
			stroke: #06c;
		}

		.ql-custom-color-btn:hover .ql-fill {
			fill: #06c;
		}

		.ql-overlay-picker {
			display: flex;
			flex-direction: column;
			gap: 8px;
			align-items: center;
			padding: 4px;
		}

		.ql-hex-input-popup {
			width: 200px;
			padding: 4px 8px;
			font-size: 12px;
			font-family: monospace;
			border: 1px solid #d9e0ea;
			border-radius: 4px;
			text-align: center;
		}
	`],
	imports: [FormsModule, CommonModule, DialogModule, EdaDialog2Component, PanelChartComponent, EdaContextMenuComponent, EditorModule,
		OverlayPanelModule, ColorPickerModule, InputSwitchModule, RadioButtonModule, ButtonModule, InputTextModule]
})

export class TitleDialogComponent{
	@Input () controller: any;
	@ViewChild('Editor') editor: Editor;
	public header = $localize`:@@PanelOptions:PANEL OPTIONS`;
	public title: string;
	public showPanelBackground: boolean = true;
	public verticalAlign: VerticalAlign = 'center';
	public isAppearanceExpanded: boolean = true;
	public isAlignmentExpanded: boolean = true;
	public borderColor: string = '#d7dde6';
	public showBorder: boolean = true;
	public backgroundColor: string = '#ffffff';
	public customTextColor: string = '#000000';
	public customTextBgColor: string = '#ffffff';
	public showTextColorPicker: boolean = false;
	public showTextBgColorPicker: boolean = false;
	private savedRange: any = null;

	constructor(private sanitizer: DomSanitizer) {}

	public ngOnInit(): void {
		this.title = this.controller.params.title;
		this.showPanelBackground = this.controller.params.backgroundTransparent !== true;
		this.verticalAlign = this.controller.params.verticalAlign || 'center';
		this.borderColor = this.controller.params.borderColor || '#d7dde6';
		this.showBorder = this.controller.params.showBorder !== false;
		this.backgroundColor = this.controller.params.backgroundColor || '#ffffff';
		const urlImage = document.querySelector('#qlUrlImage');
		urlImage?.addEventListener('click', ($event) => this.urlImageHandler(event));
	}

	public onClose(event: EdaDialogCloseEvent, response?: any): void {
		return this.controller.close(event, response);
	}

	public saveChartConfig(): void {
		this.onClose(EdaDialogCloseEvent.UPDATE, {
			title: this.title,
			backgroundTransparent: !this.showPanelBackground,
			verticalAlign: this.verticalAlign,
			borderColor: this.borderColor,
			showBorder: this.showBorder,
			backgroundColor: this.backgroundColor
		});
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

	public openColorOverlay(event: Event, overlay: OverlayPanel): void {
		if (this.editor) {
			const quill = this.editor.getQuill();
			this.savedRange = quill.getSelection();
		}
		overlay.toggle(event);
		event.stopPropagation();
	}

	public onOverlayShow(type: string): void {
		setTimeout(() => {
			if (type === 'textColor') this.showTextColorPicker = true;
			else this.showTextBgColorPicker = true;
		}, 50);
	}

	private applySavedFormat(format: string, value: string): void {
		if (!this.editor || !value) return;
		const quill = this.editor.getQuill();
		if (this.savedRange && this.savedRange.length > 0) {
			quill.formatText(this.savedRange.index, this.savedRange.length, format, value);
			quill.setSelection(this.savedRange.index, this.savedRange.length, 'silent');
		} else {
			quill.format(format, value);
		}
		this.title = quill.root.innerHTML;
	}

	public removeTextFormat(format: string): void {
		if (!this.editor) return;
		const quill = this.editor.getQuill();
		if (this.savedRange && this.savedRange.length > 0) {
			quill.removeFormat(this.savedRange.index, this.savedRange.length);
		}
		this.title = quill.root.innerHTML;
	}

	public onTextColorLive(value: string): void {
		this.applySavedFormat('color', value);
	}

	public onTextBgColorLive(value: string): void {
		this.applySavedFormat('background', value);
	}

	// Toggles expansion/collapse of a side panel section
	toggleSection(section: 'appearance' | 'alignment'): void {
		if (section === 'appearance') {
			this.isAppearanceExpanded = !this.isAppearanceExpanded;
		} else if (section === 'alignment') {
			this.isAlignmentExpanded = !this.isAlignmentExpanded;
		}
	}

}
