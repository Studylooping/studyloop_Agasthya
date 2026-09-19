import type { VideoSelection } from "@/lib/video-lessons";

// Original creator chapter libraries, selected by current topic scope rather
// than the chapter numbering in older recordings. See the research note.
const chapters: Omit<VideoSelection, "courseSlug">[] = [
  {
    videoId: "k6M7sdtDvD0",
    unitSlug: "formative-reinforcement",
    topicCodes: ["F.1"],
    language: "hi",
    focus: "Surface chemistry: compact revision",
    format: "revision",
    coverage:
      "Bharat Panchal's compact surface-chemistry revision. Formative reinforcement only; its CUET/NEET framing does not add the chapter to the current CBSE theory syllabus.",
  },
  {
    videoId: "JX7O3Xv5HFQ",
    unitSlug: "formative-reinforcement",
    topicCodes: ["F.2"],
    language: "hi",
    focus: "Isolation of elements",
    format: "revision",
    coverage:
      "NCERT Wallah's metallurgy and isolation-of-elements revision. Use only the matching formative concepts; competitive-exam extensions are optional.",
  },
  {
    videoId: "eM15MG-3j_s",
    unitSlug: "formative-reinforcement",
    topicCodes: ["F.3"],
    language: "hi",
    focus: "Polymers: compact revision",
    format: "revision",
    coverage:
      "Polymer classification and examples in a compact Bharat Panchal lesson. Formative enrichment rather than an additional board-theory requirement.",
  },
  {
    videoId: "1-R6hhhG51Y",
    unitSlug: "formative-reinforcement",
    topicCodes: ["F.4"],
    language: "hi",
    focus: "Chemistry in everyday life",
    format: "revision",
    coverage:
      "NCERT Wallah revision of the older everyday-chemistry chapter. Academic enrichment, not medical advice or an extra board-theory requirement.",
  },
  {
    videoId: "LzQpbfU7DLo",
    unitSlug: "practicals-projects",
    topicCodes: ["Lab.1"],
    language: "en",
    focus: "Permanganate titration using Mohr's salt",
    format: "concept",
    coverage:
      "MeitY OLabs demonstration of standard-solution preparation, redox titration and endpoint observation. Watch for preparation; perform only in a teacher-supervised laboratory with the prescribed safety procedure.",
  },
  {
    videoId: "rp8VtU74DlU",
    unitSlug: "practicals-projects",
    topicCodes: ["Lab.1"],
    language: "hi",
    focus: "Permanganate titration using Mohr's salt",
    format: "concept",
    coverage:
      "Bharat Panchal's volumetric titration demonstration. A preparation aid for one experiment, not the whole practical course. Chemicals and apparatus require teacher supervision.",
  },
  {
    videoId: "n4esSHxz_J8",
    unitSlug: "practicals-projects",
    topicCodes: ["Lab.2"],
    language: "en",
    focus: "Organic functional-group tests",
    format: "concept",
    coverage:
      "MeitY OLabs functional-group identification demonstrations. This supports the organic-tests portion, not the complete inorganic salt-analysis scheme. Teacher-supervised laboratory work only.",
  },
  {
    videoId: "AHqjvsaYAxo",
    unitSlug: "practicals-projects",
    topicCodes: ["Lab.2"],
    language: "hi",
    focus: "Salt analysis: acidic radicals",
    format: "concept",
    coverage:
      "Anion-identification revision from Bharat Panchal. This is not the entire salt-analysis or organic-functional-group scheme. Follow the school's supervised laboratory and safety instructions.",
  },
  {
    videoId: "PUrevC1bBd4",
    unitSlug: "practicals-projects",
    topicCodes: ["Lab.2"],
    language: "hi",
    focus: "Salt analysis: basic radicals",
    format: "concept",
    coverage:
      "Cation-identification revision, complementing the acidic-radical lesson. Perform chemical tests only with teacher supervision and required protective equipment.",
  },
  {
    videoId: "lT-K-XvIdeI",
    unitSlug: "practicals-projects",
    topicCodes: ["Lab.3"],
    language: "en",
    focus: "Preparing lyophilic and lyophobic sols",
    format: "concept",
    coverage:
      "MeitY OLabs demonstration supporting the colloids subset of content-based experiments. It does not cover every kinetics, electrochemistry or chromatography experiment. Supervised laboratory work only.",
  },
  {
    videoId: "k6M7sdtDvD0",
    unitSlug: "practicals-projects",
    topicCodes: ["Lab.3"],
    language: "hi",
    focus: "Colloids: theory before the practical",
    format: "revision",
    coverage:
      "Surface-chemistry and colloid theory supporting the content-based experiments. This is a conceptual revision lesson, not a practical procedure or complete lab preparation. Experiments require teacher supervision.",
  },
  {
    videoId: "QacQmS3aaTI",
    unitSlug: "practicals-projects",
    topicCodes: ["Lab.4"],
    language: "en",
    focus: "Tests for carbohydrates, proteins and fats",
    format: "concept",
    coverage:
      "MeitY OLabs food-test demonstration, supporting the food-tests portion rather than inorganic preparations. Follow your teacher's reagent, heating and disposal instructions; no tasting of laboratory samples.",
  },
  {
    videoId: "jVXQtXK7Jqo",
    unitSlug: "practicals-projects",
    topicCodes: ["Lab.4"],
    language: "hi",
    focus: "Preparation of potash alum crystals",
    format: "concept",
    coverage:
      "A2Z practical's potash-alum preparation demonstration. This supports inorganic preparation, not the food-tests portion. Use only as preparation for teacher-supervised laboratory work.",
  },
  {
    videoId: "j6vaRrT_EcI",
    unitSlug: "practicals-projects",
    topicCodes: ["Lab.5"],
    language: "en",
    focus: "Food-adulteration investigation: an example",
    format: "concept",
    coverage:
      "MeitY OLabs demonstrates a dal-adulterant test as one example of investigative chemistry. Design controls, repeats and the project record with your teacher; this is not a complete project or viva guide. Never taste laboratory samples.",
  },
  {
    videoId: "KY4t3z_6HaA",
    unitSlug: "practicals-projects",
    topicCodes: ["Lab.5"],
    language: "hi",
    focus: "Practical assessment preparation",
    format: "revision",
    coverage:
      "A short Bharat Panchal practical-exam orientation. It supplements preparation for records and viva, not experimental design or a completed project. The creator's score claim is not a StudyLoop guarantee; follow your teacher's assessment requirements.",
  },
  {
    videoId: "FQX48a7SGB8",
    unitSlug: "u1-solutions",
    topicCodes: ["1.1", "1.2", "1.3", "1.4", "1.5"],
    language: "en",
    focus: "Solutions: chapter lesson",
    format: "lesson",
    coverage:
      "Concentration, solubility, vapour pressure and colligative properties. An older NCERT chapter lesson; use your school's current assessment scope.",
  },
  {
    videoId: "DC7cFdUawBc",
    unitSlug: "u2-electrochemistry",
    topicCodes: ["2.1", "2.2", "2.3", "2.4", "2.5"],
    language: "en",
    focus: "Electrochemistry: chapter lesson",
    format: "lesson",
    coverage:
      "NCERT electrochemical cells, electrode potentials, conductance and electrolysis, with batteries and corrosion. Chapter instruction rather than an exam-paper walkthrough.",
  },
  {
    videoId: "RVDKighUnBY",
    unitSlug: "u3-chemical-kinetics",
    topicCodes: ["3.1", "3.2", "3.3", "3.4", "3.5"],
    language: "en",
    focus: "Rates, rate laws and temperature dependence",
    format: "lesson",
    coverage:
      "Rate laws, order and molecularity, integrated equations, half-life and activation energy. The chapter includes collision-theory foundations, not a complete set of mechanism problems.",
  },
  {
    videoId: "MXM7G3EJrdQ",
    unitSlug: "u4-d-and-f-block-elements",
    topicCodes: ["4.1", "4.2"],
    language: "en",
    focus: "Transition elements: configuration and trends",
    format: "lesson",
    coverage:
      "Part 1: electronic configurations and general properties of transition elements. Important compounds and the f-block are in part 2.",
  },
  {
    videoId: "BRZSD0RKgKo",
    unitSlug: "u4-d-and-f-block-elements",
    topicCodes: ["4.3", "4.4", "4.5"],
    language: "en",
    focus: "Important compounds, lanthanoids and actinoids",
    format: "lesson",
    coverage:
      "Part 2: important transition-element compounds, lanthanoids, actinoids and applications. Follow current school requirements for individual preparation reactions.",
  },
  {
    videoId: "TYe7SJZKOYg",
    unitSlug: "u5-coordination-compounds",
    topicCodes: ["5.1", "5.2", "5.3", "5.4", "5.5"],
    language: "en",
    focus: "Coordination chemistry: chapter lesson",
    format: "lesson",
    coverage:
      "Werner's theory, nomenclature, isomerism, valence-bond and crystal-field descriptions, and applications. For topic 5.5 this supports applications; revise metal-carbonyl bonding separately.",
  },
  {
    videoId: "LIS9HVYJHeI",
    unitSlug: "u6-haloalkanes-haloarenes",
    topicCodes: ["6.1", "6.2", "6.3", "6.4", "6.5"],
    language: "en",
    focus: "Haloalkanes and haloarenes: chapter lesson",
    format: "lesson",
    coverage:
      "Classification, preparation, substitution and elimination, haloarenes and organometallic reactions, plus uses and environmental effects of polyhalogen compounds.",
  },
  {
    videoId: "TNsSr0l-T6g",
    unitSlug: "u7-alcohols-phenols-ethers",
    topicCodes: ["7.1", "7.2", "7.3", "7.4", "7.5"],
    language: "en",
    focus: "Alcohols, phenols and ethers: chapter lesson",
    format: "lesson",
    coverage:
      "NCERT classification, preparation and reactions of alcohols, phenols and ethers. Use as chapter preparation alongside the written reaction mechanisms and practice questions.",
  },
  {
    videoId: "jrW8BfVbsFU",
    unitSlug: "u8-aldehydes-ketones-carboxylic-acids",
    topicCodes: ["8.1", "8.2", "8.3", "8.4", "8.5"],
    language: "en",
    focus: "Carbonyl compounds and carboxylic acids",
    format: "lesson",
    coverage:
      "NCERT chapter instruction on aldehydes, ketones and carboxylic acids. Supplement with the topic exercises for unfamiliar conversions and distinguishing-test combinations.",
  },
  {
    videoId: "4heMA_R3zN8",
    unitSlug: "u9-amines",
    topicCodes: ["9.1", "9.2", "9.3", "9.4", "9.5"],
    language: "en",
    focus: "Amines: chapter lesson",
    format: "lesson",
    coverage:
      "Classification, nomenclature, preparation, properties and reactions of amines, including diazonium chemistry. An older NCERT recording, not a guarantee of current exam coverage.",
  },
  {
    videoId: "f_0H5yxxjlU",
    unitSlug: "u10-biomolecules",
    topicCodes: ["10.1", "10.2", "10.3", "10.4", "10.5"],
    language: "en",
    focus: "Biomolecules: chapter lesson",
    format: "lesson",
    coverage:
      "Carbohydrates, proteins, enzymes, vitamins and nucleic acids, with biological functions. Use the topic notes and questions for integrated comparisons and hormone examples.",
  },
  {
    videoId: "zZ3kpW3XiqQ",
    unitSlug: "u4-d-and-f-block-elements",
    topicCodes: ["4.1", "4.2", "4.3", "4.4", "4.5"],
    language: "hi",
    focus: "d- and f-block elements: board lesson",
    format: "lesson",
    coverage:
      "Bharat Panchal's board-focused chapter lesson on transition elements, important compounds and the f-block. Check your school's current list of assessed reactions.",
  },
  {
    videoId: "W7v7yc40zo0",
    unitSlug: "u5-coordination-compounds",
    topicCodes: ["5.1", "5.2", "5.3", "5.4", "5.5"],
    language: "hi",
    focus: "Coordination compounds: board lesson",
    format: "lesson",
    coverage:
      "Board-focused nomenclature, isomerism and bonding in coordination compounds, with chapter examples and applications.",
  },
  {
    videoId: "yDYnKBc4akQ",
    unitSlug: "u6-haloalkanes-haloarenes",
    topicCodes: ["6.1", "6.2", "6.3", "6.4", "6.5"],
    language: "hi",
    focus: "Haloalkanes and haloarenes: board lesson",
    format: "lesson",
    coverage:
      "Preparation, properties and reactions of haloalkanes and haloarenes. Work through the separate topic questions to test mechanism and product-prediction skills.",
  },
  {
    videoId: "KbeDVZDISbo",
    unitSlug: "u7-alcohols-phenols-ethers",
    topicCodes: ["7.1", "7.2", "7.3", "7.4", "7.5"],
    language: "hi",
    focus: "Alcohols, phenols and ethers: board lesson",
    format: "lesson",
    coverage:
      "Board-focused preparation, properties and reactions of the three functional-group families, with NCERT examples.",
  },
  {
    videoId: "Yr0QFOw0NCI",
    unitSlug: "u8-aldehydes-ketones-carboxylic-acids",
    topicCodes: ["8.1", "8.2", "8.3", "8.4", "8.5"],
    language: "hi",
    focus: "Aldehydes, ketones and acids: board lesson",
    format: "lesson",
    coverage:
      "Chapter preparation and revision of carbonyl compounds and carboxylic acids, including reactions and conversions. This is not a substitute for independently solving unfamiliar conversion chains.",
  },
  {
    videoId: "PCdKnJvbd1A",
    unitSlug: "u9-amines",
    topicCodes: ["9.1", "9.2", "9.3", "9.4", "9.5"],
    language: "hi",
    focus: "Amines: board lesson",
    format: "lesson",
    coverage:
      "Amines chapter instruction with preparations, basicity, reactions, identification and diazonium chemistry.",
  },
  {
    videoId: "P4VtiTmzTSM",
    unitSlug: "u10-biomolecules",
    topicCodes: ["10.1", "10.2", "10.3", "10.4", "10.5"],
    language: "hi",
    focus: "Biomolecules: board lesson",
    format: "lesson",
    coverage:
      "Board-focused biomolecules lesson covering the principal biological compound families. Supplement with topic practice for integrated structure-function comparisons.",
  },
  {
    videoId: "xHZREcntcY8",
    unitSlug: "formative-reinforcement",
    topicCodes: ["F.1"],
    language: "en",
    focus: "Surface chemistry: adsorption and catalysis",
    format: "lesson",
    coverage:
      "Older NCERT surface-chemistry lesson, part 1. Offered only as formative reinforcement, not as a claim that this withdrawn theory chapter is in the current board paper.",
  },
  {
    videoId: "F8CtJ5xSk54",
    unitSlug: "formative-reinforcement",
    topicCodes: ["F.1"],
    language: "en",
    focus: "Surface chemistry: colloids",
    format: "lesson",
    coverage:
      "Surface chemistry, part 2, supporting colloid concepts. Formative enrichment; practical preparation must be teacher-supervised.",
  },
  {
    videoId: "QNLwFXijkd8",
    unitSlug: "formative-reinforcement",
    topicCodes: ["F.2"],
    language: "en",
    focus: "Isolation of elements",
    format: "lesson",
    coverage:
      "Older NCERT metallurgy and isolation-of-elements chapter. Formative reinforcement only; use the current school syllabus to set assessment scope.",
  },
  {
    videoId: "q9gXiFfnCZw",
    unitSlug: "formative-reinforcement",
    topicCodes: ["F.3"],
    language: "en",
    focus: "Polymers",
    format: "lesson",
    coverage:
      "Polymer classification, preparation and examples from the older NCERT chapter. Formative reinforcement, not an additional board-theory requirement.",
  },
  {
    videoId: "e9R-jwdcDQU",
    unitSlug: "formative-reinforcement",
    topicCodes: ["F.4"],
    language: "en",
    focus: "Chemistry in everyday life",
    format: "lesson",
    coverage:
      "Older NCERT chapter on chemistry in everyday life. Academic enrichment only, not medical advice or an added board-theory requirement.",
  },
];

export const CHEMISTRY_12_VIDEOS: VideoSelection[] = chapters.map((lesson) => ({
  ...lesson,
  courseSlug: "cbse-chemistry-12",
}));
