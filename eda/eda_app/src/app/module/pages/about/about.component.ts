import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { User } from '@eda/models/model.index';
import { UserService } from "@eda/services/service.index";


@Component({
  selector: "app-about",
  templateUrl: "./about.component.html",
  styleUrls: ["./about.component.css"]
})

export class AboutComponent implements OnInit {
  // Estos valores son solo ejemplos. Debes reemplazarlos con datos reales, posiblemente obtenidos desde un servicio.
  public user: User;
  public isAdmin: boolean;
  sinergiaDaVersion: string = "XXXX";
  edaApiVersion: string = "XXXX";
  edaAppVersion: string = "XXXX";
  lastSyncDate: string = "XXXX";
  sinergiaCRMDatabaseName: string = "XXXX";
  lastUpdateModelRun: string = "XXXX";

  constructor(
    private http: HttpClient,
    public userService: UserService,
    ) {
      this.user = this.userService.getUserObject();

    }

  ngOnInit(): void {

    this.user = this.userService.getUserObject();
    interface InfoResponse {
      info: {
        sinergiaDaVersion: string;
        edaAppVersion: string;
        edaApiVersion: string;
        lastSyncDate: string;
        sinergiaCRMDatabaseName: string;
        lastUpdateModelRun: string;
      };
    }




    this.http.get<InfoResponse>("http://localhost:8666/getsdainfo/getinfo").subscribe({
      next: data => {
        this.sinergiaDaVersion = data.info.sinergiaDaVersion;
        this.edaApiVersion = data.info.edaApiVersion;
        this.edaAppVersion = data.info.edaAppVersion;
        this.lastSyncDate = data.info.lastSyncDate;
        this.sinergiaCRMDatabaseName = this.userService.isAdmin ? data.info.sinergiaCRMDatabaseName: '';
        this.lastUpdateModelRun = data.info.lastUpdateModelRun;

      },
      error: error => {
        console.error("Error al obtener la información desde el backend", error);
      }
    });
  }
}
