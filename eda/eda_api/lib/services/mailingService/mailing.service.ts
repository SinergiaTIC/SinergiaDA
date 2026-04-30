import { UserController } from './../../module/admin/users/user.controller';

import { ManagerConnectionService } from '../../services/connection/manager-connection.service';
import Dashboard from '../../module/dashboard/model/dashboard.model';
const mailConfig = require('../../../config/mailing.config')
let nodemailer = require('nodemailer');
import { SchedulerFunctions } from './../scheduler/schedulerFunctions';
import { MailDashboardsController } from '../dashboardToPDFService/mail-dashboards.controller';
const fs = require('fs');
const path = require("path");

/**Mailing service */


export class MailingService {

  static async mailingService() {

// SDA CUSTOM - Fix typo and check if mailing is configured to avoid recurring errors
/*SDA CUSTOM*/    console.log('Mailer');
/*SDA CUSTOM*/    const newDate = SchedulerFunctions.totLocalISOTime(new Date()) ;
/*SDA CUSTOM*/    const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../config/SMPT.config.json"), 'utf-8'));
/*SDA CUSTOM*/
/*SDA CUSTOM*/    if (!config || !config.auth || !config.auth.user || config.auth.user === "") {
/*SDA CUSTOM*/      return;
/*SDA CUSTOM*/    }
// END SDA CUSTOM

    const transporter = nodemailer.createTransport(config);
    const verify = transporter.verify(async (error, sucess) => {
      if (error) {
        console.log(`\n\x1b[33m\u21AF\x1b[0m \x1b[1mMailing service is not configured properly, please check your configuration file\x1b[0m \x1b[33m\u21AF\x1b[0m\n`);
        console.log(error);
      } else {

        console.log(`\n\x1b[34m=====\x1b[0m \x1b[32mMail server is ready to take our messages\x1b[0m \x1b[34m=====\x1b[0m\n`)

        this.alertSending(newDate, transporter);
        this.dashboardSending(newDate, transporter);


      }
    });


  }

  static async alertSending(newDate: string, transporter: any) {
    try {

      const dashboards = await Dashboard.find({ 'config.mailingAlertsEnabled': true });
      let dashboardsToUpdate = [];

      const alerts = MailingService.getAlerts(dashboards);

      /**Check alerts  */
      alerts.forEach((alert, i) => {

        let shouldUpdate = false;

        if (alert.value.mailing.units === 'hours') {

          shouldUpdate = SchedulerFunctions.checkScheduleHours(alert.value.mailing.quantity, alert.value.mailing.lastUpdated);

        } else if (alert.value.mailing.units === 'days') {

          const mailing = alert.value.mailing;
          shouldUpdate = SchedulerFunctions.checkScheduleDays(mailing.quantity, mailing.hours, mailing.minutes, mailing.lastUpdated);

        }

        if (shouldUpdate) {

          MailingService.mailAlertsSending(alert, transporter);
          alert.value.mailing.lastUpdated = newDate;

          /**Push dashboard to update */
          if (!dashboardsToUpdate.map(d => d._id).includes(alert.dashboard_id)) dashboardsToUpdate.push(dashboards.filter(d => d._id === alert.dashboard_id)[0]);
        }

      });

      /**Update dashbaords */
      dashboardsToUpdate.forEach(d => {
        Dashboard.replaceOne({ _id: d._id }, d).exec()
      });

    } catch (err) {
      throw err;
    }



  }

  static async dashboardSending(newDate: string, transporter: any) {

    try {

      const dashboards = await Dashboard.find({ 'config.sendViaMailConfig.enabled': true });
      const token = await UserController.provideFakeToken();

      let dashboardsToUpdate = [];

      dashboards.forEach(dashboard => {

        const userMails = dashboard.config.sendViaMailConfig.users.map(user => user.email);
        const dashboardID = dashboard._id;
        let shouldUpdate = false;

        if (dashboard.config.sendViaMailConfig.units = 'hours') {

          shouldUpdate = SchedulerFunctions.checkScheduleHours(dashboard.config.sendViaMailConfig.quantity, dashboard.config.sendViaMailConfig.lastUpdated);

        } else if (dashboard.config.sendViaMailConfig.units = 'minutes') {
          const mailing = dashboard.config.sendViaMailConfig;
          shouldUpdate = SchedulerFunctions.checkScheduleDays(mailing.quantity, mailing.hours, mailing.minutes, mailing.lastUpdated);

        }


        if (shouldUpdate) {

          userMails.forEach( mail => {
            MailDashboardsController.sendDashboard(dashboardID, mail, transporter, dashboard.config.sendViaMailConfig.mailMessage, token);
          });

          dashboard.config.sendViaMailConfig.lastUpdated = newDate;

          if (!dashboardsToUpdate.map(d => d._id).includes(dashboardID)) {
            dashboardsToUpdate.push(dashboard)
          };

        }
      });

       /**Update dashbaords */
       dashboardsToUpdate.forEach(d => {
        Dashboard.replaceOne({ _id: d._id }, d).exec()
      });

    } catch (err) {
      throw err;
    }

  }

  static getAlerts(dashboards) {

    const alerts = []
    dashboards.forEach(dashboard => {

      dashboard.config.panel.forEach(panel => {

        if (panel.content && panel.content.chart === 'kpi') {

          panel.content.query.output.config.alertLimits.forEach(alert => {

            if (alert.mailing.enabled === true) {

              alerts.push({ value: alert, dashboard_id: dashboard._id, query: panel.content.query });

            }
          });
        }
      });
    });

    return alerts;

  }


  /**Chech kpi condition and send mail if condition is true
   * 
   */
  static mailAlertsSending(alert, transporter) {

    alert.value.mailing.users.forEach(async user => {

      let result = !alert.query.query.modeSQL ?
        await MailingService.execQuery(alert.query, user) :
        await MailingService.execSqlQuery(alert.query, user);

      let condition = MailingService.compareValues(result, alert.value.value, alert.value.operand);

      let text = `${alert.value.mailing.mailMessage}\n-------------------------------------------- \n\n` +
        `${alert.query.query.fields[0].display_name}: ${result.toLocaleString('de-DE')}\n${mailConfig.server_baseURL}dashboard/${alert.query.dashboard.dashboard_id}`

      let mailOptions = {
        from: mailConfig.user,
        to: user.email,
        subject: 'Eda Alerts',
        text: text
      };


      if (condition) {

        transporter.sendMail(mailOptions, function (error, info) {
          if (error) {
            console.log(error);
          } else {
            console.log('Email sent: ' + info.response + `Email sent: ${info.response} from: ${info.envelope.from} to: ${info.envelope.to} at ${SchedulerFunctions.totLocalISOTime(new Date()) }`);
          }
        });
      }
    })
  }

  static mailDashboardSending(userMail:string, filename:string, filepath:string, transporter:any, message:string, link:string){

    let text = `${message}\n-------------------------------------------- \n\n`;
    text += link;

/* SDA CUSTOM */    const sender =
/* SDA CUSTOM */      (transporter && transporter.options && transporter.options.auth && transporter.options.auth.user) ||
/* SDA CUSTOM */      (transporter && transporter.transporter && transporter.transporter.options && transporter.transporter.options.auth && transporter.transporter.options.auth.user) ||
/* SDA CUSTOM */      mailConfig.user;

    let mailOptions = {
/* SDA CUSTOM */      from: sender,
      to: userMail,
      subject: 'Eda Dashboard Sending Service',
      text: text,
      attachments: [{
        filename: filename,
        path: `${filepath}/${filename}`,
        contentType: 'application/pdf'
      }],
    };

/* SDA CUSTOM */    if (!mailOptions.from) {
/* SDA CUSTOM */      console.error('[MailingService] No sender configured for dashboard email. Configure SMTP auth.user or mailConfig.user');
/* SDA CUSTOM */      return;
/* SDA CUSTOM */    }

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
/*SDA CUSTOM*/        console.error(`[MailingService] Error sending email to ${userMail}:`, error);
      } else {
/*SDA CUSTOM*/        console.log(`[MailingService] Email sent successfully to ${userMail}: ${info.response}`);
        console.log('Email sent: ' + info.response + `Email sent: ${info.response} from: ${info.envelope.from} to: ${info.envelope.to} at ${SchedulerFunctions.totLocalISOTime(new Date()) }`);
      }

      /**Remove file */
      try{
/*SDA CUSTOM*/        console.log(`[MailingService] Removing temporary file: ${filepath}/${filename}`);
        fs.unlinkSync(`${filepath}/${filename}`);
      }catch(err){
/*SDA CUSTOM*/        console.error(`[MailingService] Error removing temporary file:`, err);
        throw err
      }

    });


  }

  static compareValues(v1, v2, op) {

    switch (op) {
      case '<': if (v1 < v2) {
        return true;
      } else return false;
      case '>': if (v1 > v2) {
        return true
      } else {
        return false;
      }
      case '=': if (v1 === v2) {
        return true
      } else {
        return false;
      }
      default: return false;
    }

  }

  static async execQuery(alertQuery, user) {

    try {
      const connection = await ManagerConnectionService.getConnection(alertQuery.model_id);
      const dataModel = await connection.getDataSource(alertQuery.model_id);

      const dataModelObject = JSON.parse(JSON.stringify(dataModel));
      const query = await connection.getQueryBuilded(alertQuery.query, dataModelObject, user);

      connection.client = await connection.getclient();
      const getResults = await connection.execQuery(query);
      const results = [];

      // Normalize data
      for (let i = 0, n = getResults.length; i < n; i++) {
        const r = getResults[i];
        const output = Object.keys(r).map(i => r[i]);
        results.push(output);
      }
      return results[0][0];

    }
    catch (err) {
      console.log(err);
      return null;
    }

  }

  static async execSqlQuery(alertQuery, user) {
    try {

      const connection = await ManagerConnectionService.getConnection(alertQuery.model_id);
      const dataModel = await connection.getDataSource(alertQuery.model_id);
      const dataModelObject = JSON.parse(JSON.stringify(dataModel));
      const query = connection.BuildSqlQuery(alertQuery.query, dataModelObject, user);

      connection.client = await connection.getclient();
      const getResults = await connection.execQuery(query);
      const results = [];

      // Normalize data
      for (let i = 0, n = getResults.length; i < n; i++) {
        const r = getResults[i];
        const output = Object.keys(r).map(i => r[i]);
        results.push(output);
      }

      return results[0][0];

    } catch (err) {
      console.log(err);
      return null;
    }
  }


}
