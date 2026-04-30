import { AlertService } from './../../../services/alerts/alert.service';
import { MailService } from './../../../services/api/mail.service';
import { Component, OnInit } from "@angular/core";
import { UntypedFormBuilder, UntypedFormGroup, Validators } from "@angular/forms";
import { DashboardService, SpinnerService } from '@eda/services/service.index';
import { EdaColumnContextMenu, EdaColumnText, EdaTable } from '@eda/components/component.index';
import { Router } from '@angular/router';
import { EdaContextMenu, EdaContextMenuItem } from '@eda/shared/components/shared-components.index';
/* SDA CUSTOM */import Swal from 'sweetalert2';

@Component({
  selector: 'mail-management',
  templateUrl: './mail-management.component.html',

})
export class MailManagementComponent implements OnInit {

  /** Mail configuration*/
  public header: string = $localize`:@@mailmanagementHeader:Gestión de correo`;
  public form: UntypedFormGroup;

  /**Alerts */
  public dashboards: Array<any> = [];
  public alerts: Array<any> = [];
  public alertsTable: EdaTable;
  public alertsHeader: string = $localize`:@@alertsConfigTitle:Gestión de alertas`;

  /**Dashboard mailing */
  public mailingDashboards: Array<any> = [];
  public dashboardsTable: EdaTable;
  public dashboardsHeader: string = $localize`:@@dashbaordsMailingHeader:Envio de informes por email`;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private mailService: MailService,
    private alertService: AlertService,
    private spinnerService: SpinnerService,
    private dashboardService: DashboardService,
    private router: Router) {

    this.form = this.formBuilder.group({
      host: [null, Validators.required],
      port: [null, Validators.required],
      secure: [false, Validators.required],
      user: [null, Validators.required],
      password: [null, Validators.required],
    });

    this.initAlertsTable();
    this.initDashboardMailingTable();


  }
  ngOnInit(): void {

    this.mailService.getConfiguration().subscribe(
      res => {
        const response: any = res;
        this.form = this.formBuilder.group({
          host: [response.config.host, Validators.required],
          port: [response.config.port, Validators.required],
          secure: [response.config.secure, Validators.required],
          user: [response.config.auth.user, Validators.required],
          password: [null, Validators.required],
        })
      },
      err => {

      }
    );

    this.initDashboards();

  }

  public sendMailconfig() {

    const options = this.getOptions();
    this.spinnerService.on();
    this.mailService.saveConfiguration(options).subscribe(
      res => {
        this.spinnerService.off();
        this.alertService.addSuccess($localize`:@@mailConfSaved:Configuración guardada correctamente`);
      },
      err => {
        this.spinnerService.off();
        this.alertService.addError(err)
      }
    );

  }

  public checkCredentials() {
    this.spinnerService.on();
    const options = this.getOptions();

    this.mailService.checkConfiguration(options).subscribe(
      res => {
        this.spinnerService.off();
        this.alertService.addSuccess($localize`:@@mailConfOk:Credenciales  correctas`);
      },
      err => {
        this.spinnerService.off();
        this.alertService.addError(err)
      }
    );

  }

// SDA CUSTOM - Add test email action using current SMTP form values
/* SDA CUSTOM */  public async sendTestEmail() {
/* SDA CUSTOM */    const popupResult = await Swal.fire({
/* SDA CUSTOM */      title: $localize`:@@sendTestEmail:Enviar correo de prueba`,
/* SDA CUSTOM */      input: 'email',
/* SDA CUSTOM */      inputLabel: $localize`:@@sendTestRecipient:Destinatario de prueba`,
/* SDA CUSTOM */      inputPlaceholder: 'mail@dominio.com',
/* SDA CUSTOM */      confirmButtonText: $localize`:@@sendNowButton:Enviar ahora`,
/* SDA CUSTOM */      showCancelButton: true,
/* SDA CUSTOM */      cancelButtonText: $localize`:@@cancelButton:Cancelar`,
/* SDA CUSTOM */      inputValidator: (value) => {
/* SDA CUSTOM */        if (!value || !value.trim()) {
/* SDA CUSTOM */          return $localize`:@@sendTestRecipientRequired:La dirección de destino es obligatoria`;
/* SDA CUSTOM */        }
/* SDA CUSTOM */        return null;
/* SDA CUSTOM */      }
/* SDA CUSTOM */    });
/* SDA CUSTOM */
/* SDA CUSTOM */    if (!popupResult.isConfirmed) {
/* SDA CUSTOM */      return;
/* SDA CUSTOM */    }
/* SDA CUSTOM */
/* SDA CUSTOM */    this.spinnerService.on();
/* SDA CUSTOM */    const options: any = this.getOptions();
/* SDA CUSTOM */    options.testRecipient = (popupResult.value || '').trim();
/* SDA CUSTOM */
/* SDA CUSTOM */    this.mailService.sendTestMail(options).subscribe(
/* SDA CUSTOM */      res => {
/* SDA CUSTOM */        this.spinnerService.off();
/* SDA CUSTOM */        this.alertService.addSuccess($localize`:@@mailTestSent:Correo de prueba enviado correctamente`);
/* SDA CUSTOM */      },
/* SDA CUSTOM */      err => {
/* SDA CUSTOM */        this.spinnerService.off();
/* SDA CUSTOM */        this.alertService.addError(err)
/* SDA CUSTOM */      }
/* SDA CUSTOM */    );
/* SDA CUSTOM */
/* SDA CUSTOM */  }

  public getOptions() {
    const options = {
      host: this.form.value.host,
      port: this.form.value.port,
      secure: this.form.value.secure,
      auth: { user: this.form.value.user, pass: this.form.value.password },
      tls: { rejectUnauthorized: this.form.value.secure ? true : false }
    }
    return options;
  }

  private initAlertsTable() {
    this.alertsTable = new EdaTable({

      contextMenu: new EdaContextMenu({
        // style:{top:'-250px', left:'-500px'},
        contextMenuItems: [

          new EdaContextMenuItem({
            label: $localize`:@@gotodashboard:Ir al informe`, command: () => {

              const elem = this.alertsTable.getContextMenuRow().data;
              this.router.navigate(['/dashboard/', elem._id]);
            }
          })
        ]
      }),
      cols: [
        new EdaColumnContextMenu(),
        new EdaColumnText({ field: 'alerta', header: $localize`:@@alertTable:ALERTA` }),
        new EdaColumnText({ field: 'panel', header: $localize`:@@panelTable:PANEL` }),
        new EdaColumnText({ field: 'dashboard', header: $localize`:@@dashboardTable:INFORME` }),
        new EdaColumnText({ field: 'model', header: $localize`:@@tituloCard:MODELO DE DATOS` }),
      ]
    });
  }

  private initDashboardMailingTable() {

    this.dashboardsTable = new EdaTable({

      contextMenu: new EdaContextMenu({
        // style:{top:'-250px', left:'-500px'},
        contextMenuItems: [

          new EdaContextMenuItem({
            label: $localize`:@@gotodashboard:Ir al informe`, command: () => {

              const elem = this.dashboardsTable.getContextMenuRow().data;
              this.router.navigate(['/dashboard/', elem._id]);
            }
          })
        ]
      }),
      cols: [
        new EdaColumnContextMenu(),
        new EdaColumnText({ field: 'dashboard', header: $localize`:@@dashboardTable:INFORME` }),
        new EdaColumnText({ field: 'model', header: $localize`:@@tituloCard:MODELO DE DATOS` }),
      ]
    });

  }

  private initDashboards(): void {
    this.dashboardService.getDashboards().subscribe(data => {
      let dashboards = [].concat.apply([], [data.dashboards, data.group, data.publics, data.shared]);

      dashboards.forEach(dashboard => {

        this.dashboardService.getDashboard(dashboard._id).subscribe(data => {

          this.dashboards.push(data.dashboard);
          /**Mailing dashbaords */
          if (data.dashboard.config.sendViaMailConfig && !!data.dashboard.config.sendViaMailConfig.enabled) {
            this.dashboardsTable.value.push({
              dashboard: dashboard.config.title,
              model: data.datasource.name,
              data: dashboard
            })
          }



          /**Alerts */
          if (data.dashboard.config.panel) {
            data.dashboard.config.panel.forEach(panel => {

              if (panel.content && panel.content.chart === 'kpi' && panel.content.query.output.config.alertLimits) {

                panel.content.query.output.config.alertLimits.forEach(alert => {

                  if (alert.mailing.enabled) {


                    this.alerts.push({ alert: alert, dashboard: dashboard, panel: panel.title, field: panel.content.query.query.fields[0].display_name });
                    this.alertsTable.value.push({
                      alerta: `KPI ${alert.operand} ${alert.value}`,
                      panel: panel.title,
                      dashboard: dashboard.config.title,
                      model: data.datasource.name,
                      data: dashboard
                    })

                  }
                });
              }
            })
          }

        })
      })
    })


  }

}
