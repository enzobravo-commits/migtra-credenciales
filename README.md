# Credenciales MIGTRA

Web app (Next.js) para preparar y enviar las credenciales de la plataforma MIGTRA a transportistas CMPC.

- Entra con Google (solo @migtra.com y solo los correos de `ALLOWED_EMAILS`).
- Lee la pestaña `UsersAAAAMMDD` más reciente del archivo y detecta las filas **verdes** (sin rojas, activas, no internas/SSO, con clave).
- Arma el correo (saludo según la hora de Santiago, tabla de datos, guía PDF adjunta) y lo crea como **borrador** o lo **envía** desde el Gmail de quien está usando la app.
- Registra cada acción en la pestaña `Envíos` de la hoja de registro (evita duplicados). No guarda claves en ningún otro lugar.

## 1. Preparar la hoja de registro
El archivo de origen (`usuarios.xlsx` en Drive) se lee tal cual, sin convertirlo (`SOURCE_FILE_ID`). Quien use la app solo necesita poder **verlo**.
Crea una **hoja de Google nueva y vacía** (por ejemplo "Registro envíos credenciales"), compártela como **editor** con quienes usen la app y copia su ID en `LOG_SHEET_ID`. Ahí la app crea la pestaña `Envíos` y anota cada borrador o envío.

## 2. Google Cloud (lo hace alguien con admin del Workspace, ~10 min)
1. console.cloud.google.com > crear proyecto (o usar uno de Migtra).
2. APIs y servicios > Biblioteca: habilitar **Gmail API** y **Google Sheets API**.
3. Pantalla de consentimiento OAuth: tipo **Interno** (así solo entra gente de migtra.com y no requiere verificación de Google).
   Scopes: `gmail.compose`, `spreadsheets` y `drive.readonly`.
4. Credenciales > Crear ID de cliente OAuth > **Aplicación web**.
   URI de redireccionamiento autorizado: `https://TU-DOMINIO.vercel.app/api/auth/callback/google` (y `http://localhost:3000/api/auth/callback/google` para probar).
5. Copiar Client ID y Client Secret.

## 3. Desplegar en Vercel
1. Subir esta carpeta a un repositorio (GitHub) e importarlo en Vercel, o `npx vercel` desde la carpeta.
2. Variables de entorno (ver `.env.example`): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (la URL final), `SOURCE_FILE_ID`, `LOG_SHEET_ID`, `ALLOWED_EMAILS`, `SENDER_EMAILS` (opcional).
3. Desplegar y probar con "Enviar prueba a mi correo".

## Copia (CC)
Cada borrador o envío lleva en copia a la lista `CC_LISTA` de `lib/config.ts` (Migtra y CMPC). Quien envía se excluye solo de la copia (si envía Liza, no se copia a Liza). Las pruebas a tu propio correo no llevan copia.

## Cambiar el texto del correo o el PDF
- Texto: `lib/mail.ts` (INTRO, NOTA, CIERRE) y `lib/config.ts` (asunto).
- PDF: reemplazar el archivo en Drive (`GUIDE_FILE_ID`); debe estar compartido con quienes usen la app.

## Notas
- Un borrador creado queda marcado en `Envíos` como BORRADOR; la fila sigue apareciendo como "borrador creado" hasta que se envíe.
- Detección de verde: `lib/sheet.ts` (`esVerde`). Si algún tono de verde no se detecta, ahí se ajusta.
