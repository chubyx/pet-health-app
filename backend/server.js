const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const authRoutes = require("./routes/auth");
const petsRoutes = require("./routes/pets");
const medicalRecordsRoutes = require("./routes/medicalRecords");
const vaccinesRoutes = require("./routes/vaccines");
const remindersRoutes = require("./routes/reminders");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/pets", petsRoutes);
app.use("/api/pets/:petId/medical-records", medicalRecordsRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads"))); // Servir archivos estáticos desde 'uploads/'
app.use("/api/pets/:petId/vaccines", vaccinesRoutes);
app.use("/api/reminders", remindersRoutes);

// Manejador de errores genérico
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
