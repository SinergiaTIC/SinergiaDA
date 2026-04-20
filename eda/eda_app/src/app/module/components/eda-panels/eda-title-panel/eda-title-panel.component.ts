import { DashboardService } from './../../../../services/api/dashboard.service';
import { Component, OnInit, Input, Output, EventEmitter, ViewEncapsulation } from "@angular/core";
import { InjectEdaPanel, EdaTitlePanel } from '@eda/models/model.index';
import { EdaContextMenu, EdaContextMenuItem, EdaDialogCloseEvent, EdaDialogController } from '@eda/shared/components/shared-components.index';
import { DomSanitizer } from '@angular/platform-browser'
import {SafeHtmlPipe} from './htmlSanitizer.pipe'
import {SafeUrlPipe} from './urlSanitizer.pipe'
import * as _ from 'lodash';
import { environment } from 'environments/environment';

@Component({
    selector: 'eda-title-panel',
    templateUrl: './eda-title-panel.component.html',
    styleUrls: ['./eda-title-panel.component.css'],
    encapsulation: ViewEncapsulation.None
})

export class EdaTitlePanelComponent implements OnInit {
    @Input() id: string;
    @Input() panel: EdaTitlePanel;
    @Input() inject: InjectEdaPanel;
    @Output() remove: EventEmitter<any> = new EventEmitter();
/* SDA CUSTOM */    @Output() duplicate: EventEmitter<any> = new EventEmitter();

    titleClick: boolean = false;
    contextMenu: EdaContextMenu;
    editTittleController: EdaDialogController;
    display: any = {
        editMode: true
    }
    public htmlPipe : SafeHtmlPipe
    public urlPipe : SafeUrlPipe
/* SDA CUSTOM */    public lockPanelTooltip: string = $localize`:@@lockPanel:Bloquear panel`;
/* SDA CUSTOM */    public unlockPanelTooltip: string = $localize`:@@unlockPanel:Desbloquear panel`;


    constructor(public sanitized: DomSanitizer, public dashboardService : DashboardService){}
    

    ngOnInit(): void {
        this.initContextMenu()
        this.setEditMode();
    }

/* SDA CUSTOM */   public toggleLock(): void {
/* SDA CUSTOM */       this.panel.locked = !this.panel.locked;
/* SDA CUSTOM */       this.dashboardService._notSaved.next(true);
/* SDA CUSTOM */   }

    public setEditMode(): void {
        const user = localStorage.getItem('user');
        const userName = JSON.parse(user).name;
        this.display.editMode = (userName !== 'edaanonim' && !this.inject.isObserver);
    }

    public initContextMenu(): void {
        this.contextMenu = new EdaContextMenu({
            header: $localize`:@@panelOptions0:OPCIONES DEL PANEL`,
            contextMenuItems: [
                new EdaContextMenuItem({
                    label: $localize`:@@panelOptions2:Editar opciones del gráfico`,
                    icon: 'mdi mdi-wrench',
                    command: () => {
                        
                        this.contextMenu.hideContextMenu();

                        this.editTittleController = new EdaDialogController({
                        /* SDA CUSTOM */ params: { title: this.panel.title, backgroundTransparent: this.panel.backgroundTransparent },
                            close: (event, response) => {
                                if(!_.isEqual(event, EdaDialogCloseEvent.NONE)){
                                    this.panel.title = response.title;
                        /* SDA CUSTOM */ this.panel.backgroundTransparent = response.backgroundTransparent;
                                    this.setPanelSize()
                                    this.dashboardService._notSaved.next(true);
                                }
                                this.editTittleController = null;
                            }
                          });
                    }
                }),
/* SDA CUSTOM */                new EdaContextMenuItem({
/* SDA CUSTOM */                    label: $localize`:@@duplicatePanel:Duplicar panel`,
/* SDA CUSTOM */                    icon: 'fa fa-copy',
/* SDA CUSTOM */                    command: () => {
/* SDA CUSTOM */                        this.contextMenu.hideContextMenu();
/* SDA CUSTOM */                        this.duplicatePanel();
/* SDA CUSTOM */                    }
                }),
                new EdaContextMenuItem({
                    label: $localize`:@@panelOptions4:Eliminar panel`,
                    icon: 'fa fa-trash',
                    command: () => {
                        this.contextMenu.hideContextMenu();
                        this.removePanel();
                    }
                }),
            ]
        });

    }
    
    public removePanel(): void {
        this.remove.emit(this.panel.id);
    }

/* SDA CUSTOM */     public openEditDialog(): void {
/* SDA CUSTOM */         this.editTittleController = new EdaDialogController({
/* SDA CUSTOM */             params: { title: this.panel.title, backgroundTransparent: this.panel.backgroundTransparent },
/* SDA CUSTOM */             close: (event, response) => {
/* SDA CUSTOM */                 if(!_.isEqual(event, EdaDialogCloseEvent.NONE)){
/* SDA CUSTOM */                     this.panel.title = response.title;
/* SDA CUSTOM */                     this.panel.backgroundTransparent = response.backgroundTransparent;
/* SDA CUSTOM */                     this.setPanelSize()
/* SDA CUSTOM */                     this.dashboardService._notSaved.next(true);
/* SDA CUSTOM */                 }
/* SDA CUSTOM */                 this.editTittleController = null;
/* SDA CUSTOM */             }
/* SDA CUSTOM */         });
/* SDA CUSTOM */     }

/* SDA CUSTOM */    public duplicatePanel(): void {
/* SDA CUSTOM */        const duplicatedPanel = _.cloneDeep(this.panel, true);
/* SDA CUSTOM */        duplicatedPanel.id = this.generateUUID();
/* SDA CUSTOM */        duplicatedPanel.y = duplicatedPanel.y + 1;
/* SDA CUSTOM */        this.duplicate.emit(duplicatedPanel);
/* SDA CUSTOM */    }

/* SDA CUSTOM */    private generateUUID(): string {
/* SDA CUSTOM */        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
/* SDA CUSTOM */            const r = Math.random() * 16 | 0;
/* SDA CUSTOM */            const v = c === 'x' ? r : (r & 0x3 | 0x8);
/* SDA CUSTOM */            return v.toString(16);
/* SDA CUSTOM */        });
/* SDA CUSTOM */    }

    public setPanelSize(): void {
        let element: any;
        if (environment.production) {
            element = document.querySelector(`[id^="${this.panel.id.substring(0,30)}"]`);
        } else {
            element = document.querySelector(`[ng-reflect-id^="${this.panel.id.substring(0,30)}"]`);
        }

        let parentElement: any = element?.parentNode;
        
        if (parentElement) {
            let parentWidth = parentElement.offsetWidth - 20;
            let parentHeight = parentElement.offsetHeight - 20;
            
            
            if (this.panel.title.includes('img')) {
                this.panel.title = this.panel.title.replace('<img', `<img style="max-height: ${parentHeight}px; max-width: ${parentWidth}px;"`);
            }
        }
    }
}