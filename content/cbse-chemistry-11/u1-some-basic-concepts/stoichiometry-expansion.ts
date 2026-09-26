import { mc, written } from "../chapter-practice";
const L = String.raw;
const t = "1.4";
export const stoichiometryExpansion = [
  mc(
    t,
    101,
    2,
    L`For $\mathrm{N_2+3H_2\rightarrow2NH_3}$, complete reaction of $1.5\,\mathrm{mol}$ nitrogen with excess hydrogen gives how much ammonia?`,
    L`$3.0\,\mathrm{mol}$`,
    [
      [L`$1.5\,\mathrm{mol}$`, "The nitrogen-to-ammonia mole ratio is 1:2."],
      [
        L`$4.5\,\mathrm{mol}$`,
        "This is the hydrogen amount required, not the ammonia amount formed.",
      ],
      [
        L`$0.75\,\mathrm{mol}$`,
        "The product coefficient requires multiplication by two.",
      ],
    ],
    [
      "Use the coefficients of $\\mathrm{N_{2}}$ and $\\mathrm{NH_{3}}$.",
      "Hydrogen is explicitly in excess.",
      "Each mole of nitrogen forms two moles of ammonia.",
    ],
    [L`$n(\mathrm{NH_3})=1.5(2/1)=3.0\,\mathrm{mol}$.`],
    "reaction_mole_ratio",
  ),
  mc(
    t,
    102,
    2,
    L`Zinc reacts as $\mathrm{Zn+2HCl\rightarrow ZnCl_2+H_2}$. The amount of hydrogen formed from $13.0\,\mathrm{g}$ zinc with excess acid is (Zn = 65)`,
    L`$0.200\,\mathrm{mol}$`,
    [
      [
        L`$0.400\,\mathrm{mol}$`,
        "The coefficient two belongs to HCl, not $\\mathrm{H_{2}}$.",
      ],
      [
        L`$0.100\,\mathrm{mol}$`,
        "One mole zinc yields one mole hydrogen, not half a mole.",
      ],
      [
        L`$13.0\,\mathrm{mol}$`,
        "The zinc mass must first be divided by its molar mass.",
      ],
    ],
    [
      "Convert zinc mass to moles.",
      "Read the zinc-to-hydrogen coefficient ratio.",
      "Use the 1:1 relation.",
    ],
    [
      L`$n(\mathrm{Zn})=13.0/65=0.200\,\mathrm{mol}$, so the hydrogen amount is also $0.200\,\mathrm{mol}$.`,
    ],
    "metal_acid_stoichiometry",
  ),
  mc(
    t,
    103,
    3,
    L`For $\mathrm{Fe+S\rightarrow FeS}$, $11.2\,\mathrm{g}$ iron is heated with $3.20\,\mathrm{g}$ sulfur. Use Fe = 56 and S = 32. The maximum FeS mass is`,
    L`$8.80\,\mathrm{g}$`,
    [
      [
        L`$17.6\,\mathrm{g}$`,
        "This assumes all iron reacts even though sulfur is insufficient.",
      ],
      [
        L`$14.4\,\mathrm{g}$`,
        "Unreacted iron remains, so the entire starting mass is not FeS.",
      ],
      [
        L`$5.60\,\mathrm{g}$`,
        "This is the iron mass consumed, not the mass of the compound.",
      ],
    ],
    [
      "Convert each reactant mass to moles.",
      "Compare the amounts for the 1:1 equation.",
      "Sulfur supplies only 0.100 mol of reaction.",
    ],
    [
      L`$n_{Fe}=11.2/56=0.200$ and $n_S=3.20/32=0.100\,\mathrm{mol}$; sulfur is limiting.`,
      L`FeS mass $=0.100(56+32)=8.80\,\mathrm{g}$.`,
    ],
    "limiting_reagent_mass",
  ),
  mc(
    t,
    104,
    2,
    L`For $\mathrm{AgNO_3+NaCl\rightarrow AgCl+NaNO_3}$, $0.030\,\mathrm{mol}$ silver nitrate reacts with $0.020\,\mathrm{mol}$ sodium chloride. The maximum amount of AgCl is`,
    L`$0.020\,\mathrm{mol}$`,
    [
      [
        L`$0.030\,\mathrm{mol}$`,
        "Sodium chloride is exhausted before all silver nitrate can react.",
      ],
      [
        L`$0.050\,\mathrm{mol}$`,
        "Reactant amounts cannot simply be added to obtain the precipitate amount.",
      ],
      [
        L`$0.010\,\mathrm{mol}$`,
        "This is the excess silver nitrate amount, not the precipitate amount.",
      ],
    ],
    [
      "All coefficients are one.",
      "Identify the smaller reactant amount.",
      "Each reacting chloride ion supplies one AgCl formula unit.",
    ],
    [L`NaCl limits this 1:1 reaction, so $0.020\,\mathrm{mol}$ AgCl can form.`],
    "precipitation_limit",
  ),
  mc(
    t,
    105,
    2,
    L`For $\mathrm{2C_2H_6+7O_2\rightarrow4CO_2+6H_2O}$, complete combustion of $0.20\,\mathrm{mol}$ ethane requires`,
    L`$0.70\,\mathrm{mol}$ oxygen`,
    [
      [
        L`$1.40\,\mathrm{mol}$ oxygen`,
        "The ratio is seven moles oxygen per two moles ethane, not per one.",
      ],
      [
        L`$0.40\,\mathrm{mol}$ oxygen`,
        "This is the carbon dioxide amount formed.",
      ],
      [L`$0.60\,\mathrm{mol}$ oxygen`, "This is the water amount formed."],
    ],
    [
      "Compare the ethane and oxygen coefficients.",
      L`Use $7/2$ moles oxygen per mole ethane.`,
      "Multiply the ratio by the ethane amount.",
    ],
    [L`$n_{O_2}=0.20(7/2)=0.70\,\mathrm{mol}$.`],
    "fractional_reaction_ratio",
  ),
  mc(
    t,
    106,
    2,
    L`A preparation gives $9.0\,\mathrm{g}$ isolated product against a theoretical yield of $15.0\,\mathrm{g}$. Its percentage yield is`,
    L`$60\%$`,
    [
      [L`$40\%$`, "This is the percentage shortfall, not the yield."],
      [L`$167\%$`, "Actual yield belongs in the numerator."],
      [L`$6\%$`, "The ratio 9/15 must be multiplied by 100."],
    ],
    [
      "Compare actual product with the maximum predicted product.",
      "Divide actual by theoretical yield.",
      "Convert the fraction to a percentage.",
    ],
    [L`$\%\text{yield}=(9.0/15.0)100=60\%$.`],
    "yield_fraction",
  ),
  mc(
    t,
    107,
    3,
    L`A $17.5\,\mathrm{g}$ sample is $70.0\%$ $\mathrm{KClO_{3}}$ by mass, with inert impurities. For $\mathrm{2KClO_3\rightarrow2KCl+3O_2}$, find the theoretical oxygen mass. Use molar masses $\mathrm{KClO_{3}}$ = 122.5 and $\mathrm{O_{2}}$ = 32.`,
    L`$4.80\,\mathrm{g}$`,
    [
      [
        L`$6.86\,\mathrm{g}$`,
        "This treats the entire impure sample as $\\mathrm{KClO_{3}}$.",
      ],
      [
        L`$3.20\,\mathrm{g}$`,
        "The oxygen-to-chlorate mole ratio is 3:2, not 1:1.",
      ],
      [
        L`$12.25\,\mathrm{g}$`,
        "This is the mass of pure chlorate, not the evolved oxygen.",
      ],
    ],
    [
      "Apply purity before converting to moles.",
      "Convert pure $\\mathrm{KClO_{3}}$ mass using 122.5.",
      "Use the 3:2 oxygen-to-chlorate ratio.",
    ],
    [
      L`Pure mass $=17.5(0.700)=12.25\,\mathrm{g}$, or $0.100\,\mathrm{mol}$.`,
      L`Oxygen mass $=0.100(3/2)(32)=4.80\,\mathrm{g}$.`,
    ],
    "purity_then_stoichiometry",
  ),
  mc(
    t,
    108,
    2,
    L`For $\mathrm{2NaHCO_3\rightarrow Na_2CO_3+CO_2+H_2O}$, complete heating of $16.8\,\mathrm{g}$ $\mathrm{NaHCO_{3}}$ produces how much $\mathrm{CO_{2}}$? Use molar mass $\mathrm{NaHCO_{3}}$ = 84.`,
    L`$0.100\,\mathrm{mol}$`,
    [
      [
        L`$0.200\,\mathrm{mol}$`,
        "Two moles bicarbonate form one mole carbon dioxide.",
      ],
      [
        L`$0.400\,\mathrm{mol}$`,
        "The coefficient two is in the reactant denominator.",
      ],
      [
        L`$0.050\,\mathrm{mol}$`,
        "Only one division by the coefficient two is needed.",
      ],
    ],
    [
      "Convert bicarbonate mass into moles.",
      "Read the 2:1 ratio.",
      "Half the bicarbonate amount becomes carbon dioxide amount.",
    ],
    [
      L`$n(\mathrm{NaHCO_3})=16.8/84=0.200$; $n(\mathrm{CO_2})=0.200/2=0.100\,\mathrm{mol}$.`,
    ],
    "decomposition_coefficients",
  ),
  mc(
    t,
    109,
    3,
    L`For $\mathrm{2Al+3CuSO_4\rightarrow Al_2(SO_4)_3+3Cu}$, $2.70\,\mathrm{g}$ Al reacts with $0.120\,\mathrm{mol}$ $\mathrm{CuSO_{4}}$. Use Al = 27. The mass of unreacted aluminium is`,
    L`$0.54\,\mathrm{g}$`,
    [
      [
        L`$2.16\,\mathrm{g}$`,
        "This is aluminium consumed, not aluminium left.",
      ],
      [
        L`$0\,\mathrm{g}$`,
        "Only 0.080 mol aluminium is needed for the supplied copper sulfate.",
      ],
      [L`$1.62\,\mathrm{g}$`, "Use the aluminium-to-copper-sulfate ratio 2:3."],
    ],
    [
      "Find initial aluminium moles.",
      "Calculate aluminium required for all $\\mathrm{CuSO_{4}}$.",
      "Subtract consumed aluminium before converting the remainder to mass.",
    ],
    [
      L`Initial Al $=0.100\,\mathrm{mol}$; consumed Al $=0.120(2/3)=0.080\,\mathrm{mol}$.`,
      L`Remainder mass $=(0.100-0.080)(27)=0.54\,\mathrm{g}$.`,
    ],
    "excess_reagent_remainder",
  ),
  mc(
    t,
    110,
    3,
    L`Carbon dioxide reacts as $\mathrm{CO_2+Ca(OH)_2\rightarrow CaCO_3+H_2O}$. If $0.15\,\mathrm{mol}$ $\mathrm{CO_{2}}$ reacts with $0.10\,\mathrm{mol}$ $\mathrm{Ca(OH)_{2}}$ and no further reaction occurs, which is correct?`,
    "$\\mathrm{Ca(OH)_{2}}$ is limiting and 0.05 mol $\\mathrm{CO_{2}}$ remains.",
    [
      [
        "$\\mathrm{CO_{2}}$ is limiting and 0.05 mol $\\mathrm{Ca(OH)_{2}}$ remains.",
        "In this 1:1 reaction the smaller reactant amount is calcium hydroxide.",
      ],
      [
        "Neither reactant remains.",
        "The initial amounts are unequal despite the 1:1 coefficient ratio.",
      ],
      [
        "0.15 mol $\\mathrm{CaCO_{3}}$ forms.",
        "Only 0.10 mol calcium hydroxide is available.",
      ],
    ],
    [
      "Use only the specified reaction.",
      "Compare the two amounts for a 1:1 reaction.",
      "Subtract the reacted amount from initial $\\mathrm{CO_{2}}$.",
    ],
    [
      L`Only $0.10\,\mathrm{mol}$ of each reacts; $\mathrm{CO_{2}}$ remaining $=0.15-0.10=0.05\,\mathrm{mol}$.`,
    ],
    "reaction_extent",
  ),
  mc(
    t,
    111,
    3,
    L`At the same temperature and pressure, $5\,\mathrm{mL}$ propane burns with $30\,\mathrm{mL}$ oxygen: $\mathrm{C_3H_8+5O_2\rightarrow3CO_2+4H_2O}$. After all water is removed, the dry gas volume at the initial temperature and pressure is`,
    L`$20\,\mathrm{mL}$`,
    [
      [L`$15\,\mathrm{mL}$`, "This omits the 5 mL unreacted oxygen."],
      [L`$35\,\mathrm{mL}$`, "Gas volume is not conserved in a reaction."],
      [
        L`$40\,\mathrm{mL}$`,
        "The question removes all water before the dry-gas measurement.",
      ],
    ],
    [
      "Use gas volume ratios as mole ratios at the same conditions.",
      "Find oxygen consumed and $\\mathrm{CO_{2}}$ produced.",
      "Add only $\\mathrm{CO_{2}}$ and unreacted oxygen.",
    ],
    [
      L`Oxygen consumed $=25\,\mathrm{mL}$, leaving 5; $\mathrm{CO_{2}}$ formed $=15\,\mathrm{mL}$.`,
      L`Dry gas volume $=5+15=20\,\mathrm{mL}$.`,
    ],
    "combustion_gas_accounting",
  ),
  mc(
    t,
    112,
    3,
    L`For $\mathrm{N_2+3H_2\rightarrow2NH_3}$, a mixture of $2.0\,\mathrm{mol}$ nitrogen and $4.5\,\mathrm{mol}$ hydrogen reacts until hydrogen is exhausted. The total amount of gaseous species afterwards, assuming ammonia remains gaseous, is`,
    L`$3.5\,\mathrm{mol}$`,
    [
      [L`$3.0\,\mathrm{mol}$`, "This omits the unreacted nitrogen."],
      [
        L`$6.5\,\mathrm{mol}$`,
        "Molecular amount need not be conserved in a chemical reaction.",
      ],
      [
        L`$4.0\,\mathrm{mol}$`,
        "Only 1.5 mol nitrogen reacts with the available hydrogen.",
      ],
    ],
    [
      "Calculate nitrogen consumed by 4.5 mol hydrogen.",
      "Calculate ammonia formed.",
      "Add unreacted nitrogen to product ammonia.",
    ],
    [
      L`Nitrogen consumed $=4.5/3=1.5\,\mathrm{mol}$; ammonia formed $=2(1.5)=3.0\,\mathrm{mol}$.`,
      L`Nitrogen remaining $=2.0-1.5=0.5\,\mathrm{mol}$; total gas amount $=3.0+0.5=3.5\,\mathrm{mol}$.`,
    ],
    "total_species_after_reaction",
  ),
  mc(
    t,
    113,
    2,
    L`A reaction has a $75\%$ isolated yield. To obtain $12.0\,\mathrm{g}$ product, the reactant charge must have a theoretical product yield of`,
    L`$16.0\,\mathrm{g}$`,
    [
      [
        L`$9.0\,\mathrm{g}$`,
        "This multiplies by yield instead of compensating for product loss.",
      ],
      [
        L`$12.0\,\mathrm{g}$`,
        "A theoretical yield of 12 g would give only 9 g at 75%.",
      ],
      [
        L`$21.0\,\mathrm{g}$`,
        "The correction is division by 0.75, not an arbitrary added mass.",
      ],
    ],
    [
      "Write actual yield as a fraction of theoretical yield.",
      "The desired 12 g is the actual yield.",
      L`Solve $0.75m=12.0$.`,
    ],
    [L`$m_{theoretical}=12.0/0.75=16.0\,\mathrm{g}$.`],
    "reverse_yield",
  ),
  mc(
    t,
    114,
    2,
    L`For $\mathrm{Fe_2O_3+3CO\rightarrow2Fe+3CO_2}$, the amount of CO required to produce $0.40\,\mathrm{mol}$ iron is`,
    L`$0.60\,\mathrm{mol}$`,
    [
      [
        L`$1.20\,\mathrm{mol}$`,
        "Three moles CO produce two, not one, moles iron.",
      ],
      [
        L`$0.20\,\mathrm{mol}$`,
        "This is the required $\\mathrm{Fe_{2}O_{3}}$ amount.",
      ],
      [L`$0.40\,\mathrm{mol}$`, "The CO-to-iron ratio is 3:2, not 1:1."],
    ],
    [
      "Relate CO directly to iron using coefficients.",
      "Use 3/2 as the conversion factor.",
      "The oxide amount need not be calculated first.",
    ],
    [L`$n_{CO}=0.40(3/2)=0.60\,\mathrm{mol}$.`],
    "reverse_stoichiometry",
  ),
  mc(
    t,
    115,
    2,
    L`For $\mathrm{2H_2+O_2\rightarrow2H_2O}$, which mixture contains the two reactants in exactly stoichiometric amounts?`,
    L`$0.30\,\mathrm{mol}$ $\mathrm{H_{2}}$ and $0.15\,\mathrm{mol}$ $\mathrm{O_{2}}$`,
    [
      [
        L`$0.30\,\mathrm{mol}$ $\mathrm{H_{2}}$ and $0.30\,\mathrm{mol}$ $\mathrm{O_{2}}$`,
        "Equal mole amounts leave oxygen in excess.",
      ],
      [
        L`$0.15\,\mathrm{mol}$ $\mathrm{H_{2}}$ and $0.30\,\mathrm{mol}$ $\mathrm{O_{2}}$`,
        "This reverses the required 2:1 ratio.",
      ],
      [
        L`$0.30\,\mathrm{mol}$ $\mathrm{H_{2}}$ and $0.10\,\mathrm{mol}$ $\mathrm{O_{2}}$`,
        "This has hydrogen in excess.",
      ],
    ],
    [
      "The balanced equation fixes the required ratio.",
      "Hydrogen amount must be twice oxygen amount.",
      "Compare each pair using that ratio.",
    ],
    [L`$0.30/0.15=2$, matching the coefficient ratio $2:1$.`],
    "stoichiometric_mixture",
  ),
  mc(
    t,
    116,
    3,
    L`A $20.0\,\mathrm{g}$ sample containing $\mathrm{MgCO_{3}}$ and inert impurity yields $8.40\,\mathrm{g}$ MgO on complete decomposition: $\mathrm{MgCO_3\rightarrow MgO+CO_2}$. Use molar masses 84 and 40. The $\mathrm{MgCO_{3}}$ purity is`,
    L`$88.2\%$`,
    [
      [L`$42.0\%$`, "MgO mass is not equal to the initial carbonate mass."],
      [
        L`$100\%$`,
        "A pure 20 g carbonate sample would yield more than 8.40 g MgO.",
      ],
      [L`$11.8\%$`, "This is the impurity percentage."],
    ],
    [
      "Convert MgO mass to product moles.",
      "Use the 1:1 ratio to infer initial carbonate moles.",
      "Convert to carbonate mass and compare with sample mass.",
    ],
    [
      L`$n_{MgO}=8.40/40=0.210$; pure $\mathrm{MgCO_{3}}$ mass $=0.210(84)=17.64\,\mathrm{g}$.`,
      L`Purity $=(17.64/20.0)100=88.2\%$.`,
    ],
    "purity_from_product",
  ),
  mc(
    t,
    117,
    2,
    "Assertion: The reactant having the smaller mass is always the limiting reagent. Reason: The limiting reagent is identified by comparing available mole amounts with reaction coefficients. Choose the correct statement.",
    "The assertion is false, but the reason is true.",
    [
      [
        "Both are true, and the reason explains the assertion.",
        "Different molar masses and coefficients make direct mass comparison invalid.",
      ],
      [
        "Both are true, but the reason does not explain the assertion.",
        "The assertion is not generally true.",
      ],
      [
        "The assertion is true, but the reason is false.",
        "Coefficient-adjusted mole amounts, not raw masses, identify the limiting reagent.",
      ],
    ],
    [
      "Mass and chemical amount are not the same.",
      "Consider reactants with very different molar masses.",
      "Compare n divided by coefficient.",
    ],
    [
      "The smaller raw mass can still be the excess reactant. Available moles relative to the required coefficient ratio determine limitation.",
    ],
    "assertion_reason_limiting",
  ),
  mc(
    t,
    118,
    3,
    L`For $\mathrm{2HCl+Ca(OH)_2\rightarrow CaCl_2+2H_2O}$, $0.30\,\mathrm{mol}$ HCl reacts with $0.20\,\mathrm{mol}$ calcium hydroxide. The maximum amount of calcium chloride is`,
    L`$0.15\,\mathrm{mol}$`,
    [
      [
        L`$0.20\,\mathrm{mol}$`,
        "All the calcium hydroxide would require 0.40 mol HCl.",
      ],
      [
        L`$0.30\,\mathrm{mol}$`,
        "Two moles HCl are required per mole calcium chloride.",
      ],
      [
        L`$0.10\,\mathrm{mol}$`,
        "The coefficient two belongs to HCl, not calcium hydroxide.",
      ],
    ],
    [
      "Compare half the acid amount with the base amount.",
      "The acid is limiting.",
      "Use the acid-to-salt ratio 2:1.",
    ],
    [
      L`The possible product amounts are $0.30/2=0.15$ and $0.20/1=0.20\,\mathrm{mol}$.`,
      L`HCl limits the product to $0.15\,\mathrm{mol}$.`,
    ],
    "neutralisation_coefficients",
  ),
  mc(
    t,
    119,
    3,
    L`For $\mathrm{2CO+O_2\rightarrow2CO_2}$, a sealed vessel starts with $0.50\,\mathrm{mol}$ CO and $0.20\,\mathrm{mol}$ $\mathrm{O_{2}}$. The CO amount remaining at completion is`,
    L`$0.10\,\mathrm{mol}$`,
    [
      [L`$0.30\,\mathrm{mol}$`, "Each mole oxygen consumes two moles CO."],
      [
        L`$0.40\,\mathrm{mol}$`,
        "This is the CO consumed, not the amount remaining.",
      ],
      [
        L`$0\,\mathrm{mol}$`,
        "The available oxygen cannot consume all 0.50 mol CO.",
      ],
    ],
    [
      "Determine how much CO the oxygen can consume.",
      "Use two moles CO per mole oxygen.",
      "Subtract consumption from the initial CO amount.",
    ],
    [
      L`CO consumed $=2(0.20)=0.40\,\mathrm{mol}$, leaving $0.50-0.40=0.10\,\mathrm{mol}$.`,
    ],
    "limiting_residual_gas",
  ),
  mc(
    t,
    120,
    2,
    L`A reaction consumes $0.080\,\mathrm{mol}$ of a reactant and theoretically forms $0.120\,\mathrm{mol}$ product. If $0.090\,\mathrm{mol}$ product is isolated, the percentage yield is`,
    L`$75\%$`,
    [
      [
        L`$112.5\%$`,
        "Yield compares product obtained with theoretical product, not reactant amount.",
      ],
      [
        L`$66.7\%$`,
        "The reactant-to-product coefficient ratio is not the isolated yield.",
      ],
      [L`$25\%$`, "This is the missing-product fraction."],
    ],
    [
      "Use quantities for the same product in numerator and denominator.",
      "The theoretical product amount is supplied.",
      "Divide 0.090 by 0.120.",
    ],
    [L`$\%\text{yield}=(0.090/0.120)100=75\%$.`],
    "yield_same_species",
  ),
  written(
    t,
    101,
    "vsaq",
    2,
    L`For $\mathrm{2SO_2+O_2\rightarrow2SO_3}$, state the amount of oxygen needed for $0.60\,\mathrm{mol}$ $\mathrm{SO_{2}}$ and justify the ratio.`,
    [
      [
        "Give the ratio and amount.",
        "Two moles $\\mathrm{SO_{2}}$ require one mole $\\mathrm{O_{2}}$.",
        L`Oxygen needed $=0.60/2=0.30\,\mathrm{mol}$.`,
      ],
    ],
    [
      "Read the balanced coefficients.",
      "Do not assume a 1:1 reactant ratio.",
      "Divide the $\\mathrm{SO_{2}}$ amount by two.",
    ],
    ["Using the oxygen-atom subscript instead of the reaction coefficient."],
    "coefficient_ratio",
  ),
  written(
    t,
    102,
    "vsaq",
    2,
    "Why must a chemical equation be balanced before it is used to calculate product amounts?",
    [
      [
        "State two linked reasons.",
        "Balanced coefficients enforce conservation of each kind of atom.",
        "They therefore supply valid mole ratios between consumed reactants and formed products.",
      ],
    ],
    [
      "Think about atom inventory.",
      "Coefficients count relative numbers of chemical entities.",
      "Those same ratios apply to moles.",
    ],
    ["Treating an unbalanced equation as a valid mole ratio."],
    "balanced_equation_purpose",
  ),
  written(
    t,
    103,
    "vsaq",
    2,
    L`A reaction's theoretical product mass is $8.0\,\mathrm{g}$, but a student reports $8.8\,\mathrm{g}$ of wet product. Calculate the apparent yield and identify one likely explanation.`,
    [
      [
        "Calculate and interpret.",
        L`Apparent yield $=(8.8/8.0)100=110\%$.`,
        "Retained water or another impurity can increase measured mass; this is not evidence of more than the theoretical amount of pure product.",
      ],
    ],
    [
      "Calculate using the measured mass first.",
      "Check whether the weighed material is pure and dry.",
      "Water in the product contributes mass without being the desired product.",
    ],
    ["Accepting 110% as a true pure-product yield."],
    "apparent_excess_yield",
  ),
  written(
    t,
    104,
    "vsaq",
    2,
    "Define the limiting reagent and explain why unused excess reagent cannot form additional product once it is exhausted.",
    [
      [
        "Give definition and consequence.",
        "The limiting reagent is exhausted first according to the balanced reaction proportions.",
        "The reaction cannot continue by the stated equation without that reagent, even if another reactant remains.",
      ],
    ],
    [
      "Use coefficient-adjusted amounts.",
      "A reaction requires all its reactants.",
      "Remaining excess material alone is insufficient.",
    ],
    ["Defining the limiting reagent as the smallest mass."],
    "limiting_definition",
  ),
  written(
    t,
    105,
    "saq",
    3,
    L`Calculate the mass of $\mathrm{CO_{2}}$ formed by burning $4.5\,\mathrm{g}$ ethane completely: $\mathrm{2C_2H_6+7O_2\rightarrow4CO_2+6H_2O}$. Use molar masses ethane = 30 and $\mathrm{CO_{2}}$ = 44.`,
    [
      [
        "Convert through the balanced mole ratio.",
        L`Ethane amount $=4.5/30=0.15\,\mathrm{mol}$.`,
        L`$\mathrm{CO_{2}}$ amount $=0.15(4/2)=0.30\,\mathrm{mol}$.`,
        L`$\mathrm{CO_{2}}$ mass $=0.30(44)=13.2\,\mathrm{g}$ (about $13\,\mathrm{g}$ to two significant figures).`,
      ],
    ],
    [
      "Start with ethane moles.",
      "Each ethane gives two $\\mathrm{CO_{2}}$ molecules.",
      "Use the product molar mass at the end.",
    ],
    ["Applying the mole ratio directly to masses."],
    "combustion_product_mass",
  ),
  written(
    t,
    106,
    "saq",
    3,
    L`For $\mathrm{2Na+Cl_2\rightarrow2NaCl}$, $4.60\,\mathrm{g}$ Na reacts with $3.55\,\mathrm{g}$ $\mathrm{Cl_{2}}$. Use molar masses Na = 23, $\mathrm{Cl_{2}}$ = 71 and NaCl = 58.5. Identify the limiting reagent and calculate product mass.`,
    [
      [
        "Compare required reactant amounts.",
        L`$n_{Na}=0.200$ and $n_{Cl_2}=0.0500\,\mathrm{mol}$.`,
        "Chlorine is limiting; it consumes 0.100 mol sodium and forms 0.100 mol NaCl.",
        L`Product mass $=0.100(58.5)=5.85\,\mathrm{g}$.`,
      ],
    ],
    [
      "The reaction needs two sodium atoms per chlorine molecule.",
      "Do not compare gram amounts directly.",
      "Use the limiting amount to predict product.",
    ],
    ["Using all sodium despite insufficient chlorine."],
    "sodium_chlorine_limit",
  ),
  written(
    t,
    107,
    "saq",
    3,
    L`For $\mathrm{CaCO_3\rightarrow CaO+CO_2}$, a $12.5\,\mathrm{g}$ impure sample yields $4.40\,\mathrm{g}$ $\mathrm{CO_{2}}$. If impurities do not release gas and decomposition is complete, find the $\mathrm{CaCO_{3}}$ percentage. Use molar masses 100 and 44.`,
    [
      [
        "Infer carbonate amount from gas produced.",
        L`$\mathrm{CO_{2}}$ amount $=4.40/44=0.100\,\mathrm{mol}$.`,
        L`Pure carbonate mass $=0.100(100)=10.0\,\mathrm{g}$.`,
        L`Purity $=(10.0/12.5)100=80.0\%$.`,
      ],
    ],
    [
      "Only the carbonate produces the measured gas.",
      "Use the 1:1 mole ratio.",
      "Compare inferred pure mass with the whole sample.",
    ],
    ["Using $\\mathrm{CO_{2}}$ mass itself as the carbonate mass."],
    "gas_based_purity",
  ),
  written(
    t,
    108,
    "saq",
    2,
    L`A process is expected to produce $25.0\,\mathrm{g}$ product but has an isolated yield of $68\%$. Calculate the actual product mass and the shortfall from the theoretical mass.`,
    [
      [
        "Calculate and compare.",
        L`Actual mass $=25.0(0.68)=17.0\,\mathrm{g}$.`,
        L`Shortfall $=25.0-17.0=8.0\,\mathrm{g}$.`,
        "The shortfall can include unreacted material or product lost during isolation; yield alone does not specify the cause.",
      ],
    ],
    [
      "Treat the percentage as a fraction.",
      "Subtract actual from theoretical mass.",
      "Do not infer a unique mechanism from yield data alone.",
    ],
    ["Equating isolated yield directly with reaction conversion."],
    "yield_vs_conversion",
  ),
  written(
    t,
    109,
    "saq",
    3,
    L`For $\mathrm{2H_2+O_2\rightarrow2H_2O}$, $0.60\,\mathrm{mol}$ $\mathrm{H_{2}}$ reacts with $0.40\,\mathrm{mol}$ $\mathrm{O_{2}}$. Find the water amount and the oxygen remaining.`,
    [
      [
        "Determine the limiting amount and remainder.",
        "Hydrogen is limiting because 0.60 mol $\\mathrm{H_{2}}$ requires only 0.30 mol $\\mathrm{O_{2}}$.",
        L`Water formed $=0.60\,\mathrm{mol}$.`,
        L`Oxygen remaining $=0.40-0.30=0.10\,\mathrm{mol}$.`,
      ],
    ],
    [
      "Use the 2:1 reactant ratio.",
      "The smaller raw mole amount need not be limiting.",
      "Subtract only the oxygen actually consumed.",
    ],
    ["Calling oxygen limiting merely because 0.40 is less than 0.60."],
    "coefficient_adjusted_limit",
  ),
  written(
    t,
    110,
    "saq",
    2,
    L`At the same temperature and pressure, $12\,\mathrm{mL}$ CO reacts completely according to $\mathrm{2CO+O_2\rightarrow2CO_2}$. Find the oxygen volume consumed and $\mathrm{CO_{2}}$ volume formed; state why volumes can be compared this way.`,
    [
      [
        "Use the coefficient ratios and their condition.",
        L`Oxygen consumed $=12/2=6\,\mathrm{mL}$.`,
        L`$\mathrm{CO_{2}}$ formed $=12\,\mathrm{mL}$.`,
        "At the same temperature and pressure, ideal-gas volumes are proportional to mole amounts.",
      ],
    ],
    [
      "Check that all specified gases are compared under the same conditions.",
      "Use the 2:1:2 coefficient ratio.",
      "The result concerns gas volumes, not liquid water or solids.",
    ],
    ["Applying gas volume ratios without matching temperature and pressure."],
    "gas_volume_stoichiometry",
  ),
  written(
    t,
    111,
    "saq",
    3,
    L`For $\mathrm{2KClO_3\rightarrow2KCl+3O_2}$, find the mass of pure $\mathrm{KClO_{3}}$ needed for a theoretical yield of $7.20\,\mathrm{g}$ $\mathrm{O_{2}}$. Use molar masses 122.5 and 32.`,
    [
      [
        "Work backwards from product amount.",
        L`Oxygen amount $=7.20/32=0.225\,\mathrm{mol}$.`,
        L`$\mathrm{KClO_{3}}$ amount $=0.225(2/3)=0.150\,\mathrm{mol}$.`,
        L`Required mass $=0.150(122.5)=18.375\,\mathrm{g}\approx18.4\,\mathrm{g}$.`,
      ],
    ],
    [
      "Convert oxygen grams into moles.",
      "Invert the usual chlorate-to-oxygen ratio.",
      "Use the reactant molar mass last.",
    ],
    ["Using the forward ratio 3:2 while solving for the reactant."],
    "reverse_decomposition",
  ),
  written(
    t,
    112,
    "saq",
    3,
    L`For $\mathrm{Fe_2O_3+3CO\rightarrow2Fe+3CO_2}$, $8.00\,\mathrm{g}$ $\mathrm{Fe_{2}O_{3}}$ reacts completely with excess CO. Use Fe = 56, O = 16 and C = 12. Calculate iron mass and CO mass consumed.`,
    [
      [
        "Find the oxide amount and both stoichiometric masses.",
        L`$M_{Fe_2O_3}=160$, so oxide amount $=8.00/160=0.0500\,\mathrm{mol}$.`,
        L`Iron mass $=2(0.0500)(56)=5.60\,\mathrm{g}$.`,
        L`CO mass consumed $=3(0.0500)(28)=4.20\,\mathrm{g}$.`,
      ],
    ],
    [
      "Use $\\mathrm{Fe_{2}O_{3}}$ molar mass 160.",
      "Track iron and carbon monoxide separately.",
      "Their coefficients relative to oxide are two and three.",
    ],
    ["Using the oxygen subscript as the iron coefficient."],
    "ore_reduction",
  ),
  written(
    t,
    113,
    "laq",
    4,
    L`For $\mathrm{2Al+3Cl_2\rightarrow2AlCl_3}$, $4.05\,\mathrm{g}$ aluminium reacts with $14.2\,\mathrm{g}$ chlorine. Use molar masses Al = 27, $\mathrm{Cl_{2}}$ = 71 and $\mathrm{AlCl_{3}}$ = 133.5.`,
    [
      [
        "Identify the limiting reagent and theoretical product mass.",
        L`Reactant amounts are $0.150\,\mathrm{mol}$ Al and $0.200\,\mathrm{mol}$ $\mathrm{Cl_{2}}$.`,
        "Chlorine is limiting because all aluminium would require 0.225 mol chlorine.",
        L`$\mathrm{AlCl_{3}}$ amount $=0.200(2/3)=0.1333\,\mathrm{mol}$, giving $17.8\,\mathrm{g}$.`,
      ],
      [
        "Find unreacted aluminium and check total mass.",
        L`Al remaining $=[0.150-0.200(2/3)]27=0.45\,\mathrm{g}$.`,
        L`Product plus residual mass $=17.8+0.45=18.25\,\mathrm{g}$, equal to $4.05+14.2$.`,
      ],
    ],
    [
      "Compare moles per coefficient.",
      "Keep guard digits for the product and remainder.",
      "Include residual aluminium in the final mass balance.",
    ],
    ["Comparing product mass alone with total starting mass."],
    "limiting_and_mass_balance",
  ),
  written(
    t,
    114,
    "laq",
    4,
    L`A $25.0\,\mathrm{g}$ limestone sample is $84.0\%$ $\mathrm{CaCO_{3}}$, with inert impurities. On heating, $\mathrm{CaCO_3\rightarrow CaO+CO_2}$. Use molar masses 100, 56 and 44.`,
    [
      [
        "Find the theoretical CaO and $\\mathrm{CO_{2}}$ masses.",
        L`Pure $\mathrm{CaCO_{3}}$ mass $=25.0(0.840)=21.0\,\mathrm{g}$, or $0.210\,\mathrm{mol}$.`,
        L`Theoretical CaO mass $=0.210(56)=11.76\,\mathrm{g}$.`,
        L`Theoretical $\mathrm{CO_{2}}$ mass $=0.210(44)=9.24\,\mathrm{g}$.`,
      ],
      [
        "Find the total solid residue for complete decomposition, and the collected $\\mathrm{CO_{2}}$ mass if gas collection efficiency is 90.0%.",
        L`Solid residue includes $4.00\,\mathrm{g}$ impurity: $11.76+4.00=15.76\,\mathrm{g}$.`,
        L`Collected $\mathrm{CO_{2}}$ mass $=9.24(0.900)=8.316\,\mathrm{g}\approx8.32\,\mathrm{g}$.`,
      ],
    ],
    [
      "Remove inert impurity from the reacting amount.",
      "Keep the impurity in the solid-residue calculation.",
      "Gas collection efficiency affects collected gas, not the completed decomposition.",
    ],
    ["Applying collection efficiency to the amount of solid formed."],
    "purity_collection_synthesis",
  ),
  written(
    t,
    115,
    "laq",
    4,
    L`A mixture of $0.20\,\mathrm{mol}$ $\mathrm{CH_{4}}$ and $0.10\,\mathrm{mol}$ $\mathrm{C_{2}H_{6}}$ burns completely in excess oxygen. Products are $\mathrm{CO_{2}}$ and $\mathrm{H_{2}O}$.`,
    [
      [
        "Write balanced combustion equations.",
        L`$\mathrm{CH_4+2O_2\rightarrow CO_2+2H_2O}$.`,
        L`$\mathrm{2C_2H_6+7O_2\rightarrow4CO_2+6H_2O}$.`,
      ],
      [
        "Find the total amounts of oxygen consumed, carbon dioxide formed and water formed.",
        L`$\mathrm{O_{2}}$ consumed $=2(0.20)+(7/2)(0.10)=0.75\,\mathrm{mol}$.`,
        L`$\mathrm{CO_{2}}$ formed $=0.20+2(0.10)=0.40\,\mathrm{mol}$.`,
        L`$\mathrm{H_{2}O}$ formed $=2(0.20)+3(0.10)=0.70\,\mathrm{mol}$.`,
      ],
    ],
    [
      "Balance each fuel separately.",
      "Multiply each fuel amount by its own conversion factors.",
      "Add contributions only for the same chemical species.",
    ],
    ["Using methane's coefficients for both fuels."],
    "mixed_fuel_combustion",
  ),
  written(
    t,
    116,
    "laq",
    4,
    L`A mixture containing only $\mathrm{Na_{2}CO_{3}}$ and $\mathrm{NaHCO_{3}}$ has mass $9.50\,\mathrm{g}$. Excess acid converts each formula unit of either salt into one $\mathrm{CO_{2}}$ molecule and produces $0.100\,\mathrm{mol}$ $\mathrm{CO_{2}}$ in total. Use molar masses 106 and 84.`,
    [
      [
        "Set up equations for the amounts x and y of the two salts.",
        L`$\mathrm{CO_{2}}$ accounting gives $x+y=0.100$.`,
        L`Mass accounting gives $106x+84y=9.50$.`,
      ],
      [
        "Find both amounts and masses.",
        L`Substitution gives $22x=1.10$, so $x=0.0500\,\mathrm{mol}$.`,
        L`$y=0.0500\,\mathrm{mol}$.`,
        L`The masses are $5.30\,\mathrm{g}$ $\mathrm{Na_{2}CO_{3}}$ and $4.20\,\mathrm{g}$ $\mathrm{NaHCO_{3}}$.`,
      ],
    ],
    [
      "Use one equation for product amount and one for sample mass.",
      "Do not assume equal salt amounts before solving.",
      "Eliminate one variable using the mole equation.",
    ],
    ["Assigning the whole sample one molar mass."],
    "two_component_analysis",
  ),
  written(
    t,
    117,
    "case",
    3,
    L`In a model reaction $\mathrm{A_2+3B_2\rightarrow2AB_3}$, a closed box initially contains 5 $\mathrm{A_{2}}$ molecules and 12 $\mathrm{B_{2}}$ molecules.`,
    [
      [
        "Identify the limiting species and product count.",
        "$\\mathrm{B_{2}}$ is limiting: 12 $\\mathrm{B_{2}}$ molecules react with four $\\mathrm{A_{2}}$ molecules.",
        "Eight $\\mathrm{AB_{3}}$ molecules form.",
      ],
      [
        "Account for the remaining reactant and check A atoms.",
        "One $\\mathrm{A_{2}}$ molecule remains.",
        "There are initially 10 A atoms and finally eight in $\\mathrm{AB_{3}}$ plus two in residual $\\mathrm{A_{2}}$, still 10.",
      ],
    ],
    [
      "Group $\\mathrm{B_{2}}$ molecules in sets of three.",
      "Each complete reaction group forms two $\\mathrm{AB_{3}}$ molecules.",
      "Remember leftover $\\mathrm{A_{2}}$ in the atom balance.",
    ],
    ["Assuming all five $\\mathrm{A_{2}}$ molecules react."],
    "particle_reaction_accounting",
  ),
  written(
    t,
    118,
    "case",
    3,
    L`A student predicts product masses from $\mathrm{2Mg+O_2\rightarrow2MgO}$ using $2.40\,\mathrm{g}$ Mg and $3.20\,\mathrm{g}$ $\mathrm{O_{2}}$. Use molar masses Mg = 24, $\mathrm{O_{2}}$ = 32 and MgO = 40.`,
    [
      [
        "Determine the limiting reagent and product mass.",
        "Both reactants are initially 0.100 mol, but magnesium is limiting because two Mg are required per $\\mathrm{O_{2}}$.",
        L`MgO amount is $0.100\,\mathrm{mol}$ and mass is $4.00\,\mathrm{g}$.`,
      ],
      [
        "Find oxygen remaining and explain why product mass is below the total reactant mass.",
        L`Oxygen remaining $=(0.100-0.0500)32=1.60\,\mathrm{g}$.`,
        "The 1.60 g residual oxygen is part of the final system but not part of MgO.",
      ],
    ],
    [
      "Equal moles are not stoichiometric here.",
      "Use magnesium to determine product amount.",
      "Check 4.00 + 1.60 against the starting mass.",
    ],
    ["Treating equal mole amounts as always leaving no excess."],
    "mass_reconciliation",
  ),
  written(
    t,
    119,
    "case",
    3,
    L`A synthesis has theoretical product mass $6.00\,\mathrm{g}$. The first weighing gives $6.30\,\mathrm{g}$; after drying to constant mass it gives $4.80\,\mathrm{g}$.`,
    [
      [
        "Calculate the apparent initial yield and the dry isolated yield.",
        L`Initial apparent yield $=(6.30/6.00)100=105\%$.`,
        L`Dry isolated yield $=(4.80/6.00)100=80.0\%$.`,
      ],
      [
        "Interpret the difference without overclaiming purity.",
        "The 1.50 g loss on drying can explain the inflated first mass through retained volatile material.",
        "Constant mass does not by itself prove chemical purity; use the dry mass only with an appropriate purity assumption.",
      ],
    ],
    [
      "Compute each yield against the same theoretical mass.",
      "Drying removes volatile contributions.",
      "Distinguish dryness from chemical purity.",
    ],
    ["Treating an initial yield above 100% as superior reaction efficiency."],
    "product_isolation_data",
  ),
  written(
    t,
    120,
    "case",
    3,
    L`Two batches each start with $0.50\,\mathrm{mol}$ $\mathrm{N_{2}}$. Batch P has $0.90\,\mathrm{mol}$ $\mathrm{H_{2}}$; batch Q has $1.80\,\mathrm{mol}$ $\mathrm{H_{2}}$. Assume the reaction $\mathrm{N_2+3H_2\rightarrow2NH_3}$ proceeds to exhaustion of the limiting reagent.`,
    [
      [
        "Find limiting reagents and theoretical $\\mathrm{NH_{3}}$ amounts.",
        "P is hydrogen-limited and forms 0.60 mol $\\mathrm{NH_{3}}$.",
        "Q is nitrogen-limited and forms 1.00 mol $\\mathrm{NH_{3}}$.",
      ],
      [
        "Explain why doubling $\\mathrm{H_{2}}$ does not double $\\mathrm{NH_{3}}$, and find residual $\\mathrm{H_{2}}$ in Q.",
        "The limiting reagent changes from hydrogen to nitrogen, capping Q's production at 1.00 mol.",
        L`Q leaves $1.80-3(0.50)=0.30\,\mathrm{mol}$ $\mathrm{H_{2}}$.`,
      ],
    ],
    [
      "Evaluate each batch independently.",
      "Compare hydrogen supply with 1.50 mol needed for all nitrogen.",
      "A yield increase stops being proportional when the limiting reagent changes.",
    ],
    ["Doubling predicted product without rechecking the limiting reagent."],
    "changing_limiting_reagent",
  ),
];
