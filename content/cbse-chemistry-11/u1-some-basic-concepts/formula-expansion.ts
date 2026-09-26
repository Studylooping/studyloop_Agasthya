import { mc, written } from "../chapter-practice";
const L = String.raw;
const t = "1.3";
export const formulaExpansion = [
  mc(
    t,
    101,
    2,
    L`Find the mass percentage of nitrogen in $\mathrm{KNO_3}$, rounded to one decimal place. Use $\mathrm{K}=39$, $\mathrm{N}=14$, $\mathrm{O}=16$.`,
    L`$13.9\%$`,
    [
      [L`$14.0\%$`, "The denominator is the full molar mass 101, not 100."],
      [L`$41.6\%$`, "There is one nitrogen atom per formula unit, not three."],
      [L`$47.5\%$`, "This is approximately the oxygen percentage."],
    ],
    [
      "Calculate the full formula mass.",
      "Nitrogen contributes 14 g per mole.",
      "Divide 14 by 101 and multiply by 100.",
    ],
    [L`$M=39+14+48=101$; $\%\mathrm N=(14/101)100\approx13.9\%$.`],
    "element_mass_percentage",
  ),
  mc(
    t,
    102,
    2,
    L`An oxide has formula MgO. With atomic masses Mg = 24 and O = 16, the mass percentage of magnesium is`,
    L`$60\%$`,
    [
      [L`$50\%$`, "Equal atom counts do not mean equal mass contributions."],
      [L`$40\%$`, "This is the oxygen percentage."],
      [
        L`$150\%$`,
        "The denominator must be total compound mass, not oxygen mass.",
      ],
    ],
    [
      "Find the formula mass.",
      "Use magnesium's mass contribution in the numerator.",
      "The two element percentages must sum to 100.",
    ],
    [L`$\%\mathrm{Mg}=24/(24+16)\times100=60\%$.`],
    "atomic_vs_mass_ratio",
  ),
  mc(
    t,
    103,
    3,
    L`A hydrocarbon contains carbon and hydrogen in the mass ratio $24:5$. Using C = 12 and H = 1, its empirical formula is`,
    L`$\mathrm{C_2H_5}$`,
    [
      [
        L`$\mathrm{C_{24}H_5}$`,
        "Mass ratios must first be converted into mole ratios.",
      ],
      [
        L`$\mathrm{CH_5}$`,
        "24 mass units of carbon correspond to two mole-ratio units.",
      ],
      [
        L`$\mathrm{C_5H_2}$`,
        "The carbon and hydrogen mole-ratio terms are reversed.",
      ],
    ],
    [
      "Divide each mass-ratio term by its atomic mass.",
      L`Compare $24/12$ with $5/1$.`,
      "Use the simplest whole-number ratio.",
    ],
    [
      L`The mole ratio is $2:5$, so the empirical formula is $\mathrm{C_2H_5}$.`,
    ],
    "empirical_from_mass_ratio",
  ),
  mc(
    t,
    104,
    3,
    L`A compound contains $5.4\,\mathrm{g}$ aluminium and $4.8\,\mathrm{g}$ oxygen. Using Al = 27 and O = 16, its empirical formula is`,
    L`$\mathrm{Al_2O_3}$`,
    [
      [
        L`$\mathrm{AlO}$`,
        "The amounts are 0.20 mol and 0.30 mol, which are not equal.",
      ],
      [
        L`$\mathrm{Al_3O_2}$`,
        "This reverses the aluminium-to-oxygen mole ratio.",
      ],
      [
        L`$\mathrm{Al_9O_8}$`,
        "Reducing the mass ratio directly does not give the atom ratio.",
      ],
    ],
    [
      "Convert both masses into amounts.",
      "Divide by the smaller amount.",
      "Convert the 1:1.5 ratio to whole numbers.",
    ],
    [
      L`$n_{Al}=5.4/27=0.20$ and $n_O=4.8/16=0.30$. The ratio is $2:3$, giving $\mathrm{Al_2O_3}$.`,
    ],
    "fractional_empirical_ratio",
  ),
  mc(
    t,
    105,
    2,
    L`A compound has empirical formula CH and molar mass $78\,\mathrm{g\,mol^{-1}}$. Using C = 12 and H = 1, its molecular formula is`,
    L`$\mathrm{C_6H_6}$`,
    [
      [L`$\mathrm{C_3H_3}$`, "This formula has molar mass 39, not 78."],
      [L`$\mathrm{CH}$`, "The empirical formula mass is only 13."],
      [L`$\mathrm{C_6H}$`, "The multiplier applies to every subscript."],
    ],
    [
      "Calculate the empirical formula mass.",
      "Divide the molecular molar mass by it.",
      "Multiply both subscripts by six.",
    ],
    [
      L`Empirical formula mass $=13$; multiplier $=78/13=6$, so the formula is $\mathrm{C_6H_6}$.`,
    ],
    "molecular_multiplier",
  ),
  mc(
    t,
    106,
    2,
    L`A molecular formula is $\mathrm{C_4H_8O_2}$. Its empirical formula is`,
    L`$\mathrm{C_2H_4O}$`,
    [
      [
        L`$\mathrm{CH_2O}$`,
        "The oxygen subscript cannot remain one if the other subscripts are divided by four.",
      ],
      [
        L`$\mathrm{C_4H_8O}$`,
        "Every subscript must be divided by the same common factor.",
      ],
      [
        L`$\mathrm{C_2H_4O_2}$`,
        "The oxygen subscript must also be divided by two.",
      ],
    ],
    [
      "Find the greatest common factor of 4, 8 and 2.",
      "Divide all subscripts by the same number.",
      "The greatest common factor is two.",
    ],
    [L`Dividing $4:8:2$ by two gives $2:4:1$, hence $\mathrm{C_2H_4O}$.`],
    "empirical_reduction",
  ),
  mc(
    t,
    107,
    3,
    L`A hydrate $\mathrm{CaCl_2\cdot xH_2O}$ has mass $2.19\,\mathrm{g}$. On complete dehydration without other decomposition, $1.11\,\mathrm{g}$ of $\mathrm{CaCl_2}$ remains. Use molar masses 111 and 18. Find x.`,
    "6",
    [
      ["3", "The lost mass corresponds to 0.060 mol water, not 0.030 mol."],
      ["1", "The water-to-salt mass ratio is not the hydrate subscript."],
      [
        "10",
        "Divide moles of water by moles of salt, not by a rounded sample mass.",
      ],
    ],
    [
      "Subtract to find water mass.",
      "Convert both salt and water masses to moles.",
      "Divide water moles by salt moles.",
    ],
    [
      L`Water mass $=1.08\,\mathrm{g}$, so $n_w=1.08/18=0.060$ and $n_s=1.11/111=0.010$. Thus $x=6$.`,
    ],
    "hydrate_formula",
  ),
  mc(
    t,
    108,
    3,
    L`A compound contains C, H and O. Analysis gives $54.55\%$ C and $9.09\%$ H. Using C = 12, H = 1 and O = 16, the empirical formula is`,
    L`$\mathrm{C_2H_4O}$`,
    [
      [
        L`$\mathrm{CH_2O}$`,
        "The oxygen percentage is 36.36%, giving half as many O as C atoms.",
      ],
      [
        L`$\mathrm{C_3H_6O_2}$`,
        "The normalized mole ratio is 2:4:1, not 3:6:2.",
      ],
      [
        L`$\mathrm{C_2H_2O}$`,
        "Hydrogen contributes four ratio units after division by the smallest amount.",
      ],
    ],
    [
      "Find oxygen percentage by subtraction from 100.",
      "Use a 100 g basis.",
      "Divide the three mole amounts by the smallest.",
    ],
    [
      L`Oxygen is $36.36\%$. Moles on a 100 g basis are approximately $4.546:9.09:2.273=2:4:1$.`,
    ],
    "composition_by_difference",
  ),
  mc(
    t,
    109,
    3,
    L`Complete combustion of a hydrocarbon gives $0.30\,\mathrm{mol}$ $\mathrm{CO_{2}}$ and $0.40\,\mathrm{mol}$ $\mathrm{H_{2}O}$. Its empirical formula is`,
    L`$\mathrm{C_3H_8}$`,
    [
      [L`$\mathrm{C_3H_4}$`, "Each water molecule carries two hydrogen atoms."],
      [
        L`$\mathrm{CH_2}$`,
        "The recovered atom amounts are 0.30 mol C and 0.80 mol H.",
      ],
      [
        L`$\mathrm{C_4H_3}$`,
        "This reverses the product ratio and also ignores the hydrogen subscript.",
      ],
    ],
    [
      "$\\mathrm{CO_{2}}$ counts carbon atoms one for one.",
      "Water contributes twice its amount as H atoms.",
      "Reduce 0.30:0.80.",
    ],
    [
      L`The atom amounts are $0.30\,\mathrm{mol}$ C and $2(0.40)=0.80\,\mathrm{mol}$ H, giving $\mathrm{C_3H_8}$.`,
    ],
    "combustion_mole_ratio",
  ),
  mc(
    t,
    110,
    3,
    L`A $0.46\,\mathrm{g}$ compound containing only C, H and O yields $0.88\,\mathrm{g}$ $\mathrm{CO_{2}}$ and $0.54\,\mathrm{g}$ $\mathrm{H_{2}O}$. Using molar masses $\mathrm{CO_{2}}$ = 44, $\mathrm{H_{2}O}$ = 18 and atomic masses C = 12, H = 1, O = 16, the oxygen mass in the original compound is`,
    L`$0.16\,\mathrm{g}$`,
    [
      [
        L`$0.30\,\mathrm{g}$`,
        "This is the combined carbon and hydrogen mass, not the oxygen mass.",
      ],
      [
        L`$0.22\,\mathrm{g}$`,
        "Hydrogen recovered in water must also be subtracted from sample mass.",
      ],
      [
        L`$0.54\,\mathrm{g}$`,
        "Product water contains oxygen supplied by the combustion gas.",
      ],
    ],
    [
      "Recover carbon mass from $\\mathrm{CO_{2}}$.",
      "Recover hydrogen mass from water.",
      "Subtract only these element masses from the sample mass.",
    ],
    [
      L`$m_C=0.88(12/44)=0.24\,\mathrm{g}$ and $m_H=0.54(2/18)=0.06\,\mathrm{g}$.`,
      L`$m_O=0.46-0.24-0.06=0.16\,\mathrm{g}$.`,
    ],
    "combustion_oxygen_difference",
  ),
  mc(
    t,
    111,
    2,
    L`A compound's empirical formula is $\mathrm{CH_{2}O}$. Which proposed molar mass is incompatible with this empirical formula? Use C = 12, H = 1, O = 16.`,
    L`$75\,\mathrm{g\,mol^{-1}}$`,
    [
      [
        L`$60\,\mathrm{g\,mol^{-1}}$`,
        "60 is twice the empirical formula mass of 30.",
      ],
      [
        L`$90\,\mathrm{g\,mol^{-1}}$`,
        "90 is three times the empirical formula mass.",
      ],
      [
        L`$150\,\mathrm{g\,mol^{-1}}$`,
        "150 is five times the empirical formula mass.",
      ],
    ],
    [
      "Find the empirical formula mass.",
      "A molecular formula is a whole-number multiple.",
      "Test divisibility by 30.",
    ],
    [L`$75/30=2.5$ is not a positive integer, so 75 is incompatible.`],
    "formula_consistency",
  ),
  mc(
    t,
    112,
    2,
    L`A compound contains $40\%$ sulfur by mass. The sulfur mass in a $7.5\,\mathrm{g}$ sample is`,
    L`$3.0\,\mathrm{g}$`,
    [
      [
        L`$4.5\,\mathrm{g}$`,
        "This is the mass of the other elements combined.",
      ],
      [
        L`$18.75\,\mathrm{g}$`,
        "The mass of one constituent cannot exceed the sample mass.",
      ],
      [L`$0.30\,\mathrm{g}$`, "40% is 0.40, not 0.040."],
    ],
    [
      "Convert percentage to a fraction.",
      "Multiply the sample mass by the fraction.",
      "Check that the answer is less than 7.5 g.",
    ],
    [L`$m_S=0.40(7.5)=3.0\,\mathrm{g}$.`],
    "percentage_to_mass",
  ),
  mc(
    t,
    113,
    2,
    L`A compound has empirical formula $\mathrm{C_2H_5N}$ and molar mass $86\,\mathrm{g\,mol^{-1}}$. Use C = 12, H = 1, N = 14. Its molecular formula is`,
    L`$\mathrm{C_4H_{10}N_2}$`,
    [
      [
        L`$\mathrm{C_2H_5N}$`,
        "Its formula mass is 43, half the stated molar mass.",
      ],
      [L`$\mathrm{C_4H_5N_2}$`, "Hydrogen must also be multiplied by two."],
      [
        L`$\mathrm{C_2H_{10}N}$`,
        "All subscripts, not just hydrogen, must be multiplied by two.",
      ],
    ],
    [
      "Add the atomic-mass contributions to the empirical unit.",
      "Compare 86 with 43.",
      "Multiply every subscript by two.",
    ],
    [
      L`Empirical mass $=24+5+14=43$; multiplier $=86/43=2$, giving $\mathrm{C_4H_{10}N_2}$.`,
    ],
    "nitrogen_formula_multiplier",
  ),
  mc(
    t,
    114,
    2,
    L`Which pair has the same empirical formula?`,
    L`$\mathrm{C_2H_4}$ and $\mathrm{C_3H_6}$`,
    [
      [
        L`$\mathrm{CO}$ and $\mathrm{CO_2}$`,
        "Their carbon-to-oxygen ratios differ.",
      ],
      [
        L`$\mathrm{CH_4}$ and $\mathrm{C_2H_6}$`,
        "Their simplest ratios are 1:4 and 1:3.",
      ],
      [
        L`$\mathrm{NO}$ and $\mathrm{N_2O_3}$`,
        "The simplest nitrogen-to-oxygen ratios differ.",
      ],
    ],
    [
      "Reduce subscripts for each formula.",
      "Compare ratios rather than total atom counts.",
      "Both selected hydrocarbons reduce to one carbon for two hydrogen atoms.",
    ],
    [
      L`$\mathrm{C_2H_4}$ and $\mathrm{C_3H_6}$ both reduce to $\mathrm{CH_2}$.`,
    ],
    "shared_empirical_formula",
  ),
  mc(
    t,
    115,
    2,
    L`A pure hydrate contains $36\%$ water by mass. A $5.00\,\mathrm{g}$ sample is fully dehydrated without salt decomposition. The remaining anhydrous mass is`,
    L`$3.20\,\mathrm{g}$`,
    [
      [L`$1.80\,\mathrm{g}$`, "This is the water mass lost."],
      [
        L`$4.64\,\mathrm{g}$`,
        "36% is a fraction of the sample mass, not a fixed 0.36 g loss.",
      ],
      [
        L`$8.20\,\mathrm{g}$`,
        "Dehydration removes mass rather than adding it.",
      ],
    ],
    [
      "Find the percentage that is not water.",
      "The remaining salt is 64% of the original mass.",
      "Multiply 5.00 g by 0.64.",
    ],
    [L`Anhydrous mass $=(1-0.36)(5.00)=3.20\,\mathrm{g}$.`],
    "hydrate_mass_fraction",
  ),
  mc(
    t,
    116,
    2,
    L`An organic compound contains C, H and O in the mole ratio $1:1.5:0.5$. Its empirical formula is`,
    L`$\mathrm{C_2H_3O}$`,
    [
      [
        L`$\mathrm{CH_2O}$`,
        "Rounding 1.5 and 0.5 independently changes the chemical ratio.",
      ],
      [
        L`$\mathrm{C_2H_4O}$`,
        "The hydrogen ratio becomes 3, not 4, after multiplication by two.",
      ],
      [
        L`$\mathrm{C_2H_3O_2}$`,
        "Multiplying the oxygen term 0.5 by two gives 1.",
      ],
    ],
    [
      "Do not round half-integer ratios to integers.",
      "Multiply all terms by the same small integer.",
      "Multiplication by two removes both halves.",
    ],
    [
      L`$1:1.5:0.5$ becomes $2:3:1$, so the empirical formula is $\mathrm{C_2H_3O}$.`,
    ],
    "half_integer_ratios",
  ),
  mc(
    t,
    117,
    2,
    "Assertion: Percentage composition alone generally does not determine a molecular formula. Reason: Different molecular formulae can be whole-number multiples of one empirical formula. Choose the correct statement.",
    "Both are true, and the reason explains the assertion.",
    [
      [
        "Both are true, but the reason does not explain the assertion.",
        "Whole-number multiples preserve percentages, which is the source of the ambiguity.",
      ],
      [
        "The assertion is true, but the reason is false.",
        "For example, $\\mathrm{CH_{2}O}$ and $\\mathrm{C_{2}H_{4}O_{2}}$ share the same simplest ratio.",
      ],
      [
        "The assertion is false, but the reason is true.",
        "Additional molecular-mass information is normally needed.",
      ],
    ],
    [
      "Compare simplest ratio with actual molecular size.",
      "Scaling every subscript preserves mass percentages.",
      "Consider what extra measurement fixes the multiplier.",
    ],
    [
      "Composition fixes the empirical ratio; molecular molar mass is needed to choose the appropriate integer multiplier.",
    ],
    "assertion_reason_formula",
  ),
  mc(
    t,
    118,
    2,
    L`A compound contains $0.10\,\mathrm{mol}$ nitrogen atoms and $0.25\,\mathrm{mol}$ oxygen atoms in an analysed sample. Its empirical formula is`,
    L`$\mathrm{N_2O_5}$`,
    [
      [L`$\mathrm{NO_2}$`, "The oxygen ratio 2.5 must not be rounded down."],
      [L`$\mathrm{N_5O_2}$`, "This reverses the atom ratio."],
      [L`$\mathrm{NO_3}$`, "Rounding 2.5 to 3 changes the composition."],
    ],
    [
      "Divide both amounts by 0.05 mol.",
      "Empirical subscripts must preserve the measured ratio.",
      "Use 2:5, not a rounded 1:2.5.",
    ],
    [L`$0.10:0.25=2:5$, giving $\mathrm{N_2O_5}$.`],
    "nonintegral_atom_ratios",
  ),
  mc(
    t,
    119,
    2,
    L`For $\mathrm{H_2O_2}$, using H = 1 and O = 16, which statement is correct?`,
    "The empirical formula is HO and oxygen accounts for about 94.1% of the mass.",
    [
      [
        "The empirical formula is $\\mathrm{H_{2}O}$ and oxygen is 88.9% by mass.",
        "This changes the H:O ratio from 1:1 to 2:1.",
      ],
      [
        "The empirical formula is HO and oxygen is 50% by mass.",
        "Equal numbers of H and O atoms do not contribute equal masses.",
      ],
      [
        "The empirical formula is $\\mathrm{H_{2}O_{2}}$ and oxygen is 94.1% by mass.",
        "The subscripts share a common factor of two and can be reduced.",
      ],
    ],
    [
      "Reduce the subscripts.",
      "Calculate oxygen's mass contribution as 32 out of 34.",
      "Do not confuse atom fraction and mass fraction.",
    ],
    [L`The simplest formula is HO, and $\%O=(32/34)100\approx94.1\%$.`],
    "empirical_and_mass_fraction",
  ),
  mc(
    t,
    120,
    3,
    L`A $1.50\,\mathrm{g}$ hydrated sample loses $0.54\,\mathrm{g}$ water. The anhydrous salt has molar mass $96\,\mathrm{g\,mol^{-1}}$. With water molar mass 18, the water-to-salt mole ratio is`,
    L`$3:1$`,
    [
      [L`$9:16$`, "This is the water-to-salt mass ratio, not the mole ratio."],
      [L`$1:3$`, "The requested order is water first."],
      [L`$2:1$`, "The anhydrous mass is 0.96 g, so there is 0.010 mol salt."],
    ],
    [
      "Subtract water loss from original sample mass.",
      "Convert both masses to moles.",
      "Divide 0.030 by 0.010.",
    ],
    [
      L`$n_w=0.54/18=0.030$ and $n_s=(1.50-0.54)/96=0.010\,\mathrm{mol}$; the ratio is $3:1$.`,
    ],
    "hydrate_mole_ratio",
  ),
  written(
    t,
    101,
    "vsaq",
    2,
    "Distinguish an empirical formula from a molecular formula using ethane, $\\mathrm{C_{2}H_{6}}$, as an example.",
    [
      [
        "State the distinction and example.",
        "A molecular formula gives the actual atom numbers in a molecule: $\\mathrm{C_{2}H_{6}}$ for ethane.",
        "An empirical formula gives the simplest whole-number atom ratio: $\\mathrm{CH_{3}}$ for ethane.",
      ],
    ],
    [
      "Consider actual counts versus simplest ratio.",
      "Find the common factor of 2 and 6.",
      "A reduced formula need not describe an isolated molecule.",
    ],
    ["Claiming empirical formula always describes an actual molecule."],
    "formula_meanings",
  ),
  written(
    t,
    102,
    "vsaq",
    2,
    L`Calculate the mass percentage of hydrogen in methane, using C = 12 and H = 1.`,
    [
      [
        "Show formula mass and percentage.",
        L`$M(\mathrm{CH_4})=12+4=16\,\mathrm{g\,mol^{-1}}$.`,
        L`Hydrogen mass percentage $=(4/16)100=25\%$.`,
      ],
    ],
    [
      "There are four hydrogen atoms per molecule.",
      "Use total mass in the denominator.",
      "Atom percentage and mass percentage are different.",
    ],
    ["Using 4/5 as the hydrogen mass fraction."],
    "hydrogen_mass_percentage",
  ),
  written(
    t,
    103,
    "vsaq",
    2,
    L`Reduce $\mathrm{C_6H_{12}O_3}$ to its empirical formula and explain the factor used.`,
    [
      [
        "Give the formula and common factor.",
        "The greatest common factor of 6, 12 and 3 is three.",
        L`Dividing every subscript by three gives $\mathrm{C_2H_4O}$.`,
      ],
    ],
    [
      "Use a factor common to all subscripts.",
      "The oxygen subscript prevents division by six.",
      "Divide every subscript consistently.",
    ],
    ["Reducing only the carbon and hydrogen subscripts."],
    "formula_common_factor",
  ),
  written(
    t,
    104,
    "vsaq",
    2,
    "A composition analysis gives empirical formula $\\mathrm{CH_{2}}$. What additional numerical information is needed to determine the molecular formula, and how is it used?",
    [
      [
        "Name the information and relation.",
        "The molecular molar mass is needed.",
        L`The multiplier is $n=M/M_{\mathrm{emp}}$; here $M_{\mathrm{emp}}=14\,\mathrm{g\,mol^{-1}}$ using C = 12 and H = 1.`,
      ],
    ],
    [
      "Empirical formula fixes a ratio only.",
      "The actual molecule can contain several empirical units.",
      "The multiplier must be a positive integer.",
    ],
    ["Using density without specifying how it yields molar mass."],
    "required_molecular_information",
  ),
  written(
    t,
    105,
    "saq",
    3,
    L`A sulfide contains $5.6\,\mathrm{g}$ iron and $3.2\,\mathrm{g}$ sulfur. Use Fe = 56 and S = 32 to find its empirical formula.`,
    [
      [
        "Convert to moles and reduce the ratio.",
        L`Iron amount $=5.6/56=0.10\,\mathrm{mol}$.`,
        L`Sulfur amount $=3.2/32=0.10\,\mathrm{mol}$.`,
        "The ratio is 1:1 and the empirical formula is FeS.",
      ],
    ],
    [
      "Do not simplify masses directly.",
      "Use each element's atomic mass.",
      "Equal mole amounts give equal subscripts.",
    ],
    ["Writing a 7:4 atomic ratio from the mass ratio."],
    "binary_formula",
  ),
  written(
    t,
    106,
    "saq",
    3,
    L`A compound is $80.0\%$ carbon and $20.0\%$ hydrogen by mass. Its molar mass is $30\,\mathrm{g\,mol^{-1}}$. Use C = 12 and H = 1 to determine both formulae.`,
    [
      [
        "Find empirical and molecular formulae.",
        L`For 100 g, $n_C:n_H=(80/12):20=1:3$, so the empirical formula is $\mathrm{CH_{3}}$.`,
        L`Empirical formula mass is $12+3=15$.`,
        L`The multiplier is $30/15=2$, giving molecular formula $\mathrm{C_2H_6}$.`,
      ],
    ],
    [
      "Choose a 100 g basis.",
      "Simplify mole amounts, not percentages.",
      "Use molar mass to determine the multiplier.",
    ],
    ["Stopping at the empirical formula when molecular mass is given."],
    "percentage_to_molecular",
  ),
  written(
    t,
    107,
    "saq",
    3,
    L`A compound contains $0.60\,\mathrm{g}$ carbon, $0.10\,\mathrm{g}$ hydrogen and $0.80\,\mathrm{g}$ oxygen. Use C = 12, H = 1 and O = 16. Find the empirical formula.`,
    [
      [
        "Calculate the mole ratio.",
        L`The amounts are $0.60/12=0.050$, $0.10/1=0.10$ and $0.80/16=0.050\,\mathrm{mol}$.`,
        "Dividing by 0.050 gives the ratio 1:2:1.",
        "The empirical formula is $\\mathrm{CH_{2}O}$.",
      ],
    ],
    [
      "Convert all three masses.",
      "Divide by the smallest amount.",
      "Check whether any further integer multiplier is needed.",
    ],
    ["Using the mass ratio 6:1:8 as subscripts."],
    "three_element_formula",
  ),
  written(
    t,
    108,
    "saq",
    3,
    L`A hydrate $\mathrm{BaCl_2\cdot xH_2O}$ leaves $2.08\,\mathrm{g}$ anhydrous salt after losing $0.36\,\mathrm{g}$ water. Use molar masses $\mathrm{BaCl_{2}}$ = 208 and $\mathrm{H_{2}O}$ = 18. Determine x.`,
    [
      [
        "Calculate salt and water amounts and compare them.",
        L`Salt amount $=2.08/208=0.010\,\mathrm{mol}$.`,
        L`Water amount $=0.36/18=0.020\,\mathrm{mol}$.`,
        L`$x=0.020/0.010=2$, so the hydrate is $\mathrm{BaCl_2\cdot2H_2O}$.`,
      ],
    ],
    [
      "The mass lost is water only.",
      "Convert the two masses separately.",
      "Use the water-to-salt mole ratio.",
    ],
    ["Dividing lost water mass directly by salt mass."],
    "barium_hydrate",
  ),
  written(
    t,
    109,
    "saq",
    3,
    L`An oxide contains $3.10\,\mathrm{g}$ phosphorus and $4.00\,\mathrm{g}$ oxygen. Use P = 31 and O = 16. Determine its empirical formula, showing how the fractional ratio is handled.`,
    [
      [
        "Convert the masses to amounts and obtain integer subscripts.",
        L`$n_P=3.10/31=0.100\,\mathrm{mol}$ and $n_O=4.00/16=0.250\,\mathrm{mol}$.`,
        "Dividing by 0.100 gives 1:2.5; multiplying both terms by two gives 2:5.",
        L`The empirical formula is $\mathrm{P_2O_5}$.`,
      ],
    ],
    [
      "Convert each mass using its atomic mass.",
      "Do not round a half-integer ratio independently.",
      "Multiply the entire ratio by two to remove the fraction.",
    ],
    ["Rounding 2.5 to 2 or 3 instead of preserving the ratio."],
    "fractional_oxide_formula",
  ),
  written(
    t,
    110,
    "saq",
    3,
    L`A hydrocarbon gives $0.22\,\mathrm{mol}$ $\mathrm{CO_{2}}$ and $0.22\,\mathrm{mol}$ $\mathrm{H_{2}O}$ on complete combustion. Find its empirical formula and explain why its molecular formula is not yet fixed.`,
    [
      [
        "Use the combustion products to obtain the ratio.",
        "The carbon amount is 0.22 mol, while the hydrogen-atom amount is twice the water amount, 0.44 mol.",
        "C:H = 1:2, so the empirical formula is $\\mathrm{CH_{2}}$.",
        "The molar mass is still needed to determine the molecular multiplier.",
      ],
    ],
    [
      "Each $\\mathrm{CO_{2}}$ contains one carbon.",
      "Each $\\mathrm{H_{2}O}$ contains two hydrogens.",
      "More than one molecular formula can share $\\mathrm{CH_{2}}$.",
    ],
    ["Using the water amount directly as the hydrogen-atom amount."],
    "combustion_and_ambiguity",
  ),
  written(
    t,
    111,
    "saq",
    3,
    L`A hydrate has formula $\mathrm{Na_2CO_3\cdot10H_2O}$. Using molar masses $\mathrm{Na_{2}CO_{3}}$ = 106 and $\mathrm{H_{2}O}$ = 18, calculate its water percentage and the water mass in $14.3\,\mathrm{g}$ hydrate.`,
    [
      [
        "Find the hydrate molar mass and water contribution.",
        L`Hydrate molar mass $=106+10(18)=286\,\mathrm{g\,mol^{-1}}$.`,
        L`Water percentage $=(180/286)100\approx62.9\%$.`,
        L`Water mass in 14.3 g is $14.3(180/286)=9.00\,\mathrm{g}$.`,
      ],
    ],
    [
      "Include the anhydrous salt in the denominator.",
      "Ten waters contribute 180 per mole of hydrate.",
      "Use the exact fraction before rounding the sample calculation.",
    ],
    ["Applying 180/106 as a mass fraction of the hydrate."],
    "hydrate_percentage_application",
  ),
  written(
    t,
    112,
    "saq",
    3,
    L`A student's proposed molecular formula is $\mathrm{C_{3}H_{6}O_{3}}$. The measured molar mass is $60\,\mathrm{g\,mol^{-1}}$, and the empirical formula is $\mathrm{CH_{2}O}$. Use C = 12, H = 1 and O = 16. Correct the proposal.`,
    [
      [
        "Test and correct the molecular formula.",
        L`The proposed formula has molar mass $3(12)+6+3(16)=90$, not 60.`,
        "The empirical formula mass is 30, giving multiplier 60/30 = 2.",
        "The compatible molecular formula is $\\mathrm{C_{2}H_{4}O_{2}}$.",
      ],
    ],
    [
      "Calculate the mass of the proposed formula.",
      "Find the multiplier independently from the empirical formula mass.",
      "Both composition and molar mass must agree.",
    ],
    ["Accepting a formula merely because its empirical ratio is correct."],
    "formula_validation",
  ),
  written(
    t,
    113,
    "laq",
    4,
    L`Complete combustion of $0.74\,\mathrm{g}$ of a compound containing only C, H and O produces $1.32\,\mathrm{g}$ $\mathrm{CO_{2}}$ and $0.54\,\mathrm{g}$ $\mathrm{H_{2}O}$. The compound's molar mass is $74\,\mathrm{g\,mol^{-1}}$. Use C = 12, H = 1, O = 16.`,
    [
      [
        "Find carbon, hydrogen and oxygen masses in the sample.",
        L`Carbon mass $=1.32(12/44)=0.36\,\mathrm{g}$.`,
        L`Hydrogen mass $=0.54(2/18)=0.06\,\mathrm{g}$.`,
        L`Oxygen mass $=0.74-0.36-0.06=0.32\,\mathrm{g}$.`,
      ],
      [
        "Determine empirical and molecular formulae.",
        L`The mole ratio is $0.030:0.060:0.020=3:6:2$, giving $\mathrm{C_3H_6O_2}$.`,
        "Its empirical formula mass is 74, so the molecular formula is also $\\mathrm{C_{3}H_{6}O_{2}}$.",
      ],
    ],
    [
      "Recover only C and H from the combustion products.",
      "Obtain the original oxygen by mass difference.",
      "Compare the empirical mass with 74.",
    ],
    ["Assigning all product oxygen to the original compound."],
    "full_combustion_analysis",
  ),
  written(
    t,
    114,
    "laq",
    3,
    L`A $6.25\,\mathrm{g}$ sample of $\mathrm{CuSO_4\cdot xH_2O}$ leaves $4.00\,\mathrm{g}$ anhydrous salt after complete dehydration. Use molar masses $\mathrm{CuSO_{4}}$ = 160 and $\mathrm{H_{2}O}$ = 18.`,
    [
      [
        "Find x and the water percentage.",
        L`The water loss is $6.25-4.00=2.25\,\mathrm{g}$.`,
        L`Salt and water amounts are $4.00/160=0.0250$ and $2.25/18=0.125\,\mathrm{mol}$.`,
        L`Their ratio gives $x=5$.`,
        L`Water percentage $=(2.25/6.25)100=36.0\%$.`,
      ],
      [
        "Explain the effect of incomplete dehydration on the calculated x.",
        "Residual water is counted as salt and measured water loss is too small, so the calculated x is too low.",
      ],
    ],
    [
      "Treat the residue as anhydrous only if dehydration is complete.",
      "Find a mole ratio rather than a mass ratio.",
      "Track both numerator and denominator when considering residual water.",
    ],
    [
      "Claiming incomplete dehydration increases the inferred hydration number.",
    ],
    "hydrate_analysis_error",
  ),
  written(
    t,
    115,
    "laq",
    4,
    L`A hydrocarbon sample produces $1.76\,\mathrm{g}$ $\mathrm{CO_{2}}$ and $0.90\,\mathrm{g}$ $\mathrm{H_{2}O}$ on complete combustion. Its molar mass is $58\,\mathrm{g\,mol^{-1}}$. Use C = 12 and H = 1.`,
    [
      [
        "Find the carbon and hydrogen amounts and masses.",
        L`Carbon amount $=1.76/44=0.040\,\mathrm{mol}$, hence mass $0.48\,\mathrm{g}$.`,
        L`Hydrogen-atom amount $=2(0.90/18)=0.100\,\mathrm{mol}$, hence mass $0.10\,\mathrm{g}$.`,
      ],
      [
        "Determine the sample mass and both formulae.",
        L`The hydrocarbon sample mass is $0.48+0.10=0.58\,\mathrm{g}$.`,
        "The atom ratio 0.040:0.100 = 2:5 gives empirical formula $\\mathrm{C_{2}H_{5}}$.",
        "Empirical mass is 29, so multiplier 58/29 = 2 gives molecular formula $\\mathrm{C_{4}H_{10}}$.",
      ],
    ],
    [
      "A hydrocarbon contains only C and H.",
      "Multiply water moles by two for H atoms.",
      "A simplest formula with odd H count can have an even molecular multiplier.",
    ],
    [
      "Rejecting $\\mathrm{C_{2}H_{5}}$ as an empirical formula because it is not the molecular formula of an alkane.",
    ],
    "hydrocarbon_combustion",
  ),
  written(
    t,
    116,
    "laq",
    3,
    L`Two compounds have molecular formulae $\mathrm{C_{2}H_{4}O_{2}}$ and $\mathrm{C_{3}H_{6}O_{3}}$. Use C = 12, H = 1 and O = 16.`,
    [
      [
        "Find each empirical formula and compare their elemental mass percentages.",
        "Both formulae reduce to $\\mathrm{CH_{2}O}$.",
        L`The $\mathrm{CH_{2}O}$ formula mass is $12+2+16=30$.`,
        L`Both compounds therefore have C percentage $40\%$, H percentage $6.67\%$ and O percentage $53.33\%$.`,
      ],
      [
        "Explain what analysis distinguishes the two molecular formulae.",
        L`Their molecular molar masses differ: $60$ and $90\,\mathrm{g\,mol^{-1}}$.`,
        "A molar-mass measurement distinguishes these formulae; elemental percentages alone do not.",
      ],
    ],
    [
      "Reduce the subscript ratios first.",
      "Multiplying all subscripts scales every mass contribution equally.",
      "Look for a measurement sensitive to molecular size.",
    ],
    [
      "Treating the same percentages as proof that two compounds are identical.",
    ],
    "composition_vs_identity",
  ),
  written(
    t,
    117,
    "case",
    3,
    L`A student heats a hydrated salt weighing $4.92\,\mathrm{g}$. Successive residue masses after heating and cooling are $2.60$, $2.42$ and $2.40\,\mathrm{g}$; a further cycle also gives $2.40\,\mathrm{g}$. The anhydrous molar mass is 120 and water molar mass is 18.`,
    [
      [
        "Choose the residue mass and justify the choice.",
        "Use 2.40 g because repeated heating and cooling have given constant mass.",
      ],
      [
        "Determine the hydration number, assuming only water is lost.",
        L`Water loss $=4.92-2.40=2.52\,\mathrm{g}$.`,
        L`Salt amount $=2.40/120=0.0200$ and water amount $=2.52/18=0.140\,\mathrm{mol}$.`,
        "The ratio is seven waters per salt formula unit.",
      ],
    ],
    [
      "A single heating may not remove all water.",
      "Use the constant final mass.",
      "Compare mole amounts after finding water loss.",
    ],
    ["Using the first residue mass before dehydration is complete."],
    "constant_mass_hydration",
  ),
  written(
    t,
    118,
    "case",
    3,
    L`Two analysts examine a compound containing only C, H and O. Both find $60\%$ carbon and $8\%$ hydrogen. Analyst P writes $\mathrm{C_{5}H_{8}O_{2}}$; analyst Q writes $\mathrm{C_{10}H_{16}O_{4}}$. Use C = 12, H = 1 and O = 16.`,
    [
      [
        "Find the empirical formula.",
        "Oxygen is 32% by difference.",
        L`The mole ratio for 100 g is $60/12:8:32/16=5:8:2$, so the empirical formula is $\mathrm{C_{5}H_{8}O_{2}}$.`,
      ],
      [
        "Assess both molecular proposals if the measured molar mass is 200 g/mol.",
        "The empirical formula mass is 100, giving multiplier two.",
        "Q's $\\mathrm{C_{10}H_{16}O_{4}}$ agrees with the measured molar mass; P's formula gives only 100 g/mol.",
      ],
    ],
    [
      "Composition gives a ratio, not automatically the molecule.",
      "Calculate the empirical mass.",
      "Use the independently measured molar mass.",
    ],
    ["Choosing the shorter formula without checking molar mass."],
    "analyst_formula_comparison",
  ),
  written(
    t,
    119,
    "case",
    3,
    L`A compound containing only nitrogen and oxygen has an analysed mass of $7.6\,\mathrm{g}$, including $2.8\,\mathrm{g}$ nitrogen. Its molar mass is $76\,\mathrm{g\,mol^{-1}}$. Use N = 14 and O = 16.`,
    [
      [
        "Determine oxygen mass and the empirical formula.",
        L`Oxygen mass $=7.6-2.8=4.8\,\mathrm{g}$.`,
        L`Mole ratio N:O is $(2.8/14):(4.8/16)=0.20:0.30=2:3$, giving $\mathrm{N_{2}O_{3}}$.`,
      ],
      [
        "Find the molecular formula and nitrogen percentage.",
        "The empirical mass is 76, so the molecular formula is $\\mathrm{N_{2}O_{3}}$.",
        L`Nitrogen percentage $=(2.8/7.6)100\approx36.8\%$.`,
      ],
    ],
    [
      "Use the fact that only two elements are present.",
      "Convert both element masses before taking a ratio.",
      "Check the formula mass against 76.",
    ],
    ["Using the total sample mass as the oxygen mass."],
    "binary_analysis_case",
  ),
  written(
    t,
    120,
    "case",
    3,
    L`A student converts mole amounts C = 0.060, H = 0.150 and O = 0.030 mol into the ratio 2:5:1, then changes it to 2:6:1 to obtain a familiar formula.`,
    [
      [
        "Assess the ratio and the alteration.",
        "Dividing all amounts by 0.030 correctly gives 2:5:1.",
        "Changing 5 to 6 is not justified by the data and changes the elemental composition.",
      ],
      [
        "State the empirical formula and its meaning.",
        "The empirical formula from the data is $\\mathrm{C_{2}H_{5}O}$.",
        "It expresses the simplest atom ratio; a molecular formula may be an integer multiple, and further evidence is needed to identify the compound.",
      ],
    ],
    [
      "Do not change measurements to fit a familiar molecule.",
      "Empirical formulae express ratios, not necessarily whole isolated molecules.",
      "Separate data interpretation from chemical identification.",
    ],
    ["Changing a correct ratio to match an expected compound."],
    "empirical_ratio_integrity",
  ),
];
