export type SdaDbMessageLang = 'es' | 'ca' | 'en' | 'gl';

export type SdaDbMessageKey =
  | 'unknownColumn'
  | 'unknownTable'
  | 'accessDenied'
  | 'syntaxError'
  | 'tooManyConnections'
  | 'lockTimeout'
  | 'connectionRefused'
  | 'generic'
  | 'fallback';

const SDA_DB_ERROR_MESSAGES: Record<SdaDbMessageKey, Record<SdaDbMessageLang, (value?: string) => string>> = {
  unknownColumn: {
    es: (value?: string) => `El campo '${value || '?'}' esta incluido en el informe pero no esta disponible en la base de datos.`,
    en: (value?: string) => `The field '${value || '?'}' is included in the report but is not available in the database.`,
    ca: (value?: string) => `El camp '${value || '?'}' esta inclos a l'informe pero no esta disponible a la base de dades.`,
    gl: (value?: string) => `O campo '${value || '?'}' esta incluido no informe pero non esta disponible na base de datos.`,
  },
  unknownTable: {
    es: (value?: string) => `La tabla '${value || '?'}' no existe en la base de datos. Por favor, revisa el modelo de datos.`,
    en: (value?: string) => `Table '${value || '?'}' does not exist in the database. Please review the data model.`,
    ca: (value?: string) => `La taula '${value || '?'}' no existeix a la base de dades. Si us plau, revisa el model de dades.`,
    gl: (value?: string) => `A taboa '${value || '?'}' non existe na base de datos. Por favor, revisa o modelo de datos.`,
  },
  accessDenied: {
    es: () => 'Acceso denegado a la base de datos. Por favor, verifica las credenciales de conexion.',
    en: () => 'Access denied to the database. Please check the connection credentials.',
    ca: () => 'Acces denegat a la base de dades. Si us plau, verifica les credencials de connexio.',
    gl: () => 'Acceso denegado a base de datos. Por favor, verifica as credenciais de conexion.',
  },
  syntaxError: {
    es: () => 'Error de sintaxis en la consulta SQL. Por favor, revisa la consulta.',
    en: () => 'SQL syntax error. Please review the query.',
    ca: () => 'Error de sintaxi a la consulta SQL. Si us plau, revisa la consulta.',
    gl: () => 'Erro de sintaxe na consulta SQL. Por favor, revisa a consulta.',
  },
  tooManyConnections: {
    es: () => 'Demasiadas conexiones activas en la base de datos. Por favor, intentalo de nuevo mas tarde.',
    en: () => 'Too many active connections to the database. Please try again later.',
    ca: () => 'Massa connexions actives a la base de dades. Si us plau, torna-ho a intentar mes tard.',
    gl: () => 'Demasiadas conexions activas na base de datos. Por favor, intentalo de novo mais tarde.',
  },
  lockTimeout: {
    es: () => 'Tiempo de espera agotado por bloqueo en la base de datos. Por favor, intentalo de nuevo.',
    en: () => 'Database lock wait timeout exceeded. Please try again.',
    ca: () => "Temps d'espera per bloqueig a la base de dades esgotat. Si us plau, torna-ho a intentar.",
    gl: () => 'Tempo de espera esgotado por bloqueo na base de datos. Por favor, intentalo de novo.',
  },
  connectionRefused: {
    es: () => 'No se puede conectar con la base de datos. Por favor, verifica que el servidor esta disponible.',
    en: () => 'Cannot connect to the database. Please verify the server is available.',
    ca: () => 'No es pot connectar amb la base de dades. Si us plau, verifica que el servidor es disponible.',
    gl: () => 'Non se pode conectar coa base de datos. Por favor, verifica que o servidor esta dispoñible.',
  },
  generic: {
    es: (value?: string) => `Error en la consulta a la base de datos: ${value || ''}`,
    en: (value?: string) => `Database query error: ${value || ''}`,
    ca: (value?: string) => `Error en la consulta a la base de dades: ${value || ''}`,
    gl: (value?: string) => `Erro na consulta a base de datos: ${value || ''}`,
  },
  fallback: {
    es: () => 'Error al consultar la base de datos',
    en: () => 'Error querying database',
    ca: () => 'Error en consultar la base de dades',
    gl: () => 'Erro ao consultar a base de datos',
  },
};

export function resolveSdaDbLang(lang?: string | false): SdaDbMessageLang {
  return typeof lang === 'string' && ['es', 'ca', 'en', 'gl'].includes(lang)
    ? (lang as SdaDbMessageLang)
    : 'en';
}

export function getSdaDbErrorMessage(key: SdaDbMessageKey, lang: SdaDbMessageLang, value?: string): string {
  return SDA_DB_ERROR_MESSAGES[key][lang](value);
}
