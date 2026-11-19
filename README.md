# Jefe de Obra

App web para Jefes de Obra en estudios de arquitectura. Vite + React + TypeScript + Tailwind CSS + Supabase.

## Desarrollo local

```bash
npm install
npm run dev
```

Si `.env.local` tiene valores reales de Supabase, la app se conecta al backend. Si las variables faltan o son placeholders, funciona en modo demo con datos mock.

## Base de datos

Ejecutá `supabase/schema.sql` en el SQL Editor de Supabase.

## Deploy en Vercel

Importá el repositorio en Vercel y cargá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en Project Settings → Environment Variables. El archivo `vercel.json` resuelve el routing de la SPA.
