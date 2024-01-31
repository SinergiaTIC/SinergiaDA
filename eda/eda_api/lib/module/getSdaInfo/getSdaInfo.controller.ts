import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
import { sinergiaConn } from "../../../config/sinergiacrm.config.js";

export class getSdaInfo {
  public static async getinfo(req: Request, res: Response) {
    let info = {};

    try {
      const moment = require("moment");
      
      // get lastUpdateModelRun
      const metadataPath = path.join(__dirname, "../../../metadata.json");
      const stats = fs.statSync(metadataPath);
      const formattedDate = moment(stats.ctime).format("YYYY-MM-DD HH:mm:ss");
      info["lastUpdateModelRun"] = formattedDate;

      // get sinergiaCRMDatabaseName
      info["sinergiaCRMDatabaseName"] = sinergiaConn.database;

      // get sinergiaDaVersion
      const versions = require("../../../../SdaVersion.js");
      info["sinergiaDaVersion"] = versions.SdaVersion;

      // get edaApiVersion from package.json
      const packageJsonPathAPI = path.join(__dirname, "../../../package.json");
      info["edaApiVersion"] = JSON.parse(fs.readFileSync(packageJsonPathAPI, "utf8")).version;
      
      // get edaAppVersion from package.json
      const packageJsonPathAPP = path.join(__dirname, "../../../../eda_app/package.json");
      info["edaAppVersion"] = JSON.parse(fs.readFileSync(packageJsonPathAPP, "utf8")).version;

      // get lastSyncDate
      info["lastSyncDate"] = "GGGGG";

      // return
      res.json({ info: info });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener los datos" });
    }
  }
}
