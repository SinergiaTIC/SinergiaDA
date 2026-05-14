import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Message } from 'primeng/api';
import * as _ from 'lodash';

@Injectable()
export class AlertService {

    public alerts: Message[] = [];

    private getSource = new Subject<any>();
    getAlerts$ = this.getSource.asObservable();

    constructor() {}

    addInfo(message: any) {
        this.getSource.next(
            {
                detail: message,
                summary: 'Info',
                severity: 'info'
            }
        );
    }

    addError(err: any) {
        console.log('Error', err);
        let message = '';

        if ( _.isEqual(typeof err, 'string')) {
            message = err;
        } else {
// SDA CUSTOM - Improve error message extraction from HttpErrorResponse
/*SDA CUSTOM*/      if (err.error && err.error.message) {
/*SDA CUSTOM*/          message = err.error.message;
/*SDA CUSTOM*/      } else if (err.message) {
/*SDA CUSTOM*/          message = err.message;
/*SDA CUSTOM*/      } else if (err.text) {
/*SDA CUSTOM*/          message = err.text;
/*SDA CUSTOM*/      } else {
/*SDA CUSTOM*/          message = ' - Server Error';
/*SDA CUSTOM*/      }
// END SDA CUSTOM
        }

        this.getSource.next(
            {
                detail: message,
                summary: 'Error',
                severity: 'error',
                nextPage: err.nextPage
            }
        );
    }

    addWarning(message: any) {
        this.getSource.next(
            {
                detail: message,
                summary: 'Alert',
                severity: 'warn'
            }
        );
    }

    addSuccess(message: any) {
        this.getSource.next(
            {
                detail: message,
                summary: '',
                severity: 'success'
            }
        );
    }
}
