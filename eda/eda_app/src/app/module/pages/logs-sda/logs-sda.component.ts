import { Component, OnInit } from '@angular/core';
import { LogService, AlertService } from '@eda/services/service.index';
import { SpinnerService } from '@eda/services/shared/spinner.service';
import * as moment from 'moment';
import { format as formatSqlStatement } from 'sql-formatter';

@Component({
    selector: 'app-logs-sda',
    templateUrl: './logs-sda.component.html',
    styleUrls: ['./logs-sda.component.css']
})
export class LogsSdaComponent implements OnInit {

    public appLogs: any[] = [];
    public selectedDate: Date = new Date();
    public firstDayOfWeek: number = 1;
    /* SDA CUSTOM */ public queryErrorDialogVisible: boolean = false;
    /* SDA CUSTOM */ public selectedQueryError: any = null;
    /* SDA CUSTOM */ public queryErrorCopyStatus: string = '';

    public periods: any[] = [
        { label: $localize`:@@Today:Hoy`, value: 'today' },
        { label: $localize`:@@Yesterday:Ayer`, value: 'yesterday' },
        { label: $localize`:@@Last7Days:Últimos 7 días`, value: 'last7days' },
        { label: $localize`:@@Last30Days:Últimos 30 días`, value: 'last30days' },
        { label: $localize`:@@ThisMonth:Este mes`, value: 'thismonth' },
        { label: $localize`:@@Custom:Personalizado`, value: 'custom' }
    ];
    public selectedPeriod: string = 'today';

    public cols: any[] = [
        { field: 'date_str', header: $localize`:@@Date:Fecha` },
        { field: 'level', header: $localize`:@@Level:Nivel` },
        { field: 'action', header: $localize`:@@Action:Acción` },
        { field: 'userMail', header: $localize`:@@User:Usuario` },
        { field: 'ip', header: $localize`:@@IP:IP` },
        { field: 'type', header: $localize`:@@Type:Tipo` }
    ];

    constructor(
        private logService: LogService,
        private alertService: AlertService,
        private spinnerService: SpinnerService
    ) { }

    ngOnInit(): void {
        this.loadLogs();
    }

    loadLogs() {
        this.spinnerService.on();

        let params: any = {};

        if (this.selectedPeriod === 'custom') {
            params.date = moment(this.selectedDate).format('YYYY-MM-DD');
        } else {
            const range = this.getPeriodRange(this.selectedPeriod);
            params.startDate = range.start;
            params.endDate = range.end;
        }
        /* SDA CUSTOM */ params.limit = 300; // SDA CUSTOM - Keep log payload bounded to reduce server and UI load

        /* SDA CUSTOM */ // SDA CUSTOM - Keep logs viewer focused on application audit log only
        /* SDA CUSTOM */ this.logService.getAppLogs(params).subscribe(
        /* SDA CUSTOM */     (resp: any) => {
        /* SDA CUSTOM */         const sortedLogs = this.sortLogsByDateDesc(resp || []);
        /* SDA CUSTOM */         this.appLogs = this.prepareLogsForTypeColumn(sortedLogs);
        /* SDA CUSTOM */         this.spinnerService.off();
        /* SDA CUSTOM */     },
        /* SDA CUSTOM */     (err) => {
        /* SDA CUSTOM */         this.alertService.addError(err);
        /* SDA CUSTOM */         this.spinnerService.off();
        /* SDA CUSTOM */     }
        /* SDA CUSTOM */ );
        /* SDA CUSTOM */ // END SDA CUSTOM
    }

    getPeriodRange(period: string): { start: string, end: string } {
        const today = moment();
        let start = moment();
        let end = moment();

        switch (period) {
            case 'today':
                start = today;
                end = today;
                break;
            case 'yesterday':
                start = moment().subtract(1, 'days');
                end = start;
                break;
            case 'last7days':
                start = moment().subtract(6, 'days');
                end = today;
                break;
            case 'last30days':
                start = moment().subtract(29, 'days');
                end = today;
                break;
            case 'thismonth':
                start = moment().startOf('month');
                end = today;
                break;
        }

        return {
            start: start.format('YYYY-MM-DD'),
            end: end.format('YYYY-MM-DD')
        };
    }

    onPeriodChange() {
        if (this.selectedPeriod !== 'custom') {
            this.loadLogs();
        }
    }

    onDateChange() {
        this.selectedPeriod = 'custom';
        this.loadLogs();
    }

    /* SDA CUSTOM */ // SDA CUSTOM - Parse log date format YYYY-MM-DD H:m:s safely (with or without zero padding)
    /* SDA CUSTOM */ private parseLogDateToTimestamp(dateStr: string): number {
    /* SDA CUSTOM */     if (!dateStr || typeof dateStr !== 'string') return 0;
    /* SDA CUSTOM */     const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    /* SDA CUSTOM */     if (!match) return 0;
    /* SDA CUSTOM */     const year = Number(match[1]);
    /* SDA CUSTOM */     const month = Number(match[2]) - 1;
    /* SDA CUSTOM */     const day = Number(match[3]);
    /* SDA CUSTOM */     const hour = Number(match[4]);
    /* SDA CUSTOM */     const minute = Number(match[5]);
    /* SDA CUSTOM */     const second = Number(match[6]);
    /* SDA CUSTOM */     return new Date(year, month, day, hour, minute, second).getTime();
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Format date string with leading zeros for HH:mm:ss in UI
    /* SDA CUSTOM */ formatDateForDisplay(dateStr: string): string {
    /* SDA CUSTOM */     if (!dateStr || typeof dateStr !== 'string') return dateStr;
    /* SDA CUSTOM */     const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
    /* SDA CUSTOM */     if (!match) return dateStr;
    /* SDA CUSTOM */     const hour = String(Number(match[4])).padStart(2, '0');
    /* SDA CUSTOM */     const minute = String(Number(match[5])).padStart(2, '0');
    /* SDA CUSTOM */     const second = String(Number(match[6])).padStart(2, '0');
    /* SDA CUSTOM */     return `${match[1]}-${match[2]}-${match[3]} ${hour}:${minute}:${second}`;
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Sort logs descending by real timestamp for correct chronological order
    /* SDA CUSTOM */ private sortLogsByDateDesc(logs: any[]): any[] {
    /* SDA CUSTOM */     return [...logs].sort((a, b) => this.parseLogDateToTimestamp(b?.date_str) - this.parseLogDateToTimestamp(a?.date_str));
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - PrimeNG custom sort to avoid lexicographical sorting for date_str
    /* SDA CUSTOM */ onTableSort(event: any) {
    /* SDA CUSTOM */     const field = event?.field;
    /* SDA CUSTOM */     const order = event?.order || 1;
    /* SDA CUSTOM */     if (field !== 'date_str') {
    /* SDA CUSTOM */         const data = event?.data || [];
    /* SDA CUSTOM */         data.sort((a, b) => {
    /* SDA CUSTOM */             const first = (a?.[field] ?? '').toString().toLowerCase();
    /* SDA CUSTOM */             const second = (b?.[field] ?? '').toString().toLowerCase();
    /* SDA CUSTOM */             if (first < second) return -1 * order;
    /* SDA CUSTOM */             if (first > second) return 1 * order;
    /* SDA CUSTOM */             return 0;
    /* SDA CUSTOM */         });
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     const data = event?.data || [];
    /* SDA CUSTOM */     data.sort((a, b) => (this.parseLogDateToTimestamp(a?.date_str) - this.parseLogDateToTimestamp(b?.date_str)) * order);
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Build friendly metadata for type column (operation first + dashboard link)
    /* SDA CUSTOM */ private prepareLogsForTypeColumn(logs: any[]): any[] {
    /* SDA CUSTOM */     return logs.map(log => {
    /* SDA CUSTOM */         const parsedType = this.parseDashboardType(log?.type);
    /* SDA CUSTOM */         const parsedQueryFailure = this.parsePanelQueryFailureDetail(parsedType?.detail);
    /* SDA CUSTOM */         const operationLabel = this.getOperationLabel(log?.action, parsedType?.detail);
    /* SDA CUSTOM */         const canLinkDashboard = this.isDashboardAction(log?.action) && !!parsedType?.dashboardId && log?.action !== 'DashboardDeleted';
    /* SDA CUSTOM */         return {
    /* SDA CUSTOM */             ...log,
    /* SDA CUSTOM */             typeOperationLabel: operationLabel,
    /* SDA CUSTOM */             typeDashboardId: parsedType?.dashboardId || '',
    /* SDA CUSTOM */             typeDashboardTitle: parsedType?.dashboardTitle || '',
    /* SDA CUSTOM */             typeCanLinkDashboard: canLinkDashboard,
    /* SDA CUSTOM */             typePanelId: parsedQueryFailure.panel,
    /* SDA CUSTOM */             typePanelName: parsedQueryFailure.panelName,
    /* SDA CUSTOM */             typeQueryMode: parsedQueryFailure.mode,
    /* SDA CUSTOM */             typeQueryError: parsedQueryFailure.error,
    /* SDA CUSTOM */             typeQuerySqlB64: parsedQueryFailure.sqlB64,
    /* SDA CUSTOM */             typeQuerySql: parsedQueryFailure.sql
    /* SDA CUSTOM */         };
    /* SDA CUSTOM */     });
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Parse PanelQueryFailed detail payload into fields for popup
    /* SDA CUSTOM */ private parsePanelQueryFailureDetail(detail: string): any {
    /* SDA CUSTOM */     const raw = (detail || '').toString();
    /* SDA CUSTOM */     const mode = this.extractDetailSegment(raw, 'mode:', '--panel:');
    /* SDA CUSTOM */     let panel = this.extractDetailSegment(raw, '--panel:', '--panel_name:');
    /* SDA CUSTOM */     let panelName = this.extractDetailSegment(raw, '--panel_name:', '--error:');
    /* SDA CUSTOM */     if (!panel) panel = this.extractDetailSegment(raw, '--panel:', '--error:');
    /* SDA CUSTOM */     if (!panelName) panelName = '-';
    /* SDA CUSTOM */     const sqlB64 = this.extractDetailSegment(raw, '--sql_b64:', '--sql:');
    /* SDA CUSTOM */     const error = this.extractDetailSegment(raw, '--error:', '--sql:');
    /* SDA CUSTOM */     const sql = this.extractDetailSegment(raw, '--sql:', '');
    /* SDA CUSTOM */     return { mode, panel, panelName, error, sqlB64, sql };
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Generic extractor for keyed segments in type detail payload
    /* SDA CUSTOM */ private extractDetailSegment(value: string, startToken: string, endToken: string): string {
    /* SDA CUSTOM */     const startIndex = value.indexOf(startToken);
    /* SDA CUSTOM */     if (startIndex < 0) return '';
    /* SDA CUSTOM */     const from = startIndex + startToken.length;
    /* SDA CUSTOM */     if (!endToken) return value.substring(from).trim();
    /* SDA CUSTOM */     const endIndex = value.indexOf(endToken, from);
    /* SDA CUSTOM */     if (endIndex < 0) return value.substring(from).trim();
    /* SDA CUSTOM */     return value.substring(from, endIndex).trim();
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Open popup with detailed information for failed panel query
    /* SDA CUSTOM */ openQueryErrorDialog(rowData: any) {
    /* SDA CUSTOM */     this.queryErrorCopyStatus = '';
    /* SDA CUSTOM */     this.selectedQueryError = {
    /* SDA CUSTOM */         reportName: rowData?.typeDashboardTitle || '-',
    /* SDA CUSTOM */         reportId: rowData?.typeDashboardId || '-',
    /* SDA CUSTOM */         panelName: rowData?.typePanelName || '-',
    /* SDA CUSTOM */         panelId: rowData?.typePanelId || '-',
    /* SDA CUSTOM */         mode: rowData?.typeQueryMode || '-',
    /* SDA CUSTOM */         error: rowData?.typeQueryError || '-',
    /* SDA CUSTOM */         sql: this.formatSqlForDisplay(this.getRawSqlFromLog(rowData))
    /* SDA CUSTOM */     };
    /* SDA CUSTOM */     this.queryErrorDialogVisible = true;
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Copy SQL to clipboard with fallback for older browsers
    /* SDA CUSTOM */ async copyQuerySqlToClipboard() {
    /* SDA CUSTOM */     const sql = (this.selectedQueryError && this.selectedQueryError.sql) ? this.selectedQueryError.sql.toString() : '';
    /* SDA CUSTOM */     if (!sql || sql === '-') {
    /* SDA CUSTOM */         this.queryErrorCopyStatus = 'No SQL available';
    /* SDA CUSTOM */         return;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     try {
    /* SDA CUSTOM */         if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    /* SDA CUSTOM */             await navigator.clipboard.writeText(sql);
    /* SDA CUSTOM */             this.queryErrorCopyStatus = 'SQL copied';
    /* SDA CUSTOM */             return;
    /* SDA CUSTOM */         }
    /* SDA CUSTOM */     } catch (e) {
    /* SDA CUSTOM */         // continue to legacy fallback
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     const textArea = document.createElement('textarea');
    /* SDA CUSTOM */     textArea.value = sql;
    /* SDA CUSTOM */     textArea.style.position = 'fixed';
    /* SDA CUSTOM */     textArea.style.opacity = '0';
    /* SDA CUSTOM */     document.body.appendChild(textArea);
    /* SDA CUSTOM */     textArea.focus();
    /* SDA CUSTOM */     textArea.select();
    /* SDA CUSTOM */     try {
    /* SDA CUSTOM */         document.execCommand('copy');
    /* SDA CUSTOM */         this.queryErrorCopyStatus = 'SQL copied';
    /* SDA CUSTOM */     } catch (e) {
    /* SDA CUSTOM */         this.queryErrorCopyStatus = 'Copy failed';
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     document.body.removeChild(textArea);
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Get raw SQL preferring sql_b64 payload when available
    /* SDA CUSTOM */ private getRawSqlFromLog(rowData: any): string {
    /* SDA CUSTOM */     const encoded = rowData?.typeQuerySqlB64 || '';
    /* SDA CUSTOM */     if (encoded) {
    /* SDA CUSTOM */         const decoded = this.decodeBase64Utf8(encoded);
    /* SDA CUSTOM */         if (decoded) return decoded;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */     return rowData?.typeQuerySql || '';
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Decode base64 text safely (UTF-8)
    /* SDA CUSTOM */ private decodeBase64Utf8(encoded: string): string {
    /* SDA CUSTOM */     try {
    /* SDA CUSTOM */         const binary = atob(encoded);
    /* SDA CUSTOM */         const escaped = Array.prototype.map.call(binary, (char: string) => {
    /* SDA CUSTOM */             return '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2);
    /* SDA CUSTOM */         }).join('');
    /* SDA CUSTOM */         return decodeURIComponent(escaped);
    /* SDA CUSTOM */     } catch (e) {
    /* SDA CUSTOM */         return '';
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Lightweight SQL formatter for popup readability
    /* SDA CUSTOM */ private formatSqlForDisplay(sql: string): string {
    /* SDA CUSTOM */     if (!sql) return '-';
    /* SDA CUSTOM */     try {
    /* SDA CUSTOM */         return formatSqlStatement(sql, { language: 'sql' });
    /* SDA CUSTOM */     } catch (e) {
    /* SDA CUSTOM */         return sql;
    /* SDA CUSTOM */     }
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Parse dashboard payload from type field format: id--title--detail
    /* SDA CUSTOM */ private parseDashboardType(typeValue: string): any {
    /* SDA CUSTOM */     const typeText = (typeValue || '').toString();
    /* SDA CUSTOM */     const parts = typeText.split('--');
    /* SDA CUSTOM */     return {
    /* SDA CUSTOM */         dashboardId: parts[0] || '',
    /* SDA CUSTOM */         dashboardTitle: parts[1] || '',
    /* SDA CUSTOM */         detail: parts.slice(2).join('--') || ''
    /* SDA CUSTOM */     };
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Identify actions related to dashboard operations
    /* SDA CUSTOM */ private isDashboardAction(action: string): boolean {
    /* SDA CUSTOM */     return ['DashboardAccessed', 'DashboardCreated', 'DashboardUpdated', 'DashboardRenamed', 'DashboardVisibilityChanged', 'DashboardDeleted', 'PanelQueryFailed'].includes(action);
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

    /* SDA CUSTOM */ // SDA CUSTOM - Convert action/detail to user-friendly operation label for type column
    /* SDA CUSTOM */ private getOperationLabel(action: string, detail: string): string {
    /* SDA CUSTOM */     const actionLabels = {
    /* SDA CUSTOM */         DashboardAccessed: 'Access',
    /* SDA CUSTOM */         DashboardCreated: 'Creation',
    /* SDA CUSTOM */         DashboardUpdated: 'Update',
    /* SDA CUSTOM */         DashboardRenamed: 'Rename',
    /* SDA CUSTOM */         DashboardVisibilityChanged: 'Visibility Change',
    /* SDA CUSTOM */         DashboardDeleted: 'Deletion',
    /* SDA CUSTOM */         PanelQueryFailed: 'Query Failure',
    /* SDA CUSTOM */         UserCreated: 'User Creation',
    /* SDA CUSTOM */         UserUpdated: 'User Update',
    /* SDA CUSTOM */         UserDeleted: 'User Deletion',
    /* SDA CUSTOM */         UserRolesChanged: 'User Roles Change',
    /* SDA CUSTOM */         UserPasswordChanged: 'User Password Change',
    /* SDA CUSTOM */         GroupCreated: 'Group Creation',
    /* SDA CUSTOM */         GroupUpdated: 'Group Update',
    /* SDA CUSTOM */         GroupDeleted: 'Group Deletion',
    /* SDA CUSTOM */         GroupMembershipChanged: 'Group Membership Change',
    /* SDA CUSTOM */         UpdateModelStarted: 'Model Update Start',
    /* SDA CUSTOM */         UpdateModelUsersAndGroupsSynced: 'Users/Groups Sync',
    /* SDA CUSTOM */         UpdateModelUsersAndGroupsSyncFailed: 'Users/Groups Sync Failure',
    /* SDA CUSTOM */         UpdateModelRolesMapped: 'Role Mapping',
    /* SDA CUSTOM */         UpdateModelRolesMappingFailed: 'Role Mapping Failure',
    /* SDA CUSTOM */         UpdateModelDataModelBuilt: 'Data Model Build',
    /* SDA CUSTOM */         UpdateModelDataModelBuildFailed: 'Data Model Build Failure',
    /* SDA CUSTOM */         UpdateModelCompleted: 'Model Update Completed',
    /* SDA CUSTOM */         UpdateModelPushFailed: 'Model Push Failure',
    /* SDA CUSTOM */         UpdateModelFailed: 'Model Update Failure'
    /* SDA CUSTOM */     };
    /* SDA CUSTOM */     if (actionLabels[action]) return actionLabels[action];
    /* SDA CUSTOM */     if (detail === 'attempt') return 'Attempt';
    /* SDA CUSTOM */     if (detail === 'login') return 'Login';
    /* SDA CUSTOM */     return detail || '-';
    /* SDA CUSTOM */ }
    /* SDA CUSTOM */ // END SDA CUSTOM

}
