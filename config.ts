export const CONFIG = {
  // Archivo de origen (usuarios.xlsx en Drive, se lee tal cual) y hoja de Google nativa donde se anota el registro de envíos.
  archivoId: process.env.SOURCE_FILE_ID || '1KJmD9X6mYWik-H-1i0f8zr6dU8Bok7cx',
  // Guía PDF que se adjunta (archivo en Drive; para cambiarla, reemplaza ese archivo y compártelo con quienes usen la app).
  guiaId: process.env.GUIDE_FILE_ID || '1dqib6i7NMf43-XNbUVJQGMwCNhlA5SzM',
  registroId: process.env.LOG_SHEET_ID || '',
  pestanaPatron: /^Users(\d{8})$/,
  hojaRegistro: 'Envíos',
  zona: 'America/Santiago',
  asunto: 'Accesos plataforma MIGTRA',
  adjuntoNombre: 'Guía de Acceso a Plataforma CMPC (Migtra).pdf',
};
const lista = (v?: string) => (v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
export const permitidos = () => lista(process.env.ALLOWED_EMAILS);
export const puedeEnviar = (email: string) => {
  const s = lista(process.env.SENDER_EMAILS);
  return s.length === 0 || s.includes(email.toLowerCase());
};

// Siempre van en copia al crear un borrador o enviar. Quien envía se excluye solo (no se copia a sí mismo).
export const CC_LISTA = [
  'liza@migtra.com',
  'loana.osuna@migtra.com',
  'jose.baeza@migtra.com',
  'joaquin.fuentealba@cmpc.com',
  'tamara.vasquez@cmpc.com',
  'juan.palacios@migtra.com',
  'daniel.cofre@migtra.com',
  'sandra@migtra.com',
  'alexis.simanca@migtra.com',
  'ignacio.huerta@migtra.com',
  'emily.peinado@migtra.com',
  'enzo.bravo@migtra.com',
];
export const copiaPara = (quienEnvia: string, destinatario: string) =>
  CC_LISTA.filter((c) => c !== quienEnvia.toLowerCase() && c !== destinatario.toLowerCase());
