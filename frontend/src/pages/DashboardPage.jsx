import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext.jsx";
import "../styles/Dashboard.css";
const emptyForm = {
  name: "", species: "perro", breed: "", size: "mediano",
  birth_date: "", weight_kg: "", activity_level: "moderada",
};

function getLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const { owner } = useAuth();
  const [pets, setPets] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [activityByPet, setActivityByPet] = useState({});
  const [activityLoadError, setActivityLoadError] = useState(false);
  const [activityReminderPets, setActivityReminderPets] = useState([]);
  const [showActivityReminder, setShowActivityReminder] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    try {
      const [petsData, remindersData] = await Promise.all([
        api.getPets(),
        api.getUpcomingReminders(30),
      ]);
      const petList = petsData || [];
      setPets(petList);
      setReminders(remindersData || []);
      const today = getLocalDate();
      const activityEntries = await Promise.all(
        petList.map(async (pet) => {
          try {
            return [pet.id, await api.getPetActivity(pet.id, today)];
          } catch (error) {
            console.error(`Error cargando actividad de ${pet.name}:`, error);
            return [pet.id, null];
          }
        })
      );
      const activityMap = Object.fromEntries(activityEntries);
      setActivityByPet(activityMap);
      setActivityLoadError(activityEntries.some(([, activity]) => !activity));

      const incompletePets = petList.filter((pet) => {
        const activity = activityMap[pet.id];
        return activity && (!activity.daily_goal_minutes || activity.total_minutes < activity.daily_goal_minutes);
      });
      setActivityReminderPets(incompletePets);
      if (incompletePets.length > 0) {
        const reminderKey = `exercise-reminder-${owner?.id || "owner"}-${today}`;
        try {
          setShowActivityReminder(localStorage.getItem(reminderKey) !== "dismissed");
        } catch (error) {
          console.error("No se pudo leer el estado del recordatorio:", error);
          setShowActivityReminder(true);
        }
      } else {
        setShowActivityReminder(false);
      }
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview("");
      return undefined;
    }
    const previewUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [avatarFile]);

  function dismissActivityReminder() {
    const reminderKey = `exercise-reminder-${owner?.id || "owner"}-${getLocalDate()}`;
    try {
      localStorage.setItem(reminderKey, "dismissed");
    } catch (error) {
      console.error("No se pudo guardar el estado del recordatorio:", error);
    }
    setShowActivityReminder(false);
  }

  useEffect(() => {
    if (!showActivityReminder) return undefined;
    function handleReminderKeyDown(event) {
      if (event.key === "Escape") dismissActivityReminder();
    }
    window.addEventListener("keydown", handleReminderKeyDown);
    return () => window.removeEventListener("keydown", handleReminderKeyDown);
  }, [showActivityReminder, owner?.id]);

async function handleCreate(e) {
    e.preventDefault();
    try {
      const payload = { ...form, weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null };
      const createdPet = await api.createPet(payload);
      let avatarError = null;
      if (avatarFile) {
        try {
          await api.uploadPetAvatar(createdPet.id, avatarFile);
        } catch (error) {
          console.error("La mascota se creó, pero no se pudo subir su foto:", error);
          avatarError = error;
        }
      }

      setForm(emptyForm);
      setAvatarFile(null);
      setShowForm(false);
      await loadData();
      alert(avatarError
        ? `La mascota se registró, pero no se pudo subir la foto: ${avatarError.message}`
        : "Mascota registrada exitosamente");

    } catch (error) {
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

      {showActivityReminder && activityReminderPets.length > 0 && (
        <div className="activity-reminder-backdrop">
          <section className="activity-reminder-dialog" role="dialog" aria-modal="true" aria-labelledby="activity-reminder-title">
            <button type="button" className="activity-reminder-close" onClick={dismissActivityReminder} aria-label="Cerrar recordatorio">×</button>
            <span className="activity-reminder-icon" aria-hidden="true">🐾</span>
            <p className="activity-reminder-eyebrow">UN MOMENTO PARA MOVERSE</p>
            <h2 id="activity-reminder-title">¿Ya hicieron actividad hoy?</h2>
            <p className="activity-reminder-copy">Un paseo, un rato de juego o una actividad tranquila pueden formar parte de su rutina. Registra el movimiento de hoy.</p>
            <div className="activity-reminder-pets">
              {activityReminderPets.map((pet) => (
                <Link
                  key={pet.id}
                  to={`/pets/${pet.id}?tab=actividad`}
                  className="activity-reminder-pet-link"
                  onClick={dismissActivityReminder}
                >
                  {pet.species?.toLowerCase() === "gato" ? "🐈" : pet.species?.toLowerCase() === "perro" ? "🐕" : "🐾"}
                  <span>{pet.name}</span>
                  <strong>{activityByPet[pet.id]?.daily_goal_minutes ? "Registrar actividad" : "Definir meta"}</strong>
                </Link>
              ))}
            </div>
            <button type="button" className="activity-reminder-later" onClick={dismissActivityReminder}>Recordármelo mañana</button>
          </section>
        </div>
      )}
      
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

      {pets.length > 0 && (
        <section className="daily-activity-panel">
          <div className="daily-activity-heading">
            <div>
              <h2>Actividad de hoy</h2>
              <p>Un seguimiento diario para cada integrante de la familia.</p>
            </div>
            <span aria-hidden="true">🏃</span>
          </div>
          {activityLoadError && (
            <p className="daily-activity-error" role="status">
              No se pudo cargar la actividad de una o más mascotas. Puedes volver a intentarlo recargando el panel.
            </p>
          )}
          <div className="daily-activity-grid">
            {pets.map((pet) => {
              const activity = activityByPet[pet.id];
              const total = activity?.total_minutes || 0;
              const goal = activity?.daily_goal_minutes;
              const progress = goal ? Math.min(100, (total / goal) * 100) : 0;
              return (
                <Link to={`/pets/${pet.id}?tab=actividad`} className="daily-activity-card" key={pet.id}>
                  <div className="daily-activity-pet">
                    <span aria-hidden="true">{pet.species?.toLowerCase() === "gato" ? "🐈" : pet.species?.toLowerCase() === "perro" ? "🐕" : "🐾"}</span>
                    <strong>{pet.name}</strong>
                  </div>
                  <div className="daily-activity-progress">
                    <span>{!activity ? "Actividad no disponible" : goal ? `${total} / ${goal} min` : `${total} min · configura una meta`}</span>
                    {goal && <div className="daily-activity-track"><span style={{ width: `${progress}%` }} /></div>}
                  </div>
                  <span className="daily-activity-link">{goal && total >= goal ? "Meta alcanzada ✓" : "Ver actividad →"}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* FORMULARIO DESPLEGABLE */}
      {showForm && (
        <form className="card form-modern fade-in" onSubmit={handleCreate}>
          <h3 className="form-title">Registrar Nuevo Integrante</h3>
          <div className="form-grid-3">
            <div className="input-group pet-photo-input">
              <label htmlFor="new-pet-photo">Foto de tu mascota (opcional)</label>
              <input
                id="new-pet-photo"
                className="input-modern"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  const selectedFile = event.target.files?.[0] || null;
                  if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
                    alert("La imagen debe pesar 5 MB o menos.");
                    event.target.value = "";
                    setAvatarFile(null);
                    return;
                  }
                  setAvatarFile(selectedFile);
                }}
              />
              {avatarPreview && (
                <img className="pet-photo-preview" src={avatarPreview} alt="Vista previa de la foto de la mascota" />
              )}
              <small>JPG, PNG, WebP o GIF · máximo 5 MB</small>
            </div>
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
                {pet.avatar_url ? (
                  <img src={pet.avatar_url} alt={`Foto de ${pet.name}`} />
                ) : (
                  pet.species?.toLowerCase() === "gato" ? "🐈" : pet.species?.toLowerCase() === "perro" ? "🐕" : "🐾"
                )}
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