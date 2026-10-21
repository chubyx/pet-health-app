import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import "../styles/Dashboard.css";
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
    try {
      const [petsData, remindersData] = await Promise.all([
        api.getPets(),
        api.getUpcomingReminders(30),
      ]);
      setPets(petsData || []);
      setReminders(remindersData || []);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

async function handleCreate(e) {
    e.preventDefault();
    try {
      // 1. Añadimos un pequeño log para confirmar qué datos estamos enviando
      const payload = { ...form, weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null };
      console.log("Enviando mascota:", payload);

      // 2. Ejecutamos la petición
      await api.createPet(payload);
      
      // 3. Si todo sale bien, limpiamos y cerramos
      setForm(emptyForm);
      setShowForm(false);
      loadData();
      alert("Mascota registrada exitosamente");

    } catch (error) {
      // 4. Si algo falla, lo mostramos en consola y en un alert
      console.error("Error al guardar la mascota:", error);
      alert("Hubo un error al guardar. Revisa la consola para más detalles.");
    }
  }

  if (loading) return (
    <div className="loading-state">
      <span className="spinner-loader dark"></span>
      <p>Cargando tu espacio...</p>
    </div>
  );

  return (
    <div className="dashboard-container fade-in">
      
      {/* PANEL DE RECORDATORIOS */}
      {reminders.length > 0 && (
        <div className="reminders-panel">
          <div className="reminders-header-box">
            <div className="reminders-icon-wrapper">
              <span>🔔</span>
            </div>
            <div>
              <h3>Próximos Vencimientos</h3>
              <p>En los siguientes 30 días</p>
            </div>
          </div>
          <div className="reminders-grid">
            {reminders.map((r) => (
              <div key={r.id} className="reminder-item">
                <span className="reminder-pet-name">{r.pet_name}</span>
                <span className="reminder-details">{r.vaccine_name}</span>
                <span className="reminder-date">Vence: {r.next_due_date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Mis Mascotas</h1>
          <p className="dashboard-subtitle">Gestiona el perfil de tus compañeros</p>
        </div>
        <button 
          className={`btn-primary ${showForm ? 'btn-cancel' : ''}`} 
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? "✕ Cancelar" : "+ Añadir Mascota"}
        </button>
      </div>

      {/* FORMULARIO DESPLEGABLE */}
      {showForm && (
        <form className="card form-modern fade-in" onSubmit={handleCreate}>
          <h3 className="form-title">Registrar Nuevo Integrante</h3>
          <div className="form-grid-3">
            <div className="input-group">
              <label>Nombre</label>
              <input className="input-modern" placeholder="Ej. Firulais" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>Especie</label>
              <select className="input-modern" value={form.species} onChange={(e) => setForm({ ...form, species: e.target.value })}>
                <option value="perro">Perro</option>
                <option value="gato">Gato</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="input-group">
              <label>Raza</label>
              <input className="input-modern" placeholder="Ej. Golden Retriever" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Tamaño</label>
              <select className="input-modern" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>
                <option value="pequeno">Pequeño</option>
                <option value="mediano">Mediano</option>
                <option value="grande">Grande</option>
              </select>
            </div>
            <div className="input-group">
              <label>Nivel de Actividad</label>
              <select className="input-modern" value={form.activity_level} onChange={(e) => setForm({ ...form, activity_level: e.target.value })}>
                <option value="baja">Baja</option>
                <option value="moderada">Moderada</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div className="input-group">
              <label>Fecha de Nacimiento</label>
              <input className="input-modern" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Peso (kg)</label>
              <input className="input-modern" type="number" step="0.1" placeholder="Ej. 12.5" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-primary">Guardar Perfil</button>
          </div>
        </form>
      )}

      {/* GRID DE MASCOTAS */}
      <div className="pet-grid-modern">
        {pets.length === 0 && !showForm && (
          <div className="empty-state span-full">
            <span style={{fontSize: '40px', display: 'block', marginBottom: '16px'}}>🏠</span>
            <p>Aún no has agregado mascotas a tu familia.</p>
            <button className="btn-primary" style={{marginTop: '16px'}} onClick={() => setShowForm(true)}>
              Agregar mi primera mascota
            </button>
          </div>
        )}
        
        {pets.map((pet) => (
          <Link to={`/pets/${pet.id}`} key={pet.id} className="pet-card-modern">
            <div className="pet-card-header">
              <div className="pet-card-avatar">
                {pet.species?.toLowerCase() === "gato" ? "🐈" : pet.species?.toLowerCase() === "perro" ? "🐕" : "🐾"}
              </div>
            </div>
            <div className="pet-card-body">
              <h3>{pet.name}</h3>
              <p className="pet-card-breed">{pet.breed || (pet.species.charAt(0).toUpperCase() + pet.species.slice(1))}</p>
            </div>
            <div className="pet-card-footer">
              <span className="badge tag-green">{pet.size}</span>
              <span className="arrow-icon">➔</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}