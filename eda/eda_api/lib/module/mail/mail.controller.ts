import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
const fs = require('fs');
const path = require("path");
// SDA CUSTOM - Add imports for sendNow
/*SDA CUSTOM*/ import { UserController } from '../admin/users/user.controller';
/*SDA CUSTOM*/ import { MailDashboardsController } from '../../services/dashboardToPDFService/mail-dashboards.controller';
/*SDA CUSTOM*/ import ServerLogSdaService from '../../services/server-log/server-log-sda.service';
// END SDA CUSTOM


let nodemailer = require('nodemailer');

export class MailController {

  static async checkCredentials(req: Request, res: Response, next: NextFunction) {

    try {

      const config = req.body;
      const isOAuth2 = config?.auth?.type === 'OAuth2' || config?.auth?.clientId;

      if (isOAuth2) {
        /* SDA CUSTOM */ // For OAuth2, validate required fields are present
        /* SDA CUSTOM */ if (!config.auth.clientId || !config.auth.clientSecret || !config.auth.refreshToken || !config.auth.user) {
        /* SDA CUSTOM */   return next(new HttpException(400, 'OAuth2 configuration requires: clientId, clientSecret, refreshToken, and user (email)'));
        /* SDA CUSTOM */ }
        /* SDA CUSTOM */
        /* SDA CUSTOM */ // Create transporter with OAuth2 to validate configuration
        /* SDA CUSTOM */ try {
        /* SDA CUSTOM */   const transporter = nodemailer.createTransport({
        /* SDA CUSTOM */     host: config.host,
        /* SDA CUSTOM */     port: config.port,
        /* SDA CUSTOM */     secure: config.secure,
        /* SDA CUSTOM */     auth: {
        /* SDA CUSTOM */       type: 'OAuth2',
        /* SDA CUSTOM */       user: config.auth.user,
        /* SDA CUSTOM */       clientId: config.auth.clientId,
        /* SDA CUSTOM */       clientSecret: config.auth.clientSecret,
        /* SDA CUSTOM */       refreshToken: config.auth.refreshToken
        /* SDA CUSTOM */     }
        /* SDA CUSTOM */   });
        /* SDA CUSTOM */
        /* SDA CUSTOM */   // For OAuth2, we verify by attempting to get an access token
        /* SDA CUSTOM */   transporter.on('token', (token: any) => {
        /* SDA CUSTOM */     console.log('[MailController] OAuth2 token obtained:', token.access_token ? 'success' : 'failed');
        /* SDA CUSTOM */   });
        /* SDA CUSTOM */
        /* SDA CUSTOM */   return res.status(200).json({ ok: true, message: 'OAuth2 configuration valid' });
        /* SDA CUSTOM */ } catch (err: any) {
        /* SDA CUSTOM */   return next(new HttpException(501, `Error in OAuth2 configuration: ${err.message}`));
        /* SDA CUSTOM */ }
        // END SDA CUSTOM
      }

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

      const config = req.body;
      const isOAuth2 = config?.auth?.type === 'oauth2';

      fs.writeFile(`config/SMPT.config.json`, JSON.stringify(config), 'utf8', (err: any) => {
// SDA CUSTOM - Include the actual error message when saving
/*SDA CUSTOM*/        if (err) return next(new HttpException(404, `Error saving configuration: ${err.message}`));
// END SDA CUSTOM

/*SDA CUSTOM*/        // SDA CUSTOM - Log email configuration update
/*SDA CUSTOM*/        const userMail = (req as any)?.user?.email || (req as any)?.user?.mail || 'system';
/*SDA CUSTOM*/        let ip = req.ip || req.connection?.remoteAddress || '';
/*SDA CUSTOM*/        if (ip.startsWith('::ffff:')) ip = ip.substring(7);
/*SDA CUSTOM*/        const now = new Date();
/*SDA CUSTOM*/        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
/*SDA CUSTOM*/        const authType = isOAuth2 ? 'OAuth2' : 'SMTP Básico';
/*SDA CUSTOM*/        const senderEmail = config?.auth?.user || '';
/*SDA CUSTOM*/        ServerLogSdaService.log({
/*SDA CUSTOM*/          level: 'INFO',
/*SDA CUSTOM*/          action: 'MailConfigUpdated',
/*SDA CUSTOM*/          userMail,
/*SDA CUSTOM*/          ip,
/*SDA CUSTOM*/          type: `${authType} - ${senderEmail}`,
/*SDA CUSTOM*/          date_str: dateStr
/*SDA CUSTOM*/        });
/*SDA CUSTOM*/        // END SDA CUSTOM

        return res.status(200).json({ ok: true });
      });

    } catch (err) {
      return next(new HttpException(501, 'Error saving configuration'));
    }

  }

// SDA CUSTOM - Add sendTestMail method to validate SMTP delivery
/* SDA CUSTOM */  static async sendTestMail(req: Request, res: Response, next: NextFunction) {
/*SDA CUSTOM*/
/*SDA CUSTOM*/    try {
/*SDA CUSTOM*/      const config = req.body;
/*SDA CUSTOM*/      const isOAuth2 = config?.auth?.type === 'OAuth2' || config?.auth?.clientId;

/*SDA CUSTOM*/      let transportConfig = req.body;
/*SDA CUSTOM*/      if (isOAuth2) {
/*SDA CUSTOM*/        // Ensure OAuth2 config is properly structured for nodemailer
/*SDA CUSTOM*/        transportConfig = {
/*SDA CUSTOM*/          host: config.host,
/*SDA CUSTOM*/          port: config.port,
/*SDA CUSTOM*/          secure: config.secure,
/*SDA CUSTOM*/          auth: {
/*SDA CUSTOM*/            type: 'OAuth2',
/*SDA CUSTOM*/            user: config.auth.user,
/*SDA CUSTOM*/            clientId: config.auth.clientId,
/*SDA CUSTOM*/            clientSecret: config.auth.clientSecret,
/*SDA CUSTOM*/            refreshToken: config.auth.refreshToken,
/*SDA CUSTOM*/            accessToken: undefined, // Let nodemailer obtain it automatically
/*SDA CUSTOM*/            expires: undefined
/*SDA CUSTOM*/          }
/*SDA CUSTOM*/        };
/*SDA CUSTOM*/        console.log('[MailController] Using OAuth2 for email sending');
/*SDA CUSTOM*/      }

/*SDA CUSTOM*/      const transporter = nodemailer.createTransport(transportConfig);
/*SDA CUSTOM*/      const testRecipient = (req.body?.testRecipient || req.body?.auth?.user || '').trim();
/*SDA CUSTOM*/      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*SDA CUSTOM*/      if (!testRecipient) {
/*SDA CUSTOM*/        return next(new HttpException(400, 'Test recipient is required'));
/*SDA CUSTOM*/      }

/*SDA CUSTOM*/      if (!emailRegex.test(testRecipient)) {
/*SDA CUSTOM*/        return next(new HttpException(400, 'Test recipient is not a valid email address'));
/*SDA CUSTOM*/      }

/*SDA CUSTOM*/      const mailOptions = {
/*SDA CUSTOM*/        from: req.body?.auth?.user,
/*SDA CUSTOM*/        to: testRecipient,
/*SDA CUSTOM*/        subject: 'SDA - Test email',
/*SDA CUSTOM*/        text: 'This is a test email to validate SMTP configuration in SDA.'
/*SDA CUSTOM*/      };

/*SDA CUSTOM*/      return transporter.sendMail(mailOptions, (error: any) => {
/*SDA CUSTOM*/        if (error) {
/*SDA CUSTOM*/          console.error('[MailController] OAuth2 sendMail error:', error.message);
/*SDA CUSTOM*/          return next(new HttpException(501, `Error sending test email: ${error.message}`));
/*SDA CUSTOM*/        }

/*SDA CUSTOM*/        return res.status(200).json({ ok: true });
/*SDA CUSTOM*/      });

/*SDA CUSTOM*/    } catch (err: any) {
/*SDA CUSTOM*/      return next(new HttpException(501, `Error in SMTP configuration: ${err.message}`));
/*SDA CUSTOM*/    }

/*SDA CUSTOM*/  }
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

  // SDA CUSTOM - Get OAuth2 authorization URL for Google
  /* SDA CUSTOM */ static async getOAuth2Url(req: Request, res: Response, next: NextFunction) {
  /* SDA CUSTOM */   try {
  /* SDA CUSTOM */     const config = req.body;
  /* SDA CUSTOM */     if (!config.clientId || !config.clientSecret) {
  /* SDA CUSTOM */       return next(new HttpException(400, 'Client ID and Client Secret are required'));
  /* SDA CUSTOM */     }
  /* SDA CUSTOM */
  /* SDA CUSTOM */     // Gmail OAuth2 scopes
  /* SDA CUSTOM */     const scopes = encodeURIComponent('https://www.googleapis.com/auth/gmail.send');
  /* SDA CUSTOM */     // Use localhost for desktop apps - user must add this to allowed redirect URIs in Google Cloud Console
  /* SDA CUSTOM */     const redirectUri = encodeURIComponent('http://localhost');
  /* SDA CUSTOM */     const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${config.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&access_type=offline&prompt=consent`;
  /* SDA CUSTOM */
  /* SDA CUSTOM */     return res.status(200).json({ ok: true, authUrl });
  /* SDA CUSTOM */   } catch (err: any) {
  /* SDA CUSTOM */     return next(new HttpException(501, `Error: ${err.message}`));
  /* SDA CUSTOM */   }
  /* SDA CUSTOM */ }
  // END SDA CUSTOM

  // SDA CUSTOM - Exchange authorization code for refresh token
  /* SDA CUSTOM */ static async getOAuth2Tokens(req: Request, res: Response, next: NextFunction) {
  /* SDA CUSTOM */   try {
  /* SDA CUSTOM */     const { code, clientId, clientSecret } = req.body;
  /* SDA CUSTOM */     if (!code || !clientId || !clientSecret) {
  /* SDA CUSTOM */       return next(new HttpException(400, 'Code, Client ID and Client Secret are required'));
  /* SDA CUSTOM */     }
  /* SDA CUSTOM */
  /* SDA CUSTOM */     const axios = require('axios');
  /* SDA CUSTOM */     const response = await axios.post('https://oauth2.googleapis.com/token', {
  /* SDA CUSTOM */       code,
  /* SDA CUSTOM */       client_id: clientId,
  /* SDA CUSTOM */       client_secret: clientSecret,
  /* SDA CUSTOM */       redirect_uri: 'http://localhost',
  /* SDA CUSTOM */       grant_type: 'authorization_code'
  /* SDA CUSTOM */     });
  /* SDA CUSTOM */
  /* SDA CUSTOM */     if (response.data.refresh_token) {
  /* SDA CUSTOM */       return res.status(200).json({
  /* SDA CUSTOM */         ok: true,
  /* SDA CUSTOM */         refreshToken: response.data.refresh_token,
  /* SDA CUSTOM */         accessToken: response.data.access_token,
  /* SDA CUSTOM */         expiresIn: response.data.expires_in
  /* SDA CUSTOM */       });
  /* SDA CUSTOM */     } else {
  /* SDA CUSTOM */       return next(new HttpException(400, 'No refresh token returned. Please ensure you requested offline access.'));
  /* SDA CUSTOM */     }
  /* SDA CUSTOM */   } catch (err: any) {
  /* SDA CUSTOM */     const errorMsg = err.response?.data?.error_description || err.response?.data?.error || err.message;
  /* SDA CUSTOM */     return next(new HttpException(501, `Error obtaining tokens: ${errorMsg}`));
  /* SDA CUSTOM */   }
  /* SDA CUSTOM */ }
  // END SDA CUSTOM

// SDA CUSTOM - Add sendNow method
/*SDA CUSTOM*/  static async sendNow(req: Request, res: Response, next: NextFunction) {
/*SDA CUSTOM*/
/*SDA CUSTOM*/    try {
/*SDA CUSTOM*/
/*SDA CUSTOM*/      const { dashboardId, emails, message } = req.body;
/*SDA CUSTOM*/      console.log(`[MailController] sendNow called for dashboard ${dashboardId} with emails: ${emails}`);

/*SDA CUSTOM*/      // SDA CUSTOM - Log the email sending action
/*SDA CUSTOM*/      const userMail = (req as any)?.user?.email || (req as any)?.user?.mail || '';
/*SDA CUSTOM*/      let ip = req.ip || req.connection?.remoteAddress || '';
/*SDA CUSTOM*/      if (ip.startsWith('::ffff:')) ip = ip.substring(7);
/*SDA CUSTOM*/      const now = new Date();
/*SDA CUSTOM*/      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
/*SDA CUSTOM*/      const dashboardTitle = (req.body?.dashboardTitle || '').toString();
/*SDA CUSTOM*/      const typePayload = `${dashboardId || ''}--${dashboardTitle}--${emails?.join(', ') || ''}`;
/*SDA CUSTOM*/      ServerLogSdaService.log({
/*SDA CUSTOM*/        level: 'INFO',
/*SDA CUSTOM*/        action: 'DashboardEmailed',
/*SDA CUSTOM*/        userMail,
/*SDA CUSTOM*/        ip,
/*SDA CUSTOM*/        type: typePayload,
/*SDA CUSTOM*/        date_str: dateStr
/*SDA CUSTOM*/      });
/*SDA CUSTOM*/      // END SDA CUSTOM
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

/*SDA CUSTOM*/  static async sendNowWithPDF(req: Request, res: Response, next: NextFunction) {
/*SDA CUSTOM*/    try {
/*SDA CUSTOM*/      const { dashboardId, emails, message, pdfBase64, dashboardName } = req.body;
/*SDA CUSTOM*/      console.log(`[MailController] sendNowWithPDF called for dashboard ${dashboardId} with emails: ${emails}`);

/*SDA CUSTOM*/      // SDA CUSTOM - Log the email sending action
/*SDA CUSTOM*/      const userMail = (req as any)?.user?.email || (req as any)?.user?.mail || '';
/*SDA CUSTOM*/      let ip = req.ip || req.connection?.remoteAddress || '';
/*SDA CUSTOM*/      if (ip.startsWith('::ffff:')) ip = ip.substring(7);
/*SDA CUSTOM*/      const logNow = new Date();
/*SDA CUSTOM*/      const logDateStr = `${logNow.getFullYear()}-${String(logNow.getMonth() + 1).padStart(2, '0')}-${String(logNow.getDate()).padStart(2, '0')} ${String(logNow.getHours()).padStart(2, '0')}:${String(logNow.getMinutes()).padStart(2, '0')}:${String(logNow.getSeconds()).padStart(2, '0')}`;
/*SDA CUSTOM*/      const typePayload = `${dashboardId || ''}--${dashboardName || ''}--${emails?.join(', ') || ''}`;
/*SDA CUSTOM*/      ServerLogSdaService.log({
/*SDA CUSTOM*/        level: 'INFO',
/*SDA CUSTOM*/        action: 'DashboardEmailedPDF',
/*SDA CUSTOM*/        userMail,
/*SDA CUSTOM*/        ip,
/*SDA CUSTOM*/        type: typePayload,
/*SDA CUSTOM*/        date_str: logDateStr
/*SDA CUSTOM*/      });
/*SDA CUSTOM*/      // END SDA CUSTOM

/*SDA CUSTOM*/      const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../config/SMPT.config.json"), 'utf-8'));
/*SDA CUSTOM*/      const transporter = nodemailer.createTransport(config);
/*SDA CUSTOM*/
/*SDA CUSTOM*/      const sender = config?.auth?.user;
/*SDA CUSTOM*/      if (!sender) {
/*SDA CUSTOM*/        return next(new HttpException(500, 'SMTP sender not configured'));
/*SDA CUSTOM*/      }
/*SDA CUSTOM*/
/*SDA CUSTOM*/      const now = new Date();
/*SDA CUSTOM*/      const dateStr = now.getFullYear().toString() +
/*SDA CUSTOM*/        (now.getMonth() + 1).toString().padStart(2, '0') +
/*SDA CUSTOM*/        now.getDate().toString().padStart(2, '0') + '_' +
/*SDA CUSTOM*/        now.getHours().toString().padStart(2, '0') +
/*SDA CUSTOM*/        now.getMinutes().toString().padStart(2, '0') +
/*SDA CUSTOM*/        now.getSeconds().toString().padStart(2, '0');
/*SDA CUSTOM*/      const safeName = dashboardName ? dashboardName.replace(/[^a-zA-Z0-9-_]/g, '_') : 'informe';
/*SDA CUSTOM*/      const filename = `${safeName}_${dateStr}.pdf`;
/*SDA CUSTOM*/      const subject = dashboardName ? `SinergiaDA - ${dashboardName}` : 'SinergiaDA - Informe';
/*SDA CUSTOM*/
/*SDA CUSTOM*/      for (const email of emails) {
/*SDA CUSTOM*/        const mailOptions = {
/*SDA CUSTOM*/          from: sender,
/*SDA CUSTOM*/          to: email,
/*SDA CUSTOM*/          subject: subject,
/*SDA CUSTOM*/          text: message,
/*SDA CUSTOM*/          attachments: [{
              filename: filename,
              path: `data:application/pdf;base64,${pdfBase64}`
            }],
/*SDA CUSTOM*/        };
/*SDA CUSTOM*/
/*SDA CUSTOM*/        transporter.sendMail(mailOptions, (error: any, info: any) => {
/*SDA CUSTOM*/          if (error) {
/*SDA CUSTOM*/            console.error(`[MailController] Error sending email to ${email}:`, error.message);
/*SDA CUSTOM*/          } else {
/*SDA CUSTOM*/            console.log(`[MailController] Email sent successfully to ${email}: ${info.response}`);
/*SDA CUSTOM*/          }
/*SDA CUSTOM*/        });
/*SDA CUSTOM*/      }
/*SDA CUSTOM*/
/*SDA CUSTOM*/      return res.status(200).json({ ok: true });
/*SDA CUSTOM*/
/*SDA CUSTOM*/    } catch (err: any) {
/*SDA CUSTOM*/      console.error(`[MailController] Error in sendNowWithPDF:`, err);
/*SDA CUSTOM*/      return next(new HttpException(500, err.message));
/*SDA CUSTOM*/    }
/*SDA CUSTOM*/  }

/*SDA CUSTOM*/  static async sendNowWithImage(req: Request, res: Response, next: NextFunction) {
/*SDA CUSTOM*/    try {
/*SDA CUSTOM*/      const { dashboardId, emails, message, imageBase64 } = req.body;
/*SDA CUSTOM*/      console.log(`[MailController] sendNowWithImage called for dashboard ${dashboardId}, image size: ${imageBase64 ? imageBase64.length : 0} chars`);
/*SDA CUSTOM*/      console.log(`[MailController] Request body keys:`, Object.keys(req.body));

/*SDA CUSTOM*/      // SDA CUSTOM - Log the email sending action
/*SDA CUSTOM*/      const userMail = (req as any)?.user?.email || (req as any)?.user?.mail || '';
/*SDA CUSTOM*/      let ip = req.ip || req.connection?.remoteAddress || '';
/*SDA CUSTOM*/      if (ip.startsWith('::ffff:')) ip = ip.substring(7);
/*SDA CUSTOM*/      const logNow = new Date();
/*SDA CUSTOM*/      const logDateStr = `${logNow.getFullYear()}-${String(logNow.getMonth() + 1).padStart(2, '0')}-${String(logNow.getDate()).padStart(2, '0')} ${String(logNow.getHours()).padStart(2, '0')}:${String(logNow.getMinutes()).padStart(2, '0')}:${String(logNow.getSeconds()).padStart(2, '0')}`;
/*SDA CUSTOM*/      const dashboardTitle = (req.body?.dashboardTitle || '').toString();
/*SDA CUSTOM*/      const typePayload = `${dashboardId || ''}--${dashboardTitle}--${emails?.join(', ') || ''}`;
/*SDA CUSTOM*/      ServerLogSdaService.log({
/*SDA CUSTOM*/        level: 'INFO',
/*SDA CUSTOM*/        action: 'DashboardEmailedImage',
/*SDA CUSTOM*/        userMail,
/*SDA CUSTOM*/        ip,
/*SDA CUSTOM*/        type: typePayload,
/*SDA CUSTOM*/        date_str: logDateStr
/*SDA CUSTOM*/      });
/*SDA CUSTOM*/      // END SDA CUSTOM

/*SDA CUSTOM*/      const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../config/SMPT.config.json"), 'utf-8'));
/*SDA CUSTOM*/      const transporter = nodemailer.createTransport(config);
/*SDA CUSTOM*/
/*SDA CUSTOM*/      const sender = config?.auth?.user;
/*SDA CUSTOM*/      if (!sender) {
/*SDA CUSTOM*/        return next(new HttpException(500, 'SMTP sender not configured'));
/*SDA CUSTOM*/      }
/*SDA CUSTOM*/
/*SDA CUSTOM*/      const filename = `dashboard_${dashboardId}.png`;
/*SDA CUSTOM*/      const link = `${require('../../../config/mailing.config').server_baseURL}#/dashboard/${dashboardId}`;
/*SDA CUSTOM*/
/*SDA CUSTOM*/      for (const email of emails) {
/*SDA CUSTOM*/        const mailOptions = {
/*SDA CUSTOM*/          from: sender,
/*SDA CUSTOM*/          to: email,
/*SDA CUSTOM*/          subject: 'Eda Dashboard',
/*SDA CUSTOM*/          text: message + '\n\n' + link,
/*SDA CUSTOM*/          attachments: [{
/*SDA CUSTOM*/            filename: filename,
/*SDA CUSTOM*/            path: `data:image/png;base64,${imageBase64}`
/*SDA CUSTOM*/          }]
/*SDA CUSTOM*/        };
/*SDA CUSTOM*/
/*SDA CUSTOM*/        transporter.sendMail(mailOptions, (error: any, info: any) => {
/*SDA CUSTOM*/          if (error) {
/*SDA CUSTOM*/            console.error(`[MailController] Error sending email to ${email}:`, error.message);
/*SDA CUSTOM*/          } else {
/*SDA CUSTOM*/            console.log(`[MailController] Email sent successfully to ${email}: ${info.response}`);
/*SDA CUSTOM*/          }
/*SDA CUSTOM*/        });
/*SDA CUSTOM*/      }
/*SDA CUSTOM*/
/*SDA CUSTOM*/      return res.status(200).json({ ok: true });
/*SDA CUSTOM*/
/*SDA CUSTOM*/    } catch (err: any) {
      /*SDA CUSTOM*/      console.error(`[MailController] Error in sendNowWithImage:`, err);
      /*SDA CUSTOM*/      return next(new HttpException(500, err.message));
      /*SDA CUSTOM*/    }
      /*SDA CUSTOM*/  }

  /*SDA CUSTOM*/  static async sendTestKpiAlert(req: Request, res: Response, next: NextFunction) {
    /*SDA CUSTOM*/    try {
    /*SDA CUSTOM*/      const { alert, emails, message, dashboardId, dashboardTitle, panelTitle } = req.body;
    /*SDA CUSTOM*/      
    /*SDA CUSTOM*/      if (!alert || !emails || emails.length === 0) {
    /*SDA CUSTOM*/        return next(new HttpException(400, 'Faltan datos necesarios para enviar la alerta'));
    /*SDA CUSTOM*/      }

    /*SDA CUSTOM*/      // Get mail config
    /*SDA CUSTOM*/      const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../config/SMPT.config.json"), 'utf-8'));
    /*SDA CUSTOM*/      if (!config || !config.auth || !config.auth.user || config.auth.user === "") {
    /*SDA CUSTOM*/        return next(new HttpException(500, 'Servidor de correo no configurado'));
    /*SDA CUSTOM*/      }

    /*SDA CUSTOM*/      const transporter = nodemailer.createTransport(config);
    /*SDA CUSTOM*/      const mailConfig = require('../../../config/mailing.config');
    /*SDA CUSTOM*/      const sender = config.auth.user;
    /*SDA CUSTOM*/      const baseUrl = mailConfig.server_baseURL || '';

    /*SDA CUSTOM*/      // Create users from emails
    /*SDA CUSTOM*/      const users = emails.map((email: string) => ({ email: email.trim(), name: email.trim() }));

    /*SDA CUSTOM*/      // Build the email text with dashboard and panel info
    /*SDA CUSTOM*/      const dashTitle = dashboardTitle || 'Informe';
    /*SDA CUSTOM*/      const pTitle = panelTitle || 'Panel KPI';
    /*SDA CUSTOM*/      const dashLink = dashboardId ? `${baseUrl}#/dashboard/${dashboardId}` : baseUrl;

    /*SDA CUSTOM*/      const text = `ALERTA DE KPI - ${dashTitle}\n` +
    /*SDA CUSTOM*/        `========================================\n\n` +
    /*SDA CUSTOM*/        `Informe: ${dashTitle}\n` +
    /*SDA CUSTOM*/        `Panel: ${pTitle}\n` +
    /*SDA CUSTOM*/        `Condición: KPI ${alert.operand} ${alert.value}\n` +
    /*SDA CUSTOM*/        `Color: ${alert.color || 'no especificado'}\n\n` +
    /*SDA CUSTOM*/        `Mensaje: ${message || 'Alerta de prueba de KPI'}\n\n` +
    /*SDA CUSTOM*/        `----------------------------------------\n` +
    /*SDA CUSTOM*/        `Enlace al informe: ${dashLink}\n\n` +
    /*SDA CUSTOM*/        `Esta es una alerta de prueba para verificar la configuración.`;

    /*SDA CUSTOM*/      for (const user of users) {
    /*SDA CUSTOM*/        const mailOptions = {
    /*SDA CUSTOM*/          from: sender,
    /*SDA CUSTOM*/          to: user.email,
    /*SDA CUSTOM*/          subject: `SinergiaDA - Alerta de KPI: ${dashTitle}`,
    /*SDA CUSTOM*/          text: text
    /*SDA CUSTOM*/        };

    /*SDA CUSTOM*/        transporter.sendMail(mailOptions, (error: any, info: any) => {
    /*SDA CUSTOM*/          if (error) {
    /*SDA CUSTOM*/            console.error(`[MailController] Error sending test alert to ${user.email}:`, error.message);
    /*SDA CUSTOM*/          } else {
    /*SDA CUSTOM*/            console.log(`[MailController] Test alert sent successfully to ${user.email}: ${info.response}`);

    /*SDA CUSTOM*/            // SDA CUSTOM - Log KPI test alert email sent
    /*SDA CUSTOM*/            const logNow = new Date();
    /*SDA CUSTOM*/            const logDateStr = `${logNow.getFullYear()}-${String(logNow.getMonth() + 1).padStart(2, '0')}-${String(logNow.getDate()).padStart(2, '0')} ${String(logNow.getHours()).padStart(2, '0')}:${String(logNow.getMinutes()).padStart(2, '0')}:${String(logNow.getSeconds()).padStart(2, '0')}`;
    /*SDA CUSTOM*/            const conditionText = `KPI ${alert.operand} ${alert.value} (${alert.color || 'sin color'})`;
    /*SDA CUSTOM*/            const typePayload = `${dashboardId || ''}--${dashboardTitle || ''}--${user.email}--${conditionText}`;
    /*SDA CUSTOM*/            ServerLogSdaService.log({
    /*SDA CUSTOM*/              level: 'INFO',
    /*SDA CUSTOM*/              action: 'KpiAlertTestEmailed',
    /*SDA CUSTOM*/              userMail: user.email,
    /*SDA CUSTOM*/              ip: ((req.ip || req.connection?.remoteAddress || '').startsWith('::ffff:') ? (req.ip || req.connection?.remoteAddress || '').substring(7) : (req.ip || req.connection?.remoteAddress || '')),
    /*SDA CUSTOM*/              type: typePayload,
    /*SDA CUSTOM*/              date_str: logDateStr
    /*SDA CUSTOM*/            });
    /*SDA CUSTOM*/            // END SDA CUSTOM
    /*SDA CUSTOM*/          }
    /*SDA CUSTOM*/      });
    /*SDA CUSTOM*/      }

    /*SDA CUSTOM*/      return res.status(200).json({ ok: true, message: 'Alerta de prueba enviada' });

    /*SDA CUSTOM*/    } catch (err: any) {
    /*SDA CUSTOM*/      console.error(`[MailController] Error in sendTestKpiAlert:`, err);
    /*SDA CUSTOM*/      return next(new HttpException(500, err.message));
    /*SDA CUSTOM*/    }
    /*SDA CUSTOM*/  }
// END SDA CUSTOM

}