import { Dashboard } from './../../../../shared/models/dashboard-models/dashboard.model';
import { Component } from "@angular/core";
import { EdaDialog, EdaDialogAbstract, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
/*SDA CUSTOM*/ import { UserService, MailService, AlertService, SpinnerService } from '@eda/services/service.index';
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
/*SDA CUSTOM*/  public additionalEmails: any = ''; // Changed to string for easier input
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
      title: $localize`:@@DashboardMailingTitle:Configuración del envío por email`,
    });
    this.dialog.style = { width: '50%', height: '50%', top: "-4em", left: '1em' };
  }

  onShow(): void {
 
    this.dashboard = this.controller.params.dashboard;
    this.userService.getUsers().subscribe(
      res => this.users = res.map(user => ({ label: user.name, value: user })),
      err => console.log(err)
    );

    if(this.controller.params.config && this.controller.params.config.enabled){
      this.setConfig();
    }
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
// SDA CUSTOM - Combine CRM users and custom emails
/*SDA CUSTOM*/    const customEmails = (this.additionalEmails || '').split(/[\s,;]+/).filter(e => e.trim() !== '');
/*SDA CUSTOM*/    const customUsers = customEmails.map(email => ({ email: email.trim(), name: email.trim() }));
/*SDA CUSTOM*/    const allUsers = [...this.selectedUsers.map(u => u.value), ...customUsers];
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
/*SDA CUSTOM*/    const customUsers = customEmails.map(email => ({ email: email.trim(), name: email.trim() }));
/*SDA CUSTOM*/    const allUsers = [...this.selectedUsers.map(u => u.value), ...customUsers];
/*SDA CUSTOM*/    const emails = allUsers.map(u => u.email);
/*SDA CUSTOM*/    const dashboardId = this.dashboard && this.dashboard._id ? this.dashboard._id : this.dashboard;
/*SDA CUSTOM*/
/*SDA CUSTOM*/    this.mailService.sendNow({
/*SDA CUSTOM*/      dashboardId: dashboardId,
/*SDA CUSTOM*/      emails: emails,
/*SDA CUSTOM*/      message: this.mailMessage
/*SDA CUSTOM*/    }).subscribe(
/*SDA CUSTOM*/      res => {
/*SDA CUSTOM*/        this.spinnerService.off();
/*SDA CUSTOM*/        this.alertService.addSuccess($localize`:@@mailSentSuccess:Envío iniciado correctamente`);
/*SDA CUSTOM*/      },
/*SDA CUSTOM*/      err => {
/*SDA CUSTOM*/        this.spinnerService.off();
/*SDA CUSTOM*/        this.alertService.addError(err);
/*SDA CUSTOM*/      }
/*SDA CUSTOM*/    );
/*SDA CUSTOM*/  }
// END SDA CUSTOM

  disableConfirm() {
/*SDA CUSTOM*/    return (!this.quantity || !this.units || !(this.selectedUsers.length > 0 || (this.additionalEmails && this.additionalEmails.trim() !== '')) || !this.mailMessage)
// END SDA CUSTOM
  }

  fillWithZeros(n: number) {
    if (n < 10) return `0${n}`
    else return `${n}`;
  }

}