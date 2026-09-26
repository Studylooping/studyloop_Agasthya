import { mc, written } from "../chapter-practice";
const L = String.raw;
const t = "1.1";
export const measurementExpansion = [
  mc(
    t,
    101,
    1,
    L`How many significant figures are present in the measured mass $0.03040\,\mathrm{g}$?`,
    "4",
    [
      [
        "2",
        "The zero between 3 and 4 and the final decimal zero are significant.",
      ],
      [
        "3",
        "The final zero records measurement precision and must be counted.",
      ],
      [
        "6",
        "The two zeros before the first non-zero digit only locate the decimal point.",
      ],
    ],
    [
      "Find the first non-zero digit.",
      "Zeros between significant digits count.",
      "A trailing zero after a decimal point also counts.",
    ],
    ["The significant digits are 3, 0, 4 and the final 0: four in total."],
    "significant_figures",
  ),
  mc(
    t,
    102,
    2,
    L`A balance records masses $15.68\,\mathrm{g}$ and $0.4\,\mathrm{g}$. Their sum, reported with appropriate precision, is`,
    L`$16.1\,\mathrm{g}$`,
    [
      [
        L`$16.08\,\mathrm{g}$`,
        "This retains more decimal places than the less precise measurement.",
      ],
      [
        L`$16\,\mathrm{g}$`,
        "Addition is limited by decimal places, not by the number of significant figures.",
      ],
      [
        L`$16.0\,\mathrm{g}$`,
        "The hundredths digit in 16.08 requires rounding the tenths digit upward.",
      ],
    ],
    [
      "Add before rounding.",
      "The second mass is recorded to one decimal place.",
      L`Round $16.08$ to the nearest tenth.`,
    ],
    [
      L`The unrounded sum is $16.08\,\mathrm{g}$.`,
      L`Retaining one decimal place gives $16.1\,\mathrm{g}$.`,
    ],
    "addition_precision",
  ),
  mc(
    t,
    103,
    2,
    L`A liquid has measured mass $12.48\,\mathrm{g}$ and volume $4.0\,\mathrm{mL}$. Its density, correctly reported, is`,
    L`$3.1\,\mathrm{g\,mL^{-1}}$`,
    [
      [
        L`$3.12\,\mathrm{g\,mL^{-1}}$`,
        "The volume permits only two significant figures in the quotient.",
      ],
      [
        L`$3\,\mathrm{g\,mL^{-1}}$`,
        "The data support two significant figures, not one.",
      ],
      [
        L`$0.32\,\mathrm{g\,mL^{-1}}$`,
        "This comes from dividing volume by mass instead of mass by volume.",
      ],
    ],
    [
      "Use mass divided by volume.",
      "The volume has two significant figures.",
      L`Round $12.48/4.0=3.12$ to two significant figures.`,
    ],
    [
      L`Density is $12.48/4.0=3.12\,\mathrm{g\,mL^{-1}}$.`,
      L`The correct report is $3.1\,\mathrm{g\,mL^{-1}}$.`,
    ],
    "density_precision",
  ),
  mc(
    t,
    104,
    2,
    L`The density $1.25\,\mathrm{g\,cm^{-3}}$ expressed in SI units is`,
    L`$1.25\times10^3\,\mathrm{kg\,m^{-3}}$`,
    [
      [
        L`$1.25\,\mathrm{kg\,m^{-3}}$`,
        "Both the mass unit and the cubed length unit must be converted.",
      ],
      [
        L`$1.25\times10^{-3}\,\mathrm{kg\,m^{-3}}$`,
        "Converting grams alone leaves the volume unit unconverted.",
      ],
      [
        L`$1.25\times10^6\,\mathrm{kg\,m^{-3}}$`,
        "This converts cubic centimetres but not grams.",
      ],
    ],
    [
      L`Use $1\,\mathrm{g}=10^{-3}\,\mathrm{kg}$.`,
      L`Use $1\,\mathrm{cm^3}=10^{-6}\,\mathrm{m^3}$.`,
      "Divide the two conversion factors.",
    ],
    [
      L`$1\,\mathrm{g\,cm^{-3}}=10^{-3}/10^{-6}=10^3\,\mathrm{kg\,m^{-3}}$.`,
      L`Thus the density is $1.25\times10^3\,\mathrm{kg\,m^{-3}}$.`,
    ],
    "density_units",
  ),
  mc(
    t,
    105,
    1,
    L`Which scientific-notation form preserves the precision of $0.000708\,\mathrm{g}$?`,
    L`$7.08\times10^{-4}\,\mathrm{g}$`,
    [
      [
        L`$7.8\times10^{-4}\,\mathrm{g}$`,
        "Removing the internal zero changes the value.",
      ],
      [
        L`$7.080\times10^{-4}\,\mathrm{g}$`,
        "The extra final zero claims an additional significant figure.",
      ],
      [
        L`$7.08\times10^4\,\mathrm{g}$`,
        "A value smaller than one requires a negative exponent here.",
      ],
    ],
    [
      "Move the decimal to immediately after 7.",
      "Count how many places it moves.",
      "Keep the internal zero but do not introduce a final zero.",
    ],
    [
      L`The decimal moves four places right, giving $7.08\times10^{-4}\,\mathrm{g}$ with three significant figures.`,
    ],
    "scientific_notation",
  ),
  mc(
    t,
    106,
    2,
    L`At the same temperature and pressure, $30\,\mathrm{mL}$ of hydrogen combines completely with $15\,\mathrm{mL}$ of oxygen to give $30\,\mathrm{mL}$ of steam. These measured gas volumes directly illustrate`,
    "Gay-Lussac's law of gaseous volumes",
    [
      [
        "the law of definite proportions",
        "That law describes fixed mass composition; the stated evidence is a ratio of gas volumes.",
      ],
      [
        "the law of multiple proportions",
        "Only one compound is formed, so the data do not compare different compounds.",
      ],
      [
        "conservation of volume",
        "The initial total volume is 45 mL but the final steam volume is 30 mL.",
      ],
    ],
    [
      "Check whether the data are masses or volumes.",
      "Compare the volumes under the same physical conditions.",
      "Their ratio is 2:1:2.",
    ],
    [
      "The reacting and product gas volumes are in a simple whole-number ratio at the same temperature and pressure.",
    ],
    "gaseous_volume_law",
  ),
  mc(
    t,
    107,
    3,
    L`Two pure samples of an oxide contain $2.4\,\mathrm{g}$ metal with $1.6\,\mathrm{g}$ oxygen and $6.0\,\mathrm{g}$ metal with $4.0\,\mathrm{g}$ oxygen. Which inference is justified?`,
    "The data agree with a fixed metal-to-oxygen mass ratio.",
    [
      [
        "The samples must have equal total masses.",
        "Fixed composition does not mean equal sample size.",
      ],
      [
        "The samples demonstrate multiple proportions.",
        "The mass ratio is the same in both samples, rather than two different ratios.",
      ],
      [
        "The metal-to-oxygen atomic ratio is necessarily 3:2.",
        "A mass ratio cannot be read as an atomic ratio without atomic masses.",
      ],
    ],
    [
      "Reduce each metal-to-oxygen mass ratio.",
      L`Compare $2.4/1.6$ and $6.0/4.0$.`,
      "Both quotients are 1.5.",
    ],
    [
      "Both samples have metal:oxygen mass ratio 3:2, consistent with definite proportions.",
      "The data alone do not establish an atomic ratio.",
    ],
    "definite_proportions",
  ),
  mc(
    t,
    108,
    2,
    L`An open flask loses mass when a carbonate reacts with acid and releases carbon dioxide. Which explanation is correct?`,
    "Gas leaves the weighed system; total mass including the escaped gas is conserved.",
    [
      [
        "The reaction destroys some matter.",
        "Chemical reactions conserve atoms; gas escaping changes the measured system.",
      ],
      [
        "Every gas has zero mass.",
        "Carbon dioxide has mass even when it is no longer on the balance.",
      ],
      [
        "Conservation of mass applies only to solids.",
        "The law includes solids, liquids and gases.",
      ],
    ],
    [
      "Identify what the balance actually weighs.",
      "The flask is open to the surroundings.",
      "Include the carbon dioxide that escaped.",
    ],
    [
      "The final flask is lighter because carbon dioxide has crossed the system boundary, not because matter was destroyed.",
    ],
    "system_boundary",
  ),
  mc(
    t,
    109,
    2,
    "Which observation requires modification of Dalton's claim that all atoms of an element have identical masses?",
    "The existence of isotopes",
    [
      [
        "A compound has fixed composition.",
        "This supports definite composition rather than contradicting equal atomic masses.",
      ],
      [
        "Atoms combine in simple ratios.",
        "This is one of the successful features of Dalton's model.",
      ],
      [
        "Mass is conserved in chemical reactions.",
        "Mass conservation does not require every atom of an element to have identical mass.",
      ],
    ],
    [
      "Look for atoms of the same element.",
      "They can differ in neutron number.",
      "Their masses therefore need not be equal.",
    ],
    [
      "Isotopes belong to the same element but have different masses, so the identical-mass postulate needs revision.",
    ],
    "dalton_isotopes",
  ),
  mc(
    t,
    110,
    2,
    "A uniform brass sample contains copper and zinc, and different brass samples may have different proportions of these metals. It is best classified as",
    "a homogeneous mixture",
    [
      [
        "a compound of fixed composition",
        "Variable composition distinguishes this alloy from a pure compound.",
      ],
      ["an element", "The sample contains two different elements."],
      [
        "a heterogeneous mixture",
        "The question specifies uniform composition within the sample.",
      ],
    ],
    [
      "Separate uniformity from fixed chemical composition.",
      "A mixture can be uniform.",
      "The copper-to-zinc ratio is not fixed across all samples.",
    ],
    [
      "Uniformity makes the mixture homogeneous; variable composition prevents classification as a single pure compound.",
    ],
    "classification_of_matter",
  ),
  mc(
    t,
    111,
    2,
    L`Two measured masses are $2.035\,\mathrm{g}$ and $1.2\,\mathrm{g}$. Their difference should be reported as`,
    L`$0.8\,\mathrm{g}$`,
    [
      [
        L`$0.835\,\mathrm{g}$`,
        "This keeps three decimal places although one reading has only one.",
      ],
      [
        L`$0.84\,\mathrm{g}$`,
        "Subtraction uses the least precise decimal place, not two significant figures.",
      ],
      [
        L`$0.9\,\mathrm{g}$`,
        "The hundredths digit of 0.835 is 3, so the tenths digit is not rounded upward.",
      ],
    ],
    [
      "Subtract without intermediate rounding.",
      "The second mass is precise only to tenths.",
      L`Round $0.835$ directly to one decimal place.`,
    ],
    [L`$2.035-1.2=0.835\,\mathrm{g}$, which is reported as $0.8\,\mathrm{g}$.`],
    "subtraction_precision",
  ),
  mc(
    t,
    112,
    2,
    L`A standard has accepted mass $10.00\,\mathrm{g}$. Three readings are $9.80$, $9.81$ and $9.80\,\mathrm{g}$. The readings are`,
    "precise but inaccurate relative to the accepted value",
    [
      [
        "accurate but imprecise",
        "The readings are tightly grouped but all below the accepted value.",
      ],
      [
        "both accurate and precise",
        "Their closeness to one another does not remove the systematic offset.",
      ],
      [
        "neither precise nor accurate",
        "The small spread shows good repeatability.",
      ],
    ],
    [
      "Compare the readings with one another.",
      "Then compare them with 10.00 g.",
      "Repeatability and agreement with the accepted value are different properties.",
    ],
    [
      "The spread is only 0.01 g, but the readings are about 0.20 g low: good precision with poor accuracy.",
    ],
    "accuracy_precision",
  ),
  mc(
    t,
    113,
    2,
    L`A micropipette delivers $247\,\mathrm{\mu L}$. This volume in litres is`,
    L`$2.47\times10^{-4}\,\mathrm{L}$`,
    [
      [L`$0.247\,\mathrm{L}$`, "This treats microlitres as millilitres."],
      [
        L`$2.47\times10^{-6}\,\mathrm{L}$`,
        "The factor 247 must be retained when converting each microlitre.",
      ],
      [
        L`$247\times10^6\,\mathrm{L}$`,
        "The micro prefix denotes one millionth, not one million.",
      ],
    ],
    [
      L`Micro means $10^{-6}$.`,
      L`Write $247\times10^{-6}\,\mathrm{L}$.`,
      "Express the result in standard scientific notation.",
    ],
    [L`$247\times10^{-6}=2.47\times10^{-4}\,\mathrm{L}$.`],
    "metric_prefix",
  ),
  mc(
    t,
    114,
    2,
    L`An empty vessel weighs $52.14\,\mathrm{g}$ and the vessel with a powder weighs $56.287\,\mathrm{g}$. The powder mass should be reported as`,
    L`$4.15\,\mathrm{g}$`,
    [
      [
        L`$4.147\,\mathrm{g}$`,
        "The empty-vessel reading does not support thousandths.",
      ],
      [
        L`$4.1\,\mathrm{g}$`,
        "Both readings support hundredths, so rounding to tenths loses justified precision.",
      ],
      [
        L`$108.43\,\mathrm{g}$`,
        "The powder mass is the difference, not the sum.",
      ],
    ],
    [
      "Subtract the empty-vessel mass.",
      "Keep guard digits until the last step.",
      "The answer is limited to two decimal places.",
    ],
    [
      L`The difference is $56.287-52.14=4.147\,\mathrm{g}$.`,
      L`Rounding to hundredths gives $4.15\,\mathrm{g}$.`,
    ],
    "weighing_by_difference",
  ),
  mc(
    t,
    115,
    2,
    L`Each of exactly three identical pellets has measured mass $1.25\,\mathrm{g}$. Using this measurement, their combined mass should be reported as`,
    L`$3.75\,\mathrm{g}$`,
    [
      [
        L`$4\,\mathrm{g}$`,
        "The exact count of three does not restrict significant figures to one.",
      ],
      [
        L`$3.8\,\mathrm{g}$`,
        "The mass measurement supports three significant figures.",
      ],
      [
        L`$3.750\,\mathrm{g}$`,
        "The extra zero implies more precision than the measured pellet mass.",
      ],
    ],
    [
      "Distinguish an exact count from a measurement.",
      "Multiply the measured mass by three.",
      "Retain three significant figures.",
    ],
    [
      L`$3\times1.25=3.75\,\mathrm{g}$. The integer count is exact and does not limit precision.`,
    ],
    "exact_numbers",
  ),
  mc(
    t,
    116,
    2,
    L`In two oxides, $3.0\,\mathrm{g}$ of the same element combines with $1.2\,\mathrm{g}$ and $1.8\,\mathrm{g}$ of oxygen. The oxygen masses for fixed element mass are in the ratio`,
    L`$2:3$`,
    [
      [L`$3:2$`, "This reverses the order of the two samples."],
      [
        L`$1:1$`,
        "Only the element mass is the same; the oxygen masses differ.",
      ],
      [L`$5:8$`, "The law compares oxygen masses, not total oxide masses."],
    ],
    [
      "The element mass is already fixed.",
      L`Reduce $1.2:1.8$.`,
      "Divide both terms by 0.6.",
    ],
    [
      L`$1.2:1.8=2:3$, a simple whole-number ratio consistent with multiple proportions.`,
    ],
    "multiple_proportions",
  ),
  mc(
    t,
    117,
    2,
    "Assertion: A solution can have uniform composition throughout without being a pure substance. Reason: The solute-to-solvent ratio can vary from one solution to another. Choose the correct statement.",
    "Both are true, and the reason explains the assertion.",
    [
      [
        "Both are true, but the reason does not explain the assertion.",
        "Variable composition explains why uniformity alone does not establish purity.",
      ],
      [
        "The assertion is true, but the reason is false.",
        "Different concentrations of the same solution can be prepared.",
      ],
      [
        "The assertion is false, but the reason is true.",
        "A homogeneous mixture is uniform but is not a pure substance.",
      ],
    ],
    [
      "Uniformity describes the distribution within one sample.",
      "Purity also requires fixed chemical identity and composition.",
      "Compare dilute and concentrated solutions of the same solute.",
    ],
    [
      "Solutions are homogeneous mixtures. Their composition is variable, unlike that of a pure compound, so both statements are true and linked.",
    ],
    "assertion_reason_mixtures",
  ),
  mc(
    t,
    118,
    2,
    L`The quotient of measured values $4.62/1.4$ should be written as`,
    L`$3.3$`,
    [
      [L`$3.30$`, "The divisor permits only two significant figures."],
      [L`$3$`, "Two significant figures are justified."],
      [L`$3.300$`, "This overstates the precision by two significant figures."],
    ],
    [
      "Calculate the quotient.",
      "Count significant figures in both inputs.",
      "The divisor has two significant figures.",
    ],
    [L`$4.62/1.4=3.3$ to two significant figures.`],
    "division_precision",
  ),
  mc(
    t,
    119,
    2,
    L`A container holds only oxygen molecules $\mathrm{O_2}$ and ozone molecules $\mathrm{O_3}$. Which statement is correct?`,
    "It contains one element in two molecular forms.",
    [
      [
        "It contains two elements.",
        "Both molecular forms contain only oxygen atoms.",
      ],
      [
        "Ozone is a compound of oxygen and another element.",
        "Every atom in ozone is oxygen.",
      ],
      [
        "All its molecules have the same mass.",
        "An ozone molecule has three oxygen atoms while an oxygen molecule has two.",
      ],
    ],
    [
      "Count the kinds of atoms, not the kinds of molecules.",
      "Both formulae use only O.",
      "Different molecular forms of one element do not create a new element.",
    ],
    [
      "The two species are different molecular forms of oxygen; no second element is present.",
    ],
    "element_vs_molecule",
  ),
  mc(
    t,
    120,
    2,
    L`In a closed apparatus, $5.60\,\mathrm{g}$ iron combines completely with $3.20\,\mathrm{g}$ sulfur and no other product is formed. The mass of the product is`,
    L`$8.80\,\mathrm{g}$`,
    [
      [
        L`$2.40\,\mathrm{g}$`,
        "Subtracting reactant masses does not give the mass of a combination product.",
      ],
      [
        L`$5.60\,\mathrm{g}$`,
        "Sulfur becomes part of the product and its mass must be included.",
      ],
      [
        L`$17.60\,\mathrm{g}$`,
        "Reaction coefficients do not justify doubling the actual masses supplied.",
      ],
    ],
    [
      "Both reactants are fully incorporated.",
      "The apparatus is closed.",
      "Add the two masses, retaining two decimal places.",
    ],
    [L`Conservation of mass gives $5.60+3.20=8.80\,\mathrm{g}$.`],
    "mass_conservation",
  ),

  written(
    t,
    101,
    "vsaq",
    2,
    L`Round the measured mass $0.004786\,\mathrm{g}$ to three significant figures and express the result in scientific notation.`,
    [
      [
        "Show the rounded value and its equivalent scientific notation.",
        L`The first three significant digits are 4, 7 and 8; the next digit is 6, so the mass rounds to $0.00479\,\mathrm{g}$.`,
        L`In scientific notation this is $4.79\times10^{-3}\,\mathrm{g}$.`,
      ],
    ],
    [
      "Ignore leading zeros when counting significant figures.",
      "Use the fourth significant digit to round the third.",
      "Preserve three significant figures when moving the decimal point.",
    ],
    ["Counting leading zeros as significant digits."],
    "round_and_normalise",
  ),
  written(
    t,
    102,
    "vsaq",
    2,
    L`A sample volume is $2.50\,\mathrm{cm^3}$. Express it in $\mathrm{m^3}$ with justified significant figures.`,
    [
      [
        "Show the conversion.",
        L`$1\,\mathrm{cm^3}=(10^{-2}\,\mathrm{m})^3=10^{-6}\,\mathrm{m^3}$.`,
        L`The volume is $2.50\times10^{-6}\,\mathrm{m^3}$, retaining three significant figures.`,
      ],
    ],
    [
      "The centimetre-to-metre factor must be cubed.",
      "The conversion factor is exact.",
      "Keep the three significant figures of 2.50.",
    ],
    ["Using the linear conversion factor for a volume."],
    "cubic_conversion",
  ),
  written(
    t,
    103,
    "vsaq",
    2,
    "Dalton proposed that atoms of an element are identical in mass. State one modern observation that modifies this proposal and explain it.",
    [
      [
        "Give the observation and its implication.",
        "Isotopes of the same element exist.",
        "They have the same atomic number but different masses, so identical elemental identity does not imply identical atomic mass.",
      ],
    ],
    [
      "Consider isotopes.",
      "Identify what is unchanged between isotopes.",
      "Contrast atomic number with atomic mass.",
    ],
    ["Claiming isotopes are different elements."],
    "dalton_revision",
  ),
  written(
    t,
    104,
    "vsaq",
    2,
    "Can a homogeneous material always be classified as a pure substance? Justify with one example.",
    [
      [
        "Give a conclusion and a supporting example.",
        "No; uniformity alone does not imply a pure substance.",
        "Salt solution is homogeneous but its concentration can vary, so it is a mixture.",
      ],
    ],
    [
      "Consider a solution.",
      "Uniformity concerns one sample.",
      "Pure substances have a definite chemical composition.",
    ],
    ["Equating homogeneous with pure."],
    "homogeneity_purity",
  ),
  written(
    t,
    105,
    "saq",
    2,
    L`A sample has mass $18.0\,\mathrm{g}$ and volume $7.50\,\mathrm{mL}$. Calculate its density and state the precision rule used.`,
    [
      [
        "Calculate and report the density.",
        L`Use $\rho=m/V$.`,
        L`$\rho=18.0/7.50=2.40\,\mathrm{g\,mL^{-1}}$.`,
        "Both measurements have three significant figures, so the quotient is reported with three.",
      ],
    ],
    [
      "Use mass per unit volume.",
      "Both values contain three significant figures.",
      "A final zero may be needed in the answer.",
    ],
    ["Writing 2.4 and losing a justified significant figure."],
    "density_reporting",
  ),
  written(
    t,
    106,
    "saq",
    3,
    L`Two sulfur oxides contain respectively $2.00\,\mathrm{g}$ sulfur with $2.00\,\mathrm{g}$ oxygen, and $4.00\,\mathrm{g}$ sulfur with $6.00\,\mathrm{g}$ oxygen. Identify and demonstrate the relevant law.`,
    [
      [
        "Compare oxygen masses for a fixed sulfur mass.",
        L`For $2.00\,\mathrm{g}$ sulfur, the second oxide contains $3.00\,\mathrm{g}$ oxygen.`,
        "The oxygen masses are in the ratio 2:3.",
        "The simple whole-number ratio illustrates the law of multiple proportions.",
      ],
    ],
    [
      "Do not compare oxygen masses until sulfur masses agree.",
      "Halve the data for the second sample.",
      "Reduce the resulting oxygen ratio.",
    ],
    ["Using 2:6 without fixing sulfur mass."],
    "multiple_proportion_normalisation",
  ),
  written(
    t,
    107,
    "saq",
    2,
    L`A student evaluates $(7.26+0.6)\,\mathrm{g}$ as $7.86\,\mathrm{g}$. Correct the report and explain the rule.`,
    [
      [
        "Show the unrounded result, the limiting place, and the final report.",
        L`The arithmetic sum is $7.86\,\mathrm{g}$.`,
        "The less precise reading is recorded to tenths, so the sum is limited to tenths.",
        L`The reported result is $7.9\,\mathrm{g}$ because the hundredths digit is 6.`,
      ],
    ],
    [
      "Addition depends on decimal places.",
      "The 0.6 g reading limits the answer.",
      "Apply the rounding rule at the tenths place.",
    ],
    ["Using the one significant figure in 0.6 as a multiplication rule."],
    "addition_rounding",
  ),
  written(
    t,
    108,
    "saq",
    2,
    L`A stoppered reaction vessel weighs $126.48\,\mathrm{g}$ before mixing its contents and $126.48\,\mathrm{g}$ afterwards. A gas has formed inside. Explain these observations.`,
    [
      [
        "Explain the constant mass despite gas formation.",
        "The vessel is closed, so no matter crosses its boundary.",
        "Gas is matter and its mass is included in the total weighed mass.",
        "Atoms are rearranged in the reaction rather than destroyed, so the total mass remains constant.",
      ],
    ],
    [
      "Define the system as vessel plus contents.",
      "Gas formation does not imply gas loss.",
      "Apply atom conservation to the whole system.",
    ],
    ["Claiming the gas has no mass."],
    "closed_system_mass",
  ),
  written(
    t,
    109,
    "saq",
    2,
    L`Convert $0.0850\,\mathrm{kg}$ into grams and milligrams. State why the number of significant figures is unchanged.`,
    [
      [
        "Give both conversions and the precision argument.",
        L`$0.0850\,\mathrm{kg}=85.0\,\mathrm{g}$.`,
        L`This equals $8.50\times10^4\,\mathrm{mg}$.`,
        "The metric conversion factors are exact, so the original three significant figures are retained.",
      ],
    ],
    [
      "A kilogram contains 1000 grams.",
      "A gram contains 1000 milligrams.",
      "Use scientific notation to show the significant figures unambiguously.",
    ],
    ["Reporting 85000 without clarifying significant figures."],
    "mass_conversion",
  ),
  written(
    t,
    110,
    "saq",
    3,
    L`An empty bottle has mass $21.26\,\mathrm{g}$; the filled bottle has mass $31.64\,\mathrm{g}$. The liquid volume is $8.0\,\mathrm{mL}$. Find the density to appropriate precision.`,
    [
      [
        "Find the liquid mass and then its density.",
        L`Liquid mass $=31.64-21.26=10.38\,\mathrm{g}$.`,
        L`Unrounded density $=10.38/8.0=1.2975\,\mathrm{g\,mL^{-1}}$.`,
        L`The volume limits the result to two significant figures: $1.3\,\mathrm{g\,mL^{-1}}$.`,
      ],
    ],
    [
      "Subtract the bottle mass first.",
      "Carry guard digits into the division.",
      "The volume is the least precise input to the quotient.",
    ],
    ["Dividing the filled-bottle mass by the liquid volume."],
    "tare_and_density",
  ),
  written(
    t,
    111,
    "saq",
    2,
    "Classify dry air, distilled water, and copper as mixture, compound, or element. Give a reason for each classification.",
    [
      [
        "Classify all three.",
        "Dry air is a mixture because its constituent gases are physically mixed and their proportions can vary.",
        "Distilled water is a compound: hydrogen and oxygen are chemically combined in a fixed composition.",
        "Copper is an element because it contains only one type of atom by atomic number.",
      ],
    ],
    [
      "Ask whether there is one or more than one element.",
      "For multiple elements, distinguish chemical combination from physical mixing.",
      "Fixed composition identifies a compound.",
    ],
    ["Calling dry air a compound because it is uniform."],
    "matter_classification",
  ),
  written(
    t,
    112,
    "saq",
    3,
    L`At identical temperature and pressure, $40\,\mathrm{mL}$ carbon monoxide combines with $20\,\mathrm{mL}$ oxygen to form $40\,\mathrm{mL}$ carbon dioxide. Explain why this does not violate conservation of mass.`,
    [
      [
        "Distinguish the two laws involved.",
        "The gas volumes are in the simple ratio 2:1:2, illustrating the law of gaseous volumes.",
        "Conservation of mass does not require conservation of gas volume or number of molecules.",
        L`The balanced equation $\mathrm{2CO+O_2\rightarrow2CO_2}$ preserves both carbon and oxygen atoms.`,
      ],
    ],
    [
      "Compare atom counts in the equation.",
      "Volume and mass are different quantities.",
      "The same gas volume need not have the same mass for different gases.",
    ],
    ["Assuming volumes must add during a chemical reaction."],
    "mass_vs_volume",
  ),
  written(
    t,
    113,
    "laq",
    3,
    L`For a reference liquid volume of $25.00\,\mathrm{mL}$, group A records $24.60,24.61,24.60\,\mathrm{mL}$; group B records $24.98,25.02,25.00\,\mathrm{mL}$.`,
    [
      [
        "Compare precision and accuracy of the groups.",
        L`Group A has a range of $0.01\,\mathrm{mL}$; group B has a range of $0.04\,\mathrm{mL}$.`,
        "Group A is more precise because its readings are more tightly grouped.",
        L`Group A's mean is about $24.60\,\mathrm{mL}$ whereas group B's mean is $25.00\,\mathrm{mL}$.`,
        "Group B is more accurate relative to the reference.",
      ],
      [
        "Suggest one suitable check for group A.",
        "Check instrument calibration or zero error because a repeated offset can cause precise but inaccurate readings.",
      ],
    ],
    [
      "Calculate spreads before judging precision.",
      "Compare means with the reference for accuracy.",
      "A consistent bias can survive repeated readings.",
    ],
    ["Treating repeated identical readings as proof of accuracy."],
    "accuracy_data",
  ),
  written(
    t,
    114,
    "laq",
    3,
    L`Two samples claimed to be the same pure oxide contain: sample P, $7.20\,\mathrm{g}$ metal and $4.80\,\mathrm{g}$ oxygen; sample Q, $10.80\,\mathrm{g}$ metal and $8.00\,\mathrm{g}$ oxygen.`,
    [
      [
        "Test the claim using mass ratios.",
        L`Sample P has metal:oxygen ratio $7.20:4.80=3:2$.`,
        L`At this ratio, $10.80\,\mathrm{g}$ metal should combine with $7.20\,\mathrm{g}$ oxygen.`,
        L`Sample Q has $0.80\,\mathrm{g}$ more oxygen than this prediction.`,
      ],
      [
        "State what the discrepancy does and does not establish.",
        "As stated, the data are inconsistent with both samples being the same pure compound with fixed composition.",
        "Impurity, a different compound, or experimental error should be investigated; the data do not establish failure of the law.",
      ],
    ],
    [
      "Use sample P as the fixed-composition reference.",
      "Scale its masses by 1.5.",
      "Separate inconsistent data from a disproved physical law.",
    ],
    ["Calling the law false without checking purity or measurements."],
    "definite_proportion_evaluation",
  ),
  written(
    t,
    115,
    "laq",
    3,
    L`A liquid is measured using an empty-container mass of $38.216\,\mathrm{g}$, filled mass of $62.80\,\mathrm{g}$, and volume $20.0\,\mathrm{mL}$.`,
    [
      [
        "Find the liquid mass, showing the unrounded difference and its reported precision.",
        L`The unrounded difference is $62.80-38.216=24.584\,\mathrm{g}$.`,
        L`The mass is limited to hundredths; rounding the thousandths digit gives $24.58\,\mathrm{g}$.`,
      ],
      [
        "Calculate the density using guard digits and explain your final precision.",
        L`Using the unrounded difference gives $24.584/20.0=1.2292\,\mathrm{g\,mL^{-1}}$.`,
        "The volume has three significant figures and limits the quotient.",
        L`The density is $1.23\,\mathrm{g\,mL^{-1}}$.`,
      ],
    ],
    [
      "Subtraction and division use different precision rules.",
      "Keep the unrounded difference for subsequent calculations.",
      "Use the volume's three significant figures to report the final quotient.",
    ],
    ["Rounding repeatedly at every intermediate step."],
    "combined_precision",
  ),
  written(
    t,
    116,
    "laq",
    3,
    "Assess these statements: (i) all atoms of one element have the same mass; (ii) atoms are rearranged in an ordinary chemical reaction; (iii) a pure compound contains its elements in a fixed mass ratio.",
    [
      [
        "Evaluate each statement with a reason.",
        "Statement (i) is not universally correct.",
        "Isotopes of the same element can have different masses.",
        "Statement (ii) is correct for ordinary chemical reactions: atoms rearrange without changing elemental identity.",
        "Statement (iii) expresses the law of definite proportions for a given pure compound.",
      ],
      [
        "Explain why a solution is not an exception to statement (iii).",
        "A solution is a mixture with variable composition, not a single pure compound.",
      ],
    ],
    [
      "Separate Dalton's original postulates from modern evidence.",
      "Limit the second statement to chemical rather than nuclear reactions.",
      "Distinguish pure compounds from mixtures.",
    ],
    ["Applying the fixed-composition law to arbitrary mixtures."],
    "atomic_theory_reasoning",
  ),
  written(
    t,
    117,
    "case",
    3,
    L`A cylinder has $1\,\mathrm{mL}$ divisions. A student reads a transparent liquid as $36.4\,\mathrm{mL}$ by estimating between marks, but writes $36.400\,\mathrm{mL}$ in the report.`,
    [
      [
        "Explain the role of the digit 4 and correct the excessive precision.",
        "The tenths digit is an estimated digit between the 1 mL graduations.",
        L`The stated observation supports $36.4\,\mathrm{mL}$, not the two extra zeros.`,
      ],
      [
        "State two precautions for reading this liquid in a glass cylinder.",
        "Read the bottom of the concave meniscus.",
        "Keep the eye at the meniscus level to avoid parallax.",
      ],
    ],
    [
      "A measurement can include an estimated digit.",
      "Extra written zeros imply extra precision.",
      "Consider both the meniscus and eye position.",
    ],
    ["Treating extra decimal places as increased instrument precision."],
    "measurement_reporting",
  ),
  written(
    t,
    118,
    "case",
    3,
    L`A reaction is weighed in two arrangements. In a sealed vessel, the initial and final masses are both $75.20\,\mathrm{g}$. In an open vessel, the mass falls from $75.20$ to $74.76\,\mathrm{g}$ as a gas escapes.`,
    [
      [
        "Calculate the mass lost from the open weighed system and interpret it.",
        L`The loss is $75.20-74.76=0.44\,\mathrm{g}$.`,
        "If gas escape is the only mass transfer, 0.44 g of gas left the weighed system.",
      ],
      [
        "Explain the sealed result and reconcile both observations with conservation of mass.",
        "The sealed system retains the gaseous product, so its total mass stays unchanged.",
        "For the open system, final vessel mass plus escaped gas mass equals the initial mass.",
      ],
    ],
    [
      "Account for every route by which matter can leave.",
      "Subtract the two open-vessel masses.",
      "Compare the same system boundaries before and after reaction.",
    ],
    ["Interpreting an open-system mass decrease as destruction of matter."],
    "mass_balance_data",
  ),
  written(
    t,
    119,
    "case",
    3,
    L`Three samples are labelled P, Q and R. P is pure water. Q is a uniform salt solution. R contains sand suspended in water. A student labels all three as compounds because each contains more than one element.`,
    [
      [
        "Correct the classifications.",
        "P is a compound with fixed chemical composition.",
        "Q is a homogeneous mixture whose salt concentration can vary.",
        "R is a heterogeneous mixture with distinguishable phases.",
      ],
      [
        "State the flaw in the student's rule.",
        "Containing multiple elements is insufficient: a compound requires chemical combination in a definite composition.",
      ],
    ],
    [
      "Check whether the substances are chemically combined.",
      "Check uniformity only after deciding whether the material is a mixture.",
      "A mixture can contain elements or compounds or both.",
    ],
    ["Using the number of elements alone to identify a compound."],
    "classification_evidence",
  ),
  written(
    t,
    120,
    "case",
    3,
    L`Two measured lengths are $4.28\,\mathrm{cm}$ and $2.1\,\mathrm{cm}$. A student reports their sum as $6.38\,\mathrm{cm}$ and product as $8.988\,\mathrm{cm^2}$.`,
    [
      [
        "Correct the sum and state its rule.",
        "Addition is limited to one decimal place by 2.1 cm.",
        L`The sum is $6.4\,\mathrm{cm}$.`,
      ],
      [
        "Correct the product and state its rule.",
        "Multiplication is limited to two significant figures.",
        L`The product is $9.0\,\mathrm{cm^2}$; the final zero preserves two significant figures.`,
      ],
    ],
    [
      "Use separate rules for addition and multiplication.",
      "Calculate first, then round once.",
      "Scientific precision can require a trailing decimal zero.",
    ],
    ["Applying the decimal-place rule to multiplication."],
    "operation_specific_precision",
  ),
];
