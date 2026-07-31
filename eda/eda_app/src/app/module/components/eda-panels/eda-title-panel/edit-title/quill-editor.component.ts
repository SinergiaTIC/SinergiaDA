import { Component, Input, ViewChild } from '@angular/core';
import { EdaDialog, EdaDialog2Component, EdaDialogAbstract, EdaDialogCloseEvent } from '@eda/shared/components/shared-components.index';
import { Editor } from 'primeng/editor';
import { DomSanitizer } from '@angular/platform-browser';
import { DialogModule } from 'primeng/dialog';
import { PanelChartComponent } from '../../eda-blank-panel/panel-charts/panel-chart.component';
import { EdaContextMenuComponent } from '@eda/shared/components/shared-components.index';
import { EditorModule } from 'primeng/editor';
import Quill from 'quill';
import { ColorPickerModule } from 'primeng/colorpicker';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
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
		/* Editor card */
		:host ::ng-deep .p-editor-container {
			height: 100%;
			display: flex;
			flex-direction: column;
			border: none;
		}

		:host ::ng-deep .p-editor-toolbar {
			border: none;
			border-bottom: 1px solid #e2e8f0;
			background: #f8fafc;
			border-top-left-radius: 0.5rem;
			border-top-right-radius: 0.5rem;
		}

		:host ::ng-deep .p-editor-content {
			flex: 1;
			border: none;
			border-bottom-left-radius: 0.5rem;
			border-bottom-right-radius: 0.5rem;
		}

		:host ::ng-deep .ql-toolbar button:hover .ql-stroke,
		:host ::ng-deep .ql-toolbar .ql-picker-label:hover .ql-stroke {
			stroke: var(--corporate-primary);
		}
		:host ::ng-deep .ql-toolbar button:hover .ql-fill,
		:host ::ng-deep .ql-toolbar .ql-picker-label:hover .ql-fill {
			fill: var(--corporate-primary);
		}
		:host ::ng-deep .ql-toolbar button.ql-active .ql-stroke,
		:host ::ng-deep .ql-toolbar .ql-picker-label.ql-active .ql-stroke {
			stroke: var(--corporate-primary);
		}
		:host ::ng-deep .ql-toolbar button.ql-active .ql-fill,
		:host ::ng-deep .ql-toolbar .ql-picker-label.ql-active .ql-fill {
			fill: var(--corporate-primary);
		}

		/* Wrapper so pTooltip still shows even though Quill replaces the <select> below it */
		.ql-color-tooltip-wrap {
			display: inline-block;
			vertical-align: middle;
		}

		/* Modern restyle of Quill's native text-color / background-color swatch picker */
		:host ::ng-deep .ql-color-picker .ql-picker-options,
		:host ::ng-deep .ql-background .ql-picker-options {
			border: 1px solid #e2e8f0;
			border-radius: 0.5rem;
			box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
			padding: 8px;
			width: auto;
		}

		:host ::ng-deep .ql-color-picker .ql-picker-item {
			width: 18px;
			height: 18px;
			margin: 3px;
			border-radius: 4px;
			border: 1px solid rgba(0, 0, 0, 0.08);
			transition: transform 0.1s ease;
		}

		:host ::ng-deep .ql-color-picker .ql-picker-item:hover,
		:host ::ng-deep .ql-color-picker .ql-picker-item.ql-selected {
			transform: scale(1.15);
			border-color: var(--corporate-primary);
		}

		:host ::ng-deep .ql-color-picker .ql-picker-label,
		:host ::ng-deep .ql-background .ql-picker-label {
			border-radius: 4px;
		}

		:host ::ng-deep .ql-color-picker .ql-picker-label.ql-active,
		:host ::ng-deep .ql-background .ql-picker-label.ql-active {
			background: rgba(var(--corporate-primary-rgb), 0.1);
		}
	`],
	imports: [FormsModule, CommonModule, DialogModule, EdaDialog2Component, PanelChartComponent, EdaContextMenuComponent, EditorModule,
		ColorPickerModule, InputSwitchModule, InputTextModule, TooltipModule]
})

export class TitleDialogComponent{
	@Input () controller: any;
	@ViewChild('Editor') editor: Editor;
	public header = $localize`:@@PanelOptions:PANEL OPTIONS`;
	public title: string;
	public showPanelBackground: boolean = true;
	public verticalAlign: VerticalAlign = 'center';
	public borderColor: string = '#d7dde6';
	public showBorder: boolean = true;
	public backgroundColor: string = '#ffffff';

	// Quill toolbar tooltips
	public tooltipSize = $localize`:@@qlTooltipSize:Tamaño de letra`;
	public tooltipBold = $localize`:@@qlTooltipBold:Negrita`;
	public tooltipItalic = $localize`:@@qlTooltipItalic:Cursiva`;
	public tooltipUnderline = $localize`:@@qlTooltipUnderline:Subrayado`;
	public tooltipStrike = $localize`:@@qlTooltipStrike:Tachado`;
	public tooltipTextColor = $localize`:@@qlTooltipTextColor:Color del texto`;
	public tooltipTextBgColor = $localize`:@@qlTooltipTextBgColor:Color de resaltado del texto`;
	public tooltipSub = $localize`:@@qlTooltipSub:Subíndice`;
	public tooltipSuper = $localize`:@@qlTooltipSuper:Superíndice`;
	public tooltipH1 = $localize`:@@qlTooltipH1:Título 1`;
	public tooltipH2 = $localize`:@@qlTooltipH2:Título 2`;
	public tooltipQuote = $localize`:@@qlTooltipQuote:Cita`;
	public tooltipOrderedList = $localize`:@@qlTooltipOrderedList:Lista numerada`;
	public tooltipBulletList = $localize`:@@qlTooltipBulletList:Lista con viñetas`;
	public tooltipAlignLeft = $localize`:@@qlTooltipAlignLeft:Alinear a la izquierda`;
	public tooltipAlignCenter = $localize`:@@qlTooltipAlignCenter:Centrar`;
	public tooltipAlignRight = $localize`:@@qlTooltipAlignRight:Alinear a la derecha`;
	public tooltipLink = $localize`:@@qlTooltipLink:Insertar enlace`;
	public tooltipImage = $localize`:@@qlTooltipImage:Insertar imagen desde un archivo`;
	public tooltipVideo = $localize`:@@qlTooltipVideo:Insertar vídeo`;
	public tooltipUrlImage = $localize`:@@qlTooltipUrlImage:Insertar imagen desde una URL`;
	public tooltipClean = $localize`:@@qlTooltipClean:Quitar formato`;

	constructor(private sanitizer: DomSanitizer) {}

	public ngOnInit(): void {
		this.title = this.controller.params.title;
		this.showPanelBackground = this.controller.params.backgroundTransparent !== true;
		this.verticalAlign = this.controller.params.verticalAlign || 'center';
		this.borderColor = this.controller.params.borderColor || '#d7dde6';
		this.showBorder = this.controller.params.showBorder !== false;
		this.backgroundColor = this.controller.params.backgroundColor || '#ffffff';
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

	public urlImageHandler(): void {
		const quill = this.editor.getQuill();
		// Clicking this custom button blurs the editor first; restore focus so Quill
		// positions the tooltip from the real selection, same as its native Link/Video buttons.
		quill.focus();

		const tooltip = quill.theme.tooltip;
		const originalSave = tooltip.save;
		const originalHide = tooltip.hide;

		tooltip.save = () => {
			const range = quill.getSelection(true);
			const value = tooltip.textbox.value;
			if (value && range) {
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
	}

	public closeChartConfig(): void {
		this.onClose(EdaDialogCloseEvent.NONE);
	}

	public setVerticalAlign(align: VerticalAlign): void {
		this.verticalAlign = align;
	}

}
