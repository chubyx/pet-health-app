import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

const emptyForm = {
  name: "", species: "perro", breed: "", size: "mediano",
  birth_date: "", weight_kg: "", activity_level: "moderada",
};

export default function DashboardPage() {
  const [pets, setPets] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [petsData, remindersData] = await Promise.all([
      api.getPets(),
      api.getUpcomingReminders(30),
    ]);
    setPets(petsData);
    setReminders(remindersData);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    await api.createPet({ ...form, weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null });
    setForm(emptyForm);
    setShowForm(false);
    loadData();
  }

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      {reminders.length > 0 && (
        <section className="reminders-banner">
          <strong>🔔 Vacunas próximas (30 días):</strong>
          <ul>
            {reminders.map((r) => (
              <li key={r.id}>
                {r.pet_name}: {r.vaccine_name} — vence {r.next_due_date}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="section-header">
        <h1>Mis mascotas</h1>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancelar" : "+ Agregar mascota"}
        </button>
      </div>

      {showForm && (
        <form className="card form-grid" onSubmit={handleCreate}>
          <div>
            <label>Nombre</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label>Especie</label>
            <select value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })}>
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div>
            <label>Raza</label>
            <input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          </div>
          <div>
            <label>Tamaño</label>
            <select value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>
              <option value="pequeno">Pequeño</option>
              <option value="mediano">Mediano</option>
              <option value="grande">Grande</option>
            </select>
          </div>
          <div>
            <label>Fecha de nacimiento</label>
            <input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
          </div>
          <div>
            <label>Peso (kg)</label>
            <input type="number" step="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
          </div>
          <div>
            <label>Nivel de actividad</label>
            <select value={form.activity_level} onChange={(e) => setForm({ ...form, activity_level: e.target.value })}>
              <option value="baja">Baja</option>
              <option value="moderada">Moderada</option>
              <option value="alta">Alta</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Guardar mascota</button>
        </form>
      )}

      <div className="pet-grid">
        {pets.length === 0 && <p>Aún no has agregado mascotas.</p>}
        {pets.map((pet) => (
          <Link to={`/pets/${pet.id}`} key={pet.id} className="pet-card">
            <div className="pet-avatar">{pet.species === "perro" ? "🐕" : pet.species === "gato" ? "🐈" : "🐾"}</div>
            <h3>{pet.name}</h3>
            <p>{pet.breed || pet.species} · {pet.size}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
