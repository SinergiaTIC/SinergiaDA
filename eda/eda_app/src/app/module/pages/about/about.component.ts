import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";


@Component({
  selector: "app-about",
  templateUrl: "./about.component.html",
  styleUrls: ["./about.component.css"]
})

export class AboutComponent implements OnInit {
  // Estos valores son solo ejemplos. Debes reemplazarlos con datos reales, posiblemente obtenidos desde un servicio.
  sinergiaDaVersion: string = "XXXX";
  edaApiVersion: string = "XXXX";
  edaAppVersion: string = "XXXX";
  lastSyncDate: string = "XXXX";
  sinergiaCRMDatabaseName: string = "XXXX";
  lastUpdateModelRun: string = "XXXX";

  constructor(private http: HttpClient) {}

  ngOnInit(): void {

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
        this.sinergiaCRMDatabaseName = data.info.sinergiaCRMDatabaseName;
        this.lastUpdateModelRun = data.info.lastUpdateModelRun;

      },
      error: error => {
        console.error("Error al obtener la información desde el backend", error);
      }
    });
  }
}
