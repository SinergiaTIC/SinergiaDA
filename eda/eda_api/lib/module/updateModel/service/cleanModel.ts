/**
* Este módulo se encarga de limpiar y consolidar los permisos del modelo de datos.
* Maneja la deduplicación de roles, fusión de permisos y sincronización con MongoDB.
*/

import _ from "lodash";
import Group, { IGroup } from '../../admin/groups/model/group.model';
import DataSourceSchema from '../../datasource/model/datasource.model';

export class CleanModel {
   /**
    * Limpia y consolida los permisos del modelo
    * @param main_model Modelo de datos a procesar
    * @returns Modelo procesado con permisos consolidados
    */
   public async cleanModel(main_model: any): Promise<any> {
       // Clonar roles para no modificar original
       const roles = _.cloneDeep(main_model.ds.metadata.model_granted_roles);
       const model_granted_roles: any[] = [];
       const mapRoles = new Map();

       /**
        * Añade o actualiza un rol en el mapa de roles
        * @param role Rol a procesar
        * @param key Clave única del rol
        */
       const addOrUpdateRole = (role: any, key: string) => {
           const existingRole = mapRoles.get(key);
           if (existingRole) {
               // Fusionar usuarios o grupos según tipo
               if (role.type === "users") {
                   existingRole.users = Array.from(new Set([...existingRole.users, ...role.users]));
                   existingRole.usersName = Array.from(new Set([...existingRole.usersName, ...role.usersName]));
               } else if (role.type === "groups") {
                   existingRole.groups = Array.from(new Set([...existingRole.groups, ...role.groups]));
                   existingRole.groupsName = Array.from(new Set([...existingRole.groupsName, ...role.groupsName]));
               }
           } else {
               // Crear nuevo rol si no existe
               mapRoles.set(key, _.cloneDeep(role));
           }
       };

       // Procesar cada rol y generar clave única
       roles.forEach((role: any) => {
           const key = `${role.table}-${role.column}-${role.type}-${role.global}-${role.none}-${role.permission}-${role.dynamic}-${role.value?.join(',')}`;
           addOrUpdateRole(role, key);
       });

       // Convertir mapa a array
       mapRoles.forEach((value) => model_granted_roles.push(value));

       // Obtener permisos existentes de MongoDB
       const finder = await DataSourceSchema.find({ _id: "111111111111111111111111" });
       const mgsmap = finder
           .map((e) => e.ds.metadata.model_granted_roles)
           .reduce((acc, val) => acc.concat(val), []);

       /**
        * Filtra roles duplicados usando una clave compuesta
        * @param roles Array de roles a filtrar
        * @param comparator Función de comparación
        * @returns Array de roles únicos
        */
       const filterUniqueRoles = (roles: any[], comparator: (a: any, b: any) => boolean) => {
           const seen = new Map();
           return roles.filter((role) => {
               const key = `${role.table}-${role.column}-${role.type}-${role.global}-${role.none}-${role.permission}-${role.users?.join(',')}-${role.groups?.join(',')}`;
               if (seen.has(key)) return false;
               seen.set(key, role);
               return true;
           });
       };

       // Obtener roles únicos y marcar origen
       const uniqueRoles = filterUniqueRoles(model_granted_roles, _.isEqual);
       uniqueRoles.forEach((role) => (role.source = "update_model"));

       // Combinar roles según existencia de permisos en MongoDB
       if (mgsmap.length) {
           // Filtrar roles de usuario SDA no-SCRM
           const userRoles = mgsmap.filter(
               (r: any) => r?.source === "SDA" && !r.groupsName.some((name: string) => name.startsWith("SCRM_"))
           );
           main_model.ds.metadata.model_granted_roles = [...uniqueRoles, ...userRoles];
       } else {
           main_model.ds.metadata.model_granted_roles = uniqueRoles;
       }

       return main_model;
   }
}