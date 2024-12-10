import mongoose, { connections, Model, mongo, Mongoose, QueryOptions } from "mongoose";
import User, { IUser } from "../../admin/users/model/user.model";
import Group, { IGroup } from "../../admin/groups/model/group.model";
import { Console } from "console";

// Desactiva warnings obsoletos de mongoose
mongoose.set("useFindAndModify", false);

// Define estructura de usuario en MongoDB
interface MongoUser extends mongoose.Document {
   email: string;
   password: string;
   name: string;
   role: mongoose.Types.ObjectId[];
   active?: number;
}

// Define estructura de grupo en MongoDB
interface MongoGroup extends mongoose.Document {
   _id: mongoose.Types.ObjectId;
   name: string;
   role: string;
   users: mongoose.Types.ObjectId[];
}

// Define estructura de usuario en CRM
interface CRMUser {
   name: string;
   email: string;
   password: string;
   active: number;
}

// Define estructura de rol en CRM
interface CRMRole {
   name: string;
   user_name?: string;
}

// Define estructura de resultados de sincronización
interface SyncResults {
   inserted: number;
   updated: number;
   deleted: number;
}

/**
 * Implementa un sistema de caché para usuarios y grupos en MongoDB
 * Se reconstruye en cada ejecución para mantener datos actualizados
 */
class DataCache {
    private static instance: DataCache;
    private cache: Map<string, MongoUser[] | MongoGroup[]>;

    private constructor() {
        this.cache = new Map();
    }

    /**
     * Obtiene o crea la instancia única del caché
     * @returns Instancia del caché limpia
     */
    static getInstance(): DataCache {
        if (!DataCache.instance) {
            DataCache.instance = new DataCache();
        }
        DataCache.instance.clearCache();
        return DataCache.instance;
    }

    /**
     * Elimina todos los datos almacenados en caché
     */
    private clearCache(): void {
        this.cache.clear();
    }

    /**
     * Recupera usuarios de MongoDB usando caché
     * @returns Lista de usuarios
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
     * Recupera grupos de MongoDB usando caché
     * @returns Lista de grupos
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

export class userAndGroupsToMongo {
    /**
     * Coordina la sincronización completa de usuarios y grupos entre CRM y MongoDB
     * Gestiona la creación de índices y ejecuta las sincronizaciones en paralelo
     * 
     * @param users Lista de usuarios del CRM a sincronizar
     * @param roles Lista de roles/grupos del CRM a sincronizar
     * @returns Resultados de la sincronización
     */
    static async crm_to_eda_UsersAndGroups(users: CRMUser[], roles: CRMRole[]) {
        console.time("Total usersAndGroupsToMongo");
        console.log(`Starting sync: ${users.length} users and ${roles.length} role assignments`);

        try {
            // Asegura índices únicos
            await User.collection.createIndex({ email: 1 }, { unique: true });
            await Group.collection.createIndex({ name: 1 }, { unique: true });

            const userSyncResults = await this.optimizedUserSync(users);
            const groupSyncResults = await this.optimizedGroupSync(roles);

            console.log('Sync completed:', {
                users: userSyncResults,
                groups: groupSyncResults
            });

            console.timeEnd("Total usersAndGroupsToMongo");
            return { userSyncResults, groupSyncResults };
        } catch (error) {
            console.error("Sync error:", error);
            throw error;
        }
    }

    /**
     * Gestiona la sincronización optimizada de usuarios
     * Procesa actualizaciones e inserciones en lotes
     * 
     * @param crmUsers Lista de usuarios del CRM
     * @returns Estadísticas de la sincronización
     */
    private static async optimizedUserSync(crmUsers: CRMUser[]): Promise<SyncResults> {
        console.time('userSync');
        
        try {
            const mongoUsers = await DataCache.getInstance().getUsers();
            const emailToMongoUser = new Map<string, MongoUser>(
                mongoUsers.map(user => [user.email, user])
            );
            
            const [syncResult, deleteResult] = await Promise.all([
                this.synchronizeUsers(crmUsers, emailToMongoUser),
                this.removeInactiveUsers(crmUsers)
            ]);

            console.timeEnd('userSync');

            return {
                inserted: syncResult?.insertedCount || 0,
                updated: syncResult?.modifiedCount || 0,
                deleted: deleteResult?.deletedCount || 0
            };
        } catch (error) {
            console.error('User sync error:', error);
            throw error;
        }
    }

    /**
     * Procesa usuarios en lotes para sincronización
     * Maneja creación de nuevos usuarios y actualización de contraseñas
     * 
     * @param crmUsers Lista de usuarios a sincronizar
     * @param emailToMongoUser Mapa de usuarios existentes
     * @returns Resultado de operaciones bulk
     */
    private static async synchronizeUsers(crmUsersRaw: CRMUser[], emailToMongoUser: Map<string, MongoUser>) {
        const batchSize = 100;
        const operations: any[] = [];

        let crmUsers = crmUsersRaw.filter(element => element.active === 1);
        
        for (let i = 0; i < crmUsers.length; i += batchSize) {
            const batch = crmUsers.slice(i, i + batchSize);
            
            batch.forEach(crmUser => {
                const existingUser = emailToMongoUser.get(crmUser.email);
                
                if (!existingUser) {
                    operations.push({
                        insertOne: {
                            document: {
                                name: crmUser.name,
                                email: crmUser.email,
                                password: crmUser.password,
                                role: []
                            }
                        }
                    });
                } else if (existingUser.password !== crmUser.password) {
                    operations.push({
                        updateOne: {
                            filter: { email: crmUser.email },
                            update: { $set: { password: crmUser.password } }
                        }
                    });
                }
            });
        }

        if (operations.length > 0) {
            return await User.collection.bulkWrite(operations, { ordered: false });
        }
        
        return null;
    }



    /**
     * Elimina usuarios inactivos del CRM preservando usuarios del sistema
     * 
     * @param crmUsers Lista de usuarios del CRM
     * @returns Resultado de la operación de eliminación
     */
    private static async removeInactiveUsers(crmUsers: CRMUser[]) {
        const excludedEmails = [
            'eda@sinergiada.org', 
            'eda@jortilles.com', 
            'edaanonim@jortilles.com'
        ];

        const crmEmails = new Set(crmUsers.map(user => user.email));
        const activeEmails = new Set(
            crmUsers
                .filter(user => user.active === 1)
                .map(user => user.email)
        );

        const bulkDelete = {
            deleteMany: {
                filter: {
                    $and: [
                        { email: { $in: Array.from(crmEmails) } },
                        { email: { $nin: [...excludedEmails, ...Array.from(activeEmails)] } }
                    ]
                }
            }
        };

        return await User.collection.bulkWrite([bulkDelete]);
    }

    /**
     * Gestiona la sincronización optimizada de grupos
     * Coordina creación de grupos y actualización de membresías
     * 
     * @param roles Lista de roles del CRM
     * @returns Estadísticas de sincronización
     */
    private static async optimizedGroupSync(roles: CRMRole[]) {
        console.time('groupSync');
        
        try {
            const mongoGroups = await DataCache.getInstance().getGroups();
            const nameToMongoGroup = new Map<string, MongoGroup>(
                mongoGroups.map(group => [group.name, group])
            );
            
            const [syncResult, userAssignments] = await Promise.all([
                this.synchronizeGroups(roles, nameToMongoGroup),
                this.updateGroupUsers(roles, mongoGroups)
            ]);

            console.timeEnd('groupSync');

            return {
                inserted: syncResult?.insertedCount || 0,
                updated: syncResult?.modifiedCount || 0,
                userAssignments
            };
        } catch (error) {
            console.error('Group sync error:', error);
            throw error;
        }
    }

    /**
     * Crea nuevos grupos del CRM en MongoDB
     * Excluye grupos especiales del sistema
     * 
     * @param roles Lista de roles del CRM
     * @param nameToMongoGroup Mapa de grupos existentes
     * @returns Resultado de operaciones bulk
     */
    private static async synchronizeGroups(roles: CRMRole[], nameToMongoGroup: Map<string, MongoGroup>) {
        const uniqueGroups = [...new Set(roles.map(item => item.name))];
        const operations: any[] = [];

        uniqueGroups.forEach(groupName => {
            if (!nameToMongoGroup.has(groupName) &&
                !['EDA_ADMIN', 'EDA_RO', 'EDA_DATASOURCE_CREATOR'].includes(groupName)) {
                
                operations.push({
                    insertOne: {
                        document: {
                            role: 'EDA_USER_ROLE',
                            name: groupName,
                            users: []
                        }
                    }
                });
            }
        });

        if (operations.length > 0) {
            return await Group.collection.bulkWrite(operations, { ordered: false });
        }

        return null;
    }

    /**
     * Actualiza las membresías de usuarios en grupos
     * Mantiene grupos SCRM_ sincronizados con CRM y preserva otros grupos
     * 
     * @param roles Lista de roles del CRM
     * @param mongoGroups Lista de grupos en MongoDB
     * @returns Resultado de operaciones bulk
     */
    private static async updateGroupUsers(roles: CRMRole[], mongoGroups: MongoGroup[]) {
        const groupUpdates = new Map<string, Set<mongoose.Types.ObjectId>>();
        const userUpdates = new Map<string, Set<mongoose.Types.ObjectId>>();
        
        const usersCache = await DataCache.getInstance().getUsers();
        const emailToId = new Map(usersCache.map(u => [u.email, u._id]));
        const idToEmail = new Map(usersCache.map(u => [u._id.toString(), u.email]));

        // Mapeo de asignaciones CRM
        const crmUsersGroups = new Map<string, Set<string>>();
        roles.forEach(role => {
            if (role.user_name && role.name.startsWith('SCRM_')) {
                if (!crmUsersGroups.has(role.user_name)) {
                    crmUsersGroups.set(role.user_name, new Set());
                }
                crmUsersGroups.get(role.user_name)?.add(role.name);
            }
        });
        
        // Obtener usuarios que deben estar en EDA_ADMIN desde sda_def_user_groups
        const edaAdminUsers = new Set<string>(
            roles.filter(role => 
                role.user_name && 
                role.name === 'EDA_ADMIN'
            ).map(role => role.user_name!)
        );
        
        // Procesamiento de grupos
        mongoGroups.forEach(group => {
            const uniqueUsers = new Set<mongoose.Types.ObjectId>();
            
           if (group.name === 'EDA_ADMIN') {
                  // Mantener usuarios existentes
            group.users.forEach(userId => {
                uniqueUsers.add(userId);
                this.updateUserRoles(userUpdates, userId.toString(), group._id);
            });

            // Añadir usuarios de sda_def_user_groups
            usersCache.forEach(user => {
                if (edaAdminUsers.has(user.email)) {
                    uniqueUsers.add(user._id);
                    this.updateUserRoles(userUpdates, user._id.toString(), group._id);
                }
            });
            } else if (group.name.startsWith('SCRM_') || group.name === 'EDA_ADMIN') {
                group.users.forEach(userId => {
                    const userEmail = idToEmail.get(userId.toString());
                    if (userEmail && crmUsersGroups.get(userEmail)?.has(group.name)) {
                        uniqueUsers.add(userId);
                    }
                });

                usersCache.forEach(user => {
                    if (crmUsersGroups.get(user.email)?.has(group.name)) {
                        uniqueUsers.add(user._id);
                    }
                });

                uniqueUsers.forEach(userId => {
                    this.updateUserRoles(userUpdates, userId.toString(), group._id);
                });
            } else {
                group.users.forEach(userId => {
                    uniqueUsers.add(userId);
                    this.updateUserRoles(userUpdates, userId.toString(), group._id);
                });
            }

            if (uniqueUsers.size > 0) {
                groupUpdates.set(group.name, uniqueUsers);
            }
        });

        // Preparación de operaciones bulk
        const groupOperations = Array.from(groupUpdates.entries()).map(([groupName, userIds]) => ({
            updateOne: {
                filter: { name: groupName },
                update: { $set: { users: Array.from(userIds) } }
            }
        }));

        const userOperations = Array.from(userUpdates.entries()).map(([userId, groupIds]) => ({
            updateOne: {
                filter: { _id: new mongoose.Types.ObjectId(userId) },
                update: { $set: { role: Array.from(groupIds) } }
            }
        }));

        return Promise.all([
            groupOperations.length > 0 ? Group.collection.bulkWrite(groupOperations, { ordered: false }) : null,
            userOperations.length > 0 ? User.collection.bulkWrite(userOperations, { ordered: false }) : null
        ]);
    }

   /**
 * Actualiza las relaciones de roles de usuario en el mapa de actualizaciones
 * @param userUpdates - Mapa de actualizaciones usuario-roles
 * @param userId - ID del usuario
 * @param groupId - ID del grupo a añadir
 */
private static updateUserRoles(
    userUpdates: Map<string, Set<mongoose.Types.ObjectId>>, 
    userId: string, 
    groupId: mongoose.Types.ObjectId
): void {
    // Inicializar set si no existe
    if (!userUpdates.has(userId)) {
        userUpdates.set(userId, new Set());
    }
    // Añadir nuevo groupId al set de roles
    userUpdates.get(userId)?.add(groupId);
}

}