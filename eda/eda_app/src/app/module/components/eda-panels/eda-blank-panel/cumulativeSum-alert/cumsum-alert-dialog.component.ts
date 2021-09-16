import { EdaDialogAbstract, EdaDialogCloseEvent, EdaDialog } from '@eda/shared/components/shared-components.index';
import { Component } from '@angular/core';


@Component({
  selector: 'app-cumsum-alert-dialog',
  templateUrl: './cumsum-alert-dialog.component.html',
  styleUrls: ['./cumsum-alert-dialog.component.css']
})

export class CumSumAlertDialogComponent extends EdaDialogAbstract {
  public dialog: EdaDialog;

  constructor() {
    super();
    this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: '',
      style :  {width: '70em', height: '33vh', top:"-5em", left:'1em'}
    });
  }

  close(execute: boolean) {
    this.onClose(EdaDialogCloseEvent.NONE, execute);
  }
  onShow(): void {
  }
  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }


}