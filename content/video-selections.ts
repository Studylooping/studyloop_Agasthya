import type { VideoSelection } from "@/lib/video-lessons";
import { CHEMISTRY_12_VIDEOS } from "@/content/videos/chemistry-12";
import { CHEMISTRY_11_VIDEOS } from "@/content/videos/chemistry-11";
import { MATH_SENIOR_VIDEOS } from "@/content/videos/math-senior";
import { PHYSICS_SENIOR_VIDEOS } from "@/content/videos/physics-senior";
import { FOUNDATION_VIDEOS } from "@/content/videos/foundation-courses";
import { CALCULUS_HINDI_VIDEOS } from "@/content/videos/calculus-hindi";

// These are scoped supplements, not a claim of full unit or exam coverage.
// Keep source video IDs traceable to their original YouTube watch pages.
export const VIDEO_SELECTIONS: VideoSelection[] = [
  {
    videoId: "xZELQc11ACY",
    courseSlug: "cbse-math-11",
    unitSlug: "u1-sets-functions",
    topicCodes: ["1.2"],
    language: "en",
    focus: "Set operations and Venn diagrams",
    format: "concept",
    coverage:
      "Union and intersection with Venn diagrams. Does not cover the relations, functions or trigonometry chapters.",
  },
  {
    videoId: "bAHqiEESWgs",
    courseSlug: "cbse-math-11",
    unitSlug: "u1-sets-functions",
    topicCodes: ["1.1", "1.2"],
    language: "hi",
    focus: "Sets",
    format: "revision",
    coverage:
      "Sets chapter revision with examples. Relations, functions and trigonometry are separate chapters.",
  },
  {
    videoId: "PlrvWjFoDz4",
    courseSlug: "cbse-math-11",
    unitSlug: "u1-sets-functions",
    topicCodes: ["1.6", "1.7", "1.8", "1.9"],
    language: "hi",
    focus: "Trigonometric functions",
    format: "revision",
    coverage:
      "Trigonometric functions and identities. Follow your current school syllabus for any additional material in this older recording.",
  },
  {
    videoId: "OQz1ydBcQSA",
    courseSlug: "cbse-math-11",
    unitSlug: "u2-algebra-xi",
    topicCodes: ["2.1"],
    language: "en",
    focus: "Complex numbers",
    format: "concept",
    coverage:
      "Complex arithmetic, standard form and the Argand plane; not the other algebra chapters.",
  },
  {
    videoId: "X6pqgXzfNDQ",
    courseSlug: "cbse-math-11",
    unitSlug: "u2-algebra-xi",
    topicCodes: ["2.1"],
    language: "hi",
    focus: "Complex numbers",
    format: "revision",
    coverage:
      "Complex numbers chapter revision. This older recording may include quadratic-equation material beyond your current assessment scope.",
  },
  {
    videoId: "fyJAOD3X5tw",
    courseSlug: "cbse-math-11",
    unitSlug: "u3-coordinate-geometry",
    topicCodes: ["3.1"],
    language: "en",
    focus: "Slope and equations of lines",
    format: "concept",
    coverage:
      "Slope-intercept and standard forms of a line. A foundation refresher, not conics or three-dimensional geometry.",
  },
  {
    videoId: "guYhVnACdTk",
    courseSlug: "cbse-math-11",
    unitSlug: "u3-coordinate-geometry",
    topicCodes: ["3.1", "3.2"],
    language: "hi",
    focus: "Straight lines",
    format: "revision",
    coverage:
      "Straight lines, equations and point-line distance. Conics and three-dimensional geometry are not covered by this selection.",
  },

  {
    videoId: "l2yuDvwYq5g",
    courseSlug: "cbse-physics-11",
    unitSlug: "u1-physical-world-measurement",
    topicCodes: ["1.3"],
    language: "en",
    focus: "Significant figures",
    format: "concept",
    coverage:
      "Significant figures, rounding and arithmetic rules. Does not cover dimensional analysis or measurement instruments.",
  },
  {
    videoId: "bin4OCO-LSc",
    courseSlug: "cbse-physics-11",
    unitSlug: "u1-physical-world-measurement",
    topicCodes: ["1.1", "1.2", "1.3", "1.4", "1.5"],
    language: "hi",
    focus: "Units and measurements",
    format: "revision",
    coverage:
      "Units, dimensions, significant figures and measurement errors with examples. Instrument demonstrations supplement, not replace, supervised practical work.",
  },
  {
    videoId: "dHjWVlfNraM",
    courseSlug: "cbse-physics-11",
    unitSlug: "u2-kinematics",
    topicCodes: ["2.1", "2.2"],
    language: "en",
    focus: "Motion in one dimension",
    format: "concept",
    coverage:
      "Worked constant-speed and constant-acceleration problems. This is the freely available lesson, not the optional paid extended recording.",
  },
  {
    videoId: "m8dx27hc5Q0",
    courseSlug: "cbse-physics-11",
    unitSlug: "u2-kinematics",
    topicCodes: ["2.1", "2.2"],
    language: "hi",
    focus: "Motion in a straight line",
    format: "revision",
    coverage:
      "One-dimensional motion and graphs. Motion in a plane is a separate lesson.",
  },
  {
    videoId: "WM_H3b6wOKc",
    courseSlug: "cbse-physics-11",
    unitSlug: "u2-kinematics",
    topicCodes: ["2.3", "2.4", "2.5"],
    language: "hi",
    focus: "Motion in a plane",
    format: "revision",
    coverage:
      "Vectors and two-dimensional motion, including projectile and circular motion.",
  },
  {
    videoId: "g550H4e5FCY",
    courseSlug: "cbse-physics-11",
    unitSlug: "u3-laws-of-motion",
    topicCodes: ["3.1"],
    language: "en",
    focus: "Newton's laws",
    format: "concept",
    coverage:
      "The meaning and application of Newton's three laws. Friction, momentum conservation and circular dynamics need additional revision.",
  },
  {
    videoId: "OpfWImlMeq0",
    courseSlug: "cbse-physics-11",
    unitSlug: "u3-laws-of-motion",
    topicCodes: ["3.1", "3.2", "3.4"],
    language: "hi",
    focus: "Laws of motion",
    format: "revision",
    coverage:
      "Forces and Newton's laws with worked applications. Some examples target NEET; use your school's chapter list to set the scope.",
  },

  {
    videoId: "irYPta9G_sw",
    courseSlug: "cbse-chemistry-11",
    unitSlug: "u1-some-basic-concepts",
    topicCodes: ["1.2"],
    language: "en",
    focus: "Mass-to-mole conversions",
    format: "concept",
    coverage:
      "Molar mass and conversions between grams and moles. A prerequisite refresher, not the whole stoichiometry chapter.",
  },
  {
    videoId: "sZBq2x8ArAM",
    courseSlug: "cbse-chemistry-11",
    unitSlug: "u1-some-basic-concepts",
    topicCodes: ["1.1", "1.2", "1.3", "1.4", "1.5"],
    language: "hi",
    focus: "Some basic concepts of chemistry",
    format: "revision",
    coverage:
      "A compact chapter recap for students who have already studied the material; not a first-time full course.",
  },
  {
    videoId: "NIwcDnFjj98",
    courseSlug: "cbse-chemistry-11",
    unitSlug: "u2-structure-of-atom",
    topicCodes: ["2.5"],
    language: "en",
    focus: "Electronic configuration",
    format: "concept",
    coverage:
      "Electronic configurations of atoms and ions with worked examples. Atomic models and spectra are separate topics.",
  },
  {
    videoId: "R0dDOK2twpI",
    courseSlug: "cbse-chemistry-11",
    unitSlug: "u2-structure-of-atom",
    topicCodes: ["2.1", "2.2", "2.3", "2.4", "2.5"],
    language: "hi",
    focus: "Structure of atom",
    format: "revision",
    coverage:
      "Chapter revision of atomic structure, spectra, orbitals and electronic configurations.",
  },
  {
    videoId: "kFvEo1qZdNw",
    courseSlug: "cbse-chemistry-11",
    unitSlug: "u3-classification-periodicity",
    topicCodes: ["3.4"],
    language: "en",
    focus: "Atomic and ionic radii",
    format: "concept",
    coverage:
      "Explains radius trends and comparisons. Other periodic properties and periodic-table classification are not covered by this selection.",
  },
  {
    videoId: "wXtQXh03GYE",
    courseSlug: "cbse-chemistry-11",
    unitSlug: "u3-classification-periodicity",
    topicCodes: ["3.1", "3.2", "3.3", "3.4", "3.5"],
    language: "hi",
    focus: "Classification and periodicity",
    format: "revision",
    coverage:
      "Periodic-table classification and periodic trends with explanations and examples.",
  },

  {
    videoId: "YqT-DAmvi3I",
    courseSlug: "cbse-math-12",
    unitSlug: "u1-relations-functions",
    topicCodes: ["1.3", "1.4"],
    language: "en",
    focus: "One-one and onto functions",
    format: "concept",
    coverage:
      "Distinguishes injective and surjective functions. Relations and inverse trigonometric functions require separate revision.",
  },
  {
    videoId: "_VGodfB7zpM",
    courseSlug: "cbse-math-12",
    unitSlug: "u1-relations-functions",
    topicCodes: ["1.1", "1.2", "1.3", "1.4"],
    language: "hi",
    focus: "Relations and functions",
    format: "revision",
    coverage:
      "Relations and functions chapter revision. This older recording may include composition or inversion beyond the current assessed scope; inverse trigonometry is a separate chapter.",
  },
  {
    videoId: "vzt9c7iWPxs",
    courseSlug: "cbse-math-12",
    unitSlug: "u2-algebra",
    topicCodes: ["2.1", "2.2"],
    language: "en",
    focus: "Matrix multiplication",
    format: "concept",
    coverage:
      "Compatible orders and row-by-column multiplication with worked examples. Not determinant or inverse-matrix revision.",
  },
  {
    videoId: "4e4xqoYdylo",
    courseSlug: "cbse-math-12",
    unitSlug: "u2-algebra",
    topicCodes: ["2.1", "2.2", "2.3", "2.4"],
    language: "hi",
    focus: "Matrices",
    format: "revision",
    coverage:
      "Matrices chapter revision. Determinants and linear systems are separate parts of this StudyLoop unit.",
  },
  {
    videoId: "xuAiQOzIkWY",
    courseSlug: "cbse-math-12",
    unitSlug: "u3-calculus",
    topicCodes: ["3.1"],
    language: "en",
    focus: "Continuity and differentiability",
    format: "concept",
    coverage:
      "Why differentiability implies continuity and why the converse fails. Not the full calculus unit.",
  },
  {
    videoId: "2TWRSvJUqVs",
    courseSlug: "cbse-math-12",
    unitSlug: "u3-calculus",
    topicCodes: ["3.1", "3.2", "3.3"],
    language: "hi",
    focus: "Continuity and differentiability",
    format: "revision",
    coverage:
      "Continuity and differentiation chapter revision. Applications, integration and differential equations need separate lessons.",
  },

  {
    videoId: "j_Cy891cmIY",
    courseSlug: "cbse-physics-12",
    unitSlug: "u1-electrostatics",
    topicCodes: ["1.4"],
    language: "en",
    focus: "Electric potential and equipotentials",
    format: "concept",
    coverage:
      "The relationship between electric field, work and equipotential surfaces. Not the whole electrostatics unit.",
  },
  {
    videoId: "9nU2YZ2HVPA",
    courseSlug: "cbse-physics-12",
    unitSlug: "u1-electrostatics",
    topicCodes: ["1.1", "1.2", "1.3"],
    language: "hi",
    focus: "Electric charges and fields",
    format: "revision",
    coverage:
      "Charges, fields, dipoles and Gauss's law. Electrostatic potential and capacitance form a separate chapter.",
  },
  {
    videoId: "wejz5s31Cts",
    courseSlug: "cbse-physics-12",
    unitSlug: "u2-current-electricity",
    topicCodes: ["2.2"],
    language: "en",
    focus: "Series and parallel circuits",
    format: "concept",
    coverage:
      "Ohm's law, current, voltage and equivalent resistance. Cells, Kirchhoff's rules and the Wheatstone bridge need further revision.",
  },
  {
    videoId: "7Wh42oHg0JY",
    courseSlug: "cbse-physics-12",
    unitSlug: "u2-current-electricity",
    topicCodes: ["2.1", "2.2", "2.3", "2.4", "2.5"],
    language: "hi",
    focus: "Current electricity",
    format: "revision",
    coverage:
      "Board-focused current electricity chapter revision with circuit applications.",
  },
  {
    videoId: "csMqfwJRjCs",
    courseSlug: "cbse-physics-12",
    unitSlug: "u3-magnetic-effects-current-magnetism",
    topicCodes: ["3.1", "3.2", "3.3", "3.4"],
    language: "en",
    focus: "Magnetic fields and forces",
    format: "concept",
    coverage:
      "Right-hand rule, magnetic force, current-generated fields and torque. Magnetism in materials is separate.",
  },
  {
    videoId: "lYqCUYI9D7Y",
    courseSlug: "cbse-physics-12",
    unitSlug: "u3-magnetic-effects-current-magnetism",
    topicCodes: ["3.1", "3.2", "3.3", "3.4"],
    language: "hi",
    focus: "Moving charges and magnetism",
    format: "revision",
    coverage:
      "Magnetic forces, fields, current loops and galvanometers. Magnetism and matter is a separate chapter.",
  },

  {
    videoId: "O_nyEj_hZzg",
    courseSlug: "cbse-chemistry-12",
    unitSlug: "u1-solutions",
    topicCodes: ["1.1"],
    language: "en",
    focus: "Concentration of solutions",
    format: "concept",
    coverage:
      "Molarity, molality, mass percentage and mole fraction with worked conversions. This freely available lesson does not cover the colligative-properties chapter content.",
  },
  {
    videoId: "0M3kJJid0Rc",
    courseSlug: "cbse-chemistry-12",
    unitSlug: "u1-solutions",
    topicCodes: ["1.1", "1.2", "1.3", "1.4", "1.5"],
    language: "hi",
    focus: "Solutions",
    format: "revision",
    coverage:
      "Solutions chapter revision, including concentration and colligative properties. Follow the school's prescribed exam scope.",
  },
  {
    videoId: "vLCf4_NKjGU",
    courseSlug: "cbse-chemistry-12",
    unitSlug: "u2-electrochemistry",
    topicCodes: ["2.1"],
    language: "en",
    focus: "Galvanic cells and cell notation",
    format: "concept",
    coverage:
      "Cell diagrams, standard cell potentials and cell notation. Nernst, conductance and electrolysis are separate topics.",
  },
  {
    videoId: "hCBQTg64MfQ",
    courseSlug: "cbse-chemistry-12",
    unitSlug: "u2-electrochemistry",
    topicCodes: ["2.1", "2.2", "2.3", "2.4", "2.5"],
    language: "hi",
    focus: "Electrochemistry",
    format: "revision",
    coverage:
      "Electrochemistry chapter revision with board-oriented explanations and examples.",
  },
  {
    videoId: "e4qci9b2d3U",
    courseSlug: "cbse-chemistry-12",
    unitSlug: "u3-chemical-kinetics",
    topicCodes: ["3.3"],
    language: "en",
    focus: "First-order half-life",
    format: "concept",
    coverage:
      "Derives and applies the first-order half-life relation. Does not cover the entire kinetics chapter.",
  },
  {
    videoId: "d2GGCSc0VMU",
    courseSlug: "cbse-chemistry-12",
    unitSlug: "u3-chemical-kinetics",
    topicCodes: ["3.1", "3.2", "3.3", "3.4", "3.5"],
    language: "hi",
    focus: "Chemical kinetics",
    format: "revision",
    coverage:
      "Rates, rate equations, temperature dependence and collision theory. Use the current syllabus when revising from this older recording.",
  },
  ...CHEMISTRY_12_VIDEOS,
  ...CHEMISTRY_11_VIDEOS,
  ...MATH_SENIOR_VIDEOS,
  ...PHYSICS_SENIOR_VIDEOS,
  ...FOUNDATION_VIDEOS,
  ...CALCULUS_HINDI_VIDEOS,
];
