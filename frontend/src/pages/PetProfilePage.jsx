import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api";

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
    if (!confirm(`¿Eliminar a ${pet.name}? Esta acción no se puede deshacer.`)) return;
    await api.deletePet(id);
    navigate("/");
  }

  if (!pet) return <p>Cargando...</p>;

  return (
    <div>
      <div className="section-header">
        <h1>{pet.name}</h1>
        <button className="btn-ghost" onClick={handleDeletePet}>Eliminar mascota</button>
      </div>
      <p className="subtitle">{pet.breed || pet.species} · {pet.size} · Actividad {pet.activity_level}</p>

      <nav className="tabs">
        <button className={tab === "nutricion" ? "tab active" : "tab"} onClick={() => setTab("nutricion")}>Nutrición</button>
        <button className={tab === "historial" ? "tab active" : "tab"} onClick={() => setTab("historial")}>Historial médico</button>
        <button className={tab === "vacunas" ? "tab active" : "tab"} onClick={() => setTab("vacunas")}>Vacunas</button>
      </nav>

      {tab === "nutricion" && recommendation && (
        <div className="card">
          <h2>Recomendación personalizada</h2>
          <p><strong>Etapa de vida:</strong> {recommendation.life_stage}</p>
          <p><strong>Calorías diarias estimadas:</strong> {recommendation.estimated_daily_calories_kcal ?? "N/D"} kcal</p>
          <p><strong>Dieta sugerida:</strong> {recommendation.diet_recommendation}</p>
          <p><strong>Suplementos sugeridos:</strong></p>
          <ul>
            {recommendation.supplements.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          <p className="disclaimer">{recommendation.disclaimer}</p>
        </div>
      )}

      {tab === "historial" && (
        <div>
          <form className="card form-grid" onSubmit={handleAddRecord}>
            <div>
              <label>Fecha</label>
              <input type="date" value={recordForm.record_date} onChange={(e) => setRecordForm({ ...recordForm, record_date: e.target.value })} required />
            </div>
            <div>
              <label>Tipo</label>
              <select value={recordForm.record_type} onChange={(e) => setRecordForm({ ...recordForm, record_type: e.target.value })}>
                <option value="consulta">Consulta</option>
                <option value="cirugia">Cirugía</option>
                <option value="examen">Examen</option>
                <option value="tratamiento">Tratamiento</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="span-2">
              <label>Descripción</label>
              <input value={recordForm.description} onChange={(e) => setRecordForm({ ...recordForm, description: e.target.value })} required />
            </div>
            <div>
              <label>Veterinario</label>
              <input value={recordForm.vet_name} onChange={(e) => setRecordForm({ ...recordForm, vet_name: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary">Agregar registro</button>
          </form>

          <ul className="record-list">
            {records.map((r) => (
              <li key={r.id} className="card">
                <strong>{r.record_date}</strong> — {r.record_type}: {r.description}
                {r.vet_name && <span className="muted"> (Dr/a. {r.vet_name})</span>}
              </li>
            ))}
            {records.length === 0 && <p>Sin registros médicos aún.</p>}
          </ul>
        </div>
      )}

      {tab === "vacunas" && (
        <div>
          <form className="card form-grid" onSubmit={handleAddVaccine}>
            <div>
              <label>Vacuna</label>
              <input value={vaccineForm.vaccine_name} onChange={(e) => setVaccineForm({ ...vaccineForm, vaccine_name: e.target.value })} required />
            </div>
            <div>
              <label>Fecha aplicada</label>
              <input type="date" value={vaccineForm.date_administered} onChange={(e) => setVaccineForm({ ...vaccineForm, date_administered: e.target.value })} required />
            </div>
            <div>
              <label>Próxima dosis</label>
              <input type="date" value={vaccineForm.next_due_date} onChange={(e) => setVaccineForm({ ...vaccineForm, next_due_date: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary">Agregar vacuna</button>
          </form>

          <ul className="record-list">
            {vaccines.map((v) => (
              <li key={v.id} className="card">
                <strong>{v.vaccine_name}</strong> — aplicada {v.date_administered}
                {v.next_due_date && <span className="muted"> · próxima dosis {v.next_due_date}</span>}
              </li>
            ))}
            {vaccines.length === 0 && <p>Sin vacunas registradas aún.</p>}
          </ul>
        </div>
      )}
    </div>
  );
}
