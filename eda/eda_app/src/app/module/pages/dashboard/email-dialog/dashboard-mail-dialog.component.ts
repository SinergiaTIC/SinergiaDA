import { Dashboard } from './../../../../shared/models/dashboard-models/dashboard.model';
import { Component, ElementRef, ViewChild } from "@angular/core";
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
/*SDA CUSTOM*/ import { UserService, MailService, AlertService, SpinnerService } from '@eda/services/service.index';
/*SDA CUSTOM*/ import domtoimage from 'dom-to-image';
/*SDA CUSTOM*/ import { jsPDF } from 'jspdf';
// END SDA CUSTOM

@Component({
  selector: 'dashboard-mail-dialog',
  templateUrl: './dashboard-mail-dialog.component.html',
  styleUrls: []
})

export class DashboardMailDialogComponent extends EdaDialogAbstract {

  public dialog: EdaDialog;
  public dashboard: any;

  /**mail config properties */
  public units: string;
  public quantity: number;
  public hours: any;
  public hoursSTR = $localize`:@@hours:Hora/s`;
  public daysSTR = $localize`:@@days:Día/s`;
  public mailMessage = '';
  public currentAlert = null;
  public users: any;
  public selectedUsers: any = [];
  public enabled : boolean = true ;
/*SDA CUSTOM*/  public additionalEmails: any = '';
  public sendModeIndex: number = 1; // 0 = Programar, 1 = Enviar ahora
  public nextScheduledDate: string = '';
// END SDA CUSTOM

  constructor(private userService: UserService,
/*SDA CUSTOM*/              private mailService: MailService,
/*SDA CUSTOM*/              private alertService: AlertService,
/*SDA CUSTOM*/              private spinnerService: SpinnerService) {
// END SDA CUSTOM
    super();

this.dialog = new EdaDialog({
      show: () => this.onShow(),
      hide: () => this.onClose(EdaDialogCloseEvent.NONE),
      title: 'Envío de informes por email',
    });
    this.dialog.style = { width: '750px', minHeight: '400px', top: "-4em", left: '1em' };
  }

  onShow(): void {
  
    this.dashboard = this.controller.params.dashboard;
    this.sendModeIndex = 0; // Default to "Enviar ahora" tab (first)
    
    this.userService.getUsers().subscribe(
      res => this.users = res.map(user => ({ label: user.name, value: user })),
      err => console.log(err)
    );

    if(this.controller.params.config && this.controller.params.config.enabled){
      this.setConfig();
      this.sendModeIndex = 1; // If there's an active schedule, show "Programar envío" tab (second)
    }
    this.calculateNextScheduledDate();
  }
  closeDialog() {
    this.onClose(EdaDialogCloseEvent.NONE);
  }

  onClose(event: EdaDialogCloseEvent, response?: any): void {
    return this.controller.close(event, response);
  }

  setConfig(){
    const config = this.controller.params.config;
    this.hours = `${config.hours || '00'}:${config.minutes || '00'}`;
    this.units = config.units;
    this.quantity = config.quantity;
// SDA CUSTOM - Separate CRM users from custom emails
/*SDA CUSTOM*/    this.selectedUsers = config.users.filter(u => u._id).map(user => ({ label: user.name, value: user }) );
/*SDA CUSTOM*/    this.additionalEmails = config.users.filter(u => !u._id).map(user => user.email).join(', ');
// END SDA CUSTOM
    this.mailMessage = config.mailMessage;
    this.enabled = config.enabled;
  }

  save() {

    const hours = this.hours && typeof this.hours === 'string' ? this.hours.slice(0, 2) :
      this.hours ? this.fillWithZeros(this.hours.getHours()) : null;
    const minutes = this.hours && typeof this.hours === 'string' ? this.hours.slice(3, 5) :
      this.hours ? this.fillWithZeros(this.hours.getMinutes()) : null;
// SDA CUSTOM - Use only custom emails
/*SDA CUSTOM*/    const customEmails = (this.additionalEmails || '').split(/[\s,;]+/).filter(e => e.trim() !== '');
/*SDA CUSTOM*/    const customUsers = customEmails.map(email => ({ email: email.trim(), name: email.trim() }));
/*SDA CUSTOM*/    const allUsers = customUsers;
/*SDA CUSTOM*/    const dashboardId = this.dashboard && this.dashboard._id ? this.dashboard._id : this.dashboard;
// END SDA CUSTOM

    const response = {
      units: this.units,
      quantity: this.quantity,
      hours: hours,
      minutes: minutes,
/*SDA CUSTOM*/      users: allUsers,
// END SDA CUSTOM
      mailMessage: this.mailMessage,
      lastUpdated: new Date().toISOString(),
      enabled: this.enabled,
/*SDA CUSTOM*/      dashboard: this.dashboard,
/*SDA CUSTOM*/      dashboardId: dashboardId
// END SDA CUSTOM
    };
    this.onClose(EdaDialogCloseEvent.NEW, response);
  }

// SDA CUSTOM - Implement sendNow method
/*SDA CUSTOM*/  sendNow() {
/*SDA CUSTOM*/    this.spinnerService.on();
/*SDA CUSTOM*/    const customEmails = (this.additionalEmails || '').split(/[\s,;]+/).filter(e => e.trim() !== '');
    const allUsers = customEmails.map(email => ({ email: email.trim(), name: email.trim() }));
    const emails = allUsers.map(u => u.email);
    const dashboardId = this.controller.params.dashboard;
    const dashboardTitle = this.controller.params.dashboardTitle || '';

    const element = document.getElementById('myDashboard');
    if (!element) {
      this.spinnerService.off();
      this.alertService.addError('Dashboard element not found');
      return;
    }

    // Generar PDF usando el mismo método que "Descargar PDF" pero con mayor calidad
    domtoimage.toJpeg(element, {
      bgcolor: 'white',
      quality: 1,
      height: element.scrollHeight * 3,
      width: element.scrollWidth * 3,
      style: {
        transform: 'scale(3)',
        transformOrigin: 'top left'
      },
      filter: node => {
        // Excluir elementos que no deberían ser capturados
        if (node.classList) {
          if (node.classList.contains('p-dialog') || node.classList.contains('p-sidebar')) {
            return false;
          }
        }
        return true;
      }
    }).then((dataUrl) => {
      let img = new Image();
      img.src = dataUrl;

      img.onload = () => {
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = img.width;
        const imgHeight = img.height;
        const ratio = pageWidth / imgWidth;
        const scaledWidth = pageWidth;
        let position = 0;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = imgWidth;
        canvas.height = pageHeight / ratio;

        while (position < imgHeight) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, position, imgWidth, pageHeight / ratio, 0, 0, canvas.width, canvas.height);
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          if (position > 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, 0, scaledWidth, pageHeight);
          position += pageHeight / ratio;
        }

        const pdfBlob = pdf.output('blob');
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const pdfBase = base64.split(',')[1];

          this.mailService.sendNowWithPDF({
            dashboardId: dashboardId,
            dashboardName: dashboardTitle,
            emails: emails,
            message: this.mailMessage,
            pdfBase64: pdfBase
          }).subscribe(
            res => {
              this.spinnerService.off();
              this.alertService.addSuccess($localize`:@@mailSentSuccess:Envío iniciado correctamente`);
            },
            err => {
              this.spinnerService.off();
              this.alertService.addError(err);
            }
          );
        };
        reader.readAsDataURL(pdfBlob);
      };
    }).catch(err => {
      this.spinnerService.off();
      this.alertService.addError('Error generating PDF: ' + err.message);
    });
  }
// END SDA CUSTOM

  calculateNextScheduledDate(): void {
    const now = new Date();
    let nextDate = new Date(now);

    if (this.units === 'hours' && this.quantity) {
      nextDate.setHours(now.getHours() + this.quantity);
    } else if (this.units === 'days') {
      nextDate.setDate(now.getDate() + 1);
      if (this.hours) {
        const hours = typeof this.hours === 'string' ? 
          parseInt(this.hours.slice(0, 2)) : 
          (this.hours.getHours ? this.hours.getHours() : 0);
        const minutes = typeof this.hours === 'string' ? 
          parseInt(this.hours.slice(3, 5)) : 
          (this.hours.getMinutes ? this.hours.getMinutes() : 0);
        nextDate.setHours(hours, minutes, 0, 0);
        
        if (nextDate <= now) {
          nextDate.setDate(nextDate.getDate() + 1);
        }
      }
    }

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    this.nextScheduledDate = nextDate.toLocaleDateString('es-ES', options);
  }

  canSendNow(): boolean {
    return this.additionalEmails && this.additionalEmails.trim() !== '';
  }

  canSaveSchedule(): boolean {
    return !!this.quantity && !!this.units && (this.additionalEmails && this.additionalEmails.trim() !== '');
  }

  fillWithZeros(n: number) {
    if (n < 10) return `0${n}`
    else return `${n}`;
  }

}