/**
 * Motor de recomendación de nutrición y suplementos.
 * Reglas simplificadas basadas en: especie, edad, peso, tamaño y nivel de actividad.
 * Pensado como punto de partida — reemplazar/ampliar con un modelo más sofisticado
 * (ML, tablas veterinarias oficiales, etc.) a futuro.
 */

function calculateAgeInMonths(birthDateStr) {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  const now = new Date();
  return (
    (now.getFullYear() - birth.getFullYear()) * 12 +
    (now.getMonth() - birth.getMonth())
  );
}

function getLifeStage(species, ageMonths, size) {
  if (ageMonths === null) return "desconocida";
  if (species === "perro") {
    if (ageMonths < 12) return "cachorro";
    const seniorThreshold = size === "grande" ? 72 : 96; // razas grandes envejecen antes
    if (ageMonths >= seniorThreshold) return "senior";
    return "adulto";
  }
  if (species === "gato") {
    if (ageMonths < 12) return "cachorro";
    if (ageMonths >= 132) return "senior"; // ~11 años
    return "adulto";
  }
  // otras especies: heurística genérica
  if (ageMonths < 10) return "cachorro";
  if (ageMonths >= 84) return "senior";
  return "adulto";
}

// Requerimiento energético en reposo (RER) según fórmula veterinaria estándar
function calculateRER(weightKg) {
  if (!weightKg || weightKg <= 0) return null;
  return 70 * Math.pow(weightKg, 0.75);
}

// Factor multiplicador del RER según etapa de vida y actividad -> MER (mantenimiento)
const ACTIVITY_FACTORS = {
  cachorro: { baja: 2.0, moderada: 2.5, alta: 3.0 },
  adulto: { baja: 1.2, moderada: 1.6, alta: 2.0 },
  senior: { baja: 1.0, moderada: 1.2, alta: 1.4 },
  desconocida: { baja: 1.2, moderada: 1.4, alta: 1.6 },
};

function calculateMER(rer, lifeStage, activityLevel) {
  if (rer === null) return null;
  const factor =
    (ACTIVITY_FACTORS[lifeStage] && ACTIVITY_FACTORS[lifeStage][activityLevel]) ||
    1.4;
  return Math.round(rer * factor);
}

function suggestDietType(species, lifeStage, size) {
  if (species === "perro") {
    if (lifeStage === "cachorro") return "Alimento formulado para cachorro, alto en proteína y DHA para desarrollo cognitivo.";
    if (lifeStage === "senior") return "Alimento senior, bajo en calorías, con soporte articular (glucosamina/condroitina).";
    if (size === "grande") return "Alimento adulto para razas grandes, con control de fósforo/calcio para salud articular.";
    return "Alimento adulto balanceado de mantenimiento.";
  }
  if (species === "gato") {
    if (lifeStage === "cachorro") return "Alimento para gatito, alta densidad calórica y proteína animal.";
    if (lifeStage === "senior") return "Alimento senior para gato, con soporte renal y bajo en fósforo.";
    return "Alimento adulto para gato, alto en proteína animal y taurina.";
  }
  return "Consultar con un veterinario especialista en la especie para una dieta formulada.";
}

function suggestSupplements(species, lifeStage, activityLevel, sterilized) {
  const supplements = [];

  if (lifeStage === "senior") {
    supplements.push("Glucosamina + condroitina (salud articular)");
    supplements.push("Ácidos grasos Omega-3 (antiinflamatorio natural)");
  }
  if (activityLevel === "alta") {
    supplements.push("Electrolitos / suplemento de recuperación post-ejercicio");
  }
  if (sterilized) {
    supplements.push("Fórmula de control de peso para mascotas esterilizadas");
  }
  if (species === "perro" && lifeStage === "cachorro") {
    supplements.push("Probióticos para apoyo digestivo en etapa de destete/crecimiento");
  }
  if (species === "gato") {
    supplements.push("Suplemento con taurina (salud cardiaca y visual)");
  }
  if (supplements.length === 0) {
    supplements.push("Sin suplementos adicionales necesarios; mantener dieta balanceada.");
  }
  return supplements;
}

/**
 * Genera una recomendación completa para una mascota.
 * @param {object} pet - objeto mascota desde la base de datos
 * @returns {object} recomendación estructurada
 */
function getRecommendation(pet) {
  const ageMonths = calculateAgeInMonths(pet.birth_date);
  const lifeStage = getLifeStage(pet.species, ageMonths, pet.size);
  const rer = calculateRER(pet.weight_kg);
  const mer = calculateMER(rer, lifeStage, pet.activity_level);

  return {
    pet_id: pet.id,
    life_stage: lifeStage,
    age_months: ageMonths,
    estimated_daily_calories_kcal: mer,
    diet_recommendation: suggestDietType(pet.species, lifeStage, pet.size),
    supplements: suggestSupplements(
      pet.species,
      lifeStage,
      pet.activity_level,
      !!pet.sterilized
    ),
    disclaimer:
      "Esta recomendación es orientativa y generada algorítmicamente. No reemplaza una evaluación veterinaria profesional.",
  };
}

module.exports = { getRecommendation, calculateAgeInMonths, getLifeStage };
