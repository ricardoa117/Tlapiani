# 🌾 TLAPIANI
## Plataforma de Resiliencia Climática Agrícola para Puebla

Tlapiani es un sistema de alerta temprana de plagas y monitoreo satelital para pequeños productores agrícolas en Puebla, México.

## 🎯 Características

- 📡 **Datos satelitales reales** de NASA (clima + NDVI)
- 🐛 **Predicción de plagas** (Gusano Cogollero, Roya, Trips)
- 📱 **Alertas multicanal** (WhatsApp, SMS) en español y náhuatl
- 🗺️ **Zonas de restauración** con incentivos económicos
- 💰 **Recomendaciones económicas** de cultivos por rentabilidad
- 🌐 **Multilingüe** (ES, NAH, TOT, MIX)

## 🏗️ Stack Tecnológico

- **Frontend:** React + TypeScript (Vite)
- **Backend:** Node.js + Supabase
- **Base de datos:** PostgreSQL (Supabase)
- **APIs externas:** 
  - NASA POWER (clima)
  - NASA AppEEARS (NDVI satelital)
  - Twilio (WhatsApp/SMS)
  - Mapbox (mapas interactivos)

## 📦 Estructura del Proyecto

```
tlapiani/
├── frontend/           # React app
│   ├── src/
│   │   ├── pages/     # Login, Registro, Dashboard, AdminDashboard
│   │   ├── components/
│   │   └── lib/       # Supabase client
│   └── .env.example
├── backend/           # Scripts Node.js
│   ├── scripts/
│   │   ├── 03_nasa_power.js      # Clima + plagas + recomendaciones
│   │   ├── 04_ndvi_modis.js      # NDVI satelital
│   │   ├── 07_plagas.js          # Motor de predicción
│   │   ├── 08_recomendador.js    # Recomendador económico
│   │   └── 10_enviar_alertas.js  # Twilio WhatsApp/SMS
│   └── .env.example
└── supabase/
    └── migrations/    # SQL schemas

```

## 🚀 Instalación

### 1. Clonar repositorio

```bash
git clone https://github.com/ricardoa117/Tlapiani.git
cd Tlapiani
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Editar .env con tus credenciales de Supabase y Mapbox
npm run dev
```

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con credenciales de Supabase, Twilio y NASA
node scripts/06_verificar_sistema.js
```

### 4. Base de datos

1. Crear proyecto en [Supabase](https://supabase.com)
2. Ejecutar migraciones SQL en SQL Editor
3. Ejecutar seeds de datos demo

## 🔑 Variables de Entorno

Ver `.env.example` en cada carpeta.

**Servicios requeridos:**
- Supabase (gratis)
- Mapbox (gratis hasta 50k tiles/mes)
- Twilio (trial gratis)
- NASA Earthdata (gratis)

## 👥 Equipo - Los Hackgricultores

Hackatón Por Amor a Puebla 2026

- **Ricardo** - Backend & Data
- **[Nombre]** - Frontend
- **[Nombre]** - Fullstack
- **[Nombre]** - UX/Design

## 📊 Impacto

- 357,000 productores agrícolas en Puebla
- $890M MXN perdidos por plagas/año
- Reducción 60% pérdidas con detección temprana
- Ahorro 30% agua con riego por demanda

## 📄 Licencia

MIT

## 🤝 Contribuir

Pull requests bienvenidos. Para cambios mayores, abrir issue primero.

---

Hecho con ❤️ en Puebla, México 🇲🇽
EOF
```

### Paso 5: Agregar archivos al staging

```bash
# Ver qué archivos se agregarán
git status

# Agregar todos los archivos
git add .

# Ver qué se agregó
git status
```

### Paso 6: Primer commit

```bash
git commit -m "🌾 Initial commit: Tlapiani - Plataforma de Resiliencia Climática Agrícola

- Frontend React + TypeScript con dashboard de productor y admin
- Backend Node.js con scripts NASA POWER, NDVI, plagas
- Integración Twilio para alertas WhatsApp/SMS en ES/NAH
- Mapbox para zonas de restauración forestal
- Sistema multilingüe (ES/NAH/TOT/MIX)
- Base de datos Supabase con 8 tablas
"
```

### Paso 7: Conectar con GitHub

```bash
# Agregar remote (tu repositorio)
git remote add origin https://github.com/ricardoa117/Tlapiani.git

# Verificar que se agregó
git remote -v
```

### Paso 8: Subir código

```bash
# Renombrar rama a main (si está como master)
git branch -M main

# Subir código
git push -u origin main
```

Si pide autenticación:
- **Usuario:** ricardoa117
- **Contraseña:** Usar Personal Access Token (no tu contraseña de GitHub)

---

## OPCIÓN 2: Actualizar repositorio existente

Si ya tienes código en GitHub y quieres actualizarlo:

```bash
# 1. Clonar repositorio existente
git clone https://github.com/ricardoa117/Tlapiani.git
cd Tlapiani

# 2. Copiar tus archivos nuevos sobre el proyecto clonado
# (AdminDashboard.tsx, scripts actualizados, etc.)

# 3. Ver cambios
git status

# 4. Agregar cambios
git add .

# 5. Commit
git commit -m "✨ Agregar panel de administración completo

- AdminDashboard con gestión de productores
- Mapa de zonas de restauración con Mapbox
- Modal de asignación de productores a zonas
- Scripts actualizados: 03_nasa_power.js con recomendaciones
- Script nuevo: 10_enviar_alertas.js para Twilio
- SQL seeds para zonas de restauración
- CSS responsivo para móvil
"

# 6. Subir
git push origin main
