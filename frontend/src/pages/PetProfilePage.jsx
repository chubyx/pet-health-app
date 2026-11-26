import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import Tesseract from "tesseract.js";
import "../styles/Profile.css";

const activityLabels = {
  walk: "Paseo",
  play: "Juego",
  training: "Entrenamiento",
  other: "Otra actividad",
};

function getLocalDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export default function PetProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pet, setPet] = useState(null);
  const [tab, setTab] = useState(() => searchParams.get("tab") === "actividad" ? "actividad" : "nutricion");
  const [recommendation, setRecommendation] = useState(null);
  const [records, setRecords] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [activityDate, setActivityDate] = useState(getLocalDate);
  const [activity, setActivity] = useState(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState("");
  const [activityForm, setActivityForm] = useState({ activity_type: "walk", duration_minutes: "" });
  const [goalForm, setGoalForm] = useState("");

  // Estados para formularios manuales
  const [recordForm, setRecordForm] = useState({ record_date: "", record_type: "consulta", description: "", vet_name: "" });
  const [vaccineForm, setVaccineForm] = useState({ vaccine_name: "", date_administered: "", next_due_date: "" });

  // NUEVOS: Estados para el escáner de documentos
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [showScanForm, setShowScanForm] = useState(false);
  const [docDescription, setDocDescription] = useState("");

  async function loadAll() {
    try {
      const [petData, rec, recs, vacs] = await Promise.all([
        api.getPet(id),
        api.getRecommendation(id),
        api.getMedicalRecords(id),
        api.getVaccines(id),
      ]);
      setPet(petData);
      setRecommendation(rec);
      setRecords(recs);
      setVaccines(vacs);
    } catch (error) {
      console.error("Error cargando el perfil de la mascota:", error);
    }
  }

  async function loadActivity() {
    setActivityLoading(true);
    try {
      const activityData = await api.getPetActivity(id, activityDate);
      setActivity(activityData);
      setGoalForm(activityData.daily_goal_minutes ? String(activityData.daily_goal_minutes) : "");
      setActivityError("");
    } catch (error) {
      console.error("Error cargando la actividad de la mascota:", error);
      setActivityError("No se pudieron cargar los datos de actividad. Inténtalo nuevamente.");
    } finally {
      setActivityLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [id]);
  useEffect(() => { loadActivity(); }, [id, activityDate]);

  async function handleAddActivity(event) {
    event.preventDefault();
    setActivityError("");
    try {
      await api.addPetActivity(id, {
        ...activityForm,
        activity_date: activityDate,
        duration_minutes: Number(activityForm.duration_minutes),
      });
      setActivityForm({ activity_type: "walk", duration_minutes: "" });
      await loadActivity();
    } catch (error) {
      console.error("Error guardando la actividad:", error);
      setActivityError(error.message || "No se pudo guardar la actividad.");
    }
  }

  async function handleSaveGoal(event) {
    event.preventDefault();
    setActivityError("");
    try {
      await api.setPetActivityGoal(id, Number(goalForm));
      await loadActivity();
    } catch (error) {
      console.error("Error guardando la meta de actividad:", error);
      setActivityError(error.message || "No se pudo guardar la meta diaria.");
    }
  }

  async function handleAvatarChange(event) {
    const imageFile = event.target.files?.[0];
    event.target.value = "";
    if (!imageFile) return;
    if (imageFile.size > 5 * 1024 * 1024) {
      setAvatarError("La imagen debe pesar 5 MB o menos.");
      return;
    }

    setAvatarUploading(true);
    setAvatarError("");
    try {
      const updatedPet = await api.uploadPetAvatar(id, imageFile);
      setPet(updatedPet);
    } catch (error) {
      console.error("Error subiendo la foto de la mascota:", error);
      setAvatarError(error.message || "No se pudo subir la foto.");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleAddRecord(e) {
    e.preventDefault();
    await api.addMedicalRecord(id, recordForm);
    setRecordForm({ record_date: "", record_type: "consulta", description: "", vet_name: "" });
    loadAll();
  }

  async function handleAddVaccine(e) {
    e.preventDefault();
    await api.addVaccine(id, vaccineForm);
    setVaccineForm({ vaccine_name: "", date_administered: "", next_due_date: "" });
    loadAll();
  }

  async function handleDeleteRecord(recordId) {
    if (!window.confirm("¿Estás seguro de eliminar este registro médico?")) return;
    try {
      await api.deleteMedicalRecord(id, recordId);
      loadAll(); // Recarga los datos para actualizar la pantalla
    } catch (err) {
      console.error(err);
      alert("Error al eliminar el registro.");
    }
  }

async function handleScanSubmit(e) {
    e.preventDefault();
    if (!file) return alert("Selecciona o captura una imagen primero.");

    setScanning(true);
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'spa');
      
      // --- FILTRO DE CORTE INTELIGENTE ---
      let cleanText = text;
      const diagIndex = text.indexOf("DIAGNÓSTICO:");
      const obsIndex = text.indexOf("OBSERVACIONES:"); // Cortar antes de la firma/observaciones
      
      if (diagIndex !== -1) {
        // Si encuentra OBSERVACIONES, corta antes de eso; si no, toma una porción prudente
        if (obsIndex !== -1) {
          cleanText = text.substring(diagIndex, obsIndex);
        } else {
          cleanText = text.substring(diagIndex);
        }
      }
      // -----------------------------------

      const formData = new FormData();
      formData.append("document", file);
      formData.append("description", docDescription || "Documento escaneado");
      formData.append("record_type", "otro");
      formData.append("record_date", new Date().toISOString().split("T")[0]);
      formData.append("extractedText", cleanText.trim()); // .trim() limpia espacios sobrantes

      await api.uploadDocument(id, formData);
      alert("¡Documento procesado con éxito!");
      
      setFile(null);
      setDocDescription("");
      setShowScanForm(false);
      loadAll();
    } catch (err) {
      console.error(err);
      alert("Error al procesar el documento.");
    } finally {
      setScanning(false);
    }
  }

  async function handleDeletePet() {
    if (!window.confirm(`¿Estás seguro de eliminar a ${pet.name}? Esta acción no se puede deshacer.`)) return;
    await api.deletePet(id);
    navigate("/");
  }

  if (!pet) return (
    <div className="loading-state">
      <span className="spinner-loader dark"></span>
      <p>Cargando perfil...</p>
    </div>
  );

  return (
    <div className="profile-container">
      {/* HEADER DE LA MASCOTA */}
      <header className="profile-header card">
        <div className="profile-header-content">
          <div className="pet-avatar-profile">
            <div className="pet-avatar-large">
              {pet.avatar_url ? (
                <img src={pet.avatar_url} alt={`Foto de ${pet.name}`} />
              ) : (
                pet.species?.toLowerCase() === 'gato' ? '🐈' : pet.species?.toLowerCase() === 'perro' ? '🐕' : '🐾'
              )}
            </div>
            <label className={`pet-avatar-upload${avatarUploading ? " uploading" : ""}`}>
              {avatarUploading ? "Subiendo..." : pet.avatar_url ? "Cambiar foto" : "Agregar foto"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleAvatarChange}
                disabled={avatarUploading}
                aria-label={`Subir foto de ${pet.name}`}
              />
            </label>
            {avatarError && <span className="pet-avatar-error" role="alert">{avatarError}</span>}
          </div>
          <div className="pet-info-main">
            <h1>{pet.name}</h1>
            <div className="pet-badges">
              <span className="badge tag-blue">{pet.breed || pet.species}</span>
              <span className="badge tag-green">{pet.size}</span>
              <span className="badge tag-purple">Actividad: {pet.activity_level}</span>
            </div>
          </div>
        </div>
        <button className="btn-destructive-ghost" onClick={handleDeletePet}>
          🗑️ Eliminar Perfil
        </button>
      </header>

      {/* NAVEGACIÓN DE PESTAÑAS */}
      <nav className="tabs-modern">
        <button className={`tab-modern ${tab === "nutricion" ? "active" : ""}`} onClick={() => setTab("nutricion")}>
          🥗 Nutrición
        </button>
        <button className={`tab-modern ${tab === "historial" ? "active" : ""}`} onClick={() => setTab("historial")}>
          🩺 Historial Médico
        </button>
        <button className={`tab-modern ${tab === "actividad" ? "active" : ""}`} onClick={() => setTab("actividad")}>
          🐾 Actividad diaria
        </button>
        <button className={`tab-modern ${tab === "vacunas" ? "active" : ""}`} onClick={() => setTab("vacunas")}>
          💉 Vacunas
        </button>
      </nav>

      <div className="tab-content">
        
        {/* PESTAÑA: NUTRICIÓN */}
        {tab === "nutricion" && recommendation && (
          <div className="fade-in">
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon bg-orange">🔥</span>
                <div className="stat-data">
                  <label>Calorías Diarias</label>
                  <p>{recommendation.estimated_daily_calories_kcal ?? "N/D"} <span>kcal</span></p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon bg-blue">⏳</span>
                <div className="stat-data">
                  <label>Etapa de Vida</label>
                  <p>{recommendation.life_stage}</p>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="card-title">Plan Nutricional</h2>
              <div className="diet-box">
                <p>{recommendation.diet_recommendation}</p>
              </div>
              
              <h3 className="card-subtitle">Suplementos Recomendados</h3>
              <div className="supplements-list">
                {recommendation.supplements.map((s, i) => (
                  <span key={i} className="supplement-tag">✨ {s}</span>
                ))}
              </div>
              
              <div className="alert-box alert-info">
                <span className="alert-icon">ℹ️</span>
                <p className="disclaimer">{recommendation.disclaimer}</p>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA: HISTORIAL MÉDICO */}
        {tab === "historial" && (
          <div className="fade-in">
            
            {/* NUEVO: Encabezado con botón de escanear */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 className="form-title" style={{ margin: 0 }}>Registrar nueva visita</h3>
              <button 
                className={`btn-primary ${showScanForm ? 'btn-cancel' : ''}`} 
                onClick={() => setShowScanForm(!showScanForm)}
              >
                {showScanForm ? "✕ Cancelar Escaneo" : "📷 Escanear Documento"}
              </button>
            </div>

            {/* NUEVO: Formulario desplegable de Escaneo */}
            {showScanForm && (
              <form className="card form-modern fade-in" onSubmit={handleScanSubmit} style={{ marginBottom: "2rem", border: "2px dashed #4ade80" }}>
                <h4 style={{ marginTop: 0, marginBottom: "1rem", color: "#16a34a" }}>Subir Documento o Fotografía</h4>
                <div className="form-grid">
                  <div className="input-group span-2">
                    <label>Archivo (Cámara trasera en móviles)</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      capture="environment"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="input-modern"
                      required
                    />
                  </div>
                  <div className="input-group span-2">
                    <label>Descripción (Opcional)</label>
                    <input
                      className="input-modern"
                      placeholder="Ej. Resultados examen de sangre, Receta médica..."
                      value={docDescription}
                      onChange={(e) => setDocDescription(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary" disabled={scanning} style={{ marginTop: "1rem" }}>
                  {scanning ? "Procesando..." : "Subir Documento"}
                </button>
              </form>
            )}

            {/* Formulario Manual Original */}
            {!showScanForm && (
              <form className="card form-modern" onSubmit={handleAddRecord}>
                <div className="form-grid">
                  <div className="input-group">
                    <label>Fecha</label>
                    <input type="date" className="input-modern" value={recordForm.record_date} onChange={(e) => setRecordForm({ ...recordForm, record_date: e.target.value })} required />
                  </div>
                  <div className="input-group">
                    <label>Tipo de visita</label>
                    <select className="input-modern" value={recordForm.record_type} onChange={(e) => setRecordForm({ ...recordForm, record_type: e.target.value })}>
                      <option value="consulta">Consulta General</option>
                      <option value="cirugia">Cirugía</option>
                      <option value="examen">Examen Médico</option>
                      <option value="tratamiento">Tratamiento</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div className="input-group span-2">
                    <label>Descripción detallada</label>
                    <input className="input-modern" placeholder="Ej. Chequeo anual, síntomas..." value={recordForm.description} onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })} required />
                  </div>
                  <div className="input-group span-2">
                    <label>Veterinario tratante (Opcional)</label>
                    <input className="input-modern" placeholder="Nombre del Dr/a." value={recordForm.vet_name} onChange={(e) => setRecordForm({ ...recordForm, vet_name: e.target.value })} />
                  </div>
                </div>
                <button type="submit" className="btn-primary">Guardar Registro</button>
              </form>
            )}

            <h3 className="section-title">Historial de visitas</h3>
            <div className="records-list">
            {records.length === 0 ? (
              <div className="empty-state">No hay registros médicos aún.</div>
            ) : (
              records.map((r) => (
                <div key={r.id} className="record-card">
                  <div className="record-date">
                    <span className="day">{new Date(r.record_date).getDate() + 1}</span>
                    <span className="month">{new Date(r.record_date).toLocaleString('es-ES', { month: 'short' })}</span>
                  </div>
                  <div className="record-details">
                    <h4>{r.record_type.charAt(0).toUpperCase() + r.record_type.slice(1)}</h4>
                    <p><strong>Motivo:</strong> {r.description}</p>
                    {r.vet_name && <span className="vet-name">👨‍⚕️ Dr/a. {r.vet_name}</span>}
                    
                    {/* Texto digitalizado por IA */}
                    {r.extracted_text && (
                      <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '8px', fontSize: '0.85rem', color: '#4b5563' }}>
                        <strong>Texto digitalizado:</strong>
                        <p style={{ whiteSpace: 'pre-wrap', marginTop: '5px' }}>{r.extracted_text}</p>
                      </div>
                    )}

                    {/* Acciones: Ver documento y Eliminar */}
                    <div style={{ marginTop: "10px", display: "flex", gap: "15px", alignItems: "center" }}>
                      {r.document_url && (
                        <a href={`/${r.document_url}`} target="_blank" rel="noreferrer" className="badge tag-blue" style={{ textDecoration: 'none', display: 'inline-block' }}>
                          📎 Ver Documento Adjunto
                        </a>
                      )}
                      
                      <button 
                        onClick={() => handleDeleteRecord(r.id)} 
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', padding: 0 }}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
          </div>
        )}

        {/* PESTAÑA: ACTIVIDAD DIARIA */}
        {tab === "actividad" && (
          <div className="fade-in activity-section">
            <section className="card activity-summary">
              <div className="activity-summary-heading">
                <div>
                  <h2 className="card-title">Movimiento de {pet.name}</h2>
                  <p>Registra paseos, juegos u otras actividades para llevar un seguimiento diario.</p>
                </div>
                <label className="activity-date-field">
                  <span>Fecha</span>
                  <input
                    className="input-modern"
                    type="date"
                    value={activityDate}
                    onChange={(event) => setActivityDate(event.target.value)}
                  />
                </label>
              </div>

              {activityError && <p className="activity-error" role="alert">{activityError}</p>}
              {activityLoading ? (
                <p className="activity-muted">Cargando actividad...</p>
              ) : (
                <>
                  <div className="activity-progress-copy">
                    <strong>{activity?.total_minutes || 0} min</strong>
                    <span>
                      {activity?.daily_goal_minutes
                        ? `de ${activity.daily_goal_minutes} min de meta diaria`
                        : "registrados hoy"}
                    </span>
                  </div>
                  {activity?.daily_goal_minutes && (
                    <div
                      className="activity-progress-track"
                      role="progressbar"
                      aria-label="Progreso de actividad diaria"
                      aria-valuemin="0"
                      aria-valuemax={activity.daily_goal_minutes}
                      aria-valuenow={Math.min(activity.total_minutes, activity.daily_goal_minutes)}
                    >
                      <span style={{ width: `${Math.min(100, (activity.total_minutes / activity.daily_goal_minutes) * 100)}%` }} />
                    </div>
                  )}
                  {activity?.daily_goal_minutes && activity.total_minutes >= activity.daily_goal_minutes && (
                    <p className="activity-goal-reached">¡Meta diaria alcanzada! 🐾</p>
                  )}
                </>
              )}
            </section>

            <div className="activity-forms-grid">
              <form className="card form-modern" onSubmit={handleAddActivity}>
                <h3 className="form-title">Registrar actividad</h3>
                <div className="input-group">
                  <label htmlFor="activity-type">Tipo de actividad</label>
                  <select
                    id="activity-type"
                    className="input-modern"
                    value={activityForm.activity_type}
                    onChange={(event) => setActivityForm({ ...activityForm, activity_type: event.target.value })}
                  >
                    <option value="walk">Paseo</option>
                    <option value="play">Juego</option>
                    <option value="training">Entrenamiento</option>
                    <option value="other">Otra actividad</option>
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="activity-duration">Duración (minutos)</label>
                  <input
                    id="activity-duration"
                    className="input-modern"
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    value={activityForm.duration_minutes}
                    onChange={(event) => setActivityForm({ ...activityForm, duration_minutes: event.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={activityLoading}>Guardar actividad</button>
              </form>

              <form className="card form-modern" onSubmit={handleSaveGoal}>
                <h3 className="form-title">Meta diaria</h3>
                <p className="activity-muted">Define una meta adecuada para tu mascota, considerando las indicaciones de su veterinario.</p>
                <div className="input-group">
                  <label htmlFor="activity-goal">Minutos de actividad al día</label>
                  <input
                    id="activity-goal"
                    className="input-modern"
                    type="number"
                    min="1"
                    max="1440"
                    step="1"
                    value={goalForm}
                    onChange={(event) => setGoalForm(event.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary" disabled={activityLoading}>Guardar meta</button>
              </form>
            </div>

            <section className="card activity-history">
              <h3 className="section-title">Actividad registrada</h3>
              {!activity?.entries?.length ? (
                <p className="activity-muted">No hay actividades registradas para esta fecha.</p>
              ) : (
                <ul>
                  {activity.entries.map((entry) => (
                    <li key={entry.id}>
                      <span className="activity-entry-icon" aria-hidden="true">
                        {entry.activity_type === "walk" ? "🚶" : entry.activity_type === "play" ? "🎾" : entry.activity_type === "training" ? "🎯" : "🐾"}
                      </span>
                      <span className="activity-entry-name">{activityLabels[entry.activity_type] || activityLabels.other}</span>
                      <strong>{entry.duration_minutes} min</strong>
                      {entry.source === "device" && <span className="activity-source">Dispositivo</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* PESTAÑA: VACUNAS */}
        {tab === "vacunas" && (
          <div className="fade-in">
            <form className="card form-modern" onSubmit={handleAddVaccine}>
              <h3 className="form-title">Registrar nueva vacuna</h3>
              <div className="form-grid-3">
                <div className="input-group">
                  <label>Nombre de la Vacuna</label>
                  <input className="input-modern" placeholder="Ej. Antirrábica" value={vaccineForm.vaccine_name} onChange={(e) => setVaccineForm({ ...vaccineForm, vaccine_name: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Fecha Aplicada</label>
                  <input type="date" className="input-modern" value={vaccineForm.date_administered} onChange={(e) => setVaccineForm({ ...vaccineForm, date_administered: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Próxima Dosis (Opcional)</label>
                  <input type="date" className="input-modern" value={vaccineForm.next_due_date} onChange={(e) => setVaccineForm({ ...vaccineForm, next_due_date: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn-primary">Guardar Vacuna</button>
            </form>

            <h3 className="section-title">Carnet de Vacunación</h3>
            <div className="vaccines-grid">
              {vaccines.length === 0 ? (
                <div className="empty-state">No hay vacunas registradas aún.</div>
              ) : (
                vaccines.map((v) => (
                  <div key={v.id} className="vaccine-card">
                    <div className="vaccine-icon">💉</div>
                    <div className="vaccine-info">
                      <h4>{v.vaccine_name}</h4>
                      <p>Aplicada: <strong>{v.date_administered}</strong></p>
                      {v.next_due_date && (
                        <div className="next-dose">
                          ⚠️ Próxima dosis: {v.next_due_date}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}