# servife-frontend

App móvil de Servife: React Native · Expo · TypeScript. Incluye el panel del gestor, protegido
por rol. El contexto del proyecto (reglas, contrato de API, diseño, roadmap) está en el repo
servife-ia, clonado al lado de este: ver ../servife-ia/README.md.

## Requisitos

- Node 22 y npm.
- Expo Go en el teléfono, o un emulador Android.
- El backend levantado (servife-backend, docker compose up -d --build).

## Comandos

    # Primera vez
    npm install
    cp .env.example .env        # EXPO_PUBLIC_API_URL: la IP de tu máquina, no localhost, si probás en el teléfono

    npm start                   # servidor de desarrollo de Expo (escanear el QR con Expo Go)
    npm test                    # Jest + React Native Testing Library
    npm run typecheck           # tsc --noEmit

    npx expo install <paquete>  # para agregar dependencias: resuelve la versión compatible con el SDK

En desarrollo, la pantalla Ingresar tiene botones "Entrar como CLIENTE / PRESTADOR / GESTOR" para
navegar sin login real mientras el módulo A no esté. No existen en el build de producción.

## Estructura

    src/
      api/            cliente HTTP (Bearer + refresh ante 401) y un archivo por módulo, con una función por endpoint
      components/     compartidos: Logo, Button, Input, Avatar, Stars, Card
      navigation/     acceso sin sesión y Tab.Navigator por rol (D04)
      screens/        acceso/, cliente/, prestador/, gestor/ y compartidas/ (las que usan cliente y prestador)
      store/          sesión (rol del usuario logueado)
      theme/          tokens de diseño: la única fuente de colores y tamaños
      utils/          formato de fechas (UTC → Argentina) y montos (centavos)

Las pantallas son marcadores (PantallaPendiente) con su caso de uso y los endpoints que consumen;
cada dueño de módulo los reemplaza por la pantalla real.
