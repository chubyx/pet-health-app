import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import Tesseract from "tesseract.js";
import "../styles/Profile.css";

export default function PetProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [tab, setTab] = useState("nutricion");
  const [recommendation, setRecommendation] = useState(null);
  const [records, setRecords] = useState([]);
  const [vaccines, setVaccines] = useState([]);

  // Estados para formularios manuales
  const [recordForm, setRecordForm] = useState({ record_date: "", record_type: "consulta", description: "", vet_name: "" });
  const [vaccineForm, setVaccineForm] = useState({ vaccine_name: "", date_administered: "", next_due_date: "" });

  // NUEVOS: Estados para el escáner de documentos
  const [file, setFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [showScanForm, setShowScanForm] = useState(false);
  const [docDescription, setDocDescription] = useState("");

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