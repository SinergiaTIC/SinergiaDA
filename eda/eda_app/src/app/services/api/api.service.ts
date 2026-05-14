import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { URL_SERVICES } from '../../config/config';
import * as _ from 'lodash';

@Injectable()
export class ApiService {
    public API = URL_SERVICES;

    constructor(protected http: HttpClient) { }


    public handleError(error: any) {
        console.warn(error);

        const result: { [k: string]: any } = {};
        result.status = error.status;

        switch (error.status) {
// SDA CUSTOM - Generic error message extraction and improved status handling
/*SDA CUSTOM*/      case 401: /* Token error */
/*SDA CUSTOM*/          result.text = '401';
/*SDA CUSTOM*/          result.nextPage = 'logout';
/*SDA CUSTOM*/          break;
/*SDA CUSTOM*/      case 403:
/*SDA CUSTOM*/          result.text = error.error.message;
/*SDA CUSTOM*/          result.nextPage = 'home';
/*SDA CUSTOM*/          break;
/*SDA CUSTOM*/      default:
/*SDA CUSTOM*/          if (error.error && error.error.message) {
/*SDA CUSTOM*/              result.text = error.error.message;
/*SDA CUSTOM*/          } else if (error.statusText === 'Unknow Error') {
/*SDA CUSTOM*/              result.text = ' - Error del servidor';
/*SDA CUSTOM*/          }
/*SDA CUSTOM*/          break;
// END SDA CUSTOM
        }
        return throwError(result);
    }

    private getHeaders() {
        const headers = new HttpHeaders();
        headers.append('Content-Type', 'application/json');
        return headers;
    }

    private getSearchParamToken() {
        const token = localStorage.getItem('token');
        let params: HttpParams = new HttpParams();

        if (token) {
            params = params.set('token', token);
        }

        return params;
    }

    public get(route: any, skipToken?: boolean) {
        let options;

        if (!skipToken) {
            options = {
                headers: this.getHeaders(),
                params: this.getSearchParamToken()
            };
        } else {
            options = {
                headers: this.getHeaders()
            };
        }

        return this.http
            .get(this.API + route, options)
            .pipe(
                map(response => response || {}),
                catchError(this.handleError)
            );
    }

    public getParams(route: any, params: any) {

        let search = this.getSearchParamToken();

        _.forEach(params, (value: any, key: number) => {
            if (!_.isNil(value)) {
                if (_.isEqual(typeof value, 'object')) {
                    search = search.append(String(key), value);
                } else {
                    search = search.append(String(key), value);
                }
            }
        })

        const options = {
            headers: this.getHeaders(),
            params: search
        };

        return this.http
            .get(this.API + route, options)
            .pipe(
                map(response => response || {}),
                catchError(this.handleError)
            );
    }

    public delete(route: any) {
        const options = {
            headers: this.getHeaders(),
            params: this.getSearchParamToken()
        };

        return this.http
            .delete(this.API + route, options)
            .pipe(
                map(response => response || {}),
                catchError(this.handleError)
            );
    }

    public post(route: any, body: any, skipToken?: boolean) {
        let options;

        if (!skipToken) {
            options = {
                headers: this.getHeaders(),
                params: this.getSearchParamToken()
            };
        } else {
            options = {
                headers: this.getHeaders()
            };
        }

        return this.http.post(this.API + route, body, options).pipe(
            map(response => response || {}),
            catchError(this.handleError)
        );
    }

    public put(route: any, body: any) {
        const options = {
            headers: this.getHeaders(),
            params: this.getSearchParamToken()
        };

        return this.http
            .put(this.API + route, body, options)
            .pipe(
                map(response => response || {}),
                catchError(this.handleError)
            );
    }

}
