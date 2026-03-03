import { Component, OnInit } from '@angular/core';
import { LogService, AlertService } from '@eda/services/service.index';
import { SpinnerService } from '@eda/services/shared/spinner.service';
import * as moment from 'moment';

@Component({
    selector: 'app-logs-sda',
    templateUrl: './logs-sda.component.html',
    styleUrls: ['./logs-sda.component.css']
})
export class LogsSdaComponent implements OnInit {

    public appLogs: any[] = [];
    public rawLogContent: string = '';
    public selectedDate: Date = new Date();
    public logType: 'app' | 'server' | 'error' = 'app';
    public firstDayOfWeek: number = 1;

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

        if (this.logType === 'app') {
            this.logService.getAppLogs(params).subscribe(
                (resp: any) => {
                    this.appLogs = resp;
                    this.spinnerService.off();
                },
                (err) => {
                    this.alertService.addError(err);
                    this.spinnerService.off();
                }
            );
        } else if (this.logType === 'server') {
            this.logService.getLogFile().subscribe(
                (resp: any) => {
                    this.rawLogContent = resp.content;
                    this.spinnerService.off();
                },
                (err) => {
                    this.alertService.addError(err);
                    this.spinnerService.off();
                }
            );
        } else if (this.logType === 'error') {
            this.logService.getLogErrorFile().subscribe(
                (resp: any) => {
                    this.rawLogContent = resp.content;
                    this.spinnerService.off();
                },
                (err) => {
                    this.alertService.addError(err);
                    this.spinnerService.off();
                }
            );
        }
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

    onTypeChange(type: 'app' | 'server' | 'error') {
        this.logType = type;
        this.loadLogs();
    }

}
