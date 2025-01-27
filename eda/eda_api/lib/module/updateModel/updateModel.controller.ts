/**
* Este módulo gestiona la actualización del modelo de datos de SinergiaDA.
* Maneja la sincronización entre la base de datos MariaDB del CRM y MongoDB,
* incluyendo la estructura de tablas, columnas, relaciones, enumeraciones y
* permisos de usuarios/grupos.
*/

import { kMaxLength } from "buffer";
import { NextFunction, Request, Response } from "express";
import Group, { IGroup } from "../admin/groups/model/group.model";
import User, { IUser } from "../admin/users/model/user.model";
import { EnCrypterService } from "../../services/encrypter/encrypter.service";
import { userAndGroupsToMongo } from "./service/usersAndGroupsToMongo";
import { Enumerations } from "./service/enumerations";
import { pushModelToMongo } from "./service/push.Model.to.Mongo";
import path from 'path';
import fs from "fs";
import { CleanModel } from "./service/cleanModel";

const mariadb = require("mariadb");
const sinergiaDatabase = require("../../../config/sinergiacrm.config");

export class updateModel {

 /**
  * Actualiza el modelo de datos de una instancia de SinergiaDA
  * Extrae datos del CRM, procesa la estructura y sincroniza con MongoDB
  * @param req Petición HTTP 
  * @param res Respuesta HTTP
  */
 static async update(req: Request, res: Response) {
   // Variables para almacenar datos durante el proceso
   let crm_to_eda: any = {};
   let modelToExport: any = {};
   let grantedRolesAt: any = [];
   let enumerator: any;
   let connection: any;

   // Inicio del proceso y conexión a BD
   console.time("UpdateModel");
   connection = await mariadb.createConnection(sinergiaDatabase.sinergiaConn);
   console.timeLog("UpdateModel", "(Create connection)");

   try {
     // Validación inicial del modelo
     await updateModel.checkSinergiaModel(connection);
     console.timeLog("UpdateModel", "(Checking model)");

     await connection
       .query(
         // Query que une tablas base, maestras y puente 
         " select `table`, label , description, visible from sda_def_tables sdt  union all " +
           " select distinct  master_table  , master_table  ,master_table  ,  0 as visible " +
           " from sda_def_enumerations sde union all  " +
           " select distinct  bridge_table   , bridge_table  ,bridge_table  ,  0 as visible " +
           " from sda_def_enumerations sde  " +
           " where bridge_table  != '' "
       )
       .then(async (rows, err1) => {
         if (err1) {
           console.log("Error getting tables list");
           throw err1;
         }
         let tables = rows;
         
         // Query para obtener definición de columnas
         const my_query =
           " select sdc.`table`, sdc.`column`,`type`,sdc.label, sdc.description, sdc.decimals, sdc.aggregations, sdc.visible, sdc.stic_type, sdc.sda_hidden " +
           " FROM sda_def_columns sdc " +
           " union " +
           " select  master_table  , master_id , 'text', master_id , master_id , 0, 'none', 0 , 'varchar', 0 " +
           " from sda_def_enumerations sde  " +
           " union " +
           " select  master_table  , master_column  , 'text', master_column , master_column , 0, 'none', 0 , 'varchar', 0 " +
           " from sda_def_enumerations sde  " +
           " union " +
           " select  bridge_table   , source_bridge  , 'text', source_bridge , source_bridge , 0, 'none', 0 , 'varchar', 0 " +
           " from sda_def_enumerations sde  " +
           " where bridge_table != '' " +
           " union " +
           " select  bridge_table   , target_bridge  , 'text', target_bridge , target_bridge , 0, 'none', 0 , 'varchar', 0 " +
           " from sda_def_enumerations sde  " +
           " where bridge_table != '' ";
         await connection.query(my_query).then(async rows => {
           let columns = rows;

           // Consulta para obtener relaciones entre tablas
           await connection
             .query(
               ` 
                   SELECT distinct source_table, source_column, target_table, target_column, label , 0 as direccion
                   FROM sda_def_relationships
                   union 
                   SELECT target_table as source_table, target_column as source_column , 
                   source_table as target_table , source_column as target_column, label as label , 1 as direccion
                   FROM sda_def_relationships 
                   where source_table != target_table
                   union 
                   SELECT source_table , source_column  , 
                           master_table  , master_id as target_column, 'xx-bridge|xx-bridge' , 2 as direccion
                           FROM sda_def_enumerations 
                           where bridge_table is null or bridge_table = ''
                   union 
                   SELECT master_table  , master_id  ,
                           source_table , source_column , 'xx-bridge|xx-bridge' , 2 as direccion
                           FROM sda_def_enumerations 
                           where bridge_table is null or bridge_table = ''
                   union 
                   SELECT source_table , source_bridge as source_column   , 
                           bridge_table  , source_bridge, 'xx-bridge|xx-bridge' , 2 as direccion
                           FROM sda_def_enumerations 
                           where bridge_table   != ''
                   union 
                   SELECT bridge_table  , source_bridge,
                               source_table , source_bridge as source_column , 'xx-bridge|xx-bridge' , 2 as direccion
                           FROM sda_def_enumerations 
                           where bridge_table != ''
                   union 
                   SELECT bridge_table  , target_bridge,
                           master_table , master_id  , 'xx-bridge|xx-bridge' , 2 as direccion
                           FROM sda_def_enumerations 
                           where bridge_table != ''
                   union 
                   SELECT  master_table , master_id,
                       bridge_table  , target_bridge , 'xx-bridge|xx-bridge' , 2 as direccion
                           FROM sda_def_enumerations 
                           where bridge_table   != ''  `
             )
             .then(async rows => {
               let relations = rows;

               // Obtener usuarios (activos e inactivos)
               await connection
                 .query(
                   "SELECT name as name, user_name as email, password as password, active as active FROM  sda_def_users WHERE password IS NOT NULL ;"
                 )
                 .then(async users => {
                   let users_crm = users;

                   // Obtener roles EDA
                   await connection
                     .query(
                       'select "EDA_USER_ROLE" as role, g.name as name , g.user_name from sda_def_user_groups g; '
                     )
                     .then(async role => {
                       let roles = role;

                       // Obtener permisos de grupos sobre tablas
                       await connection
                         .query(
                           '  select distinct  a.user_name as name, a.`table`,  "id" as  `column`,  a.`group` from  sda_def_permissions a where a.`group` != ""  ; '
                         )
                         .then(async granted => {
                           let fullTablePermissionsForRoles = granted;

                           // Obtener enumeraciones
                           await connection
                             .query(
                               " select source_table , source_column , master_table, master_id, master_column, bridge_table, source_bridge, target_bridge, stic_type, info from sda_def_enumerations sde ;"
                             )
                             .then(async enums => {
                               let ennumeration = enums;

                               // Obtener permisos de usuarios sobre tablas
                               await connection
                                 .query(" select user_name as name, `table` from sda_def_permissions ")
                                 .then(async permi => {
                                   let fullTablePermissionsForUsers = permi;

                                   await connection
                                     .query(
                                       " select distinct  user_name as name, `table`, 'id' as `column`,   group_concat( distinct `group`) as `group` from sda_def_permissions  where `group` != ''  group by 1,2,3  "
                                     )
                                     .then(async permiCol => {
                                       let dynamicPermisssionsForGroup = permiCol;

                                       // Obtener permisos dinámicos de usuarios
                                       const query =
                                         'select user_name as name, `table` as tabla , `column` as columna  from sda_def_permissions where stic_permission_source in (  "ACL_ALLOW_OWNER")';
                                       await connection.query(query).then(async customUserPermissionsValue => {
                                         console.timeLog("UpdateModel", "(Run MariaDB queries)");
                                         let dynamicPermisssionsForUser = customUserPermissionsValue;

                                         try {
                                           // Sincronizar usuarios y grupos
                                           crm_to_eda = await userAndGroupsToMongo.crm_to_eda_UsersAndGroups(
                                             users_crm,
                                             roles
                                           );
                                           console.timeLog("UpdateModel", "(Syncs users and groups)");
                                         } catch (e) {
                                           console.log("Error 1", e);
                                           res.status(500).json({ status: "ko" });
                                         }

                                         try {
                                           // Convertir permisos CRM a modelo EDA
                                           grantedRolesAt = await updateModel.grantedRolesToModel(
                                             fullTablePermissionsForRoles,
                                             tables,
                                             fullTablePermissionsForUsers,
                                             dynamicPermisssionsForGroup,
                                             dynamicPermisssionsForUser
                                           );
                                           console.timeLog("UpdateModel", "(Converts CRM roles to EDA)");
                                         } catch (e) {
                                           console.log("Error 2", e);
                                           res.status(500).json({ status: "ko" });
                                         }

                                         try {
                                           // Crear modelo final
                                           modelToExport = updateModel.createModel(
                                             tables,
                                             columns,
                                             relations,
                                             grantedRolesAt,
                                             ennumeration,
                                             res
                                           );
                                           console.timeLog("UpdateModel", "(Creating Model)");
                                         } catch (e) {
                                           console.log("Error 3", e);
                                           res.status(500).json({ status: "ko" });
                                         }
                                       });

                                       connection.end();
                                     });
                                 });
                             });
                         });
                     });
                 });
             });
         });
       });
   } catch (e) {
     console.log("Error : ", e);
   }
 }

 /**
  * Verifica la existencia de columnas y tablas definidas en el modelo
  * @param con Conexión a la base de datos
  */
 static async checkSinergiaModel(con: any) {
   // Arrays para almacenar metadatos
   let tablas = [];
   let columns = [];
   let successfulQueries = 0;

   try {
     // Obtener listado de tablas y columnas
     const dataset = await con
       .query("select sdc.`table` as tabla, sdc.`column` as `column` FROM sda_def_columns sdc")
       .catch(err => {
         console.log("Error retrieving tables to check:", err);
         throw err;
       });

     // Extraer nombres únicos de tablas  
     tablas = [...new Set(dataset.map(item => item.tabla))];

     // Verificar cada tabla y sus columnas
     for (const tabla of tablas) {
       columns = [...new Set(dataset.map(item => (tabla === item.tabla ? item.column : null)))].filter(
         item => item != null
       );

       // Construir y ejecutar query de prueba
       const sql = " select " + columns.toString() + " from " + tabla + " limit 1   \n";
       let nexSql = sql.replace("select ,", "select ").replace(", from", " from ");

       try {
         await con.query(nexSql);
         successfulQueries++;
       } catch (err) {
         console.log(`Error executing query for table ${tabla}:`, err);
       }
     }
   } catch (err) {
     console.log("Error in model check process:", err);
   }
 }

 /**
  * Genera y procesa los roles del modelo EDA a partir de los permisos del CRM
  * @param fullTablePermissionsForRoles Permisos de grupos sobre tablas completas
  * @param crmTables Tablas del CRM
  * @param fullTablePermissionsForUsers Permisos de usuarios sobre tablas completas 
  * @param dynamicPermisssionsForGroup Permisos dinámicos para grupos
  * @param dynamicPermisssionsForUser Permisos dinámicos para usuarios
  * @returns Array de roles procesados
  */
 static async grantedRolesToModel(
   fullTablePermissionsForRoles: any,
   crmTables: any,
   fullTablePermissionsForUsers: any,
   dynamicPermisssionsForGroup: any,
   dynamicPermisssionsForUser: any
 ) {
   const destGrantedRoles = [];
   let gr, gr2, gr3, gr4, gr5 = {};

   // Obtener usuarios y grupos de MongoDB
   const usersFound = await User.find();
   const mongoGroups = await Group.find();

   // Función para verificar permisos duplicados
   const hasExistingFullTablePermission = (newRole: any) => {
       return destGrantedRoles.some(existing => 
           existing.column === "fullTable" && 
           existing.table === newRole.table && 
           existing.type === newRole.type &&
           existing.users?.toString() === newRole.users?.toString()
       );
   };

   // Procesar permisos de grupos sobre tablas
   fullTablePermissionsForRoles.forEach(line => {
       let match = mongoGroups.filter(i => {
           return i.name === line.group;
       });
       let mongoId: String;
       let mongoGroup: String;
       if (match.length == 1 && line.group !== undefined) {
           mongoId = match[0]._id.toString();
           mongoGroup = match[0].name.toString();
           if (line.name != null) {
               // Procesar grupo convertido a usuario
               const found = usersFound.find(i => i.email == line.name);
               gr = {
                   users: [found._id],
                   usersName: [line.name],
                   none: false,
                   table: line.table,
                   column: "fullTable",
                   global: true,
                   permission: true,
                   type: "users"
               };
               
               // Verificar duplicados antes de agregar
               if (!hasExistingFullTablePermission(gr)) {
                   destGrantedRoles.push(gr);
               }
           } else {
               gr = {
                   groups: [mongoId],
                   groupsName: [mongoGroup],
                   none: false,
                   table: line.table,
                   column: "fullTable", 
                   global: true,
                   permission: true,
                   type: "groups"
               };
               destGrantedRoles.push(gr);
           }
       }
   });

   // Procesar permisos de usuarios sobre tablas
   fullTablePermissionsForUsers.forEach(line => {
       const found = usersFound.find(i => i.email == line.name);
       if (found) {
           gr3 = {
               users: [found._id],
               usersName: [line.name],
               none: false,
               table: line.table,
               column: "fullTable",
               global: true,
               permission: true,
               type: "users"
           };
           if (!hasExistingFullTablePermission(gr3)) {
               destGrantedRoles.push(gr3);
           }
       }
   });

   // Procesar permisos dinámicos de grupos
   dynamicPermisssionsForGroup.forEach(line => {
       const match = mongoGroups.filter(i => {
           return i.name === line.group.split(",")[0];
       });
       let mongoId: String;
       if (match.length == 1 && line.group !== undefined) {
           mongoId = match[0]._id.toString();
           let group_name: String = " '" + line.group + "' ";
           let table_name: String = " '" + line.table + "' ";
           let valueAt: String =
               " select record_id from sda_def_security_group_records" +
               " where `group` in  ( " +
               group_name.split(",").join("','") +
               ") and `table` = " +
               table_name;
           if (line.name != null) {
               // Procesar grupo convertido a usuario
               const found = usersFound.find(i => i.email == line.name);
               gr4 = {
                   users: [found._id],
                   usersName: [line.name],
                   none: false,
                   table: line.table,
                   column: line.column,
                   dynamic: true,
                   global: false,
                   type: "users",
                   value: [valueAt]
               };
               destGrantedRoles.push(gr4);

               let valueAt2: String = " select `id` from " + line.table + " where `assigned_user_name`  = 'EDA_USER' ";
               gr5 = {
                   users: [found._id],
                   usersName: [line.name],
                   none: false,
                   table: line.table,
                   column: "id",
                   global: false,
                   permission: true,
                   dynamic: true,
                   type: "users",
                   value: [valueAt2]
               };
               destGrantedRoles.push(gr5);
           }
       }
   });

   // Procesar permisos dinámicos de usuarios
   dynamicPermisssionsForUser.forEach(line => {
       const found = usersFound.find(i => i.email == line.name);
       if (found) {
           let valueAt: String =
               "select `" + line.columna + "` from " + line.tabla + " where `" + line.columna + "` = 'EDA_USER' ";
           gr5 = {
               users: [found._id],
               usersName: [line.name],
               none: false,
               table: line.tabla,
               column: line.columna,
               global: false,
               permission: true,
               dynamic: true,
               type: "users",
               value: [valueAt]
           };
           destGrantedRoles.push(gr5);
       }
   });

   return destGrantedRoles;
 }

 /**
  * Crea el modelo de datos completo con tablas, columnas y relaciones
  * @param tables Tablas del modelo
  * @param columns Columnas de las tablas
  * @param relations Relaciones entre tablas
  * @param grantedRoles Roles y permisos
  * @param ennumeration Enumeraciones del modelo
  * @param res Respuesta HTTP
  * @returns Array de tablas procesadas
  */
 static createModel(
   tables: any,
   columns: any,
   relations: any,
   grantedRoles: any,
   ennumeration: any,
   res: any
 ): string[] {
   let visible = false;

   // Procesar estructura de tablas
   const destTables = [];
   for (let i = 0; i < tables.length; i++) {
     // Determinar visibilidad
     if (tables[i].visible == 1) {
       visible = true;
     } else {
       visible = false;
     }

     // Crear estructura base de tabla
     var tabla = {
       table_name: tables[i].table,
       columns: [],
       relations: [],
       display_name: {
         default: tables[i].label,
         localized: []
       },
       description: {
         default: tables[i].description,
         localized: []
       },
       visible: visible,
       table_granted_roles: [],
       table_type: [],
       tableCount: 0,
       no_relations: []
     };

     // Procesar columnas y relaciones
     const destColumns: any[] = updateModel.getColumnsForTable(tables[i].table, columns, ennumeration);
     tabla.columns = destColumns;

     const destRelations: any[] = updateModel.getRelations(tables[i].table, relations);
     tabla.relations = destRelations;

     destTables.push(tabla);
   }

   // Enviar modelo a MongoDB
   this.extractJsonModelAndPushToMongo(destTables, grantedRoles, res);

   return destTables;
 }

 /**
  * Genera la configuración de agregaciones para las columnas
  * @param aggregations String con tipos de agregación separados por comas
  * @returns Array de configuraciones de agregación
  */
 static getAggretations(aggregations: string) {
   // Procesar tipos de agregación
   const aggArray = aggregations.split(",");
   const agg = [];

   // Añadir configuraciones según tipos
   if (aggArray.indexOf("sum") >= 0) {
     agg.push({ value: "sum", display_name: "Sum" });
   }
   if (aggArray.indexOf("avg") >= 0) {
     agg.push({ value: "avg", display_name: "Average" });
   }
   if (aggArray.indexOf("max") >= 0) {
     agg.push({ value: "max", display_name: "Maximum" });
   }
   if (aggArray.indexOf("min") >= 0) {
     agg.push({ value: "min", display_name: "Minimum" });
   }
   if (aggArray.indexOf("count") >= 0) {
     agg.push({ value: "count", display_name: "Count Values" });
   }
   if (aggArray.indexOf("count_distinct") > 0) {
     agg.push({ value: "count_distinct", display_name: "Distinct Values" });
   }
   agg.push({ value: "none", display_name: "None" });
   return agg;
 }

 /**
  * Procesa y devuelve las columnas para una tabla específica
  * @param table Nombre de la tabla
  * @param columns Array de columnas a procesar
  * @param ennumeration Configuración de enumeraciones
  * @returns Array de columnas procesadas
  */
 static getColumnsForTable(table: string, columns: any, ennumeration: any) {
   const destColumns = [];

   // Configuración por defecto de agregación
   const agg_none = [
     {
       value: "none",
       display_name: "none"
     }
   ];

   let agg_used = {};
   let colVisible = false;

   // Procesar cada columna
   for (let i = 0; i < columns.length; i++) {
     let c = columns[i];

     // Determinar agregadores según tipo
     if (columns[i].type) {
       agg_used = this.getAggretations(columns[i].aggregations);
     } else {
       agg_used = agg_none;
     }

     // Determinar visibilidad
     if (columns[i].visible == 1) {
       colVisible = true;
     } else {
       colVisible = false;
     }

     // Procesar columna si pertenece a la tabla
     if (c.table == table) {
       c = {
         column_name: columns[i].column,
         column_type: columns[i].type == "enumeration" ? "text" : columns[i].type,
         display_name: {
           default: columns[i].label,
           localized: []
         },
         description: {
           default: columns[i].description,
           localized: []
         },
         aggregation_type: agg_used,
         visible: colVisible,
         minimumFractionDigits: columns[i].decimals,
         column_granted_roles: [],
         row_granted_roles: [],
         tableCount: 0,
         valueListSource: {},
         hidden: columns[i].sda_hidden
       };

       // Procesar fuente de valores si existe
       const foundTable = ennumeration.filter(j => j.source_table == table);
       foundTable.forEach(u => {
         if (u.source_column == c.column_name) {
           c.valueListSource = Enumerations.enumeration_to_column(u);
         }
       });
       destColumns.push(c);
     }
   }
   return destColumns;
 }

 /**
  * Procesa y devuelve las relaciones para una tabla específica
  * @param table Nombre de la tabla
  * @param relations Array de relaciones a procesar
  * @returns Array de relaciones procesadas
  */
 static getRelations(table: string, relations: any) {
   const destRelations = [];

   // Procesar cada relación
   for (let i = 0; i < relations.length; i++) {
     let r = relations[i];
     if (r.source_table == table) {
       let rr = {
         source_table: relations[i].source_table,
         source_column: [relations[i].source_column],
         target_table: relations[i].target_table,
         target_column: [relations[i].target_column],
         visible: true,
         bridge: relations[i].label == "xx-bridge|xx-bridge" ? true : false,
         display_name: {
           default: relations[i].direccion === 0 ? relations[i].label.split("|")[0] : relations[i].label.split("|")[1],
           localized: []
         },
         autorelation: relations[i].source_table === relations[i].target_table ? true : false
       };
       destRelations.push(rr);
     }
   }

   return destRelations;
 }

 /**
  * Formatea y envía el modelo final a MongoDB
  * @param tables Tablas procesadas
  * @param grantedRoles Roles y permisos
  * @param res Respuesta HTTP
  */
 static async extractJsonModelAndPushToMongo(tables: any, grantedRoles: any, res: any) {
   // Inicio del formateo JSON
   console.timeLog("UpdateModel", "(Start JSON formatting)");
   
   // Cargar y configurar modelo base
   let main_model = await JSON.parse(
     fs.readFileSync(
       path.join(__dirname, '../../../config/base_datamodel.json'), 
       "utf-8"
     )
   );

   // Configurar conexión
   main_model.ds.connection.host = sinergiaDatabase.sinergiaConn.host;
   main_model.ds.connection.database = sinergiaDatabase.sinergiaConn.database;
   main_model.ds.connection.port = sinergiaDatabase.sinergiaConn.port;
   main_model.ds.connection.user = sinergiaDatabase.sinergiaConn.user;
   main_model.ds.connection.poolLimit = sinergiaDatabase.sinergiaConn.connectionLimit;
   main_model.ds.connection.password = EnCrypterService.encrypt(sinergiaDatabase.sinergiaConn.password);

   // Asignar datos del modelo
   main_model.ds.model.tables = tables;
   main_model.ds.metadata.model_granted_roles = await grantedRoles;

   console.timeLog("UpdateModel", "(Model configuration completed)");

   try {
     // Limpiar modelo
     const cleanM = new CleanModel();
     main_model = await cleanM.cleanModel(main_model);
     console.timeLog("UpdateModel", "(Model cleaning completed)");

     // Guardar metadata
     fs.writeFile(`metadata.json`, JSON.stringify(main_model), { encoding: `utf-8` }, err => {
       if (err) {
         throw err;
       }
     });
     console.timeLog("UpdateModel", "(Metadata file written)");

     // Enviar a MongoDB
     await new pushModelToMongo().pushModel(main_model, res);
     res.status(200).json({ status: "ok" });
   } catch (e) {
     console.log("Error :", e);
     res.status(500).json({ status: "ko" });
          }
 }
}