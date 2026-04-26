# 🌽 Tlapiani – Plataforma de Resiliencia Climática Agrícola

Sistema de alertas tempranas de plagas impulsado por datos satelitales (NASA POWER) y un bot de WhatsApp para líderes ejidales.

## 🧱 Arquitectura

El proyecto sigue una estructura simple de dos carpetas:

- **`frontend/`** – Dashboard web construido con **Vite + React + TypeScript**. Consume directamente la API de Supabase para mostrar los datos.
- **`backend/`** – Scripts de Node.js que procesan clima, NDVI y riesgo de plagas, y escriben en la base de datos Supabase.

Ambas partes comparten la misma base de datos PostgreSQL en **Supabase**. No hay un servidor HTTP intermedio: el frontend lee con la clave anónima y los scripts escriben con la clave de servicio.

## 📁 Estructura de directorios
