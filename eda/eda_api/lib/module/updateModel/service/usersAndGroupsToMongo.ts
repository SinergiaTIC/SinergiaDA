/**
 * User and Group Synchronization Service
 * Part of the updateModel module
 * 
 * This service handles the synchronization of users and groups between SinergiaCRM 
 * and SinergiaDA (Sinergia Data Analytics) systems. It is a crucial component of 
 * the updateModel process, ensuring that user and group data is consistently 
 * maintained across both platforms. Key functions include:
 * 
 * 1. Importing users from SinergiaCRM to SinergiaDA, creating or updating as needed.
 * 2. Importing and creating groups from SinergiaCRM roles in SinergiaDA.
 * 3. Synchronizing user-group relationships based on CRM roles and SDA-specific rules.
 * 4. Handling special cases for admin users and SinergiaCRM-specific groups (prefixed with 'SCRM_').
 * 5. Removing inactive users and deleted groups to maintain system consistency.
 * 6. Updating the MongoDB database in SinergiaDA with the synchronized data.
 * 
 * The userAndGroupsToMongo class contains two primary methods:
 * - crm_to_eda_UsersAndGroups: Initiates the synchronization process.
 * - syncronizeUsersGroups: Performs detailed synchronization logic.
 * 
 * This service is a critical part of maintaining data integrity between SinergiaCRM 
 * and SinergiaDA, ensuring that analytics and reporting in SinergiaDA accurately 
 * reflect the current state of users and groups in the CRM system.
 * 
 * Note: This service assumes the existence of User and Group models in the SinergiaDA 
 * MongoDB database and relies on user and role data structures from SinergiaCRM.
 */

import mongoose, {
  connections,
  Model,
  mongo,
  Mongoose,
  QueryOptions
} from 'mongoose'
import User, { IUser } from '../../admin/users/model/user.model'
import Group, { IGroup } from '../../admin/groups/model/group.model'

mongoose.set('useFindAndModify', false);

export class userAndGroupsToMongo {
  static async crm_to_eda_UsersAndGroups(users: any, roles: any) {
    // Sync users and groups from CRM to EDA
    let mongoUsers = await User.find()

    // Initialize users
    for (let i = 0; i < users.length; i++) {
      let existe = mongoUsers.find(e => e.email == users[i].email)
      if (!existe) {
        let user = new User({
          name: users[i].name,
          email: users[i].email,
          password: users[i].password,
          role: []
        })
        try {
          await user.save()
        } catch (err) {
          console.log(
            'usuario ' +
            user.name +
            ' (Could not insert into the MongoDB database.)'          )
        }
      } else {
        await User.findOneAndUpdate({ name: users[i].name }, { password: users[i].password });
      }
    }

    // Initialize groups
    let mongoGroups = await Group.find()
    mongoUsers = await User.find()
    const unique_groups = [...new Set(roles.map(item => item.name))]

    for (let i = 0; i < unique_groups.length; i++) {
      let existe = mongoGroups.find(e => e.name == unique_groups[i])
      if (
        !existe &&
        unique_groups[i] != 'EDA_ADMIN' &&
        unique_groups[i] != 'EDA_RO' &&
        unique_groups[i] != 'EDA_DATASOURCE_CREATOR'
      ) {
        let group = new Group({
          role: 'EDA_USER_ROLE',
          name: unique_groups[i],
          users: []
        })
        try {
          await group.save()
          console.log(`Group ${group.name} inserted successfully`)
        } catch (err) {
          console.log(`Group ${group.name} already exists, skipped`)
        }
      }
    }

    // Synchronize users and groups
    await this.syncronizeUsersGroups(mongoUsers, mongoGroups, users, roles);
  }
  
  static async syncronizeUsersGroups(
    mongoUsers: any,
    mongoGroups: any,
    crmUsers: any,
    crmRoles: any
  ) {
    // Remove inactive users from CRM
    mongoUsers.forEach(a => {
      let existe = crmUsers.find(u => u.email === a.email);
      if (existe) {
        if (
          a.email !== 'eda@sinergiada.org' &&
          a.email !== 'eda@jortilles.com' &&
          a.email !== 'edaanonim@jortilles.com' &&
          existe.active == 0) {
            User.deleteOne({ email: a.email })
              .then(function () {
              })
              .catch(function (error) {
                console.log('Error deleting user:', a.email, 'Details:', error);
              })
        }
      }
    })

    // Remove deleted CRM groups
    mongoGroups.forEach(a => {  
      if( a.name.startsWith('SCRM_') ){
        let existe = crmRoles.find(u => u.name === a.name);
        if(!existe){
          Group.deleteOne( {name: a.name}  ).then( function(){ console.log( a.name +  ' deleted')})
        }
      }
    });

    // Helper functions to check user existence in CRM
    const userExistsInCRM = (user: any, crmUsers: any) => {
      return crmUsers.some(crmUser => crmUser.email === user.email && crmUser.active == 1); 
    };

    const userExistedInCRM = (user: any, crmUsers: any) => {
      return crmUsers.some(crmUser => crmUser.email === user.email); 
    };

    // Synchronize groups and users, avoiding duplicates
    const BATCH_SIZE = 50;
    for (let i = 0; i < mongoUsers.length; i += BATCH_SIZE) {
        const userBatch = mongoUsers.slice(i, i + BATCH_SIZE);
        await Promise.all(userBatch.map(async (user) => {
            if (userExistsInCRM(user, crmUsers)) {
        const nonCRMRoles = user.role.filter(roleId => {
          const group = mongoGroups.find(g => g._id.toString() === roleId.toString() && !g.name.startsWith('SCRM_')  );
          return group;
        });

        // Add CRM roles
        const crmRolesForUser = crmRoles
          .filter(role => role.user_name === user.email)
          .map(role => mongoGroups.find(g => g.name === role.name))
          .filter(group => group)
          .map(group => group._id.toString());  // Convert to string for comparison

        const allRoles = [...nonCRMRoles.map(r => r.toString()), ...crmRolesForUser];
        const uniqueRoles = [...new Set(allRoles)].map(r => mongoose.Types.ObjectId(r));

            try {
                await User.updateOne(
                    { email: user.email },
                    { $set: { role: uniqueRoles } }
                );
            } catch (err) {
                console.log('Error updating user roles:', err);
            }
        }
        }));
    }

    // Procesar grupos en lotes para evitar duplicados en users
    for (let i = 0; i < mongoGroups.length; i += BATCH_SIZE) {
        const groupBatch = mongoGroups.slice(i, i + BATCH_SIZE);
        await Promise.all(groupBatch.map(async (group) => {
            try {
                const usersInGroup = mongoUsers
                    .filter(user => user.role.some(roleId => 
                        roleId.toString() === group._id.toString()
                    ))
                    .map(user => user._id.toString());

                // Corrección del tipado
                const uniqueUsers = Array.from(new Set(usersInGroup))
                    .map(u => mongoose.Types.ObjectId(u as string));

                await Group.updateOne(
                    { _id: group._id },
                    { $set: { users: uniqueUsers } }
                );
            } catch (err) {
                console.log('Error updating group users:', err);
            }
        }));

    // Admin user management
    await mongoGroups.find(i => i.name === 'EDA_ADMIN').users.push('135792467811111111111111');
    let user = await mongoUsers.find(i => i.email === ('eda@jortilles.com'));
    if (user) {
        user.role.push('135792467811111111111110');
    } else {
        user = await mongoUsers.find(i => i.email === ('eda@sinergiada.org'));
        if (user) {
            user.role.push('135792467811111111111110');
        } else {
            console.log('Error: Failed to assign admin role to user');
        }
    }

    const newGroupsInMongo = await Group.find();
    const newGroupsIDInMongo = newGroupsInMongo.map(g => g._id.toString());

    // Final user roles update con tipado corregido
    for (let i = 0; i < mongoUsers.length; i += BATCH_SIZE) {
        const userBatch = mongoUsers.slice(i, i + BATCH_SIZE);
        await Promise.all(userBatch.map(async (user) => {
            const validRoles = user.role
                .map(r => r.toString())
                .filter(r => newGroupsIDInMongo.includes(r));

            // Corrección del tipado
            const uniqueRoles = Array.from(new Set(validRoles))
                .map(r => mongoose.Types.ObjectId(r as string));

            try {
                await User.updateOne(
                    { email: user.email },
                    { $set: { role: uniqueRoles } }
                );
            } catch (err) {
                console.log('Error updating final user roles:', err);
            }
        }));
    }
}
}
}
