const express = require("express");
const db = require("../db/database");
const { authRequired } = require("../middleware/auth");
const { getRecommendation } = require("../utils/recommendationEngine");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();
router.use(authRequired);

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    if (!allowedImageTypes.has(file.mimetype)) {
      return callback(new Error("Solo se permiten imágenes JPG, PNG, WebP o GIF."));
    }
    callback(null, true);
  },
});

function ensureOwnership(petId, ownerId) {
  const pet = db.prepare("SELECT * FROM pets WHERE id = ?").get(petId);
  if (!pet) return { error: 404 };
  if (pet.owner_id !== ownerId) return { error: 403 };
  return { pet };
}

function getImageExtension(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return ".jpg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return ".png";
  if (buffer.length >= 6 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))) return ".gif";
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) return ".webp";
  return null;
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

// POST /api/pets/:id/avatar - subir foto del perfil de mascota
router.post("/:id/avatar", (req, res) => {
  const { pet, error } = ensureOwnership(req.params.id, req.owner.id);
  if (error) return res.status(error).json({ error: "No encontrado o sin permiso." });

  avatarUpload.single("avatar")(req, res, (uploadError) => {
    if (uploadError) {
      return res.status(400).json({ error: uploadError.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Selecciona una imagen para la mascota." });
    }

    const extension = getImageExtension(req.file.buffer);
    if (!extension) {
      return res.status(400).json({ error: "El archivo no contiene una imagen válida." });
    }

    const previousAvatarFilename = pet.avatar_url ? path.basename(pet.avatar_url) : "";
    const filename = `avatar-${pet.id}-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`;
    const uploadDirectory = path.join(__dirname, "..", "uploads");
    const destination = path.join(uploadDirectory, filename);
    const avatarUrl = `/uploads/${filename}`;

    try {
      fs.mkdirSync(uploadDirectory, { recursive: true });
      fs.writeFileSync(destination, req.file.buffer, { flag: "wx" });
      db.prepare("UPDATE pets SET avatar_url = ? WHERE id = ?").run(avatarUrl, pet.id);
      const updatedPet = db.prepare("SELECT * FROM pets WHERE id = ?").get(pet.id);
      if (previousAvatarFilename.startsWith(`avatar-${pet.id}-`)) {
        try {
          fs.unlinkSync(path.join(uploadDirectory, previousAvatarFilename));
        } catch (cleanupError) {
          if (cleanupError.code !== "ENOENT") {
            console.error("Error eliminando la foto anterior de la mascota:", cleanupError);
          }
        }
      }
      return res.json(updatedPet);
    } catch (writeError) {
      console.error("Error guardando la foto de la mascota:", writeError);
      try {
        if (fs.existsSync(destination)) fs.unlinkSync(destination);
      } catch (cleanupError) {
        console.error("Error limpiando una foto de mascota incompleta:", cleanupError);
      }
      return res.status(500).json({ error: "No se pudo guardar la foto de la mascota." });
    }
  });
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
