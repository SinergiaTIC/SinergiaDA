import { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export class getSdaInfo {
    public static async getinfo(req: Request, res: Response) {
        try {
          const moment = require('moment');
          const filePath = path.join(__dirname, '../../../metadata.json');
          const stats = fs.statSync(filePath);
          const formattedDate = moment(stats.ctime).format('YYYY-MM-DD HH:mm:ss');
          res.json({ lastUpdateModelRun: formattedDate });
        } catch (error) {
          res.status(500).json({ error: 'Error al obtener la fecha de modificación' });
        }
      }
}