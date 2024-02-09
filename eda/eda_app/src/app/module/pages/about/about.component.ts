import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { User } from '@eda/models/model.index';
import { UserService } from "@eda/services/service.index";

/**
 * Component responsible for displaying information about the application, such as version details and last synchronization times.
 */
@Component({
  selector: "app-about",
  templateUrl: "./about.component.html",
  styleUrls: ["./about.component.css"]
})
export class AboutComponent implements OnInit {
  public user: User;
  public isAdmin: boolean;
  sinergiaDaVersion: string = "XXXX"; // Placeholder value, replace with actual data.
  edaApiVersion: string = "XXXX"; // Placeholder value, replace with actual data.
  edaAppVersion: string = "XXXX"; // Placeholder value, replace with actual data.
  lastSyncDate: string = "XXXX"; // Placeholder value, replace with actual data.
  sinergiaCRMDatabaseName: string = "XXXX"; // Placeholder value, replace with actual data.
  lastUpdateModelRun: string = "XXXX"; // Placeholder value, replace with actual data.

  /**
   * Constructs the AboutComponent with injected services for HTTP requests and user services.
   *
   * @param http HttpClient for making requests.
   * @param userService UserService for accessing user-related functionalities.
   */
  constructor(
    private http: HttpClient,
    public userService: UserService,
  ) {
    this.user = this.userService.getUserObject();
  }

  /**
   * OnInit lifecycle hook to initialize component data.
   * Fetches and sets application-related information such as version numbers and last synchronization details.
   */
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

    // Fetches information from the backend and updates component properties accordingly.
    this.http.get<InfoResponse>("http://localhost:8666/getsdainfo/getinfo").subscribe({
      next: data => {
        this.sinergiaDaVersion = data.info.sinergiaDaVersion;
        this.edaApiVersion = data.info.edaApiVersion;
        this.edaAppVersion = data.info.edaAppVersion;
        this.lastSyncDate = data.info.lastSyncDate;
        // Conditionally displays the database name based on admin status.
        this.sinergiaCRMDatabaseName = this.userService.isAdmin ? data.info.sinergiaCRMDatabaseName : '';
        this.lastUpdateModelRun = data.info.lastUpdateModelRun;
      },
      error: error => {
        console.error("Error fetching information from the backend", error);
      }
    });
  }
}
