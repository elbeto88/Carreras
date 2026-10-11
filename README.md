# 🏎️ Super Carreras 3D Oval - Multijugador en Tiempo Real

Videojuego de carreras de autos en 3D con física arcade, saltos, disparos contra rivales y modo multijugador online en tiempo real para 2 o más jugadores, optimizado para dispositivos móviles y PC.

## 🏁 Características Principales

- **🎮 Pistas Ovaladas:** Circuitos ovalados de alta velocidad con 4 vueltas reglamentarias por carrera.
- **🚀 Saltos y Acrobacias:** Presiona el botón de SALTO para evitar misiles rivales y superar curvas.
- **💥 Sistema de Disparos:** Lanza proyectiles teledirigidos para hacer trompicar a los contrincantes rivales.
- **🌐 Multijugador Online en Tiempo Real (WebSockets):**
  - Creación de salas públicas o privadas con código de 4 caracteres.
  - Sincronización instantánea de autos, saltos, posiciones, proyectiles e impactos.
  - Chat rápido y taunts con emoticones flotantes en 3D en tiempo real.
  - Podio final en vivo al completar las 4 vueltas.
- **🤖 Modo Solitario (Un Jugador):**
  - Entrena contra IA inteligente en 4 niveles y biomas diferentes (Circuito Neón, Desierto Rocoso, Pista Volcánica, Valle Tecnológico).
- **📱 Optimizado para Dispositivos Móviles:**
  - Controles táctiles virtuales ergonómicos (Volante táctil / Botones de dirección, Acelerador, Freno/Reversa, Salto y Disparo).
  - Compatible con teclado en PC (Flechas / WASD, Barra espaciadora para saltar, Tecla E / Enter para disparar).
- **🔊 Efectos de Sonido Integrados (Web Audio API):**
  - Motores dinámicos acelerando según la velocidad.
  - Sonidos de derrapes, saltos, disparos láser, explosiones de impacto y fanfarria de victoria.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 19, TypeScript, Three.js (Canvas 3D WebGL), Tailwind CSS v4, Lucide Icons.
- **Backend:** Node.js, Express, WebSockets (`ws`).
- **Build Tool:** Vite 6 / tsx.

---

## 🚀 Instalación y Ejecución Local

### Prerrequisitos
- [Node.js](https://nodejs.org/) (versión 18 o superior)
- `npm` o `pnpm` o `yarn`

### 1. Clonar o extraer el proyecto
```bash
git clone <URL_DE_TU_REPOSITORIO>
cd carreras-3d-multijugador
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Iniciar el servidor de desarrollo (con WebSockets + Vite)
```bash
npm run dev
```

Abre tu navegador en:
`http://localhost:3000`

---

## 📦 Subir este proyecto a GitHub / GitLab

Si descargaste el archivo ZIP y quieres subirlo a un nuevo repositorio:

```bash
# 1. Descomprime el archivo zip y entra a la carpeta
cd carreras-3d-multijugador

# 2. Inicializa git
git init

# 3. Agrega todos los archivos
git add .

# 4. Haz tu primer commit
git commit -m "feat: Videojuego de carreras 3D con saltos, disparos y multijugador"

# 5. Renombra la rama principal a main
git branch -M main

# 6. Vincula con tu repositorio remoto de GitHub / GitLab
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# 7. Sube tu código
git push -u origin main
```

---

## 🎯 Controles del Juego

| Acción | PC (Teclado) | Móvil (Pantalla Táctil) |
| :--- | :--- | :--- |
| **Acelerar** | Flecha Arriba / `W` | Botón verde ⚡ |
| **Frenar / Reversa** | Flecha Abajo / `S` | Botón rojo 🛑 |
| **Girar Izquierda** | Flecha Izquierda / `A` | Botón ◀️ / Pad táctil |
| **Girar Derecha** | Flecha Derecha / `D` | Botón ▶️ / Pad táctil |
| **Saltar** | Barra Espaciadora | Botón azul 🦘 |
| **Disparar** | Tecla `E` / Enter | Botón naranja 🎯 |

---

## 🌐 Despliegue en la Nube (Vercel + Render / Railway)

### ⚠️ ¿Por qué Vercel solo no puede crear salas multijugador?
**Vercel** es una plataforma orientada a **sitios estáticos y funciones Serverless**. Al desplegar en Vercel, únicamente se compila el frontend de React (`dist/`). Vercel **no permite mantener procesos continuos de Node.js con conexiones WebSockets abiertas** (`server.ts`).

Por esta razón, cuando abres el juego desde Vercel (`https://tu-juego.vercel.app`), el cliente busca un servidor WebSocket en ese mismo dominio y no lo encuentra.

### 💡 Solución en 2 Minutos (100% Gratuita):
Mantén tu frontend en Vercel y aloja el backend Node.js en **Render.com** (o **Railway.app**):

1. **Alojar el Backend en Render (Gratis):**
   - Entra a [Render.com](https://render.com) e inicia sesión con tu cuenta de GitHub.
   - Haz clic en **New + > Web Service**.
   - Selecciona el repositorio de tu juego.
   - Configura:
     - **Build Command:** `npm install && npm run build`
     - **Start Command:** `npm start`
     - **Instance Type:** Free
   - Render generará una URL pública (ejemplo: `https://mi-juego-backend.onrender.com`).
   - El archivo `render.yaml` incluido en el proyecto ya contiene esta configuración predefinida.

2. **Conectar tu Vercel con el Backend:**
   - En tu panel de **Vercel** > Proyecto > **Settings** > **Environment Variables**:
     - Agrega la variable:
       ```env
       VITE_WS_URL = wss://mi-juego-backend.onrender.com/ws
       ```
     - Haz un **Redeploy** en Vercel.
   - O alternativamente:
     - Abre tu juego en Vercel, entra en **Multijugador > Pestaña Servidor**, pega tu URL de Render y haz clic en **Guardar y Conectar**. ¡Se guardará automáticamente!

3. **Modo Sala Simulada (Sin Backend):**
   - Si no quieres desplegar un backend todavía, dentro del juego puedes hacer clic en **"Probar Sala con Bots IA"** para disfrutar de la experiencia completa de sala, 4 vueltas, disparos y podio directamente en Vercel.

---

## 📄 Licencia
Este proyecto es de código abierto bajo licencia Apache-2.0 / MIT.
