const express = require("express");
const db = require("../db/database");
const { authRequired } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });
const activityTypes = new Set(["walk", "play", "training", "other"]);
router.use(authRequired);

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getOwnedPetId(req, res) {
  const petId = Number(req.params.petId);
  if (!Number.isInteger(petId) || petId <= 0) {
    res.status(400).json({ error: "El identificador de mascota no es válido." });
    return null;
  }

  const pet = db
    .prepare("SELECT id FROM pets WHERE id = ? AND owner_id = ?")
    .get(petId, req.owner.id);
  if (!pet) {
    res.status(404).json({ error: "Mascota no encontrada." });
    return null;
  }
  return pet.id;
}

router.get("/", (req, res) => {
  const petId = getOwnedPetId(req, res);
  if (!petId) return;

  const date = req.query.date;
  if (!isValidDate(date)) {
    return res.status(400).json({ error: "La fecha debe tener el formato YYYY-MM-DD." });
  }

  const goal = db
    .prepare("SELECT daily_goal_minutes FROM activity_goals WHERE pet_id = ?")
    .get(petId);
  const entries = db
    .prepare(
      `SELECT id, activity_date, activity_type, duration_minutes, source, notes, created_at
       FROM activity_logs
       WHERE pet_id = ? AND activity_date = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(petId, date);

  res.json({
    date,
    daily_goal_minutes: goal?.daily_goal_minutes ?? null,
    total_minutes: entries.reduce((total, entry) => total + entry.duration_minutes, 0),
    entries,
  });
});

router.put("/goal", (req, res) => {
  const petId = getOwnedPetId(req, res);
  if (!petId) return;

  const goalMinutes = req.body?.daily_goal_minutes;
  if (!Number.isInteger(goalMinutes) || goalMinutes < 1 || goalMinutes > 1440) {
    return res.status(400).json({ error: "La meta diaria debe ser un número entero entre 1 y 1440 minutos." });
  }

  db.prepare(
    `INSERT INTO activity_goals (pet_id, daily_goal_minutes)
     VALUES (?, ?)
     ON CONFLICT(pet_id) DO UPDATE SET
       daily_goal_minutes = excluded.daily_goal_minutes,
       updated_at = datetime('now')`
  ).run(petId, goalMinutes);

  res.json({ daily_goal_minutes: goalMinutes });
});

router.post("/", (req, res) => {
  const petId = getOwnedPetId(req, res);
  if (!petId) return;

  const { activity_date: date, activity_type: activityType, duration_minutes: durationMinutes, notes } = req.body || {};
  if (!isValidDate(date)) {
    return res.status(400).json({ error: "La fecha debe tener el formato YYYY-MM-DD." });
  }
  if (!activityTypes.has(activityType)) {
    return res.status(400).json({ error: "El tipo de actividad no es válido." });
  }
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 1440) {
    return res.status(400).json({ error: "La duración debe ser un número entero entre 1 y 1440 minutos." });
  }
  if (notes != null && (typeof notes !== "string" || notes.length > 240)) {
    return res.status(400).json({ error: "Las notas deben tener como máximo 240 caracteres." });
  }

  const result = db
    .prepare(
      `INSERT INTO activity_logs
        (pet_id, activity_date, activity_type, duration_minutes, source, notes)
       VALUES (?, ?, ?, ?, 'manual', ?)`
    )
    .run(petId, date, activityType, durationMinutes, notes?.trim() || null);
  const entry = db
    .prepare(
      `SELECT id, activity_date, activity_type, duration_minutes, source, notes, created_at
       FROM activity_logs WHERE id = ?`
    )
    .get(result.lastInsertRowid);

  res.status(201).json(entry);
});

module.exports = router;
