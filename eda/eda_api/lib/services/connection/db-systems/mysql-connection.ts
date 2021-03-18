import { MysqlError, createConnection, Connection as SqlConnection } from 'mysql';
import { MySqlBuilderService } from "../../query-builder/qb-systems/mySql-builder.service";
import { AbstractConnection } from "../abstract-connection";
import DataSource from '../../../module/datasource/model/datasource.model';
import { AggregationTypes } from "../../../module/global/model/aggregation-types";
const util = require('util');


export class MysqlConnection extends AbstractConnection {
    GetDefaultSchema(): string {
        return null;
    }
    private queryBuilder: MySqlBuilderService;
    private AggTypes: AggregationTypes;

    async getPool() {
        return createConnection(this.config);
    }

    async tryConnection(): Promise<any> {
        try {
            return new Promise((resolve, reject) => {
                this.pool = createConnection(this.config);
                console.log('\x1b[32m%s\x1b[0m', 'Connecting to MySQL database...\n');
                this.pool.connect((err: MysqlError, connection: SqlConnection) => {
                    if (err) {
                        return reject(err);
                    }
                    if (connection) {
                        this.itsConnected();
                        this.pool.end();
                        return resolve(connection);
                    }
                });
            })

        } catch (err) {
            throw err;
        }
    }

    async generateDataModel(optimize:number): Promise<any> {
        try {
            const tableNames = [];
            this.pool = await this.getPool();
            const schema = this.config.database;
            let tables = [];
            const query = `
            SELECT *  FROM information_schema.tables   WHERE table_type in ( 'BASE TABLE', 'VIEW', 'base table', 'view')  and TABLE_SCHEMA = '${schema}';
            `;

            const getResults = await this.execQuery(query);
            getResults.forEach(r => {
                let tableName = r['TABLE_NAME'];
                tableNames.push(tableName);
            });
            this.pool = await this.getPool();
            this.pool.query = util.promisify(this.pool.query);
            for (let i = 0; i < tableNames.length; i++) {

                let new_table = await this.setTable(tableNames[i]);
                let count = 0;
                if(optimize === 1){
                    const dbCount = await this.countTable(tableNames[i]);
                    count = dbCount[0].count;
                }
                new_table.tableCount = count;
                tables.push(new_table);
            }

            for (let i = 0; i < tables.length; i++) {
                for (let j = 0; j < tables[i].columns.length; j++) {
                    tables[i].columns[j] = this.setColumns(tables[i].columns[j], tables[i].tableCount);
                }
            }
            this.pool.end();
            return await this.commonColumns(tables);
        } catch (err) {
            throw err;
        }
    }

    async execQuery(query: string): Promise<any> {
        try {
            this.pool.query = util.promisify(this.pool.query);
            const rows = await this.pool.query(query);
            this.pool.end();
            return rows;
        } catch (err) {
            console.log(err);
            throw err;
        }

    }

    async getDataSource(id: string) {
        try {
            return await DataSource.findOne({ _id: id }, (err, datasource) => {

                if (err) {
                    throw Error(err);
                }
                return datasource;
            });
        } catch (err) {
            throw err;
        }
    }

    async getQueryBuilded(queryData: any, dataModel: any, user: any) {
        this.queryBuilder = new MySqlBuilderService(queryData, dataModel, user);
        return this.queryBuilder.builder();
    }

    BuildSqlQuery(queryData: any, dataModel: any, user: any){
        this.queryBuilder = new MySqlBuilderService(queryData, dataModel, user);
        return this.queryBuilder.sqlBuilder(queryData, queryData.filters);
    }

    private async countTable(tableName: string): Promise<any> {
        const query = `
        SELECT count(*) as count from ${tableName} 
        `;
        return new Promise(async (resolve, reject) => {
            try {
                const count = await this.pool.query(query);
                resolve(count);
            } catch (err) {
                reject(err);
            }
        })
    }

    private async setTable(tableName: string): Promise<any> {
        const query = `
                    SELECT COLUMN_NAME AS column_name, DATA_TYPE AS column_type
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = '${this.config.database}' AND TABLE_NAME = '${tableName}';  
    `;

        return new Promise(async (resolve, reject) => {
            try {
                //this.pool = createConnection(this.config);
                const getColumns = await this.pool.query(query);
                const newTable = {
                    table_name: tableName,
                    display_name: {
                        "default": this.normalizeName(tableName),
                        "localized": []
                    },
                    description: {
                        "default": `${this.normalizeName(tableName)}`,
                        "localized": []
                    },
                    table_granted_roles: [],
                    table_type: [],
                    columns: getColumns,
                    relations: [],
                    visible: true
                };
                resolve(newTable);
            } catch (err) {
                reject(err);
            }
        });
    }

    private setColumns(c, tableCount?:number) {
        let column = c;
        column.display_name = { default: this.normalizeName(column.column_name), localized: [] };
        column.description = { default: this.normalizeName(column.column_name), localized: [] };
        column.column_type = this.normalizeType(column.column_type) || column.column_type;

        column.column_type === 'numeric'
            ? column.aggregation_type = AggregationTypes.getValues()
            : column.aggregation_type = [{ value: 'none', display_name: 'no' }];

        column.column_granted_roles = [];
        column.row_granted_roles = [];
        column.visible = true;
        column.tableCount = tableCount || 0;

        return column;
    }

    private normalizeName(name: string) {
        let out = name.split('_').join(' ');
        return out.toLowerCase()
            .split(' ')
            .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
            .join(' ');
    }



    private async commonColumns(dm) {
        let data_model = dm;
        let visited = [];
        // Recorrem totes les columnes de totes les taules i comparem amb totes les columnes de cada taula (menys la que estem recorrent
        // Taules
        for (let l = 0; l < data_model.length; l++) {
            visited.push(data_model[l].table_name);
            // Columnes
            for (let k = 0; k < data_model[l].columns.length; k++) {
                let sourceColumn = { source_column: data_model[l].columns[k].column_name, column_type: data_model[l].columns[k].column_type };
                // Taules
                for (let j = 0; j < data_model.length; j++) {

                    if (!visited.includes(data_model[j].table_name)) {
                        // Columnes
                        for (let i = 0; i < data_model[j].columns.length; i++) {
                            let targetColumn = { target_column: data_model[j].columns[i].column_name, column_type: data_model[j].columns[i].column_type };
                            if ((sourceColumn.source_column.toLowerCase().includes("_id") ||
                                sourceColumn.source_column.toLowerCase().includes("id_") ||
                                sourceColumn.source_column.toLowerCase().includes("number") ||
                                sourceColumn.source_column.toLowerCase().startsWith("sk") ||
                                sourceColumn.source_column.toLowerCase().startsWith("tk") ||
                                sourceColumn.source_column.toLowerCase().endsWith("sk") ||
                                sourceColumn.source_column.toLowerCase().endsWith("tk") ||
                                sourceColumn.source_column.toLowerCase().includes("code"))
                                && sourceColumn.source_column === targetColumn.target_column && sourceColumn.column_type === targetColumn.column_type) {

                                // FER EL CHECK AMB ELS INNER JOINS ---- DESHABILITAT (Masses connexions a la db)
                                let a = true; //await checkJoins(pool, data_model[l].table_name, sourceColumn.source_column, data_model[j].table_name, targetColumn.target_column);

                                if (a) {
                                    data_model[l].relations.push({
                                        source_table: data_model[l].table_name,
                                        source_column: [sourceColumn.source_column],
                                        target_table: data_model[j].table_name,
                                        target_column: [targetColumn.target_column],
                                        visible: true
                                    });
                                    data_model[j].relations.push({
                                        source_table: data_model[j].table_name,
                                        source_column:[ targetColumn.target_column],
                                        target_table: data_model[l].table_name,
                                        target_column: [sourceColumn.source_column],
                                        visible: true
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        return data_model;
    }

    createTable(queryData: any): string {
        throw new Error('Method not implemented.');
    }
    generateInserts(queryData:any):string {
        throw new Error('Method not implemented.');
    }
}
