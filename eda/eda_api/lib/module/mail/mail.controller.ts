import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
const fs = require('fs');
const path = require("path");
// SDA CUSTOM - Add imports for sendNow
/*SDA CUSTOM*/ import { UserController } from '../admin/users/user.controller';
/*SDA CUSTOM*/ import { MailDashboardsController } from '../../services/dashboardToPDFService/mail-dashboards.controller';
// END SDA CUSTOM


let nodemailer = require('nodemailer');

export class MailController {

  static async checkCredentials(req: Request, res: Response, next: NextFunction) {

    try {

      const transporter = nodemailer.createTransport(req.body);
      const verify = transporter.verify((error: any, sucess: any) => {
        if (error) {
// SDA CUSTOM - Include the actual error message from nodemailer and fix typo
/*SDA CUSTOM*/          return next(new HttpException(501, `Error in SMTP configuration: ${error.message}`));
// END SDA CUSTOM
        } else {
          return res.status(200).json({ ok: true });
        }
      });

    } catch (err: any) {
// SDA CUSTOM - Include the actual error message and fix typo
/*SDA CUSTOM*/      return next(new HttpException(501, `Error in SMTP configuration: ${err.message}`));
// END SDA CUSTOM
    }

  }

  static async saveCredentials(req: Request, res: Response, next: NextFunction) {

    try {

      fs.writeFile(`config/SMPT.config.json`, JSON.stringify(req.body), 'utf8', (err: any) => {
// SDA CUSTOM - Include the actual error message when saving
/*SDA CUSTOM*/        if (err) return next(new HttpException(404, `Error saving configuration: ${err.message}`));
// END SDA CUSTOM
        return res.status(200).json({ ok: true });
      });

    } catch (err) {
      return next(new HttpException(501, 'Error saving configuration'));
    }

  }

// SDA CUSTOM - Add sendTestMail method to validate SMTP delivery
/* SDA CUSTOM */  static async sendTestMail(req: Request, res: Response, next: NextFunction) {
/* SDA CUSTOM */
/* SDA CUSTOM */    try {
/* SDA CUSTOM */      const transporter = nodemailer.createTransport(req.body);
/* SDA CUSTOM */      const testRecipient = (req.body?.testRecipient || req.body?.auth?.user || '').trim();
/* SDA CUSTOM */      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/* SDA CUSTOM */
/* SDA CUSTOM */      if (!testRecipient) {
/* SDA CUSTOM */        return next(new HttpException(400, 'Test recipient is required'));
/* SDA CUSTOM */      }
/* SDA CUSTOM */
/* SDA CUSTOM */      if (!emailRegex.test(testRecipient)) {
/* SDA CUSTOM */        return next(new HttpException(400, 'Test recipient is not a valid email address'));
/* SDA CUSTOM */      }
/* SDA CUSTOM */
/* SDA CUSTOM */      const mailOptions = {
/* SDA CUSTOM */        from: req.body?.auth?.user,
/* SDA CUSTOM */        to: testRecipient,
/* SDA CUSTOM */        subject: 'SDA - Test email',
/* SDA CUSTOM */        text: 'This is a test email to validate SMTP configuration in SDA.'
/* SDA CUSTOM */      };
/* SDA CUSTOM */
/* SDA CUSTOM */      return transporter.sendMail(mailOptions, (error: any) => {
/* SDA CUSTOM */        if (error) {
/* SDA CUSTOM */          return next(new HttpException(501, `Error sending test email: ${error.message}`));
/* SDA CUSTOM */        }
/* SDA CUSTOM */
/* SDA CUSTOM */        return res.status(200).json({ ok: true });
/* SDA CUSTOM */      });
/* SDA CUSTOM */
/* SDA CUSTOM */    } catch (err: any) {
/* SDA CUSTOM */      return next(new HttpException(501, `Error in SMTP configuration: ${err.message}`));
/* SDA CUSTOM */    }
/* SDA CUSTOM */
/* SDA CUSTOM */  }
// END SDA CUSTOM

  static async getCredentials(req: Request, res: Response, next: NextFunction) {

    try {

      const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../config/SMPT.config.json"), 'utf-8'));
      config.auth.pass = null;
      return res.status(200).json({ ok: true, config: config });
      
    } catch (err) {
      return next(new HttpException(501, 'Error loading configuration'));
    }

  }

// SDA CUSTOM - Add sendNow method
/*SDA CUSTOM*/  static async sendNow(req: Request, res: Response, next: NextFunction) {
/*SDA CUSTOM*/
/*SDA CUSTOM*/    try {
/*SDA CUSTOM*/
/*SDA CUSTOM*/      const { dashboardId, emails, message } = req.body;
/*SDA CUSTOM*/      console.log(`[MailController] sendNow called for dashboard ${dashboardId} with emails: ${emails}`);
/*SDA CUSTOM*/      const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../config/SMPT.config.json"), 'utf-8'));
/*SDA CUSTOM*/      const transporter = nodemailer.createTransport(config);
/*SDA CUSTOM*/      const token = await UserController.provideFakeToken();
/*SDA CUSTOM*/
/*SDA CUSTOM*/      emails.forEach((email: any) => {
/*SDA CUSTOM*/        console.log(`[MailController] Triggering sendDashboard for ${email}`);
/*SDA CUSTOM*/        MailDashboardsController.sendDashboard(dashboardId, email, transporter, message, token);
/*SDA CUSTOM*/      });
/*SDA CUSTOM*/
/*SDA CUSTOM*/      return res.status(200).json({ ok: true });
/*SDA CUSTOM*/
/*SDA CUSTOM*/    } catch (err: any) {
/*SDA CUSTOM*/      console.error(`[MailController] Error in sendNow:`, err);
/*SDA CUSTOM*/      return next(new HttpException(500, err.message));
/*SDA CUSTOM*/    }
/*SDA CUSTOM*/
/*SDA CUSTOM*/  }
// END SDA CUSTOM

}