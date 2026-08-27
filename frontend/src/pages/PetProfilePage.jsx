import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import "../styles/Profile.css";
export default function PetProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [tab, setTab] = useState("nutricion");
  const [recommendation, setRecommendation] = useState(null);
  const [records, setRecords] = useState([]);
  const [vaccines, setVaccines] = useState([]);

  const [recordForm, setRecordForm] = useState({ record_date: "", record_type: "consulta", description: "", vet_name: "" });
  const [vaccineForm, setVaccineForm] = useState({ vaccine_name: "", date_administered: "", next_due_date: "" });

  async function loadAll() {
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
  }

  useEffect(() => { loadAll(); }, [id]);

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
          <div className="pet-avatar-large">
            {pet.species?.toLowerCase() === 'gato' ? '🐈' : '🐕'}
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
            <form className="card form-modern" onSubmit={handleAddRecord}>
              <h3 className="form-title">Registrar nueva visita</h3>
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
                      <p>{r.description}</p>
                      {r.vet_name && <span className="vet-name">👨‍⚕️ Dr/a. {r.vet_name}</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
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