# Photo Journal (Expo · React Native)

Aplicación móvil hecha con **Expo** y **React Native** que permite **tomar fotos** con la cámara del dispositivo, **guardar la ubicación GPS** de cada foto y visualizar una **galería** con la información capturada. Incluye **eliminación de fotos** y un **mapa** con marcadores en las ubicaciones donde se tomaron.

> Probado en Android con Expo Go. Requiere permisos de **cámara** y **ubicación**.

---

## ✨ Características

- 📸 **Cámara**: captura de fotos con `expo-camera`.
- 📍 **Geolocalización**: guarda latitud/longitud con `expo-location`.
- 🖼️ **Galería local**: lista de fotos tomadas (URI local), fecha y coordenadas.
- 🗺️ **Mapa**: pantalla con marcadores por cada foto tomada (usando `react-native-maps`).
- 🧹 **Eliminar**: borra la foto del almacenamiento y la quita de la galería.
- 💾 **Persistencia**: items guardados en `AsyncStorage` y archivos en `FileSystem`.
- 🌓 UI sencilla y responsiva; diseño seguro para pantallas con barra de gestos.

---

## 📲 Demo rápida

1. **Galería**: muestra tus fotos con fecha y coordenadas (si están disponibles).
2. **Cámara**: toma una foto y la app guarda automáticamente la ubicación (si el permiso fue concedido).
3. **Mapa**: ve pines en un mapa con las ubicaciones de tus fotos.
4. **Eliminar**: desde la galería, borra una foto y su archivo local.

> Si negás **ubicación**, la foto se guarda **sin coordenadas**.

---

## 🛠️ Tecnologías

- **Expo SDK 54**
- `expo-camera`, `expo-location`, `expo-file-system`
- `@react-native-async-storage/async-storage`
- `react-native-maps`

---

## 📦 Estructura
photo-journal/
├─ App.js # UI (tabs: Galería, Cámara, Mapa) + lógica principal
├─ app.json # Configuración de Expo (permisos, iconos, splash)
├─ assets/ # Iconos, splash, etc.
├─ package.json
└─ README.md

---

## ▶️ Instalación y ejecución

### Requisitos
- Node.js LTS
- App **Expo Go** instalada en el teléfono (Android/iOS)
- (Opcional) Emulador Android/iOS

### Pasos
```bash
# instalar dependencias
npm install

# iniciar el proyecto
npx expo start
Escaneá el QR con Expo Go o usá:

npm run android

npm run ios (en macOS)

npm run web (solo para vista básica)


