#!/usr/bin/env node
'use strict';

const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const database = require(path.join(__dirname, '..', 'config', 'database.config'));

const ADMIN_ROLE = 'EDA_ADMIN_ROLE';
const ADMIN_GROUP_FALLBACK_ID = '135792467811111111111110';
const MIN_PASSWORD_LENGTH = 8;
const SALT_ROUNDS = 10;

const color = {
  red: (t) => `\x1b[31m${t}\x1b[0m`,
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  bold: (t) => `\x1b[1m${t}\x1b[0m`,
};

function usage() {
  console.log(`
Uso: npm run admin:reset -- [opciones]

Resetea la contraseña de un usuario administrador de SinergiaDA. Si el
usuario indicado con --email no existe, se crea en ese momento.
Es un mecanismo de rescate: requiere acceso al servidor donde está la API.

Opciones:
  --email <email>     Usuario a modificar o crear. Si se omite y hay un único
                      administrador, se usa automáticamente.
  --password <pass>   Contraseña nueva (mínimo ${MIN_PASSWORD_LENGTH} caracteres).
                      Si se omite, se genera una aleatoria y se muestra una vez.
  --random            Fuerza la generación de una contraseña aleatoria.
  --name <nombre>     Nombre del usuario al crearlo. Por defecto, la parte
                      del email anterior a la @.
  --role <grupo>      Grupo a asignar al crear el usuario (por nombre).
                      Por defecto, el grupo de administradores.
  --list              Lista los administradores existentes y termina.
  --force             Permite el reseteo aunque el usuario esté gestionado por
                      SinergiaCRM (su contraseña se sobrescribirá en el
                      próximo updateModel).
  --dry-run           Muestra qué se haría, sin escribir en la base de datos.
  -h, --help          Muestra esta ayuda.
`);
}

function parseArgs(argv) {
  const args = {
    email: null,
    password: null,
    name: null,
    role: null,
    random: false,
    list: false,
    force: false,
    dryRun: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const hasInlineValue = arg.indexOf('=') !== -1;
    const key = hasInlineValue ? arg.slice(0, arg.indexOf('=')) : arg;
    const inlineValue = hasInlineValue ? arg.slice(arg.indexOf('=') + 1) : null;
    const takeValue = () => (inlineValue !== null ? inlineValue : argv[++i]);

    switch (key) {
      case '--email':
        args.email = takeValue();
        break;
      case '--password':
        args.password = takeValue();
        break;
      case '--name':
        args.name = takeValue();
        break;
      case '--role':
        args.role = takeValue();
        break;
      case '--random':
        args.random = true;
        break;
      case '--list':
        args.list = true;
        break;
      case '--force':
        args.force = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '-h':
      case '--help':
        args.help = true;
        break;
      default:
        throw new Error(`Opción desconocida: ${arg}`);
    }
  }

  return args;
}

function generatePassword() {
  return crypto.randomBytes(15).toString('base64url');
}

function describe(user) {
  const origin = user.info && user.info.scrm_user === true ? 'SinergiaCRM' : 'nativo de SinergiaDA';
  return `${user.email} (${user.name}) - ${origin}`;
}

async function getAdminGroupId(db) {
  const group = await db.collection('groups').findOne({ role: ADMIN_ROLE });
  if (group) {
    return group._id;
  }
  const fallback = await db
    .collection('groups')
    .findOne({ _id: new mongoose.Types.ObjectId(ADMIN_GROUP_FALLBACK_ID) });
  return fallback ? fallback._id : null;
}

async function findAdmins(db, adminGroupId) {
  return db
    .collection('users')
    .find({ role: adminGroupId })
    .project({ email: 1, name: 1, info: 1 })
    .toArray();
}

async function findUserByEmail(db, email) {
  const users = db.collection('users');
  const exact = await users.findOne({ email });
  if (exact) {
    return exact;
  }
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return users.findOne({ email: { $regex: `^${escaped}$`, $options: 'i' } });
}

function defaultName(email) {
  return email.split('@')[0];
}

async function resolveGroups(db, roleName, adminGroupId) {
  if (!roleName) {
    return [adminGroupId];
  }
  const group = await db.collection('groups').findOne({ name: roleName });
  if (!group) {
    throw new Error(`No existe ningún grupo con el nombre ${roleName}.`);
  }
  return [group._id];
}

async function createUser(db, args, groups, password) {
  const user = {
    name: args.name || defaultName(args.email),
    email: args.email,
    password: bcrypt.hashSync(password, SALT_ROUNDS),
    role: groups,
    info: { scrm_user: false },
  };

  const result = await db.collection('users').insertOne(user);

  await db.collection('groups').updateMany({}, { $pull: { users: result.insertedId } });
  await db.collection('groups').updateMany(
    { _id: { $in: groups } },
    { $push: { users: result.insertedId } }
  );

  return result.insertedId;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    usage();
    return 0;
  }

  if (args.password && args.random) {
    throw new Error('Usa --password o --random, pero no ambos.');
  }
  if (args.password && args.password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  await mongoose.connect(database.url);
  const db = mongoose.connection.db;

  const adminGroupId = await getAdminGroupId(db);
  if (!adminGroupId) {
    throw new Error('No se ha encontrado el grupo de administradores. ¿Está instalada la aplicación?');
  }

  const admins = await findAdmins(db, adminGroupId);

  if (args.list) {
    console.log(`Administradores (${admins.length}):`);
    admins.forEach((admin) => console.log(`  - ${describe(admin)}`));
    return 0;
  }

  let target = null;
  let willCreate = false;
  if (args.email) {
    target = await findUserByEmail(db, args.email);
    willCreate = !target;
  } else {
    if (admins.length === 0) {
      throw new Error('No hay ningún administrador. Indica el usuario con --email.');
    }
    if (admins.length > 1) {
      console.log('Hay varios administradores; indica cuál con --email:');
      admins.forEach((admin) => console.log(`  - ${describe(admin)}`));
      return 1;
    }
    target = await db.collection('users').findOne({ _id: admins[0]._id });
  }

  if (target && target.info && target.info.scrm_user === true && !args.force) {
    console.log(color.yellow('AVISO: este usuario está gestionado por SinergiaCRM.'));
    console.log(color.yellow('Su contraseña se sobrescribirá en el próximo updateModel.'));
    console.log(color.yellow('Usa --force si quieres resetearla igualmente.'));
    return 1;
  }

  const generated = !args.password;
  const password = args.password || generatePassword();

  if (willCreate) {
    const groups = await resolveGroups(db, args.role, adminGroupId);
    const name = args.name || defaultName(args.email);

    if (args.dryRun) {
      console.log(`[dry-run] No existe ${args.email}; se crearía el usuario "${name}".`);
      return 0;
    }

    await createUser(db, args, groups, password);

    console.log(color.green('Usuario creado correctamente.'));
    console.log(`Usuario: ${args.email} (${name})`);
    if (generated) {
      console.log(`Contraseña nueva: ${color.bold(password)}`);
      console.log(color.yellow('Guárdala ahora: no se volverá a mostrar.'));
    }
    return 0;
  }

  if (args.dryRun) {
    console.log(`[dry-run] Se resetearía la contraseña de: ${describe(target)}`);
    return 0;
  }

  await db.collection('users').updateOne(
    { _id: target._id },
    { $set: { password: bcrypt.hashSync(password, SALT_ROUNDS) } }
  );

  console.log(color.green('Contraseña actualizada correctamente.'));
  console.log(`Usuario: ${target.email} (${target.name})`);
  if (generated) {
    console.log(`Contraseña nueva: ${color.bold(password)}`);
    console.log(color.yellow('Guárdala ahora: no se volverá a mostrar.'));
  }

  return 0;
}

main()
  .then((code) => {
    mongoose.connection.close();
    process.exit(code);
  })
  .catch((err) => {
    console.error(color.red(`Error: ${err.message}`));
    mongoose.connection.close();
    process.exit(1);
  });
