const express = require("express");
const db = require("../db/database");
const { authRequired } = require("../middleware/auth");

const router = express.Router();
router.use(authRequired);

// GET /api/reminders/upcoming?days=30
// Vacunas próximas a vencer para todas las mascotas del dueño autenticado
router.get("/upcoming", (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;

  const rows = db
    .prepare(
      `SELECT v.id, v.vaccine_name, v.next_due_date, p.id as pet_id, p.name as pet_name
       FROM vaccines v
       JOIN pets p ON p.id = v.pet_id
       WHERE p.owner_id = ?
         AND v.next_due_date IS NOT NULL
         AND date(v.next_due_date) <= date('now', ?)
       ORDER BY date(v.next_due_date) ASC`
    )
    .all(req.owner.id, `+${days} days`);

  res.json(rows);
});

module.exports = router;
