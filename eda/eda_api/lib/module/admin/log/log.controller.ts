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

            /* SDA CUSTOM */ // SDA CUSTOM - Read only recent log lines to keep memory/cpu bounded as log grows
            /* SDA CUSTOM */ if (!fs.existsSync(logFilePath)) {
            /* SDA CUSTOM */     return res.status(200).json([]);
            /* SDA CUSTOM */ }
            /* SDA CUSTOM */ const requestedLimit = Number((qs || {}).limit || 300);
            /* SDA CUSTOM */ const safeLimit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(2000, requestedLimit)) : 300;
            /* SDA CUSTOM */ const readWindowMultiplier = (date || startDate || endDate) ? 20 : 4;
            /* SDA CUSTOM */ const maxTailLines = Math.min(20000, safeLimit * readWindowMultiplier);
            /* SDA CUSTOM */ const tailContent = readLastLines(logFilePath, maxTailLines);
            /* SDA CUSTOM */ const lines = tailContent.split('\n');
            /* SDA CUSTOM */ const logs = lines
            /* SDA CUSTOM */     .filter(line => line.trim() !== '')
            /* SDA CUSTOM */     .map(line => {
            /* SDA CUSTOM */         const parts = line.split('|,|');
            /* SDA CUSTOM */         return {
            /* SDA CUSTOM */             level: parts[0]?.trim(),
            /* SDA CUSTOM */             action: parts[1]?.trim(),
            /* SDA CUSTOM */             userMail: parts[2]?.trim(),
            /* SDA CUSTOM */             ip: parts[3]?.trim(),
            /* SDA CUSTOM */             type: parts[4]?.trim(),
            /* SDA CUSTOM */             date_str: parts[5]?.trim()
            /* SDA CUSTOM */         };
            /* SDA CUSTOM */     });

            /* SDA CUSTOM */ let filteredLogs = logs;
            /* SDA CUSTOM */ if (date) {
            /* SDA CUSTOM */     filteredLogs = logs.filter(log => log.date_str && log.date_str.startsWith(date.toString()));
            /* SDA CUSTOM */ } else if (startDate || endDate) {
            /* SDA CUSTOM */     filteredLogs = logs.filter(log => {
            /* SDA CUSTOM */         if (!log.date_str) return false;
            /* SDA CUSTOM */         const logDate = log.date_str.split(' ')[0];
            /* SDA CUSTOM */         if (startDate && logDate < startDate) return false;
            /* SDA CUSTOM */         if (endDate && logDate > endDate) return false;
            /* SDA CUSTOM */         return true;
            /* SDA CUSTOM */     });
            /* SDA CUSTOM */ }

            /* SDA CUSTOM */ filteredLogs = filteredLogs.sort((a, b) => {
            /* SDA CUSTOM */     const dateA = new Date((a?.date_str || '').replace(' ', 'T')).getTime();
            /* SDA CUSTOM */     const dateB = new Date((b?.date_str || '').replace(' ', 'T')).getTime();
            /* SDA CUSTOM */     return dateB - dateA;
            /* SDA CUSTOM */ });
            /* SDA CUSTOM */ // END SDA CUSTOM

            /* SDA CUSTOM */ return res.status(200).json(filteredLogs.slice(0, safeLimit));
        } catch (err) {
            next(err);
        }
    }
    // AI END
}

/* SDA CUSTOM */ // SDA CUSTOM - Efficiently read last N lines from large log files (tail-like)
/* SDA CUSTOM */ function readLastLines(filePath: string, maxLines: number): string {
/* SDA CUSTOM */     const fileDescriptor = fs.openSync(filePath, 'r');
/* SDA CUSTOM */     try {
/* SDA CUSTOM */         const fileStats = fs.fstatSync(fileDescriptor);
/* SDA CUSTOM */         const chunkSize = 64 * 1024;
/* SDA CUSTOM */         let position = fileStats.size;
/* SDA CUSTOM */         let content = '';
/* SDA CUSTOM */         let lineCount = 0;
/* SDA CUSTOM */
/* SDA CUSTOM */         while (position > 0 && lineCount <= maxLines) {
/* SDA CUSTOM */             const currentChunkSize = Math.min(chunkSize, position);
/* SDA CUSTOM */             position -= currentChunkSize;
/* SDA CUSTOM */             const buffer = Buffer.alloc(currentChunkSize);
/* SDA CUSTOM */             fs.readSync(fileDescriptor, buffer, 0, currentChunkSize, position);
/* SDA CUSTOM */             content = buffer.toString('utf8') + content;
/* SDA CUSTOM */             lineCount = content.split('\n').length - 1;
/* SDA CUSTOM */         }
/* SDA CUSTOM */
/* SDA CUSTOM */         const lines = content.split('\n').filter(line => line.trim() !== '');
/* SDA CUSTOM */         return lines.slice(-maxLines).join('\n');
/* SDA CUSTOM */     } finally {
/* SDA CUSTOM */         fs.closeSync(fileDescriptor);
/* SDA CUSTOM */     }
/* SDA CUSTOM */ }
/* SDA CUSTOM */ // END SDA CUSTOM