import mongoose, { connections, Model, mongo, Mongoose, QueryOptions } from "mongoose";
import User, { IUser } from "../../admin/users/model/user.model";
import Group, { IGroup } from "../../admin/groups/model/group.model";

mongoose.set("useFindAndModify", false);

interface MongoUser extends mongoose.Document {
   email: string;
   password: string;
   name: string;
   role: mongoose.Types.ObjectId[];
   active?: number;
}

interface MongoGroup extends mongoose.Document {
   _id: mongoose.Types.ObjectId;
   name: string;
   role: string;
   users: mongoose.Types.ObjectId[];
}

interface CRMUser {
   name: string;
   email: string;
   password: string;
   active: number;
}

interface CRMRole {
   name: string;
   user_name?: string;
}

interface SyncResults {
   inserted: number;
   updated: number;
   deleted: number;
}

class DataCache {
   private static instance: DataCache;
   private cache: Map<string, MongoUser[] | MongoGroup[]>;
   private ttl: number;

   private constructor() {
       this.cache = new Map();
       this.ttl = 300000;
   }

   static getInstance(): DataCache {
       if (!DataCache.instance) {
           DataCache.instance = new DataCache();
       }
       return DataCache.instance;
   }

   async getUsers(): Promise<MongoUser[]> {
       const cacheKey = 'all_users';
       if (!this.cache.has(cacheKey)) {
           const users = await User.find().lean() as unknown as MongoUser[];
           this.cache.set(cacheKey, users);
           setTimeout(() => this.cache.delete(cacheKey), this.ttl);
       }
       return this.cache.get(cacheKey) as MongoUser[];
   }

   async getGroups(): Promise<MongoGroup[]> {
       const cacheKey = 'all_groups';
       if (!this.cache.has(cacheKey)) {
           const groups = await Group.find().lean() as unknown as MongoGroup[];
           this.cache.set(cacheKey, groups);
           setTimeout(() => this.cache.delete(cacheKey), this.ttl);
       }
       return this.cache.get(cacheKey) as MongoGroup[];
   }
}

export class userAndGroupsToMongo {
   static async crm_to_eda_UsersAndGroups(users: CRMUser[], roles: CRMRole[]) {
       console.time("Total usersAndGroupsToMongo");
       console.log(`Starting sync: ${users.length} users and ${roles.length} role assignments`);

       try {
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

   private static async synchronizeUsers(crmUsers: CRMUser[], emailToMongoUser: Map<string, MongoUser>) {
       const batchSize = 100;
       const operations: any[] = [];

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

   private static async removeInactiveUsers(crmUsers: CRMUser[]) {
       const excludedEmails = ['eda@sinergiada.org', 'eda@jortilles.com', 'edaanonim@jortilles.com'];
       const activeEmails = new Set(
           crmUsers
               .filter(user => user.active === 1)
               .map(user => user.email)
       );

       const bulkDelete = {
           deleteMany: {
               filter: {
                   email: { 
                       $nin: [...excludedEmails, ...Array.from(activeEmails)]
                   }
               }
           }
       };

       return await User.collection.bulkWrite([bulkDelete]);
   }

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

   private static async updateGroupUsers(roles: CRMRole[], mongoGroups: MongoGroup[]) {
       const groupUpdates = new Map<string, Set<string>>();

       roles.forEach(role => {
           if (!groupUpdates.has(role.name)) {
               groupUpdates.set(role.name, new Set());
           }
           if (role.user_name) {
               groupUpdates.get(role.name)?.add(role.user_name);
           }
       });

       const operations = mongoGroups
           .filter(group => groupUpdates.has(group.name))
           .map(group => ({
               updateOne: {
                   filter: { name: group.name },
                   update: { $set: { users: Array.from(groupUpdates.get(group.name) || []) } }
               }
           }));

       if (operations.length > 0) {
           return await Group.collection.bulkWrite(operations, { ordered: false });
       }
       return null;
   }
}