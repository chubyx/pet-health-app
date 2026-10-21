import { useState } from 'react';

export default function DocumentScanner({ petId }) {
  const [file, setFile] = useState(null);

  const handleCapture = (event) => {
    const uploadedFile = event.target.files[0];
    setFile(uploadedFile);
  };

  const uploadDocument = async () => {
    const formData = new FormData();
    formData.append('document', file);

    // Llamada a tu api.js
    await fetch(`/api/pets/${petId}/documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
  };

  return (
    <div>
      <h3>Escanear Documento Veterinario</h3>
      {/* Abre la cámara trasera en móviles */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        onChange={handleCapture} 
      />
      {file && <button onClick={uploadDocument}>Subir y Procesar</button>}
    </div>
  );
}
