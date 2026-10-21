const BASE_URL = "/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Error en la solicitud");
  }
  return data;
}

export const api = {
  // Auth
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),

  // Pets
  getPets: () => request("/pets"),
  getPet: (id) => request(`/pets/${id}`),
  createPet: (payload) => request("/pets", { method: "POST", body: JSON.stringify(payload) }),
  updatePet: (id, payload) => request(`/pets/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deletePet: (id) => request(`/pets/${id}`, { method: "DELETE" }),
  getRecommendation: (id) => request(`/pets/${id}/recommendations`),

  // Medical records
  getMedicalRecords: (petId) => request(`/pets/${petId}/medical-records`),
  addMedicalRecord: (petId, payload) =>
    request(`/pets/${petId}/medical-records`, { method: "POST", body: JSON.stringify(payload) }),
  deleteMedicalRecord: (petId, recordId) =>
    request(`/pets/${petId}/medical-records/${recordId}`, { method: "DELETE" }),
  
  // Escáner / Subida de documentos
  uploadDocument: async (petId, formData) => {
    const token = getToken();
    const res = await fetch(`${BASE_URL}/pets/${petId}/medical-records/document`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Error al subir el documento");
    }
    return data;
  },

  // Vaccines
  getVaccines: (petId) => request(`/pets/${petId}/vaccines`),
  addVaccine: (petId, payload) =>
    request(`/pets/${petId}/vaccines`, { method: "POST", body: JSON.stringify(payload) }),
  deleteVaccine: (petId, vaccineId) =>
    request(`/pets/${petId}/vaccines/${vaccineId}`, { method: "DELETE" }),

  // Reminders
  getUpcomingReminders: (days = 30) => request(`/reminders/upcoming?days=${days}`),
};