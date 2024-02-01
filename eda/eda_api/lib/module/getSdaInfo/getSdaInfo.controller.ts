import { Request, Response } from "express";
import * as fs from "fs";
import * as path from "path";
const sinergiaDatabase = require("../../../config/sinergiacrm.config");
const mariadb = require("mariadb");

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
      info["sinergiaCRMDatabaseName"] =
        sinergiaDatabase.sinergiaConn.host +
        ":" +
        sinergiaDatabase.sinergiaConn.port +
        "/" +
        sinergiaDatabase.sinergiaConn.database;

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
      let connection: any;
      connection = await mariadb.createConnection(sinergiaDatabase.sinergiaConn);
      const rows = await connection.query("SELECT value from sda_def_config WHERE `key` = 'last_rebuild';");

      // async (rows, err1) => {
      //   if (err1) { console.log("Error getting last_rebuild"); throw err1 }
      // }
      if (rows.length > 0) {
        info["lastSyncDate"] = rows[0].value;
      } else {
        info["lastSyncDate"] = "N/D";
      }
      connection.end();

      // return
      res.json({ info: info });
    } catch (error) {
      res.status(500).json({ error: "Error al obtener los datos" });
    }
  }
}
