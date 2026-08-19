const express = require("express");
const db = require("../db/database");
const { authRequired } = require("../middleware/auth");
const { getRecommendation } = require("../utils/recommendationEngine");

const router = express.Router();
router.use(authRequired);

function ensureOwnership(petId, ownerId) {
  const pet = db.prepare("SELECT * FROM pets WHERE id = ?").get(petId);
  if (!pet) return { error: 404 };
  if (pet.owner_id !== ownerId) return { error: 403 };
  return { pet };
}

// GET /api/pets - listar mascotas del dueño autenticado
router.get("/", (req, res) => {
  const pets = db
    .prepare("SELECT * FROM pets WHERE owner_id = ? ORDER BY created_at DESC")
    .all(req.owner.id);
  res.json(pets);
});

// POST /api/pets - crear mascota
router.post("/", (req, res) => {
  const {
    name, species, breed, size, birth_date,
    weight_kg, activity_level, sterilized, avatar_url,
  } = req.body;

  if (!name || !species) {
    return res.status(400).json({ error: "name y species son requeridos." });
  }

  const info = db
    .prepare(
      `INSERT INTO pets
        (owner_id, name, species, breed, size, birth_date, weight_kg, activity_level, sterilized, avatar_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      req.owner.id, name, species, breed || null, size || "mediano",
      birth_date || null, weight_kg || null, activity_level || "moderada",
      sterilized ? 1 : 0, avatar_url || null
    );

  const pet = db.prepare("SELECT * FROM pets WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(pet);
});

// GET /api/pets/:id
router.get("/:id", (req, res) => {
  const { pet, error } = ensureOwnership(req.params.id, req.owner.id);
  if (error) return res.status(error).json({ error: "No encontrado o sin permiso." });
  res.json(pet);
});

// PUT /api/pets/:id
router.put("/:id", (req, res) => {
  const { pet, error } = ensureOwnership(req.params.id, req.owner.id);
  if (error) return res.status(error).json({ error: "No encontrado o sin permiso." });

  const fields = ["name", "species", "breed", "size", "birth_date", "weight_kg", "activity_level", "sterilized", "avatar_url"];
  const updates = { ...pet, ...req.body };

  db.prepare(
    `UPDATE pets SET name=?, species=?, breed=?, size=?, birth_date=?, weight_kg=?, activity_level=?, sterilized=?, avatar_url=?
     WHERE id=?`
  ).run(
    updates.name, updates.species, updates.breed, updates.size, updates.birth_date,
    updates.weight_kg, updates.activity_level, updates.sterilized ? 1 : 0,
    updates.avatar_url, req.params.id
  );

  const updated = db.prepare("SELECT * FROM pets WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// DELETE /api/pets/:id
router.delete("/:id", (req, res) => {
  const { error } = ensureOwnership(req.params.id, req.owner.id);
  if (error) return res.status(error).json({ error: "No encontrado o sin permiso." });
  db.prepare("DELETE FROM pets WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

// GET /api/pets/:id/recommendations - nutrición y suplementos personalizados
router.get("/:id/recommendations", (req, res) => {
  const { pet, error } = ensureOwnership(req.params.id, req.owner.id);
  if (error) return res.status(error).json({ error: "No encontrado o sin permiso." });
  res.json(getRecommendation(pet));
});

module.exports = router;
