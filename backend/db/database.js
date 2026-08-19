const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const DB_PATH = path.join(__dirname, "pethealth.sqlite");
const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// ---------- Esquema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS owners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('perro','gato','otro')),
  breed TEXT,
  size TEXT CHECK (size IN ('pequeno','mediano','grande')) DEFAULT 'mediano',
  birth_date TEXT,             -- YYYY-MM-DD
  weight_kg REAL,
  activity_level TEXT CHECK (activity_level IN ('baja','moderada','alta')) DEFAULT 'moderada',
  sterilized INTEGER DEFAULT 0, -- 0/1
  avatar_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS medical_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  record_date TEXT NOT NULL,   -- YYYY-MM-DD
  record_type TEXT NOT NULL CHECK (record_type IN ('consulta','cirugia','examen','tratamiento','otro')),
  description TEXT NOT NULL,
  vet_name TEXT,
  clinic_name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vaccines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  date_administered TEXT NOT NULL, -- YYYY-MM-DD
  next_due_date TEXT,              -- YYYY-MM-DD
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pets_owner ON pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_medical_pet ON medical_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_vaccines_pet ON vaccines(pet_id);
`);

module.exports = db;
