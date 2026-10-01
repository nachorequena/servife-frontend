# AGENTS.md — servife-frontend

Repo de código de Servife: React Native · Expo · TypeScript.

El contexto del proyecto no está acá. Vive en el repo servife-ia, clonado al lado de este:

    ../servife-ia/CLAUDE.md            índice y reglas que no se negocian (leelo primero)
    ../servife-ia/.agents/AGENTS.md    protocolo: ramas, commits, PR pareado, qué leer
    ../servife-ia/.ai/                 01 a 09

Para este repo, lo más habitual: 09-ux-ui.md, 05-api-contract.md (lo que consumís) y 08-testing.md §4.

Si ../servife-ia no existe, frená y pedí que lo clonen (ver su README.md). No trabajes sin ese
contexto.

Si tu cambio modifica el estado del proyecto o deja viejo algo de ../servife-ia/.ai/, abrí un PR
pareado en servife-ia con el mismo nombre de rama (../servife-ia/.agents/AGENTS.md, punto 6).
Un cambio de contrato que afecta a servife-backend se escribe primero en 05-api-contract.md.

Comandos (dev, tests, typecheck): README.md de este repo. "Levantá el proyecto" quiere decir
backend con Docker y la app en el emulador de Android (npm run emulador); las pruebas end to end
se hacen ahí con npm run pantalla (../servife-ia/.ai/08-testing.md §6).

## Expo

- Expo cambia en cada SDK. Antes de usar una API de Expo o React Native, mirá la versión de expo
  en package.json y leé la documentación de esa versión (https://docs.expo.dev/versions/). No
  confíes en lo que recordás.
- Dependencias nuevas con npx expo install, nunca npm install directo: elige la versión compatible
  con el SDK. Y toda librería nueva se justifica (../servife-ia/.ai/01-rules.md).
- La navegación es React Navigation (decidido en el stack), no Expo Router.
- Las carpetas ios/ y android/ se generan; no se crean ni se editan a mano.
- Testing Library 14: render y fireEvent devuelven promesas, van con await.

## Piezas compartidas que ya existen

Antes de escribir una de estas, usá la que está. No la copies a tu pantalla.

| Necesitás | Usá |
|---|---|
| Llamar a un endpoint | La función de src/api/<modulo>.ts. Si falta, agregala ahí; nunca fetch en una pantalla |
| Mostrar un error del backend | ApiError (src/api/errores.ts); errorDe(campo) para el error de un Input |
| Colores, radios, tipografía, espaciados | src/theme. Si falta un valor, agregalo como token, no escrito a mano |
| Botón, input, avatar, estrellas, tarjeta, logo | src/components |
| "Trabajos realizados" | screens/compartidas/TrabajosRealizadosScreen con soloLectura |
| Chat | screens/compartidas/ChatScreen, detrás de la interfaz CanalDeMensajes (src/api/mensajeria.ts) |
| Rol del usuario, cerrar sesión | useSesion() (src/store/sesion.tsx) |
| Mostrar fechas o montos | src/utils/formato.ts (UTC → Argentina, centavos → pesos) |
