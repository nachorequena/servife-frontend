# servife-frontend

App móvil de Servife: React Native · Expo · TypeScript. Incluye el panel del gestor, protegido
por rol. El contexto del proyecto (reglas, contrato de API, diseño, roadmap) está en el repo
servife-ia, clonado al lado de este: ver ../servife-ia/README.md.

## Requisitos

- Node 22 y npm.
- Un emulador de Android (ver "Emulador de Android" abajo), o Expo Go en el teléfono.
- El backend levantado (servife-backend, docker compose up -d --build).

## Comandos

    # Primera vez
    npm install
    cp .env.example .env        # EXPO_PUBLIC_API_URL: la IP de tu máquina, no localhost, si probás en el teléfono

    npm run emulador            # arranca el emulador si hace falta y abre la app con Expo Go
    npm start                   # servidor de desarrollo de Expo (escanear el QR con Expo Go)
    npm run pantalla            # pruebas end to end: ver y tocar la pantalla del emulador
    npm test                    # Jest + React Native Testing Library
    npm run typecheck           # tsc --noEmit

    npx expo install <paquete>  # para agregar dependencias: resuelve la versión compatible con el SDK

## Emulador de Android

Es la forma de probar la app en la PC y donde se hacen las pruebas end to end
(../servife-ia/.ai/08-testing.md §6).

Instalación, una vez por máquina:

1. Android Studio → More Actions → Virtual Device Manager → crear un dispositivo (ej. Pixel 7)
   con una imagen x86_64 de Google APIs. Sin Android Studio alcanza con las command-line tools:
   sdkmanager "platform-tools" "emulator" "system-images;android-36;google_apis;x86_64" y
   avdmanager create avd -n servife -k "system-images;android-36;google_apis;x86_64" -d pixel_7.
2. ANDROID_HOME apuntando al SDK. Si no está, el script prueba la ubicación por defecto
   (Windows: %LOCALAPPDATA%\Android\Sdk; macOS: ~/Library/Android/sdk; Linux: ~/Android/Sdk).
3. En Windows, la aceleración usa el Windows Hypervisor Platform (ya está si usás Docker Desktop):
   emulator -accel-check tiene que decir "WHPX ... is installed and usable".

npm run emulador:
- Si no hay un emulador corriendo, arranca el primer AVD (o el de --avd <nombre> o SERVIFE_AVD) y
  espera a que bootee. Si ya hay uno, usa ese.
- Dentro del emulador, localhost es el propio emulador: si EXPO_PUBLIC_API_URL apunta a
  localhost, el script la cambia por 10.0.2.2 (la PC vista desde el emulador). El .env queda igual.
- Avisa si el backend no responde, y abre la app con Expo Go (lo instala la primera vez).
- Los flags extra van a expo start: npm run emulador -- --clear.

npm run pantalla (para recorrer la app sin mouse; lo usan los agentes en las pruebas end to end):

    npm run pantalla                        # textos visibles y el punto donde tocar cada uno
    npm run pantalla -- tocar "Cliente"     # toca el elemento con ese texto
    npm run pantalla -- escribir "hola"     # escribe en el campo con foco
    npm run pantalla -- atras               # botón Atrás
    npm run pantalla -- captura <png>       # captura de pantalla (guardala fuera del repo)

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
