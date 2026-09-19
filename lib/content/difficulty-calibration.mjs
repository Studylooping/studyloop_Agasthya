function stripMath(text) {
  return String(text ?? "")
    .replace(/\$[^$]*\$/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}_^]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function hasQuantitativeLoad(text) {
  const numericCount = (String(text ?? "").match(/\d+(?:\.\d+)?/g) ?? [])
    .length;
  return (
    numericCount >= 3 ||
    /\b(calculate|estimate|find|mass|molarity|molality|osmotic|nernst|emf|conductance|enthalpy|entropy|gibbs|equilibrium constant|solubility product|limiting|empirical formula|combustion|buffer|ph|activation energy|rate constant|half-life|balanced|balance)\b/i.test(
      text,
    )
  );
}

function isRoutineConceptMc(text) {
  return /\b(which statement|which species|which reaction|which compound|which element|primarily|mainly|because|belongs to|identify|arrange|correct iupac name|molecularity|oxidation number|number of sigma|gives mainly|is respectively)\b/i.test(
    text,
  );
}

function hasHighEndCbseChemistryLoad(text) {
  const numericCount = (String(text ?? "").match(/\d+(?:\.\d+)?/g) ?? [])
    .length;
  const quantitativeHighEnd =
    /limiting|excess|empirical formula|combustion|hydrated|hydrate|association|dissociation|degree of ionisation|degree of dissociation|observed molar mass|freezing-point|boiling-point|vapour pressure|raoult|colligative|van'?t hoff|osmotic|nernst|cell potential|cell reaction|concentration cell|standard reduction|same charge|deposits|cell constant|resistance|faraday|electrolytic|conductance|k_\{?sp\}?|solubility product|selective precipitation|buffer|weak acid|pH|pK_a|hess|bond enthalp|calorimeter|gibbs|entropy|half-reaction|balance|arrhenius|activation energy|e_a|rate law|initial-rate|molar mass/i.test(
      text,
    ) && numericCount >= 2;

  const qualitativeSynthesis =
    /\b(construct|derive|balance|balanced|half-reaction|compare|evaluate|justify|explain why|account for|data|figure|graph|trend)\b/i.test(
      text,
    ) &&
    /\b(dichromate|permanganate|chromate|oxalate|lanthanoid contraction|actinoid|transition[- ]?metal|oxidation[- ]?state|electron-count|shielding)\b/i.test(
      text,
    );

  const organicSynthesis =
    /\b(plan|identify|distinguish|account for|explain why|justify|multi[- ]?clue|isomeric|route|sequence|suitable reactants)\b/i.test(
      text,
    ) &&
    /\b(alcohol|phenol|ether|anisole|haloalkane|haloarene|aldehyde|ketone|carboxylic|amine|grignard|williamson|lucas|iodoform|dichromate|oxidation|cumene|diazonium|reimer|kolbe)\b/i.test(
      text,
    );

  const biomoleculeHighEnd =
    /\b(classify|identify|distinguish|compare|justify|explain why|data|sample|case|hydrolysis|base pairing|sequence|denaturation|active site|deficiency|calculate|find)\b/i.test(
      text,
    ) &&
    /\b(carbohydrate|sugar|glucose|fructose|sucrose|maltose|lactose|starch|cellulose|glycogen|protein|peptide|amino acid|zwitterion|enzyme|vitamin|nucleotide|nucleoside|dna|rna|hormone|biomolecule)\b/i.test(
      text,
    );

  return (
    quantitativeHighEnd ||
    qualitativeSynthesis ||
    organicSynthesis ||
    biomoleculeHighEnd
  );
}

function hasHighEndCbsePhysicsLoad({
  questionLatex,
  responseType,
  skillTags = [],
}) {
  const text = String(questionLatex ?? "");
  const prose = stripMath(text);
  const tagText = Array.isArray(skillTags) ? skillTags.join(" ") : "";
  const combined = `${prose} ${tagText}`.toLowerCase();
  const numericCount = (text.match(/\d+(?:\.\d+)?/g) ?? []).length;

  return (
    /\b(derive|obtain|show that|prove|dimensional analysis|uncertainty|error propagation|slope|area under|cycle|two-loop|mesh|kirchhoff|wheatstone|bridge|network|equivalent capacitance|galvanometer|shunt|voltmeter|ammeter|transformer|transmission|lcr|resonance|rms|phase|adiabatic|isothermal|bernoulli|venturi|projectile|relative velocity|river|boat|two-dimensional|right angles|embeds|pendulum|incline|bullet|spring.*rough|variable force|centre of mass|center of mass|explodes|turntable|angular momentum|parallel axes|constant torque.*then|satellite|orbit|escape speed|gaussian|dipole|net force|multiple charges|square|corners|terminal speed|stokes|calorimetry|steam|standing wave|beats|sonometer|resonance tube|closed pipe|open pipe|spherometer|best-fit|flux|induced emf|lenz|mutual inductance|spherical.*surface|lens[- ]?screen|lens maker|camera lens|minimum deviation|optical fibre|compound microscope|astronomical telescope|fringe shift|young'?s double[- ]slit|ydse|single[- ]slit|diffraction|central maximum|transparent sheet|rectifier_waveform_case)\b/i.test(
      combined,
    ) ||
    (numericCount >= 5 &&
      /\b(find|calculate|estimate|compare|initial|final|current|voltage|pressure|volume|speed|mass|radius|area|time|force|work|energy|power|temperature|field|potential)\b/i.test(
        prose,
      )) ||
    ((responseType === "case" || responseType === "laq") && numericCount >= 5)
  );
}

function isRoutinePhysicsMc(text) {
  const prose = stripMath(text);
  return /\b(assertion|which statement|which quantity|which graph|mainly|because|valid for every|state function|not state function|formula|principle|expected observation|what happens|proportional to|is closest to)\b/i.test(
    prose,
  );
}

function isRoutineD2PhysicsMc({ questionLatex, skillTags = [] }) {
  const prose = stripMath(questionLatex);
  const tagText = Array.isArray(skillTags) ? skillTags.join(" ") : "";
  const combined = `${prose} ${tagText}`.toLowerCase();

  if (/\b(assertion|derive|obtain|show that|prove|justify)\b/i.test(prose)) {
    return false;
  }

  if (
    /\b(is best described as|will have|are conventionally drawn|weakly repelled|curie temperature|directly proportional to|si ampere|force per metre is|work done.*zero because|placed exactly parallel|undeflected speed is)\b/i.test(
      prose,
    )
  ) {
    return true;
  }

  if (
    /\b(two long parallel wires carry currents in the same direction\.? the wires|same-direction currents attract|current sensitivity|magnetic dipole moment is)\b/i.test(
      combined,
    )
  ) {
    return true;
  }

  const hasRoutineFormulaTag =
    /\b(long_straight_wire_field|circular_loop_field|velocity_selector)\b/.test(
      combined,
    ) ||
    /\b(electric_field_from_potential|dipole_torque|ampere_circuital_law|lorentz_force_direction|parallel_current_force|torque_on_current_loop)\b/.test(
      combined,
    ) ||
    /\b(magnetic_flux|motional_emf|energy_in_inductor|ac_rms_value|capacitive_reactance|inductive_reactance|transformer_ratio|wattless_current)\b/.test(
      combined,
    ) ||
    /\b(self_induction induced_emf|mutual_induction induced_emf|ac_power power_factor)\b/.test(
      combined,
    ) ||
    /\b(electric_flux_rate|wavelength_frequency|frequency_wavelength|field_relation|spectrum_identification|x_rays|visible_light)\b/.test(
      combined,
    ) ||
    (/\bmagnetic_dipole_moment\b/.test(combined) &&
      !/\btorque_on_current_loop\b/.test(combined));

  const numericCount = (
    String(questionLatex ?? "").match(/\d+(?:\.\d+)?/g) ?? []
  ).length;

  if (/\belectric_flux_rate\b/.test(combined)) return true;

  return hasRoutineFormulaTag && numericCount <= 12;
}

/**
 * @param {{
 *   difficulty: 1 | 2 | 3 | 4 | 5,
 *   kind: "mc_single" | "frq",
 *   questionLatex: string,
 *   responseType?: "vsaq" | "saq" | "laq" | "case"
 * }} input
 * @returns {1 | 2 | 3 | 4 | 5}
 */
export function calibrateCbseChemistryDifficulty({
  difficulty,
  kind,
  questionLatex,
  responseType,
}) {
  const prose = stripMath(questionLatex);
  const quantitative = hasQuantitativeLoad(questionLatex);

  if (difficulty <= 3) return difficulty;

  const highEnd = hasHighEndCbseChemistryLoad(questionLatex);
  let calibrated = difficulty === 5 ? (highEnd ? 4 : 3) : difficulty;

  if (responseType === "vsaq") return Math.min(calibrated, 2);

  if (kind === "mc_single") {
    if (calibrated === 4 && (isRoutineConceptMc(prose) || !highEnd)) {
      calibrated = 3;
    }
    return calibrated;
  }

  if (
    (responseType === "saq" || responseType === "case") &&
    calibrated === 4 &&
    !highEnd
  ) {
    return 3;
  }

  if (responseType === "laq" && calibrated === 4 && !highEnd) {
    return 3;
  }

  return calibrated;
}

/**
 * Keeps CBSE Physics difficulty labels honest:
 * - d1/d2 seeds are trusted.
 * - VSAQ should not display as hard.
 * - Routine MC/plug-in recognition items can be deflated to d2.
 * - d5 is reserved so rarely that current CBSE-style physics banks display
 *   genuine multi-step work as d4 unless a future item is explicitly reviewed.
 *
 * @param {{
 *   difficulty: 1 | 2 | 3 | 4 | 5,
 *   kind: "mc_single" | "frq",
 *   questionLatex: string,
 *   responseType?: "vsaq" | "saq" | "laq" | "case",
 *   skillTags?: readonly string[]
 * }} input
 * @returns {1 | 2 | 3 | 4 | 5}
 */
export function calibrateCbsePhysicsDifficulty({
  difficulty,
  kind,
  questionLatex,
  responseType,
  skillTags = [],
}) {
  if (responseType === "vsaq") return Math.min(difficulty, 2);
  if (difficulty <= 2) return difficulty;

  const highEnd = hasHighEndCbsePhysicsLoad({
    questionLatex,
    responseType,
    skillTags,
  });

  if (kind === "mc_single") {
    if (
      difficulty === 3 &&
      isRoutineD2PhysicsMc({ questionLatex, skillTags })
    ) {
      return 2;
    }
    if (difficulty === 5) return highEnd ? 4 : 3;
    if (difficulty === 4 && (!highEnd || isRoutinePhysicsMc(questionLatex))) {
      return 3;
    }
    return difficulty;
  }

  if (difficulty === 5) return 4;
  if (
    (responseType === "saq" ||
      responseType === "laq" ||
      responseType === "case") &&
    !highEnd
  ) {
    return 3;
  }

  return difficulty;
}
