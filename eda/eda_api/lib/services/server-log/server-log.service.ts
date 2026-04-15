import * as fs from 'fs';
import * as path from 'path';

/* SDA CUSTOM */ // SDA CUSTOM - Daily file logger without external runtime dependencies (10-day retention)
/* SDA CUSTOM */ const LOG_RETENTION_DAYS = 10;
/* SDA CUSTOM */ const LOG_DIR_PATH = path.resolve(process.cwd(), 'logs');
/* SDA CUSTOM */ const APP_LOG_PATTERN = /^app-(\d{4}-\d{2}-\d{2})\.log$/;
/* SDA CUSTOM */
/* SDA CUSTOM */ function ensureLogsDirectory() {
/* SDA CUSTOM */   if (!fs.existsSync(LOG_DIR_PATH)) fs.mkdirSync(LOG_DIR_PATH, { recursive: true });
/* SDA CUSTOM */ }
/* SDA CUSTOM */
/* SDA CUSTOM */ function formatTodayKey(date: Date) {
/* SDA CUSTOM */   const year = date.getFullYear();
/* SDA CUSTOM */   const month = String(date.getMonth() + 1).padStart(2, '0');
/* SDA CUSTOM */   const day = String(date.getDate()).padStart(2, '0');
/* SDA CUSTOM */   return `${year}-${month}-${day}`;
/* SDA CUSTOM */ }
/* SDA CUSTOM */
/* SDA CUSTOM */ function getDailyLogPath() {
/* SDA CUSTOM */   const todayKey = formatTodayKey(new Date());
/* SDA CUSTOM */   return path.join(LOG_DIR_PATH, `app-${todayKey}.log`);
/* SDA CUSTOM */ }
/* SDA CUSTOM */
/* SDA CUSTOM */ function pruneOldDailyLogs() {
/* SDA CUSTOM */   const now = new Date();
/* SDA CUSTOM */   now.setHours(0, 0, 0, 0);
/* SDA CUSTOM */   const cutoffDate = new Date(now);
/* SDA CUSTOM */   cutoffDate.setDate(cutoffDate.getDate() - (LOG_RETENTION_DAYS - 1));
/* SDA CUSTOM */
/* SDA CUSTOM */   fs.readdirSync(LOG_DIR_PATH).forEach(fileName => {
/* SDA CUSTOM */     const match = fileName.match(APP_LOG_PATTERN);
/* SDA CUSTOM */     if (!match) return;
/* SDA CUSTOM */     const parsedDate = new Date(`${match[1]}T00:00:00`);
/* SDA CUSTOM */     if (isNaN(parsedDate.getTime())) return;
/* SDA CUSTOM */     if (parsedDate < cutoffDate) {
/* SDA CUSTOM */       try {
/* SDA CUSTOM */         fs.unlinkSync(path.join(LOG_DIR_PATH, fileName));
/* SDA CUSTOM */       } catch (error) {
/* SDA CUSTOM */         // Intentionally ignore pruning errors to avoid breaking request flow
/* SDA CUSTOM */       }
/* SDA CUSTOM */     }
/* SDA CUSTOM */   });
/* SDA CUSTOM */ }
/* SDA CUSTOM */
/* SDA CUSTOM */ function sanitizeField(value: any) {
/* SDA CUSTOM */   return (value || '').toString().replace(/\r|\n/g, ' ').replace(/\|,\|/g, ' ');
/* SDA CUSTOM */ }
/* SDA CUSTOM */
/* SDA CUSTOM */ const ServerLogService = {
/* SDA CUSTOM */   log(payload: any) {
/* SDA CUSTOM */     ensureLogsDirectory();
/* SDA CUSTOM */     pruneOldDailyLogs();
/* SDA CUSTOM */     const row = [
/* SDA CUSTOM */       sanitizeField(payload && payload.level),
/* SDA CUSTOM */       sanitizeField(payload && payload.action),
/* SDA CUSTOM */       sanitizeField(payload && payload.userMail),
/* SDA CUSTOM */       sanitizeField(payload && payload.ip),
/* SDA CUSTOM */       sanitizeField(payload && payload.type),
/* SDA CUSTOM */       sanitizeField(payload && payload.date_str)
/* SDA CUSTOM */     ].join('|,|');
/* SDA CUSTOM */     fs.appendFileSync(getDailyLogPath(), `${row}\n`, { encoding: 'utf8' });
/* SDA CUSTOM */   }
/* SDA CUSTOM */ };
/* SDA CUSTOM */ // END SDA CUSTOM

export default ServerLogService;