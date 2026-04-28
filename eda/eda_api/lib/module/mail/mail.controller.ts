import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../global/model/index';
const fs = require('fs');
const path = require("path");


let nodemailer = require('nodemailer');

export class MailController {

  static async checkCredentials(req: Request, res: Response, next: NextFunction) {

    try {

      const transporter = nodemailer.createTransport(req.body);
      const verify = transporter.verify((error, sucess) => {
        if (error) {
// SDA CUSTOM - Include the actual error message from nodemailer and fix typo
/*SDA CUSTOM*/          return next(new HttpException(501, `Error in SMTP configuration: ${error.message}`));
// END SDA CUSTOM
        } else {
          return res.status(200).json({ ok: true });
        }
      });

    } catch (err) {
// SDA CUSTOM - Include the actual error message and fix typo
/*SDA CUSTOM*/      return next(new HttpException(501, `Error in SMTP configuration: ${err.message}`));
// END SDA CUSTOM
    }

  }

  static async saveCredentials(req: Request, res: Response, next: NextFunction) {

    try {

      fs.writeFile(`config/SMPT.config.json`, JSON.stringify(req.body), 'utf8', (err) => {
// SDA CUSTOM - Include the actual error message when saving
/*SDA CUSTOM*/        if (err) return next(new HttpException(404, `Error saving configuration: ${err.message}`));
// END SDA CUSTOM
        return res.status(200).json({ ok: true });
      });

    } catch (err) {
      return next(new HttpException(501, 'Error saving configuration'));
    }

  }

  static async getCredentials(req: Request, res: Response, next: NextFunction) {

    try {

      const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../config/SMPT.config.json"), 'utf-8'));
      config.auth.pass = null;
      return res.status(200).json({ ok: true, config: config });
      
    } catch (err) {
      return next(new HttpException(501, 'Error loading configuration'));
    }

  }


}