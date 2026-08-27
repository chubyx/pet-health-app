const express = require("express");
const db = require("../db/database");
const { authRequired } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });
router.use(authRequired);

function petBelongsToOwner(petId, ownerId) {
  const pet = db.prepare("SELECT * FROM pets WHERE id = ?").get(petId);
  return pet && pet.owner_id === ownerId ? pet : null;
}

// GET /api/pets/:petId/vaccines
router.get("/", (req, res) => {
  if (!petBelongsToOwner(req.params.petId, req.owner.id)) {
    return res.status(403).json({ error: "Sin permiso sobre esta mascota." });
  }
  const vaccines = db
    .prepare("SELECT * FROM vaccines WHERE pet_id = ? ORDER BY date_administered DESC")
    .all(req.params.petId);
  res.json(vaccines);
});

// POST /api/pets/:petId/vaccines
router.post("/", (req, res) => {
  if (!petBelongsToOwner(req.params.petId, req.owner.id)) {
    return res.status(403).json({ error: "Sin permiso sobre esta mascota." });
  }
  const { vaccine_name, date_administered, next_due_date, notes } = req.body;
  if (!vaccine_name || !date_administered) {
    return res.status(400).json({ error: "vaccine_name y date_administered son requeridos." });
  }
  const info = db
    .prepare(
      `INSERT INTO vaccines (pet_id, vaccine_name, date_administered, next_due_date, notes)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(req.params.petId, vaccine_name, date_administered, next_due_date || null, notes || null);

  const vaccine = db.prepare("SELECT * FROM vaccines WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(vaccine);
});

// DELETE /api/pets/:petId/vaccines/:vaccineId
router.delete("/:vaccineId", (req, res) => {
  if (!petBelongsToOwner(req.params.petId, req.owner.id)) {
    return res.status(403).json({ error: "Sin permiso sobre esta mascota." });
  }
  db.prepare("DELETE FROM vaccines WHERE id = ? AND pet_id = ?").run(
    req.params.vaccineId, req.params.petId
  );
  res.status(204).send();
});

module.exports = router;
