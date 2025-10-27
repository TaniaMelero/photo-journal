# Photo Journal (React Native + Expo)

App móvil para **tomar fotos** y guardarlas en una **galería local** junto con la **ubicación** donde fueron tomadas.

https://expo.dev – Probado con **Expo SDK 54**.

## ✨ Funcionalidades
- Cámara integrada (captura y vista previa).
- Guarda cada foto en el almacenamiento local del dispositivo.
- Persiste la galería con `AsyncStorage`.
- Muestra **fecha/hora** y **coordenadas** (si hay permiso de ubicación).
- Tabs: **Cámara / Galería**.

## 🧰 Tecnologías
- React Native con **Expo**
- `expo-camera`
- `expo-location`
- `expo-file-system/legacy` (para copiar y persistir imágenes)
- `@react-native-async-storage/async-storage`

## 📦 Instalación
```bash 
npm install
