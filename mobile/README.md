# LabKeep Mobile (React Native + Expo)

Aplicación móvil oficial para Android e iOS del **Sistema de Inventario de Laboratorio de Química y Materiales (TecNM - Instituto Tecnológico de Milpa Alta II)**.

---

## 📱 Características Principales
- **Consulta Completa de Inventario**: Sustancias químicas, materiales de vidrio/químicos y materiales didácticos.
- **Lector Nativo de Código QR**: Escanea reactivos directamente desde la cámara del celular para abrir su ficha técnica de inmediato.
- **Gestión de Solicitudes de Cambio**: Notificación y aprobación/rechazo de solicitudes de cambio con retroalimentación para administradores y responsables.
- **Configuración de IP de Servidor**: Posibilidad de cambiar la dirección del servidor Flask tanto en red local de laboratorio como en producción.

---

## 🚀 Requisitos e Instalación

### 1. Prerrequisitos
- Node.js versión 18 o superior.
- Celular Android o iPhone con la aplicación gratuita **Expo Go** instalada (disponible en Play Store y App Store).

### 2. Pasos para ejecutar en Desarrollo

1. Abre la terminal dentro de la carpeta `mobile`:
   ```bash
   cd mobile
   npm install
   ```

2. Inicia el servidor de desarrollo de Expo:
   ```bash
   npx expo start
   ```

3. **Para probar en tu celular**:
   - Conecta tu celular a la misma red Wi-Fi que tu computadora.
   - Abre la app **Expo Go** en Android y escanea el código QR que aparece en la terminal.
   - En la pantalla de inicio de sesión de la app, presiona **⚙ Servidor actual** e ingresa la dirección IP de tu computadora con el puerto de Flask (ejemplo: `http://192.168.1.50:5000`).

---

## 📦 Generar APK para Android (Instalación nativa sin Expo Go)

Para compilar un instalador ejecutable `.apk` para Android sin depender de la terminal:
```bash
npx eas build -p android --profile preview
```
