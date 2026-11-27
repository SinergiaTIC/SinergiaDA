import type { AbstractConnection } from './abstract-connection';
import { EnCrypterService } from '../encrypter/encrypter.service';
import { PluginRegistry } from '../../plugins';
import DataSource from '../../module/datasource/model/datasource.model';

export const
    MS_CONNECTION = 'mssql',
    MY_CONNECTION = 'mysql',
    PG_CONNECTION = 'postgres',
    VE_CONNECTION = 'vertica',
    SQLS_CONNECTION = 'sqlserver',
    ORACLE_CONNECTION = 'oracle',
    BIGQUERY_CONNECTION = 'bigquery',
    SNOWFLAKE_CONNECTION = 'snowflake',
    WEB_SERVICE = 'jsonwebservice',
    MONGODB_CONNECTION = 'mongodb',
    CLICKHOUSE_CONNECTION = 'clickhouse',
    DUCKDB_CONNECTION = 'duckdb'



export class ManagerConnectionService {

    static async getConnection(id: string, properties?: any): Promise<AbstractConnection> {
        const datasource = await this.getDataSource(id);
        const config = datasource.ds.connection;
        config.password = EnCrypterService.decode(config.password || ' ');

        // Esto sirve solo para postgres y se pasa con la sintaxis de prostgres. 
        // Si se quisiera implementar para otras bbdd habría que hacerlo.
        if (properties) {
            config.options = '';
            for (const prop in properties) {
                // pasamos las custom properties en el parametro options.
                config.options += ' -c '+ prop + '=' +properties[prop];
            }
        }

        switch (config.type) {
            case MS_CONNECTION:
            // return new MsConnection(config, secondary);
            case MY_CONNECTION:
                return new (require('./db-systems/mysql-connection').MysqlConnection)(config);
            case PG_CONNECTION:
                return new (require('./db-systems/pg-connection').PgConnection)(config);
            case VE_CONNECTION:
                return new (require('./db-systems/vertica-connection').VerticaConnection)(config);
            case SQLS_CONNECTION:
                return new (require('./db-systems/slqserver-connection').SQLserverConnection)(config);
            case ORACLE_CONNECTION:
                return new (require('./db-systems/oracle-connection').OracleConnection)(config);
            case BIGQUERY_CONNECTION:
                return new (require('./db-systems/bigquery-connection').BigQueryConnection)(config);
            case SNOWFLAKE_CONNECTION:
                return new (require('./db-systems/snowflake-connection').SnowflakeConnection)(config);
            case WEB_SERVICE:
                return new (require('./db-systems/json-webservice-connection').JSONWebServiceConnection)(config);
            case MONGODB_CONNECTION:
                return new (require('./db-systems/mongodb-connection').MongoDBConnection)(config);
            case CLICKHOUSE_CONNECTION:
                return new (require('./db-systems/clickhouse-connection').ClickHouseConnection)(config);
            case DUCKDB_CONNECTION:
                return new (require('./db-systems/duckdb-connection').DuckDBConnection)(config);
            default: {
                const connection = PluginRegistry.getConnection(config.type, config);
                if (!connection) throw new Error(`El plugin de datasource "${config.type}" no está registrado ni habilitado en plugins_config.ENABLED_PLUGINS.`);
                return connection;
            }
        }
    }

    static async testConnection(config: any): Promise<AbstractConnection> {
        switch (config.type) {
            case MS_CONNECTION:
            //return new MsConnection(config, secondary);
            case MY_CONNECTION:
                return new (require('./db-systems/mysql-connection').MysqlConnection)(config);
            case PG_CONNECTION:
                return new (require('./db-systems/pg-connection').PgConnection)(config);
            case VE_CONNECTION:
                return new (require('./db-systems/vertica-connection').VerticaConnection)(config);
            case SQLS_CONNECTION:
                return new (require('./db-systems/slqserver-connection').SQLserverConnection)(config);
            case ORACLE_CONNECTION:
                return new (require('./db-systems/oracle-connection').OracleConnection)(config);
            case BIGQUERY_CONNECTION:
                return new (require('./db-systems/bigquery-connection').BigQueryConnection)(config);
            case SNOWFLAKE_CONNECTION:
                return new (require('./db-systems/snowflake-connection').SnowflakeConnection)(config);
            case WEB_SERVICE:
                return new (require('./db-systems/json-webservice-connection').JSONWebServiceConnection)(config);
            case MONGODB_CONNECTION:
                return new (require('./db-systems/mongodb-connection').MongoDBConnection)(config);
            case CLICKHOUSE_CONNECTION:
                return new (require('./db-systems/clickhouse-connection').ClickHouseConnection)(config);
            case DUCKDB_CONNECTION:
                return new (require('./db-systems/duckdb-connection').DuckDBConnection)(config);
            default: {
                const connection = PluginRegistry.getConnection(config.type, config);
                if (!connection) throw new Error(`El plugin de datasource "${config.type}" no está registrado ni habilitado en plugins_config.ENABLED_PLUGINS.`);
                return connection;
            }
        }
    }

    private static async switchConnection(type: string) {

    }

    private static async getDataSource(id: string): Promise<any> {
try {
  const datasource = await DataSource.findOne({ _id: id });

  if (!datasource) {
    throw new Error(`Datasource not found with id ${id}`);
  }

  return datasource;

} catch (err) {
  throw err;
}

    }
}

export default ManagerConnectionService;
