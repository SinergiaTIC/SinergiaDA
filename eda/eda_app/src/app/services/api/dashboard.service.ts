import {Injectable, Output, EventEmitter} from '@angular/core';
import {Observable, BehaviorSubject} from 'rxjs';
import {ApiService} from './api.service';

@Injectable()
export class DashboardService extends ApiService {

    private route = '/dashboard/';
    private routeDataManager = '/database-manager';

    public _notSaved = new BehaviorSubject<boolean>(false); // [{ display_name: { default: '' }, eda-columns: [] }] --> just in case
    public notSaved = this._notSaved.asObservable();

    getDashboards(): Observable<any> {
        return this.get( this.route );
    }

    getDashboard( id ): Observable<any> {
        return this.get( `${this.route}${id}` );
    }
/*SDA CUSTOM    // This function is used to check if a dashboard is public (shared) or not. It is used in the login guard to allow anonymous users to access public dashboards without needing to log in.
                 It returns a boolean value indicating if the dashboard is public (shared) or not.*/
/*SDA CUSTOM*/   getDashboardVisibility( id ): Observable<any> {
/*SDA CUSTOM*/       return this.get( `${this.route}${id}/visibility` );
/*SDA CUSTOM*/   }

    addNewDashboard( dashboard, forceDuplicate?: boolean ): Observable<any> {
        /* SDA CUSTOM */ const body = forceDuplicate ? { ...dashboard, forceDuplicate: true } : dashboard;
        return this.post( this.route,  body);
    }

    updateDashboard( id, body, forceDuplicate?: boolean ): Observable<any> {
        /* SDA CUSTOM */ const requestBody = forceDuplicate ? { ...body, forceDuplicate: true } : body;
        return this.put( `${this.route}${id}`, requestBody );
    }

    deleteDashboard( id ): Observable<any> {
        return this.delete( `${this.route}${id}` );
    }

    executeQuery(body): Observable<any> {
        return this.post( `${this.route}query`,  body );
    }

    executeSqlQuery(body): Observable<any> {
        return this.post( `${this.route}sql-query`,  body );
    }
    executeView(body) : Observable<any>{
        return this.post(`${this.route}view-query`, body);
    }

    getBuildedQuery(body) : Observable<any>{
        return this.post(`${this.route}getQuery`, body);
    }

    cleanCache(body):Observable<any>{
        return this.post(`${this.route}clean-refresh`, body);
    }

    /*SDA CUSTOM*/ cloneDashboard(id: string, title?: string, forceDuplicate?: boolean): Observable<any> {
    /*SDA CUSTOM*/  console.log(`Clonando dashboard con ID: ${id}`);
    /*SDA CUSTOM*/  const body = title ? { title } : {};
    /* SDA CUSTOM */ const requestBody = forceDuplicate ? { ...body, forceDuplicate: true } : body;
    /*SDA CUSTOM*/  return this.post(`${this.route}${id}/clone`, requestBody);
    /*SDA CUSTOM*/ }

    /*SDA CUSTOM*/ updateDashboardSpecific( id, body, forceDuplicate?: boolean ): Observable<any> {
    /* SDA CUSTOM */   const requestBody = forceDuplicate ? { ...body, forceDuplicate: true } : body;
    /*SDA CUSTOM*/   return this.put( `${this.route}${id}/updateSpecific`, requestBody );
    /*SDA CUSTOM*/ }

    /* SDA CUSTOM */ checkTitle(title: string, visible: string, group?: any[], excludeId?: string): Observable<any> {
    /* SDA CUSTOM */   const params: any = {
    /* SDA CUSTOM */     visible,
    /* SDA CUSTOM */     excludeId: excludeId || null
    /* SDA CUSTOM */   };

    /* SDA CUSTOM */   if (group && group.length > 0) {
    /* SDA CUSTOM */     params.group = group.map(g => g?._id || g).join(',');
    /* SDA CUSTOM */   }

    /* SDA CUSTOM */   return this.getParams(`${this.route}check-title/${encodeURIComponent((title || '').trim())}`, params);
    /* SDA CUSTOM */ }



}
