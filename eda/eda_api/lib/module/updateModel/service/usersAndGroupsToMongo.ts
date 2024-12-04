import mongoose, { connections, Model, mongo, Mongoose, QueryOptions } from "mongoose";
import User, { IUser } from "../../admin/users/model/user.model";
import Group, { IGroup } from "../../admin/groups/model/group.model";

// Desactiva la advertencia de findAndModify deprecated
mongoose.set("useFindAndModify", false);

// Interfaz que define la estructura de un usuario en MongoDB
interface MongoUser extends mongoose.Document {
   email: string;
   password: string;
   name: string;
   role: mongoose.Types.ObjectId[];
   active?: number;
}

// Interfaz que define la estructura de un grupo en MongoDB
interface MongoGroup extends mongoose.Document {
   _id: mongoose.Types.ObjectId;
   name: string;
   role: string;
   users: mongoose.Types.ObjectId[];
}

// Interfaz que define la estructura de un usuario en el CRM
interface CRMUser {
   name: string;
   email: string;
   password: string;
   active: number;
}

// Interfaz que define la estructura de un rol en el CRM
interface CRMRole {
   name: string;
   user_name?: string;
}

// Interfaz que define la estructura de los resultados de sincronización
interface SyncResults {
   inserted: number;
   updated: number;
   deleted: number;
}

/**
 * Clase que implementa un sistema de caché para usuarios y grupos
 * Se reconstruye en cada ejecución para asegurar datos actualizados
 */
class DataCache {
    private static instance: DataCache;
    private cache: Map<string, MongoUser[] | MongoGroup[]>;

    private constructor() {
        this.cache = new Map();
    }

    /**
     * Obtiene la instancia única del caché y la limpia
     */
    static getInstance(): DataCache {
        if (!DataCache.instance) {
            DataCache.instance = new DataCache();
        }
        // Limpiar la caché al obtener la instancia
        DataCache.instance.clearCache();
        return DataCache.instance;
    }

    /**
     * Limpia todos los datos de la caché
     */
    private clearCache(): void {
        this.cache.clear();
    }

    /**
     * Obtiene usuarios de MongoDB y los almacena en caché
     */
    async getUsers(): Promise<MongoUser[]> {
        const cacheKey = 'all_users';
        if (!this.cache.has(cacheKey)) {
            const users = await User.find().lean() as unknown as MongoUser[];
            this.cache.set(cacheKey, users);
        }
        return this.cache.get(cacheKey) as MongoUser[];
    }

    /**
     * Obtiene grupos de MongoDB y los almacena en caché
     */
    async getGroups(): Promise<MongoGroup[]> {
        const cacheKey = 'all_groups';
        if (!this.cache.has(cacheKey)) {
            const groups = await Group.find().lean() as unknown as MongoGroup[];
            this.cache.set(cacheKey, groups);
        }
        return this.cache.get(cacheKey) as MongoGroup[];
    }
}

/**
 * Clase principal para la sincronización de usuarios y grupos entre CRM y MongoDB
 */
export class userAndGroupsToMongo {
   /**
    * Método principal que sincroniza usuarios y grupos entre CRM y MongoDB
    * @param users Lista de usuarios del CRM
    * @param roles Lista de roles del CRM
    */
   static async crm_to_eda_UsersAndGroups(users: CRMUser[], roles: CRMRole[]) {
       console.time("Total usersAndGroupsToMongo");
       console.log(`Starting sync: ${users.length} users and ${roles.length} role assignments`);

       try {
           // Crea índices únicos para email y nombre
           await User.collection.createIndex({ email: 1 }, { unique: true });
           await Group.collection.createIndex({ name: 1 }, { unique: true });

           // Sincroniza usuarios y grupos en paralelo
           const userSyncResults = await this.optimizedUserSync(users);
           const groupSyncResults = await this.optimizedGroupSync(roles);

           console.log('Sync completed:', {
               users: userSyncResults,
               groups: groupSyncResults
           });

                // Añadir verificación de admin
                await this.verifyAdminRelations();


           console.timeEnd("Total usersAndGroupsToMongo");
           return { userSyncResults, groupSyncResults };
       } catch (error) {
           console.error("Sync error:", error);
           throw error;
       }
   }

  /**
 * Sincroniza los usuarios del CRM con MongoDB de manera optimizada
 * @param crmUsers Array de usuarios provenientes del CRM
 * @returns Objeto con el conteo de usuarios insertados, actualizados y eliminados
 */
private static async optimizedUserSync(crmUsers: CRMUser[]): Promise<SyncResults> {
    // Inicia el contador de tiempo para medir la duración de la sincronización
    console.time('userSync');
    
    try {
        // Obtiene todos los usuarios de MongoDB usando el caché
        // Si no están en caché, DataCache hará la consulta a MongoDB
        const mongoUsers = await DataCache.getInstance().getUsers();

        // Crea un Map para acceso rápido a usuarios por email
        // La clave es el email y el valor es el objeto usuario completo
        const emailToMongoUser = new Map<string, MongoUser>(
            mongoUsers.map(user => [user.email, user])
        );
        
        // Ejecuta dos operaciones en paralelo usando Promise.all:
        // 1. synchronizeUsers: Sincroniza los usuarios nuevos y actualiza los existentes
        // 2. removeInactiveUsers: Elimina los usuarios inactivos
        const [syncResult, deleteResult] = await Promise.all([
            this.synchronizeUsers(crmUsers, emailToMongoUser),
            this.removeInactiveUsers(crmUsers)
        ]);

        // Detiene el contador de tiempo de sincronización
        console.timeEnd('userSync');

        // Retorna un objeto con las estadísticas de la sincronización
        // Si alguna operación no retornó resultados, usa 0 como valor por defecto
        return {
            inserted: syncResult?.insertedCount || 0,  // Número de usuarios nuevos insertados
            updated: syncResult?.modifiedCount || 0,   // Número de usuarios actualizados
            deleted: deleteResult?.deletedCount || 0   // Número de usuarios eliminados
        };
    } catch (error) {
        // Si ocurre algún error durante el proceso
        console.error('User sync error:', error);
        // Propaga el error hacia arriba para que sea manejado por el llamador
        throw error;
    }
}
 /**
 * Sincroniza los usuarios del CRM con MongoDB procesándolos en lotes
 * @param crmUsers Lista de usuarios del CRM a sincronizar
 * @param emailToMongoUser Map de emails a usuarios existentes en MongoDB
 * @returns Resultado de las operaciones de escritura en bulk
 */
private static async synchronizeUsers(crmUsers: CRMUser[], emailToMongoUser: Map<string, MongoUser>) {
    // Define el tamaño del lote para procesar usuarios
    // 100 usuarios por lote para optimizar las operaciones en MongoDB
    const batchSize = 100;
    
    // Array para almacenar todas las operaciones de MongoDB a ejecutar
    const operations: any[] = [];

    // Procesa los usuarios en lotes usando un bucle for
    // i se incrementa en batchSize en cada iteración
    for (let i = 0; i < crmUsers.length; i += batchSize) {
        // Extrae un subconjunto (lote) de usuarios usando slice
        // Desde el índice i hasta i + batchSize
        const batch = crmUsers.slice(i, i + batchSize);
        
        // Procesa cada usuario del lote actual
        batch.forEach(crmUser => {
            // Busca si el usuario ya existe en MongoDB usando su email
            const existingUser = emailToMongoUser.get(crmUser.email);
            
            if (!existingUser) {
                // Si el usuario no existe, prepara una operación de inserción
                operations.push({
                    insertOne: {
                        document: {
                            name: crmUser.name,
                            email: crmUser.email,
                            password: crmUser.password,
                            role: [] // Roles iniciales vacíos
                        }
                    }
                });
            } else if (existingUser.password !== crmUser.password) {
                // Si el usuario existe y su contraseña ha cambiado
                // Prepara una operación de actualización
                operations.push({
                    updateOne: {
                        filter: { email: crmUser.email },
                        update: { $set: { password: crmUser.password } }
                    }
                });
            }
            // Si el usuario existe y la contraseña no ha cambiado
            // no se realiza ninguna operación
        });
    }

    // Si hay operaciones pendientes, las ejecuta todas en una sola llamada
    if (operations.length > 0) {
        // ordered: false permite que las operaciones continúen aunque alguna falle
        return await User.collection.bulkWrite(operations, { ordered: false });
    }
    
    // Si no hay operaciones para ejecutar, retorna null
    return null;
}

/**
 * Elimina solo los usuarios inactivos que provienen del CRM
 * @param crmUsers Lista de usuarios del CRM para verificar el estado activo
 */
private static async removeInactiveUsers(crmUsers: CRMUser[]) {
    // Define usuarios del sistema que nunca deben eliminarse
    const excludedEmails = [
        'eda@sinergiada.org', 
        'eda@jortilles.com', 
        'edaanonim@jortilles.com'
    ];

    // Crea un Set con TODOS los emails que vienen del CRM
    const crmEmails = new Set(crmUsers.map(user => user.email));

    // Crea un Set con los emails de usuarios activos del CRM
    const activeEmails = new Set(
        crmUsers
            .filter(user => user.active === 1)
            .map(user => user.email)
    );

    // Define la operación de eliminación masiva
    const bulkDelete = {
        deleteMany: {
            filter: {
                // Solo elimina si:
                $and: [
                    // El email está en la lista de emails del CRM
                    { email: { $in: Array.from(crmEmails) } },
                    // Y no está en la lista de excluidos ni activos
                    { email: { $nin: [...excludedEmails, ...Array.from(activeEmails)] } }
                ]
            }
        }
    };

    return await User.collection.bulkWrite([bulkDelete]);
}

/**
 * Sincroniza los grupos del CRM con MongoDB de manera optimizada
 * @param roles Lista de roles/grupos del CRM a sincronizar
 * @returns Objeto con estadísticas de la sincronización
 */
private static async optimizedGroupSync(roles: CRMRole[]) {
    // Inicia el temporizador para medir el tiempo de sincronización
    console.time('groupSync');
    
    try {
        // Obtiene todos los grupos existentes en MongoDB usando el caché
        // Si no están en caché, DataCache hará la consulta a MongoDB
        const mongoGroups = await DataCache.getInstance().getGroups();

        // Crea un Map para acceso rápido a grupos por nombre
        // La clave es el nombre del grupo y el valor es el objeto grupo completo
        const nameToMongoGroup = new Map<string, MongoGroup>(
            mongoGroups.map(group => [group.name, group])
        );
        
        // Ejecuta dos operaciones en paralelo usando Promise.all:
        // 1. synchronizeGroups: Sincroniza los grupos nuevos
        // 2. updateGroupUsers: Actualiza los usuarios asignados a cada grupo
        const [syncResult, userAssignments] = await Promise.all([
            this.synchronizeGroups(roles, nameToMongoGroup),
            this.updateGroupUsers(roles, mongoGroups)
        ]);

        // Detiene el temporizador de sincronización
        console.timeEnd('groupSync');

        // Retorna las estadísticas de la sincronización
        return {
            inserted: syncResult?.insertedCount || 0,    // Número de grupos nuevos insertados
            updated: syncResult?.modifiedCount || 0,     // Número de grupos actualizados
            userAssignments                             // Resultado de las asignaciones de usuarios
        };
    } catch (error) {
        // Si ocurre algún error durante el proceso
        console.error('Group sync error:', error);
        // Propaga el error hacia arriba para que sea manejado por el llamador
        throw error;
    }
}

/**
 * Sincroniza los grupos del CRM con MongoDB, creando los grupos que no existen
 * @param roles Lista de roles/grupos del CRM
 * @param nameToMongoGroup Map de nombres a grupos existentes en MongoDB
 * @returns Resultado de las operaciones de escritura en bulk
 */
private static async synchronizeGroups(roles: CRMRole[], nameToMongoGroup: Map<string, MongoGroup>) {
    // Obtiene una lista de nombres de grupos únicos del CRM
    // Set elimina duplicados y Array.from lo convierte de nuevo a array
    const uniqueGroups = [...new Set(roles.map(item => item.name))];

    // Array para almacenar las operaciones de MongoDB a ejecutar
    const operations: any[] = [];
    // TODO: Mantener grupos propios de SDA, solo procesar grupos SCRM
    // Procesa cada nombre de grupo único
    uniqueGroups.forEach(groupName => {
        // Verifica si:
        // 1. El grupo no existe en MongoDB (no está en el Map)
        // 2. No es uno de los grupos especiales del sistema
        if (!nameToMongoGroup.has(groupName) &&
            !['EDA_ADMIN', 'EDA_RO', 'EDA_DATASOURCE_CREATOR'].includes(groupName)) {
            
            // Prepara la operación de inserción para el nuevo grupo
            operations.push({
                insertOne: {
                    document: {
                        role: 'EDA_USER_ROLE',     // Rol por defecto
                        name: groupName,           // Nombre del grupo
                        users: []                  // Lista inicial vacía de usuarios
                    }
                }
            });
        }
    });

    // Si hay operaciones pendientes, las ejecuta todas en una sola llamada
    if (operations.length > 0) {
        // ordered: false permite que las operaciones continúen aunque alguna falle
        return await Group.collection.bulkWrite(operations, { ordered: false });
    }

    // Si no hay operaciones para ejecutar, retorna null
    return null;
}

/**
* Actualiza las relaciones bidireccionales entre usuarios y grupos, manejando tanto grupos SCRM_ como no-SCRM.
* Garantiza que los usuarios que ya no pertenecen a grupos SCRM_ en CRM sean removidos de estos grupos en MongoDB.
* 
* @param roles - Lista de roles del CRM con estructura {name: string, user_name?: string}
* @param mongoGroups - Lista de grupos existentes en MongoDB
* @returns Resultado de las operaciones de escritura en bulk
*/
private static async updateGroupUsers(roles: CRMRole[], mongoGroups: MongoGroup[]) {
    // Mapas para almacenar actualizaciones pendientes
    const groupUpdates = new Map<string, Set<mongoose.Types.ObjectId>>();
    const userUpdates = new Map<string, Set<mongoose.Types.ObjectId>>();
    
    // Obtener usuarios del caché y crear mapas para búsqueda rápida
    const usersCache = await DataCache.getInstance().getUsers();
    const emailToId = new Map(usersCache.map(u => [u.email, u._id]));
    const idToEmail = new Map(usersCache.map(u => [u._id.toString(), u.email]));
 
    // Crear mapa de asignaciones usuario-grupo del CRM
    const crmUsersGroups = new Map<string, Set<string>>();
    roles.forEach(role => {
        if (role.user_name) {
            if (!crmUsersGroups.has(role.user_name)) {
                crmUsersGroups.set(role.user_name, new Set());
            }
            if (role.name.startsWith('SCRM_')) {
                crmUsersGroups.get(role.user_name)?.add(role.name);
            }
        }
    });
 
    // Procesar cada grupo de MongoDB
    mongoGroups.forEach(group => {
        const updatedUsers = new Set<mongoose.Types.ObjectId>();
 
        if (group.name.startsWith('SCRM_')) {
            // Manejo de grupos SCRM_
            group.users.forEach(userId => {
                const userEmail = idToEmail.get(userId.toString());
                if (userEmail) {
                    const userCrmGroups = crmUsersGroups.get(userEmail);
                    if (userCrmGroups?.has(group.name)) {
                        // Mantener usuario solo si aún pertenece al grupo en CRM
                        updatedUsers.add(userId);
                        if (!userUpdates.has(userId.toString())) {
                            userUpdates.set(userId.toString(), new Set());
                        }
                        userUpdates.get(userId.toString())?.add(group._id);
                    }
                }
            });
        } else {
            // Mantener configuración para grupos no-SCRM
            group.users.forEach(userId => {
                updatedUsers.add(userId);
                if (!userUpdates.has(userId.toString())) {
                    userUpdates.set(userId.toString(), new Set());
                }
                userUpdates.get(userId.toString())?.add(group._id);
            });
        }
 
        // Añadir nuevos usuarios del CRM al grupo
        if (group.name.startsWith('SCRM_')) {
            usersCache.forEach(user => {
                const userCrmGroups = crmUsersGroups.get(user.email);
                if (userCrmGroups?.has(group.name)) {
                    updatedUsers.add(user._id);
                    if (!userUpdates.has(user._id.toString())) {
                        userUpdates.set(user._id.toString(), new Set());
                    }
                    userUpdates.get(user._id.toString())?.add(group._id);
                }
            });
        }
 
        groupUpdates.set(group.name, updatedUsers);
    });
 
    // Preparar operaciones de actualización
    const groupOperations = mongoGroups
        .map(group => ({
            updateOne: {
                filter: { name: group.name },
                update: { 
                    $set: { 
                        users: Array.from(groupUpdates.get(group.name) || [])
                    } 
                }
            }
        }))
        .filter(op => op.updateOne.update.$set.users.length > 0);
 
    const userOperations = Array.from(userUpdates.entries())
        .map(([userId, groupIds]) => ({
            updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(userId) },
                update: {
                    $set: {
                        role: Array.from(groupIds)
                    }
                }
            }
        }));
 
    // Ejecutar actualizaciones en paralelo
    const results = await Promise.all([
        groupOperations.length > 0 ? Group.collection.bulkWrite(groupOperations, { ordered: false }) : null,
        userOperations.length > 0 ? User.collection.bulkWrite(userOperations, { ordered: false }) : null
    ]);
 
    return results[0];
 }
 
 
 /**
 * Verifica y corrige las relaciones bidireccionales entre usuarios administrativos y sus roles
 * @param adminGroups - Array de nombres de grupos administrativos a verificar
 * @returns Resultado de las operaciones de corrección
 */
 private static async verifyAdminRelations(adminGroups: string[] = ['EDA_ADMIN', 'EDA_DATASOURCE_CREATOR']) {
    const operations = {
        users: [] as any[],
        groups: [] as any[]
    };

    const adminMongoGroups = await Group.find({ name: { $in: adminGroups } });
    const adminUsers = await User.find({
        role: { 
            $in: adminMongoGroups.map(g => g._id)
        }
    });

    for (const group of adminMongoGroups) {
        const usersInGroup = new Set<string>(group.users.map(id => id.toString()));
        const shouldBeInGroup = new Set<string>(adminUsers
            .filter(u => u.role.includes(group._id))
            .map(u => u._id.toString()));

        if (!userAndGroupsToMongo.setsAreEqual(usersInGroup, shouldBeInGroup)) {
            operations.groups.push({
                updateOne: {
                    filter: { _id: group._id },
                    update: { $set: { users: Array.from(shouldBeInGroup).map(id => new mongoose.Types.ObjectId(id)) } }
                }
            });
        }
    }

    for (const user of adminUsers) {
        const userGroups = new Set<string>(user.role.map(id => id.toString()));
        const shouldBeInRoles = new Set<string>(adminMongoGroups
            .filter(g => g.users.includes(user._id))
            .map(g => g._id.toString()));

        if (!userAndGroupsToMongo.setsAreEqual(userGroups, shouldBeInRoles)) {
            operations.users.push({
                updateOne: {
                    filter: { _id: user._id },
                    update: { $set: { role: Array.from(shouldBeInRoles).map(id => new mongoose.Types.ObjectId(id)) } }
                }
            });
        }
    }

    if (operations.groups.length || operations.users.length) {
        return Promise.all([
            operations.groups.length ? Group.bulkWrite(operations.groups) : null,
            operations.users.length ? User.bulkWrite(operations.users) : null
        ]);
    }

    return null;
}

/**
 * Compara dos Sets para verificar si contienen los mismos elementos
 */
private static setsAreEqual(a: Set<string>, b: Set<string>): boolean {
    return a.size === b.size && [...a].every(value => b.has(value));
}

}