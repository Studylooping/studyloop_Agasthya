import type { FrqItem, Hint, McSingleItem, Topic } from "@/lib/content/types";

const course = "cbse-science-9";
const version = "0.3.0";
const L = String.raw;

function base(unit: string, topic: string, kind: string, number: number, difficulty: 1 | 2 | 3, questionLatex: string, hints: [string, string, string]) {
  return {
    contentId: `${course}.${unit}.t${topic.replace(".", "-")}.${kind}.${number}`,
    course, unit, topic, difficulty, questionLatex, version,
    calculatorAllowed: false,
    skillTags: ["educator_evaluation_repair", topic],
    commonMisconceptions: [],
    hintLadder: hints.map((body, index) => ({ level: (index + 1) as Hint["level"], body })),
    reviewStatus: "human_review_required" as const,
    sourceType: "original_ai_assisted_question" as const,
  };
}

const biologyUnit = "u1-world-of-living";
const biology: (McSingleItem | FrqItem)[] = [
  {
    ...base(biologyUnit, "1.1", "mc", 201, 2,
      "A living plant cell is placed in a concentrated sugar solution. Its protoplast shrinks away from the cell wall. Which explanation accounts for this observation?",
      ["Identify which substance crosses the membrane.", "Compare water concentration inside and outside the cell.", "Link net water loss to a decrease in protoplast volume."]),
    kind: "mc_single", correctLetter: "C",
    choices: [
      { letter: "A", text: "Water enters the cell by osmosis, reducing the protoplast volume.", isCorrect: false, rationaleIfWrong: "Water entering would increase the cell contents' volume. In the concentrated external solution, the net movement of water is outward.", misconceptionTag: "reversed_osmosis_direction" },
      { letter: "B", text: "Sugar leaves the cell by osmosis, reducing the protoplast volume.", isCorrect: false, rationaleIfWrong: "Osmosis describes movement of water through a selectively permeable membrane, not movement of sugar.", misconceptionTag: "solute_instead_of_water" },
      { letter: "C", text: "Water leaves the cell by osmosis, reducing the protoplast volume.", isCorrect: true, rationaleIfWrong: null, misconceptionTag: null },
      { letter: "D", text: "The cell wall contracts and pushes the protoplast inward.", isCorrect: false, rationaleIfWrong: "The rigid cell wall keeps its outline. Water loss shrinks the protoplast, which pulls away from the wall.", misconceptionTag: "wall_contracts_in_plasmolysis" },
    ],
    workedSolution: [{ step: 1, explanation: "The surrounding concentrated sugar solution has a lower water concentration than the cell sap, so water moves out across the selectively permeable membrane." }, { step: 2, explanation: "Water loss reduces the protoplast volume while the cell wall retains its outline. The separation is plasmolysis." }],
  },
  {
    ...base(biologyUnit, "1.1", "mc", 202, 3,
      "Two equal strips cut from the same fresh potato are placed separately in distilled water and concentrated sugar solution for the same time. After blotting, the first gains mass and the second loses mass. Which statement explains both results?",
      ["The same tissue experiences different external concentrations.", "Consider net water movement across living cell membranes.", "Account for the gain and the loss together."]),
    kind: "mc_single", correctLetter: "B",
    choices: [
      { letter: "A", text: "Sugar moves into both strips by osmosis.", isCorrect: false, rationaleIfWrong: "Distilled water contains no sugar to enter the first strip, and osmosis concerns water rather than sugar.", misconceptionTag: "solute_instead_of_water" },
      { letter: "B", text: "Water enters cells in distilled water and leaves cells in concentrated sugar solution.", isCorrect: true, rationaleIfWrong: null, misconceptionTag: null },
      { letter: "C", text: "Water enters both strips, but their cell walls absorb different amounts of sugar.", isCorrect: false, rationaleIfWrong: "Net water entry cannot explain the second strip's mass loss. The cell membrane and the concentration difference determine the direction of osmosis.", misconceptionTag: "ignores_mass_loss" },
      { letter: "D", text: "Water leaves cells in distilled water and enters cells in concentrated sugar solution.", isCorrect: false, rationaleIfWrong: "Both directions are reversed. This predicts a loss in distilled water and a gain in sugar solution, opposite to the observations.", misconceptionTag: "reversed_osmosis_direction" },
    ],
    workedSolution: [{ step: 1, explanation: "The first strip gains water because water moves into its cells from distilled water." }, { step: 2, explanation: "The second strip loses water to the concentrated sugar solution. Blotting removes surface liquid so the mass change better reflects changes in the tissue." }],
  },
  {
    ...base(biologyUnit, "1.1", "case", 205, 2,
      'A living onion epidermal cell is placed in concentrated sugar solution. The cell wall keeps its outline, but the protoplast pulls away from it. A student records only the word "diffusion". Improve this explanation.',
      ["Separate the observation from its explanation.", "Which substance moves through the selectively permeable membrane?", "Explain why the protoplast changes volume while the wall keeps its outline."]),
    kind: "frq", responseType: "case",
    parts: [{ letter: "a", promptMarkdown: "State the observed change in the cell contents.", points: 1 }, { letter: "b", promptMarkdown: "Name the process by which water moves across the membrane.", points: 1 }, { letter: "c", promptMarkdown: "Explain the direction of movement and why 'diffusion' alone is incomplete.", points: 2 }],
    rubric: { maxPoints: 4, criteria: [
      { part: "a", points: 1, description: "States that the protoplast/cell contents shrink away from the unchanged cell wall." },
      { part: "b", points: 1, description: "Names osmosis (accept exosmosis). Plasmolysis names the visible result, not the transport process asked for." },
      { part: "c", points: 1, description: "States that net water movement is outward because the external solution has lower water concentration than the cell sap." },
      { part: "c", points: 1, description: "Explains that osmosis specifies water movement across a selectively permeable membrane, which the word diffusion alone does not specify." },
    ]},
    commonErrors: ["Naming sugar as the substance undergoing osmosis.", "Saying that the wall shrinks."],
    workedSolution: [{ part: "a", explanation: "The protoplast shrinks and separates from the cell wall, whose outline is unchanged." }, { part: "b", explanation: "Water moves by osmosis, specifically outward osmosis or exosmosis." }, { part: "c", explanation: "Water moves from the cell sap into the more concentrated external solution across the selectively permeable membrane. 'Diffusion' alone omits both the moving substance (water) and this membrane condition. The resulting shrinkage is plasmolysis." }],
  },
  {
    ...base(biologyUnit, "1.1", "case", 212, 3,
      'A fresh onion epidermal cell is first placed in concentrated sugar solution. Its protoplast shrinks away from the wall. The same cell is then transferred to water and the protoplast expands back towards the wall. A report claims, "The cell wall permanently shrank in sugar solution."',
      ["Follow the same cell through both treatments.", "Which boundary keeps its outline?", "Use the reversal in water to test the word permanently."]),
    kind: "frq", responseType: "case",
    parts: [{ letter: "a", promptMarkdown: "Identify the structure that changed volume in the first treatment.", points: 1 }, { letter: "b", promptMarkdown: "Explain its expansion after transfer to water.", points: 2 }, { letter: "c", promptMarkdown: "Use the observations to correct the report.", points: 1 }],
    rubric: { maxPoints: 4, criteria: [
      { part: "a", points: 1, description: "Identifies the protoplast/living cell contents, not the cell wall." },
      { part: "b", points: 1, description: "States that water enters the cell by osmosis from the dilute external medium." },
      { part: "b", points: 1, description: "Links water entry to increased protoplast volume and its return towards the wall (deplasmolysis)." },
      { part: "c", points: 1, description: "Rejects permanent wall shrinkage: the protoplast changed volume reversibly while the wall kept its outline." },
    ]},
    commonErrors: ["Treating plasmolysis as permanent contraction of the wall."],
    workedSolution: [{ part: "a", explanation: "The protoplast changed volume." }, { part: "b", explanation: "After transfer to water, water enters through the selectively permeable membrane by osmosis. The protoplast expands back towards the wall; this reversal is called deplasmolysis." }, { part: "c", explanation: "The wall did not permanently shrink. Reversible water loss and gain changed the volume of the living contents while the wall retained its outline." }],
  },
  {
    ...base(biologyUnit, "1.1", "laq", 206, 3,
      "An onion epidermal cell and an animal cell are each placed in distilled water. Both initially take in water. The plant cell becomes turgid, while the animal cell may burst. Explain this difference using cell structure.",
      ["Both cells have a plasma membrane, but only one has a cell wall.", "Water enters both cells by osmosis.", "Consider which structure can oppose further expansion."]),
    kind: "frq", responseType: "laq",
    parts: [{ letter: "a", promptMarkdown: "Explain why water initially enters both cells.", points: 1 }, { letter: "b", promptMarkdown: "Explain why the plant cell can become turgid without bursting under these conditions.", points: 2 }, { letter: "c", promptMarkdown: "Explain why the animal cell is more likely to burst.", points: 1 }],
    rubric: { maxPoints: 4, criteria: [
      { part: "a", points: 1, description: "States that water enters by osmosis from the more dilute external medium through the selectively permeable membrane." },
      { part: "b", points: 1, description: "Identifies the rigid plant cell wall as resisting expansion." },
      { part: "b", points: 1, description: "Explains that pressure develops against the wall, limiting further net water entry/expansion as the cell becomes turgid." },
      { part: "c", points: 1, description: "States that the animal cell lacks the supporting cell wall and excessive water uptake can rupture its membrane." },
    ]},
    commonErrors: ["Claiming that a cell wall prevents all water entry.", "Saying that animal cells have no plasma membrane."],
    workedSolution: [{ part: "a", explanation: "Water enters each cell by osmosis because distilled water is more dilute than the cell contents." }, { part: "b", explanation: "The rigid cell wall resists expansion. Water uptake develops pressure against the wall, and the opposing pressure limits further net entry as the cell becomes turgid." }, { part: "c", explanation: "An animal cell has a plasma membrane but no rigid cell wall. Excessive water uptake can therefore rupture the membrane." }],
  },
];

const mixture: FrqItem = {
  ...base("u2-matter-nature-behaviour", "2.1", "case", 205, 3,
    "A student dissolves 5 g of salt completely in 95 g of water. No material is lost. The student labels the solution '5% by mass'. Later, 25 g of water is added to this solution.",
    ["Use total solution mass in the denominator.", "Adding water changes solution mass but not salt mass.", "Calculate concentration separately before and after dilution."]),
  kind: "frq", responseType: "case",
  parts: [{ letter: "a", promptMarkdown: "Find the initial solution mass.", points: 1 }, { letter: "b", promptMarkdown: "Check the student's label with a calculation.", points: 1 }, { letter: "c", promptMarkdown: "Calculate the mass percentage after the water is added.", points: 2 }],
  rubric: { maxPoints: 4, criteria: [
    { part: "a", points: 1, description: L`Adds solute and solvent masses: $5+95=100\,\mathrm{g}$.` },
    { part: "b", points: 1, description: L`Uses $100(5/100)=5\%$ and accepts the label as mass percentage.` },
    { part: "c", points: 1, description: L`Keeps salt mass at $5\,\mathrm{g}$ and obtains a new solution mass of $125\,\mathrm{g}$.` },
    { part: "c", points: 1, description: L`Uses $100(5/125)=4\%$ by mass. Accept a correct method using a carried-forward solution mass.` },
  ]},
  commonErrors: ["Dividing by solvent mass instead of solution mass.", "Changing salt mass when only water is added."],
  workedSolution: [{ part: "a", explanation: "The initial solution mass is 5 + 95 = 100 g." }, { part: "b", explanation: "Mass percentage uses solute mass divided by total solution mass, so the label is correct.", math: L`\frac{5}{100}\times100=5\%` }, { part: "c", explanation: "Salt mass stays at 5 g. The new solution mass is 100 + 25 = 125 g.", math: L`\frac{5}{125}\times100=4\%` }],
};

const motion: FrqItem = {
  ...base("u3-motion-force-work-sound", "3.1", "case", 205, 3,
    "A student walks 60 m east in 12 s and then 20 m west in 8 s along the same straight path. Take east as positive. A classmate claims that average speed and average velocity are equal for the whole journey.",
    ["Calculate total path length and net displacement separately.", "Use the full 20 s for both averages.", "Direction matters for displacement but not for distance."]),
  kind: "frq", responseType: "case",
  parts: [{ letter: "a", promptMarkdown: "Find the average speed during the first 12 s.", points: 1 }, { letter: "b", promptMarkdown: "Find the average speed for the whole journey.", points: 1 }, { letter: "c", promptMarkdown: "Calculate the average velocity for the whole journey and assess the claim.", points: 2 }],
  rubric: { maxPoints: 4, criteria: [
    { part: "a", points: 1, description: L`Uses $60/12=5\,\mathrm{m\,s^{-1}}$.` },
    { part: "b", points: 1, description: L`Uses total distance and time: $(60+20)/(12+8)=4\,\mathrm{m\,s^{-1}}$.` },
    { part: "c", points: 1, description: L`Uses signed displacement: $(60-20)/20=+2\,\mathrm{m\,s^{-1}}$, or $2\,\mathrm{m\,s^{-1}}$ east.` },
    { part: "c", points: 1, description: "Rejects the claim because the return segment reduces net displacement but adds to total distance; the magnitudes are 2 and 4 m/s respectively." },
  ]},
  commonErrors: ["Adding the westward distance to eastward displacement.", "Averaging the two segment speeds without weighting by time."],
  workedSolution: [{ part: "a", explanation: "For the first segment, speed is distance divided by elapsed time.", math: L`60/12=5\,\mathrm{m\,s^{-1}}` }, { part: "b", explanation: "The path length is 80 m and total time is 20 s.", math: L`80/20=4\,\mathrm{m\,s^{-1}}` }, { part: "c", explanation: "Net displacement is 40 m east. Average velocity is 2 m/s east, whose magnitude differs from the average speed of 4 m/s. The classmate's claim is false.", math: L`\bar v=\frac{60-20}{20}=+2\,\mathrm{m\,s^{-1}}` }],
};

export function repairedTopicsFor(unit: string): Topic[] {
  const items = [...biology, mixture, motion].filter((item) => item.unit === unit);
  if (!items.length) return [];
  return [{ topicCode: items[0].topic, title: unit === biologyUnit ? "Cell Structure and Cell Processes" : unit === mixture.unit ? "Mixtures and Solutions" : "Motion in One Dimension", items }];
}
