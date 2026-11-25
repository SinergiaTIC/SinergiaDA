import * as fs from 'fs';
import { isFirstWorker } from '../../../utils/cluster.util';

let oracleModule: any;

export function getOracleClient(): any {
    if (!oracleModule) {
        oracleModule = require('oracledb');
        const clientPath = require('../../../../config/oracle-config.js').EDA_ORACLE_CLIENT;
        const oracleConfigured = !!clientPath && fs.existsSync(clientPath);

        if (!oracleConfigured) {
            if (isFirstWorker()) console.log('[Oracle] Oracle no configurado');
        } else {
            try {
                oracleModule.initOracleClient({ libDir: clientPath });
            } catch (err) {
                if (isFirstWorker()) {
                    console.log('[Oracle] Error inicializando el cliente de Oracle en', clientPath);
                    console.error(err);
                }
            }
        }
    }

    return oracleModule;
}
