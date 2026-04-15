// SDA CUSTOM - Controller for SDA audit log viewer (daily rotating CSV logs)
import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

export class LogSdaController {

    /* SDA CUSTOM */ static async getAppLogs(req: Request, res: Response, next: NextFunction) {
    /* SDA CUSTOM */     try {
    /* SDA CUSTOM */         const logsDirectoryPath = path.resolve(__dirname, '../../../../logs');
    /* SDA CUSTOM */         const qs = (req as any).qs;
    /* SDA CUSTOM */         const { date, startDate, endDate } = qs || {} as any;
    /* SDA CUSTOM */
    /* SDA CUSTOM */         // SDA CUSTOM - Read all files that may contain requested range to guarantee 10-day visibility
    /* SDA CUSTOM */         if (!fs.existsSync(logsDirectoryPath)) {
    /* SDA CUSTOM */             return res.status(200).json([]);
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */         const requestedLimitRaw = (qs || {}).limit;
    /* SDA CUSTOM */         const hasRequestedLimit = requestedLimitRaw !== undefined && requestedLimitRaw !== null && requestedLimitRaw !== '';
    /* SDA CUSTOM */         const requestedLimit = Number(requestedLimitRaw);
    /* SDA CUSTOM */         const safeLimit = hasRequestedLimit && Number.isFinite(requestedLimit) ? Math.max(1, Math.min(20000, requestedLimit)) : 0;
    /* SDA CUSTOM */         const requestedStartDate = date ? date.toString() : (startDate ? startDate.toString() : undefined);
    /* SDA CUSTOM */         const requestedEndDate = date ? date.toString() : (endDate ? endDate.toString() : undefined);
    /* SDA CUSTOM */         const logFiles = resolveAppLogFiles(logsDirectoryPath, requestedStartDate, requestedEndDate);
    /* SDA CUSTOM */         if (logFiles.length === 0) {
    /* SDA CUSTOM */             return res.status(200).json([]);
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */         const rawContent = logFiles.map(filePath => readFileSafely(filePath)).join('\n');
    /* SDA CUSTOM */         const lines = rawContent.split('\n');
    /* SDA CUSTOM */         const logs = lines
    /* SDA CUSTOM */             .filter(line => line.trim() !== '')
    /* SDA CUSTOM */             .map(line => {
    /* SDA CUSTOM */                 const parts = line.split('|,|');
    /* SDA CUSTOM */                 return {
    /* SDA CUSTOM */                     level: parts[0]?.trim(),
    /* SDA CUSTOM */                     action: parts[1]?.trim(),
    /* SDA CUSTOM */                     userMail: parts[2]?.trim(),
    /* SDA CUSTOM */                     ip: parts[3]?.trim(),
    /* SDA CUSTOM */                     type: parts[4]?.trim(),
    /* SDA CUSTOM */                     date_str: parts[5]?.trim()
    /* SDA CUSTOM */                 };
    /* SDA CUSTOM */             });
    /* SDA CUSTOM */
    /* SDA CUSTOM */         let filteredLogs = logs;
    /* SDA CUSTOM */         if (date) {
    /* SDA CUSTOM */             filteredLogs = logs.filter(log => log.date_str && log.date_str.startsWith(date.toString()));
    /* SDA CUSTOM */         } else if (startDate || endDate) {
    /* SDA CUSTOM */             filteredLogs = logs.filter(log => {
    /* SDA CUSTOM */                 if (!log.date_str) return false;
    /* SDA CUSTOM */                 const logDate = log.date_str.split(' ')[0];
    /* SDA CUSTOM */                 if (startDate && logDate < startDate) return false;
    /* SDA CUSTOM */                 if (endDate && logDate > endDate) return false;
    /* SDA CUSTOM */                 return true;
    /* SDA CUSTOM */             });
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */
    /* SDA CUSTOM */         filteredLogs = filteredLogs.sort((a, b) => {
    /* SDA CUSTOM */             const dateA = new Date((a?.date_str || '').replace(' ', 'T')).getTime();
    /* SDA CUSTOM */             const dateB = new Date((b?.date_str || '').replace(' ', 'T')).getTime();
    /* SDA CUSTOM */             return dateB - dateA;
    /* SDA CUSTOM */         });
    /* SDA CUSTOM */         // END SDA CUSTOM
    /* SDA CUSTOM */
    /* SDA CUSTOM */         return res.status(200).json(safeLimit > 0 ? filteredLogs.slice(0, safeLimit) : filteredLogs);
    /* SDA CUSTOM */     } catch (err) {
    /* SDA CUSTOM */         next(err);
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }
}
// END SDA CUSTOM

/* SDA CUSTOM */ // SDA CUSTOM - Resolve all application log files (daily + rotated + legacy) for requested date range
/* SDA CUSTOM */ function resolveAppLogFiles(logsDirectoryPath: string, startDate?: string, endDate?: string): string[] {
/* SDA CUSTOM */     const fileNames = fs.readdirSync(logsDirectoryPath);
/* SDA CUSTOM */     const selectedFiles: string[] = [];
/* SDA CUSTOM */
/* SDA CUSTOM */     fileNames.forEach(fileName => {
/* SDA CUSTOM */         const dailyMatch = fileName.match(/^app-(\d{4}-\d{2}-\d{2})\.log(?:\.\d+)?$/);
/* SDA CUSTOM */         if (dailyMatch) {
/* SDA CUSTOM */             const logDate = dailyMatch[1];
/* SDA CUSTOM */             if (startDate && logDate < startDate) return;
/* SDA CUSTOM */             if (endDate && logDate > endDate) return;
/* SDA CUSTOM */             selectedFiles.push(path.join(logsDirectoryPath, fileName));
/* SDA CUSTOM */             return;
/* SDA CUSTOM */         }
/* SDA CUSTOM */
/* SDA CUSTOM */         if (/^app\.log(?:\.\d+)?$/.test(fileName)) {
/* SDA CUSTOM */             selectedFiles.push(path.join(logsDirectoryPath, fileName));
/* SDA CUSTOM */         }
/* SDA CUSTOM */     });
/* SDA CUSTOM */
/* SDA CUSTOM */     return selectedFiles.sort((firstPath, secondPath) => {
/* SDA CUSTOM */         const firstMtime = fs.statSync(firstPath).mtime.getTime();
/* SDA CUSTOM */         const secondMtime = fs.statSync(secondPath).mtime.getTime();
/* SDA CUSTOM */         return firstMtime - secondMtime;
/* SDA CUSTOM */     });
/* SDA CUSTOM */ }
/* SDA CUSTOM */
/* SDA CUSTOM */ // SDA CUSTOM - Read file content safely to avoid breaking whole response if one rotated file is unreadable
/* SDA CUSTOM */ function readFileSafely(filePath: string): string {
/* SDA CUSTOM */     try {
/* SDA CUSTOM */         return fs.readFileSync(filePath, 'utf8');
/* SDA CUSTOM */     } catch (error) {
/* SDA CUSTOM */         return '';
/* SDA CUSTOM */     }
/* SDA CUSTOM */ }
/* SDA CUSTOM */ // END SDA CUSTOM
