import mongoose, {
  connections,
  Model,
  mongo,
  Mongoose,
  QueryOptions
} from 'mongoose'
import User, { IUser } from '../../admin/users/model/user.model'
import Group, { IGroup } from '../../admin/groups/model/group.model'

export class userAndGroupsToMongo {
  static async crm_to_eda_UsersAndGroups(users: any, roles: any) {
    /** METEMOS USUARIOS Y GRUPOS */

    let mongoUsers = await User.find()

    /** inicializamos usuarios */
    for (let i = 0; i < users.length; i++) {
      let existe = mongoUsers.find(e => e.email == users[i].email)
      if (!existe) {
        //console.log('procesando');
        //console.log(users[i]);

        let user = new User({
          name: users[i].name,
          email: users[i].email,
          password: users[i].password,
          role: []
          //active: users[i].active  ----> eliminamos el campo active y discriminamos más tarde su eliminación
        })
        try {
          await user.save()
          //console.log( ' usuario ' + user.name + ' introducido correctamente en la bbdd' ) ;
          
        } catch (err) {
          console.log(
            'usuario ' +
            user.name +
            ' repetido, no se ha introducido en la bbdd'
          )
        }
      } else {
        await User.findOneAndUpdate({ name: users[i].name }, { password: users[i].password });
        // console.log(' usuario ' + users[i].name + '  ya existe en mongo')
      }
    }

    let mongoGroups = await Group.find()
    mongoUsers = await User.find()
    const unique_groups = [...new Set(roles.map(item => item.name))]

    for (let i = 0; i < unique_groups.length; i++) {
      let existe = mongoGroups.find(e => e.name == unique_groups[i])
      //console.log('Existe: ' +  existe);
      // No meto estos 3 porque son internos de EDA
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
          //console.log('Grabo e grupo' +  group);
          await group.save()
          console.log(
            ' grupo ' + group.name + ' introducido correctamente en la bbdd'
          )
        } catch (err) {
          console.log(
            'grupo ' + group.name + ' repetido, no se ha introducido en la bbdd'
          )
        }
      } else {
        //console.log(' grupo ' + unique_groups[i] + ' Ya existe')
      }
    }

    /* mete usuarios en los grupos y viceversa . 
    cruza los datos de los usuarios de CRM con los de EDA para actualizar.
    */

    await this.syncronizeUsersGroups(mongoUsers, mongoGroups, users, roles);
  }
  
  static async syncronizeUsersGroups(
    mongoUsers: any,
    mongoGroups: any,
    crmUsers: any,
    crmRoles: any
  ) {

    //eliminamos los usuarios inactivos del crm
    mongoUsers.forEach(a => {
      let existe = crmUsers.find(u => u.email === a.email);
      if (existe) {
        if (
          a.email !== 'eda@sinergiada.org' &&
          a.email !== 'eda@jortilles.com' &&
          a.email !== 'edaanonim@jortilles.com' &&
          existe.active == 0) {
            //console.log("El usuario " + a.name + " ya no está activo y es eliminado")
            User.deleteOne({ email: a.email })
              .then(function () {
                //console.log(a.email + ' deleted') // Success
              })
              .catch(function (error) {
                console.log(error, "no se ha borrado el usuario " + a.email) // Failure
              })
        }
      }
    })
    //eliminamos los grupos del CRM que se han borrado.
    mongoGroups.forEach(a => {  
      if( a.name.startsWith('SDA_') ){
        let existe = crmRoles.find(u => u.name === a.name);
        if(!existe){
          Group.deleteOne( {name: a.name}  ).then( function(){ console.log( a.name +  ' deleted')})
        }
      }
    });




    // --------------------------
    // Función auxiliar para verificar si un usuario existe en el CRM
    const userExistsInCRM = (user, crmUsers) => {
      // Se añade que esté activo para comprobar si debe seguir estando ahi.
      return crmUsers.some(crmUser => crmUser.email === user.email && crmUser.active == 1); 
    };

    // Función auxiliar que permite saber si un usuario viene del CRM aunque esé de baja
    const userExistedInCRM = (user, crmUsers) => {
      // Se añade que esté activo para comprobar si debe seguir estando ahi.
      return crmUsers.some(crmUser => crmUser.email === user.email  ); 
    };




    //
    // Grupos
    //

    // Sincronizamos los grupos y usuarios respetando las reglas específicas
    await mongoGroups.forEach(async (group) => {
      if (group.name.startsWith('SDA_')) {
        // Para grupos SDA_, mantenemos usuarios de SDA y sincronizamos con CRM
        const crmUsersInGroup = crmRoles
          .filter(role => role.name === group.name)
          .map(role => mongoUsers.find(u => u.email === role.user_name))
          .filter(user => user)
          .map(user => user._id);
        // Mantenemos usuarios existentes de SDA y añadimos/actualizamos usuarios del CRM
        group.users = [
          ...group.users.filter(userId => {
            const user = mongoUsers.find(u => u._id.toString() === userId.toString());
            return user &&  !userExistsInCRM( user, crmUsers); // Mantenemos usuarios creados en SDA
          }),
          ...crmUsersInGroup
        ];


        // Añadimos nuevos usuarios del CRM que deberían estar en este grupo
        const newCrmUsersInGroup = crmRoles
          .filter(role => role.name === group.name)
          .map(role => mongoUsers.find(u => u.email === role.user_name &&  userExistsInCRM(u, crmUsers)  ))
          .filter(user => user && !group.users.includes(user._id))
          .map(user => user._id);
          
        group.users = [...group.users, ...newCrmUsersInGroup];

      } else {
        // Para grupos sin prefijo SDA_, mantenemos usuarios de SDA y actualizamos usuarios del CRM
        group.users = group.users.filter(userId => {
          const user = mongoUsers.find(u => u._id.toString() === userId.toString());
          if (!user) return false; // El usuario ya no existe en MongoDB
          if (userExistedInCRM(user, crmUsers)) {
            // Para usuarios del CRM, verificamos si aún existen en CRM 
            // Es un grupo de SDA... no sabemos si debe estar o no
            return userExistsInCRM(user, crmUsers) ;
          } else {
            // Mantenemos usuarios creados directamente en SDA
            return true;
          }
        });

 
        


      }
    });


    // Actualizamos los roles de los usuarios
    await mongoUsers.forEach(async (user) => {
      if( userExistsInCRM( user, crmUsers)) { 
        // Actualizamos los usuarios del crm.... los demas no los gestionamos nosotros.
        // Mantenemos roles  que no son SDA_
        const nonCRMRoles = user.role.filter(roleId => {
          const group = mongoGroups.find(g => g._id.toString() === roleId.toString() && !g.name.startsWith('SDA_')  );
          return group;
        });


        // Añadimos roles del CRM
        const crmRolesForUser = crmRoles
          .filter(role => role.user_name === user.email)
          .map(role => mongoGroups.find(g => g.name === role.name))
          .filter(group => group)
          .map(group => group._id);
        // Combinamos roles existentes con roles del CRM
        user.role = [...new Set([...nonCRMRoles, ...crmRolesForUser])];
      }
      // Para los usuarios que no son del crm yo no los gestiono
      // Solo podría qutar los roles que no tocan. Pero no se cual es cual.
      // Por eso no hay else
    });


    // --------------------------



    //empujo el grupo admin para que se inicialize con el admin de eda y el empujo usuario EDA con función de admin
    await mongoGroups.find(i => i.name ===  'EDA_ADMIN').users.push('135792467811111111111111')
    let user = await mongoUsers.find(i => i.email ===  ('eda@jortilles.com') ) ;
    if(user){
      user.role.push('135792467811111111111110');
    }else{
      user = await mongoUsers.find(i => i.email ===  ('eda@sinergiada.org' ) )
      if(user){
        user.role.push('135792467811111111111110');
      }else{
        console.log('NO SE HA PODIDO AÑADIR EL ROL AL USUARIO ADMIN <=============================================================================');
      }

    }





    //guardamos en la bbdd
    await mongoGroups.forEach(async r => {
      try {
        await Group.updateOne({ name: r.name }, { $unset: { users: {} } })
          .then(function () {
            //console.log(r.name + ' Updated') // Success
          })
          .catch(function (error) {
            console.log(error) // Failure
          })
      } catch (err) {
        console.log(err);
      }
      try {
        await Group.updateOne({ name: r.name }, { $addToSet: { users: r.users } })
          .then(function () {
            //console.log(r.name + ' Updated') // Success
          })
          .catch(function (error) {
            console.log(error) // Failure
          })
      } catch (err) {
        console.log(err);
      }
    })    

    const newGroupsInMongo =  await Group.find(); 
    const newGroupsIDInMongo = newGroupsInMongo.map(g=>g._id.toString());
 
      //filtramos grupos por usuario, buscando los grupos que empiezan por "SDA_"
      await mongoUsers.forEach(async user => {
        user.role = user.role.filter( r => newGroupsIDInMongo.includes(r.toString() ) )
        // Solo actualizo los usuarios que  vienen del CRM.... Los otros no tengo manera de saber.
            try {
              await User.updateOne({ email: user.email }, { $unset : {role: {}} })
              .then(function () {
              // console.log(y.name + ' Unset ') 
              })
              .catch(function (error) {
                console.log(error) 
              })
            
            await User.updateOne({ email: user.email }, { $addToSet : {role: user.role} })
              .then(function () {
                //console.log( ' Updated: ');
                // console.log(user);
              })
              .catch(function (error) {
                console.log(error) 
              })
            }catch (err) {}
    })
}
}
