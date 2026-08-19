const express = require("express");
const db = require("../db/database");
const { authRequired } = require("../middleware/auth");

const router = express.Router({ mergeParams: true });
router.use(authRequired);

function petBelongsToOwner(petId, ownerId) {
  const pet = db.prepare("SELECT * FROM pets WHERE id = ?").get(petId);
  return pet && pet.owner_id === ownerId ? pet : null;
}

// GET /api/pets/:petId/medical-records
router.get("/", (req, res) => {
  if (!petBelongsToOwner(req.params.petId, req.owner.id)) {
    return res.status(403).json({ error: "Sin permiso sobre esta mascota." });
  }
  const records = db
    .prepare("SELECT * FROM medical_records WHERE pet_id = ? ORDER BY record_date DESC")
    .all(req.params.petId);
  res.json(records);
});

// POST /api/pets/:petId/medical-records
router.post("/", (req, res) => {
  if (!petBelongsToOwner(req.params.petId, req.owner.id)) {
    return res.status(403).json({ error: "Sin permiso sobre esta mascota." });
  }
  const { record_date, record_type, description, vet_name, clinic_name } = req.body;
  if (!record_date || !record_type || !description) {
    return res.status(400).json({ error: "record_date, record_type y description son requeridos." });
  }
  const info = db
    .prepare(
      `INSERT INTO medical_records (pet_id, record_date, record_type, description, vet_name, clinic_name)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(req.params.petId, record_date, record_type, description, vet_name || null, clinic_name || null);

  const record = db.prepare("SELECT * FROM medical_records WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(record);
});

// DELETE /api/pets/:petId/medical-records/:recordId
router.delete("/:recordId", (req, res) => {
  if (!petBelongsToOwner(req.params.petId, req.owner.id)) {
    return res.status(403).json({ error: "Sin permiso sobre esta mascota." });
  }
  db.prepare("DELETE FROM medical_records WHERE id = ? AND pet_id = ?").run(
    req.params.recordId, req.params.petId
  );
  res.status(204).send();
});

module.exports = router;
