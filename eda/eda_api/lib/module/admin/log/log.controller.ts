import { NextFunction, Request, Response } from 'express';
import { HttpException } from '../../global/model/index';
import * as fs from 'fs';
import * as path from 'path';



const eda_api_config = require('../../../../config/eda_api_config.js');



export class LogController {


    static async getLogFile(req: Request, res: Response, next: NextFunction) {
        try {
            let logFilePath = eda_api_config.log_file;

            if (!fs.existsSync(logFilePath)) {
                // Try alternative path in user home for local dev or different docker setups
                const homePath = process.env.HOME || process.env.USERPROFILE;
                if (homePath) {
                    const altPath = path.join(homePath, '.pm2/logs/server-out.log');
                    if (fs.existsSync(altPath)) {
                        logFilePath = altPath;
                    }
                }
            }

            if (!fs.existsSync(logFilePath)) {
                return res.status(200).json({ content: 'Información: El archivo de log del servidor no existe en este entorno.\nEn desarrollo (Docker sin PM2) el servidor no genera este archivo automáticamente.' });
            }

            fs.readFile(logFilePath, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error al leer el archivo de log:', err);
                    return next(new HttpException(500, 'Error: No se puede leer el archivo de log del servidor'));
                }
                return res.status(200).json({ content: data });
            });
        } catch (err) {
            next(err);
        }
    }

    static async getLogErrorFile(req: Request, res: Response, next: NextFunction) {
        try {
            let logFilePath = eda_api_config.error_log_file;

            if (!fs.existsSync(logFilePath)) {
                // Try alternative path in user home
                const homePath = process.env.HOME || process.env.USERPROFILE;
                if (homePath) {
                    const altPath = path.join(homePath, '.pm2/logs/server-error.log');
                    if (fs.existsSync(altPath)) {
                        logFilePath = altPath;
                    }
                }
            }

            if (!fs.existsSync(logFilePath)) {
                return res.status(200).json({ content: 'Información: El archivo de errores del servidor no existe en este entorno.\nEn desarrollo (Docker sin PM2) el servidor no genera este archivo automáticamente.' });
            }

            fs.readFile(logFilePath, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error al leer el archivo de log:', err);
                    return next(new HttpException(500, 'Error: No se puede leer el archivo de errores del servidor'));
                }
                return res.status(200).json({ content: data });
            });
        } catch (err) {
            next(err);
        }
    }

    // AI START
    static async getAppLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const logFilePath = path.resolve(__dirname, '../../../../logs/app.log');
            const qs = (req as any).qs;
            const { date, startDate, endDate } = qs || {} as any;

            fs.readFile(logFilePath, 'utf8', (err, data) => {
                if (err) {
                    console.error('Error reading app log file:', err);
                    return next(new HttpException(500, 'Error: Could not read application logs'));
                }

                const lines = data.split('\n');
                const logs = lines
                    .filter(line => line.trim() !== '')
                    .map(line => {
                        const parts = line.split('|,|');
                        return {
                            level: parts[0]?.trim(),
                            action: parts[1]?.trim(),
                            userMail: parts[2]?.trim(),
                            ip: parts[3]?.trim(),
                            type: parts[4]?.trim(),
                            date_str: parts[5]?.trim()
                        };
                    });

                let filteredLogs = logs;
                if (date) {
                    filteredLogs = logs.filter(log => log.date_str && log.date_str.startsWith(date.toString()));
                } else if (startDate || endDate) {
                    filteredLogs = logs.filter(log => {
                        if (!log.date_str) return false;
                        const logDate = log.date_str.split(' ')[0]; // Get YYYY-MM-DD
                        if (startDate && logDate < startDate) return false;
                        if (endDate && logDate > endDate) return false;
                        return true;
                    });
                }

                return res.status(200).json(filteredLogs);
            });
        } catch (err) {
            next(err);
        }
    }
    // AI END
}