# 🐾 Pet Health — Ecosistema Digital de Salud y Nutrición para Mascotas

Código base (MVP) del proyecto: historial médico centralizado, recordatorios de
vacunas y un motor de recomendación de dietas/suplementos según raza, edad y
nivel de actividad.

> Proyecto académico — Creatividad en la Innovación y Emprendimiento
> Integrantes: Carlos Duque · Sebastián Campos · Dafne Poblete

## Stack

| Capa       | Tecnología                              |
|------------|------------------------------------------|
| Frontend   | React 18 + Vite + React Router           |
| Backend    | Node.js + Express                        |
| Base datos | SQLite (módulo nativo `node:sqlite`, sin dependencias que compilar) — fácil de migrar a Postgres/MySQL |
| Auth       | JWT + bcrypt                              |

> **Requisito:** Node.js 22 o superior (usa el módulo experimental `node:sqlite`
> incluido en Node, así que no necesitas instalar Visual Studio Build Tools ni
> nada de compilación nativa). Verifica tu versión con `node --version`.

## Estructura

```
pet-health-app/
├── backend/
│   ├── server.js                  # punto de entrada Express
│   ├── db/database.js             # conexión + esquema SQL
│   ├── middleware/auth.js         # verificación de JWT
│   ├── routes/
│   │   ├── auth.js                # registro / login
│   │   ├── pets.js                # CRUD mascotas + recomendaciones
│   │   ├── medicalRecords.js      # historial médico
│   │   ├── vaccines.js            # vacunas
│   │   └── reminders.js           # recordatorios próximos
│   └── utils/recommendationEngine.js  # lógica de nutrición/suplementos
└── frontend/
    └── src/
        ├── api.js                 # cliente HTTP centralizado
        ├── AuthContext.jsx        # sesión global
        ├── App.jsx                # rutas
        └── pages/                 # Login, Registro, Dashboard, Perfil de mascota
```

## Cómo correrlo

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # opcional, ajusta JWT_SECRET
npm run dev                # http://localhost:4000
```

La base de datos SQLite (`db/pethealth.sqlite`) se crea automáticamente al
iniciar el servidor por primera vez.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

El frontend usa un proxy (`vite.config.js`) que redirige `/api` hacia
`http://localhost:4000`, así que basta con correr ambos servidores en
paralelo.

## Endpoints principales

| Método | Ruta                                  | Descripción                          |
|--------|----------------------------------------|---------------------------------------|
| POST   | `/api/auth/register`                   | Crear cuenta de dueño                 |
| POST   | `/api/auth/login`                      | Iniciar sesión (retorna JWT)          |
| GET    | `/api/pets`                            | Listar mascotas del dueño autenticado |
| POST   | `/api/pets`                            | Crear mascota                         |
| GET    | `/api/pets/:id/recommendations`        | Recomendación de dieta y suplementos  |
| GET    | `/api/pets/:id/medical-records`        | Historial médico                      |
| POST   | `/api/pets/:id/medical-records`        | Agregar registro médico               |
| GET    | `/api/pets/:id/vaccines`               | Vacunas registradas                   |
| POST   | `/api/pets/:id/vaccines`               | Registrar vacuna                      |
| GET    | `/api/reminders/upcoming?days=30`      | Vacunas próximas a vencer             |

Todas las rutas de `/api/pets/*` y `/api/reminders/*` requieren el header
`Authorization: Bearer <token>`.

## Motor de recomendación (MVP)

`backend/utils/recommendationEngine.js` calcula:

1. **Etapa de vida** (cachorro/adulto/senior) según especie, edad y tamaño.
2. **Requerimiento calórico diario (MER)** usando la fórmula veterinaria
   estándar `RER = 70 × peso_kg^0.75`, ajustada por un factor de actividad.
3. **Tipo de dieta sugerida** y **suplementos** según reglas simples
   (edad, esterilización, nivel de actividad, especie).

Es un punto de partida deliberadamente simple: la idea es reemplazar estas
reglas por un modelo más sofisticado (tablas veterinarias oficiales, ML
entrenado con datos reales, etc.) a medida que el proyecto avance.

## Próximos pasos sugeridos

- [ ] Migrar SQLite → PostgreSQL para producción.
- [ ] Endpoint de telemedicina (videollamada / chat con veterinario).
- [ ] Integración con marketplace (catálogo de productos + checkout + comisión).
- [ ] Notificaciones push/email para recordatorios de vacunas.
- [ ] Subida de imágenes de mascotas (S3 o similar) en vez de `avatar_url` manual.
- [ ] Tests automatizados (Jest/Supertest en backend, Vitest en frontend).
- [ ] Versión Flutter del frontend si se prioriza mobile-first.
