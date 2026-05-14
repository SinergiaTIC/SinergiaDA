import { Injectable } from "@angular/core";
import { ApiService } from "./api.service";

@Injectable()
export class MailService extends ApiService{

  private globalDSRoute = '/mail';

  checkConfiguration(config:any){
    return this.post(`${this.globalDSRoute}/check`, config);
  }

  saveConfiguration(config:any){
    return this.post(`${this.globalDSRoute}/save`, config);
  }

// SDA CUSTOM - Add sendTestMail method
/* SDA CUSTOM */  sendTestMail(config: any) {
/* SDA CUSTOM */    return this.post(`${this.globalDSRoute}/send-test`, config);
/* SDA CUSTOM */  }

  getConfiguration(){
    return this.get(`${this.globalDSRoute}/credentials`);
  }

// SDA CUSTOM - Add sendNow method
/*SDA CUSTOM*/  sendNow(data: any) {
/*SDA CUSTOM*/    return this.post(`${this.globalDSRoute}/send-now`, data);
/*SDA CUSTOM*/  }

/*SDA CUSTOM*/  sendNowWithPDF(data: any) {
/*SDA CUSTOM*/    return this.post(`${this.globalDSRoute}/send-now-with-pdf`, data);
/*SDA CUSTOM*/  }

/*SDA CUSTOM*/  sendNowWithImage(data: any) {
    /*SDA CUSTOM*/    return this.post(`${this.globalDSRoute}/send-now-with-image`, data);
    /*SDA CUSTOM*/  }

  /*SDA CUSTOM*/  sendTestKpiAlert(data: any) {
    /*SDA CUSTOM*/    return this.post(`${this.globalDSRoute}/send-test-kpi-alert`, data);
    /*SDA CUSTOM*/  }

  /* SDA CUSTOM */ getOAuth2Url(config: any) {
  /* SDA CUSTOM */   return this.post(`${this.globalDSRoute}/oauth2-url`, config);
  /* SDA CUSTOM */ }

  /* SDA CUSTOM */ getOAuth2Token(data: any) {
  /* SDA CUSTOM */   return this.post(`${this.globalDSRoute}/oauth2-token`, data);
  /* SDA CUSTOM */ }
  // END SDA CUSTOM

}
