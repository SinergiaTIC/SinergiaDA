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
// END SDA CUSTOM

}
