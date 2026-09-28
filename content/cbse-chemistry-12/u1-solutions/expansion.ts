import { chapterPractice } from "../chapter-practice";
const { mc, written: w } = chapterPractice("u1-solutions");
const L = String.raw;
export const solutionsExpansion = [
  mc(
    "1.1",
    101,
    3,
    L`An aqueous glucose solution is $20\%$ by mass and has density $1.20\,\mathrm{g\,mL^{-1}}$. With glucose molar mass $180\,\mathrm{g\,mol^{-1}}$, its molarity is`,
    L`$4/3\,\mathrm{mol\,L^{-1}}$`,
    [
      [
        L`$10/9\,\mathrm{mol\,L^{-1}}$`,
        "This treats 100 g solution as 100 mL despite the stated density.",
      ],
      [
        L`$5/3\,\mathrm{mol\,L^{-1}}$`,
        "This uses solvent mass instead of solution volume.",
      ],
      [
        L`$24\,\mathrm{mol\,L^{-1}}$`,
        "240 g per litre must still be divided by molar mass.",
      ],
    ],
    [
      "Use one litre as the basis.",
      "Find solution mass from density.",
      "Twenty percent of that mass is glucose.",
    ],
    [
      L`One litre weighs $1200\,\mathrm{g}$ and contains $240\,\mathrm{g}$ glucose. Thus $c=(240/180)/1=4/3\,\mathrm{mol\,L^{-1}}$.`,
    ],
  ),
  mc(
    "1.1",
    102,
    2,
    L`A sealed solution expands from $200$ to $208\,\mathrm{mL}$ on warming, without evaporation or reaction. Its initial molarity is $0.520\,\mathrm{M}$. The final molarity is`,
    L`$0.500\,\mathrm{M}$`,
    [
      [
        L`$0.541\,\mathrm{M}$`,
        "Expansion lowers concentration; this uses the volume ratio in reverse.",
      ],
      [
        L`$0.520\,\mathrm{M}$`,
        "Moles remain constant, but molarity does not when volume changes.",
      ],
      [
        L`$0.020\,\mathrm{M}$`,
        "This is the change, not the final concentration.",
      ],
    ],
    [
      "Solute amount stays fixed.",
      L`Use $c_1V_1=c_2V_2$.`,
      "The final volume is larger.",
    ],
    [L`$c_2=0.520(200/208)=0.500\,\mathrm{M}$.`],
  ),
  mc(
    "1.1",
    103,
    2,
    L`A non-electrolyte solution is $2.0\,\mathrm{mol\,kg^{-1}}$ in water. Take water molar mass as $18\,\mathrm{g\,mol^{-1}}$. The solute mole fraction is`,
    L`$9/259$`,
    [
      [
        L`$9/250$`,
        "This is the solute-to-solvent mole ratio, not mole fraction.",
      ],
      [L`$2/1002$`, "Mass in grams cannot be added to an amount in moles."],
      [L`$250/259$`, "This is the solvent mole fraction."],
    ],
    [
      "Take 1 kg water.",
      "Convert it to moles.",
      "Divide solute moles by total moles.",
    ],
    [L`$x_2=2/(2+1000/18)=36/1036=9/259$.`],
  ),
  mc(
    "1.1",
    104,
    2,
    L`Equal volumes of $0.20\,\mathrm{M}$ and $0.60\,\mathrm{M}$ glucose solutions are mixed. Assuming additive volumes, the final concentration is`,
    L`$0.40\,\mathrm{M}$`,
    [
      [
        L`$0.80\,\mathrm{M}$`,
        "The amounts add, but the total volume also doubles.",
      ],
      [L`$0.30\,\mathrm{M}$`, "Both solutions contribute solute."],
      [
        L`$0.20\,\mathrm{M}$`,
        "The more concentrated solution raises the final concentration.",
      ],
    ],
    ["Let each volume be V.", "Add the solute amounts.", "Divide by 2V."],
    [L`$c=(0.20V+0.60V)/(2V)=0.40\,\mathrm{M}$.`],
  ),
  w(
    "1.1",
    101,
    "vsaq",
    2,
    "A student claims that a 10% mass solution is necessarily also a 10% mass-by-volume solution.",
    [
      [
        "Is the claim valid? State the missing information.",
        "No: mass percentage uses mass of solution, whereas mass-by-volume percentage uses volume of solution.",
        "Density at the stated temperature is needed to relate these denominators; equality occurs numerically only for density 1 g/mL.",
      ],
    ],
    [
      "Compare the denominators.",
      "Mass and volume are not interchangeable.",
      "Which property relates mass and volume?",
    ],
    ["Treating all aqueous solutions as having density 1 g/mL."],
  ),
  w(
    "1.1",
    102,
    "saq",
    2,
    L`A solution contains $12\,\mathrm{g}$ urea ($M=60$) in $108\,\mathrm{g}$ water ($M=18$).`,
    [
      [
        "Calculate its mass percentage, molality and urea mole fraction.",
        L`Mass percentage $=100(12/120)=10\%$.`,
        L`$m=(12/60)/0.108=50/27\,\mathrm{mol\,kg^{-1}}$.`,
        L`$x_{urea}=0.20/(0.20+6)=1/31$.`,
      ],
    ],
    [
      "Use total mass for mass percentage.",
      "Use kilograms of water for molality.",
      "Use moles of both species for mole fraction.",
    ],
    ["Using 120 g as solvent mass."],
  ),
  w(
    "1.1",
    103,
    "laq",
    3,
    L`A $15\%$ by mass aqueous solute solution has density $1.10\,\mathrm{g\,mL^{-1}}$. The solute molar mass is $60\,\mathrm{g\,mol^{-1}}$.`,
    [
      [
        "Calculate its molarity and molality.",
        L`A litre of solution has mass $1100\,\mathrm{g}$ and solute mass $165\,\mathrm{g}$.`,
        L`Solute amount is $165/60=2.75\,\mathrm{mol}$, hence molarity $2.75\,\mathrm{M}$.`,
        L`Solvent mass is $935\,\mathrm{g}$, so molality $=2.75/0.935=50/17\,\mathrm{mol\,kg^{-1}}$.`,
      ],
      [
        L`Find the stock volume needed for $250\,\mathrm{mL}$ of $0.55\,\mathrm{M}$ solution; describe the dilution.`,
        L`$V=0.55(250)/2.75=50\,\mathrm{mL}$.`,
        "Measure 50 mL stock and dilute to a final volume of 250 mL, not by adding 250 mL water.",
      ],
    ],
    [
      "Choose a litre basis.",
      "Subtract solute mass to obtain solvent mass.",
      "For dilution conserve solute moles.",
    ],
    [
      "Using solution mass in molality; confusing added water with final volume.",
    ],
  ),
  w(
    "1.1",
    104,
    "case",
    3,
    L`A laboratory mixes $100\,\mathrm{mL}$ of $0.30\,\mathrm{M}$ glucose with $200\,\mathrm{mL}$ of $0.15\,\mathrm{M}$ glucose. It then removes water by evaporation until the volume is $240\,\mathrm{mL}$. No glucose is lost or changed.`,
    [
      [
        "Calculate the initial total glucose amount and concentration after mixing.",
        L`$n=0.100(0.30)+0.200(0.15)=0.060\,\mathrm{mol}$.`,
        L`With additive volumes, $c=0.060/0.300=0.20\,\mathrm{M}$.`,
      ],
      [
        "Find the concentration after evaporation and explain whether molality changes.",
        L`$c=0.060/0.240=0.25\,\mathrm{M}$.`,
        "Molality increases because solvent mass decreases while solute amount remains fixed.",
      ],
    ],
    [
      "Add amounts, not molarities.",
      "Track glucose through evaporation.",
      "Consider the solvent mass separately.",
    ],
    [
      "Assuming molality never changes: it is temperature independent only at fixed composition.",
    ],
  ),
  mc(
    "1.2",
    101,
    3,
    L`An ideal binary liquid has $p_A^0=90$ and $p_B^0=30\,\mathrm{kPa}$. Its total vapour pressure is $54\,\mathrm{kPa}$. The liquid mole fraction of A is`,
    L`$0.40$`,
    [
      [L`$0.60$`, "This is the mole fraction of B."],
      [L`$0.80$`, "The pressure difference must be divided by 60, not 30."],
      [L`$0.20$`, "Substitution gives 42 kPa, not 54 kPa."],
    ],
    [
      L`Write $p=x_Ap_A^0+(1-x_A)p_B^0$.`,
      "Collect the terms in xA.",
      "Subtract the pressure of pure B first.",
    ],
    [L`$54=30+60x_A$, hence $x_A=0.40$.`],
  ),
  mc(
    "1.2",
    102,
    2,
    L`At the same temperature and gas partial pressure, gases P and Q have Henry constants $K_{H,P}=2K_{H,Q}$ in the same solvent. Their dissolved mole-fraction ratio $x_P/x_Q$ is`,
    L`$1/2$`,
    [
      [L`$2$`, "With p=KHx, solubility is inversely proportional to KH."],
      [L`$1$`, "Different Henry constants imply different solubilities."],
      [L`$4$`, "Henry's law is linear, not quadratic."],
    ],
    [
      L`Use $x=p/K_H$.`,
      "The pressures cancel in the ratio.",
      "The larger constant gives the smaller mole fraction.",
    ],
    [L`$x_P/x_Q=K_{H,Q}/K_{H,P}=1/2$.`],
  ),
  mc(
    "1.2",
    103,
    2,
    "A liquid mixture shows a maximum in total vapour pressure at an intermediate composition and forms an azeotrope there. The azeotrope is",
    "minimum-boiling",
    [
      [
        "maximum-boiling",
        "Higher vapour pressure corresponds to a lower boiling temperature at fixed external pressure.",
      ],
      [
        "necessarily ideal",
        "An ideal binary solution does not produce this interior vapour-pressure maximum.",
      ],
      [
        "separable completely by ordinary fractional distillation",
        "At the azeotrope the vapour and liquid compositions coincide.",
      ],
    ],
    [
      "Compare vapour pressure at the same temperature.",
      "Boiling occurs when vapour pressure reaches external pressure.",
      "A larger vapour pressure means that less heating is needed.",
    ],
    [
      "The pressure maximum corresponds to a boiling-temperature minimum. At the azeotropic composition, liquid and vapour have the same composition.",
    ],
  ),
  mc(
    "1.2",
    104,
    3,
    L`An ideal equimolar liquid mixture has $p_A^0=120$ and $p_B^0=40\,\mathrm{kPa}$. The mole fraction of A in its equilibrium vapour is`,
    L`$0.75$`,
    [
      [
        L`$0.50$`,
        "This is liquid composition; the vapour is enriched in the more volatile component.",
      ],
      [L`$0.25$`, "This is the vapour mole fraction of B."],
      [L`$1.50$`, "A mole fraction cannot exceed one."],
    ],
    [
      "Calculate both partial pressures.",
      "Add them for total pressure.",
      "Use partial pressure divided by total pressure.",
    ],
    [L`$p_A=60$, $p_B=20\,\mathrm{kPa}$, hence $y_A=60/80=0.75$.`],
  ),
  w(
    "1.2",
    101,
    "vsaq",
    2,
    "A gas dissolves exothermically in water. Explain the effects of warming at fixed partial pressure and of increasing partial pressure at fixed temperature.",
    [
      [
        "State and explain both effects.",
        "Warming favours gas escape in an exothermic dissolution equilibrium and reduces solubility.",
        "Increasing partial pressure increases dissolved mole fraction, as x=p/KH at fixed temperature.",
      ],
    ],
    [
      "Treat temperature and pressure separately.",
      "Apply equilibrium reasoning to heat.",
      "Apply Henry's law only at fixed temperature.",
    ],
    ["Saying all solids and gases have identical temperature trends."],
  ),
  w(
    "1.2",
    102,
    "saq",
    3,
    L`At a fixed temperature, $K_H=4.0\times10^4\,\mathrm{kPa}$. A gas mixture at total pressure $200\,\mathrm{kPa}$ contains $20\%$ of this gas by mole.`,
    [
      [
        "Calculate its partial pressure and dissolved mole fraction. Predict the new mole fraction if total pressure doubles at unchanged gas composition.",
        L`$p=0.20(200)=40\,\mathrm{kPa}$.`,
        L`$x=p/K_H=40/(4.0\times10^4)=1.0\times10^{-3}$.`,
        L`Doubling total pressure doubles partial pressure, so $x=2.0\times10^{-3}$.`,
      ],
    ],
    [
      "Henry's law uses the gas partial pressure.",
      "Use the gas mole fraction to find partial pressure.",
      "KH stays constant at the stated temperature.",
    ],
    ["Using 200 kPa directly as the gas partial pressure."],
  ),
  w(
    "1.2",
    103,
    "laq",
    3,
    L`Pure liquids A and B have vapour pressures $100$ and $50\,\mathrm{kPa}$ at a fixed temperature. A mixture with $x_A=0.60$ has observed total pressure $72\,\mathrm{kPa}$.`,
    [
      [
        "Find the ideal total pressure and classify the deviation.",
        L`$p_A^{ideal}=0.60(100)=60\,\mathrm{kPa}$.`,
        L`$p_B^{ideal}=0.40(50)=20\,\mathrm{kPa}$; total $80\,\mathrm{kPa}$.`,
        "The observed value is lower, so the mixture shows negative deviation.",
      ],
      [
        "Explain the molecular interaction and expected sign of enthalpy of mixing.",
        "Unlike attractions are stronger than the corresponding like attractions, reducing escape into vapour.",
        L`Mixing is exothermic: $\Delta H_{mix}<0$.`,
      ],
    ],
    [
      "Calculate the Raoult-law prediction first.",
      "Compare observed and predicted pressures.",
      "Relate lower escaping tendency to stronger attraction.",
    ],
    ["Inferring an azeotrope from one pressure measurement alone."],
  ),
  w(
    "1.2",
    104,
    "case",
    3,
    L`At one temperature an ideal binary solution has $p_A^0=80$ and $p_B^0=20\,\mathrm{kPa}$. Two samples have liquid mole fractions $x_A=0.25$ and $0.75$.`,
    [
      [
        "Calculate the total pressure of each sample.",
        L`At $x_A=0.25$, $p=20+15=35\,\mathrm{kPa}$.`,
        L`At $x_A=0.75$, $p=60+5=65\,\mathrm{kPa}$.`,
      ],
      [
        "For the first sample find vapour composition of A and identify the more volatile liquid.",
        L`$y_A=p_A/p=20/35=4/7$.`,
        "A is more volatile because its pure vapour pressure is higher at the same temperature.",
      ],
    ],
    [
      "Use both partial pressures.",
      "Vapour mole fraction uses total vapour pressure.",
      "Volatility compares pure-liquid vapour pressures.",
    ],
    ["Equating liquid and vapour mole fractions for every ideal solution."],
  ),
  mc(
    "1.3",
    101,
    2,
    L`Equal masses of glucose ($M=180$) and urea ($M=60$) are separately dissolved in equal masses of water. Both dilute solutions are ideal. The ratio $\Delta T_f(\text{urea})/\Delta T_f(\text{glucose})$ is`,
    L`$3$`,
    [
      [L`$1$`, "Equal solute masses do not imply equal numbers of particles."],
      [
        L`$1/3$`,
        "Urea has the smaller molar mass and therefore more particles.",
      ],
      [L`$9$`, "The colligative effect is linear in amount, not its square."],
    ],
    [
      "Convert equal masses into amounts.",
      "Solvent masses are equal.",
      "Both solutes have i=1.",
    ],
    [L`$\Delta T_f\propto 1/M$ for fixed masses, so the ratio is $180/60=3$.`],
  ),
  mc(
    "1.3",
    102,
    2,
    L`A dilute non-electrolyte solution has $\Delta T_b=0.13\,\mathrm{K}$. For the solvent $K_b=0.52$ and $K_f=1.86\,\mathrm{K\,kg\,mol^{-1}}$. Its freezing-point depression is`,
    L`$0.465\,\mathrm{K}$`,
    [
      [
        L`$0.13\,\mathrm{K}$`,
        "Different constants produce different temperature changes.",
      ],
      [L`$7.44\,\mathrm{K}$`, "Molality is 0.13/0.52, not its reciprocal."],
      [
        L`$0.242\,\mathrm{K}$`,
        "You must first divide by Kb before multiplying by Kf.",
      ],
    ],
    [
      "Find molality from boiling elevation.",
      "Use the same molality for freezing.",
      L`Apply $\Delta T_f=K_fm$.`,
    ],
    [L`$m=0.13/0.52=0.25$ and $\Delta T_f=1.86(0.25)=0.465\,\mathrm{K}$.`],
  ),
  mc(
    "1.3",
    103,
    3,
    L`A non-volatile non-electrolyte is added to $9.0\,\mathrm{mol}$ of solvent. The ideal relative lowering of vapour pressure is $0.10$. The solute amount is`,
    L`$1.0\,\mathrm{mol}$`,
    [
      [
        L`$0.90\,\mathrm{mol}$`,
        "This approximates total moles by solvent moles although an exact answer is requested.",
      ],
      [L`$9.0\,\mathrm{mol}$`, "Equal amounts would give a lowering of 0.50."],
      [
        L`$0.10\,\mathrm{mol}$`,
        "Relative lowering is a mole fraction, not an amount.",
      ],
    ],
    [
      "Relative lowering equals solute mole fraction.",
      L`Use $n/(9+n)=0.10$.`,
      "Include solute in total moles.",
    ],
    [L`$n=0.90+0.10n$, so $n=1.0\,\mathrm{mol}$.`],
  ),
  mc(
    "1.3",
    104,
    2,
    "In a freezing-point molar-mass experiment, some solvent evaporates before measurement but its original mass is used in the calculation. The solute is non-volatile and unchanged. The calculated molar mass is",
    "too low",
    [
      [
        "too high",
        "The measured depression becomes larger, making inferred molar mass smaller.",
      ],
      [
        "unchanged",
        "Solute mass is unchanged, but solvent mass has decreased.",
      ],
      [
        "necessarily doubled",
        "The error depends on the fraction of solvent lost.",
      ],
    ],
    [
      "Evaporation increases true molality.",
      "That increases the measured freezing depression.",
      "In the calculation, molar mass is inversely proportional to depression.",
    ],
    [
      L`The observed depression reflects the smaller actual solvent mass. In $M=K_fw/(W\Delta T_f)$, $w$ is solute mass in grams and $W$ is solvent mass in kilograms. Using the larger original $W$ underestimates $M$.`,
    ],
  ),
  w(
    "1.3",
    101,
    "vsaq",
    2,
    "Explain why adding a non-volatile solute raises a solvent's boiling point at fixed external pressure.",
    [
      [
        "Give the two linked steps.",
        "The solute lowers solvent vapour pressure at a given temperature.",
        "A higher temperature is then needed for that vapour pressure to reach the external pressure.",
      ],
    ],
    [
      "Begin with vapour pressure lowering.",
      "Recall the boiling condition.",
      "Keep external pressure fixed.",
    ],
    ["Saying the solute itself must boil first."],
  ),
  w(
    "1.3",
    102,
    "saq",
    2,
    L`A $3.0\,\mathrm{g}$ non-electrolyte in $100\,\mathrm{g}$ water gives $\Delta T_f=0.558\,\mathrm{K}$. Take $K_f=1.86\,\mathrm{K\,kg\,mol^{-1}}$.`,
    [
      [
        "Determine molality, amount of solute and molar mass.",
        L`$m=0.558/1.86=0.300\,\mathrm{mol\,kg^{-1}}$.`,
        L`$n=0.300(0.100)=0.0300\,\mathrm{mol}$.`,
        L`$M=3.0/0.0300=100\,\mathrm{g\,mol^{-1}}$.`,
      ],
    ],
    [
      "Find molality before molar mass.",
      "Use kilograms of water.",
      "Molar mass is mass divided by moles.",
    ],
    ["Using 103 g as solvent mass."],
  ),
  w(
    "1.3",
    103,
    "laq",
    3,
    L`A solution contains $6.0\,\mathrm{g}$ urea ($M=60$) and $9.0\,\mathrm{g}$ glucose ($M=180$) in $250\,\mathrm{g}$ water. Both are non-volatile non-electrolytes. Take $K_f=1.86$ and $K_b=0.52\,\mathrm{K\,kg\,mol^{-1}}$.`,
    [
      [
        "Calculate total solute molality and the two colligative temperature changes.",
        L`Amounts are $0.10\,\mathrm{mol}$ urea and $0.05\,\mathrm{mol}$ glucose.`,
        L`Total molality $=(0.10+0.05)/0.250=0.60$.`,
        L`$\Delta T_f=1.86(0.60)=1.116\,\mathrm{K}$.`,
        L`$\Delta T_b=0.52(0.60)=0.312\,\mathrm{K}$.`,
      ],
      [
        "Would replacing glucose by an equal mass of urea increase the effects? Explain.",
        "Yes. At fixed mass, the smaller molar mass of urea gives more solute particles; both effects increase.",
      ],
    ],
    [
      "Count the two solutes separately.",
      "Add their amounts before dividing by solvent mass.",
      "Colligative effects depend on total particle count.",
    ],
    ["Adding solute masses and dividing by just one molar mass."],
  ),
  w(
    "1.3",
    104,
    "case",
    3,
    L`A lab uses dilute aqueous non-electrolyte samples P and Q of the same molality. Their solvent constants are $K_f=1.86$ and $K_b=0.52\,\mathrm{K\,kg\,mol^{-1}}$. P shows $\Delta T_f=0.744\,\mathrm{K}$. Water is then added to Q until its solvent mass doubles.`,
    [
      [
        "Find the initial molality and initial boiling elevation of Q.",
        L`$m=0.744/1.86=0.400$.`,
        L`$\Delta T_b=0.52(0.400)=0.208\,\mathrm{K}$.`,
      ],
      [
        "Find Q's final freezing depression and explain why its solute identity is not needed.",
        L`Final molality is $0.200$ and $\Delta T_f=0.372\,\mathrm{K}$.`,
        "For ideal non-electrolytes the effect depends on particle number per solvent mass, not chemical identity.",
      ],
    ],
    [
      "Equal molalities mean equal initial effects in the same solvent.",
      "Dilution conserves solute amount.",
      "Doubling solvent mass halves molality.",
    ],
    ["Doubling the colligative effect when water is added."],
  ),
  mc(
    "1.4",
    101,
    2,
    "Two dilute solutions of the same non-electrolyte have equal molarity. Their temperatures are 300 K and 330 K. The ratio of their osmotic pressures (hotter/colder) is",
    L`$1.10$`,
    [
      [
        L`$1$`,
        "Equal molarity does not cancel the absolute-temperature dependence.",
      ],
      [L`$30$`, "Use the ratio of temperatures, not their difference."],
      [L`$10/11$`, "This is the colder-to-hotter ratio."],
    ],
    [
      L`Use $\pi=cRT$.`,
      "Concentrations and R cancel.",
      "Temperatures must be in kelvin.",
    ],
    [L`$\pi_{330}/\pi_{300}=330/300=1.10$.`],
  ),
  mc(
    "1.4",
    102,
    3,
    L`Equal volumes of ideal $0.10\,\mathrm{M}$ glucose and $0.20\,\mathrm{M}$ urea are mixed without reaction. Compared with the original glucose solution at the same temperature, the mixture's osmotic pressure is`,
    "1.5 times as large",
    [
      [
        "3 times as large",
        "The amount triples relative to one starting volume, but the volume doubles.",
      ],
      ["the same", "The urea solution has a higher particle concentration."],
      ["0.5 times as large", "Both solutions contribute solute particles."],
    ],
    [
      "Add particle amounts.",
      "Use the combined volume.",
      "Osmotic pressure is proportional to total particle molarity.",
    ],
    [
      L`$c_{total}=(0.10V+0.20V)/(2V)=0.15\,\mathrm{M}$; the ratio is $0.15/0.10=1.5$.`,
    ],
  ),
  mc(
    "1.4",
    103,
    2,
    "A solution and pure water are separated by a membrane permeable only to water. A pressure equal to the solution's osmotic pressure is applied to the solution side. Initially there is",
    "no net solvent flow",
    [
      [
        "net solvent flow into the solution",
        "That occurs when the applied pressure is smaller.",
      ],
      [
        "net solvent flow into pure water",
        "Reverse osmosis requires pressure greater than osmotic pressure.",
      ],
      [
        "solute flow through the membrane",
        "The membrane is specified to exclude solute.",
      ],
    ],
    [
      "Osmotic pressure is the stopping pressure.",
      "Equality is different from exceeding it.",
      "The membrane excludes solute.",
    ],
    [
      "At the stopping pressure the opposing tendencies balance: solvent can exchange microscopically but there is no net flow.",
    ],
  ),
  mc(
    "1.4",
    104,
    3,
    L`At the same temperature, $0.020\,\mathrm{M}$ of an undissociated solute A is isotonic with $0.010\,\mathrm{M}$ solute B. The effective van't Hoff factor of B is`,
    L`$2$`,
    [
      [
        L`$1/2$`,
        "B is more dilute in formula units, so each unit must produce more particles.",
      ],
      [L`$1$`, "That would give half the osmotic pressure."],
      [L`$4$`, "That would give twice A's osmotic pressure."],
    ],
    [
      "Isotonic means equal osmotic pressure.",
      L`Use $i_Ac_A=i_Bc_B$.`,
      "A is undissociated.",
    ],
    [L`$1(0.020)=i_B(0.010)$ gives $i_B=2$.`],
  ),
  w(
    "1.4",
    101,
    "vsaq",
    2,
    "Why is osmotic pressure useful for determining the molar mass of a protein compared with measuring boiling-point elevation?",
    [
      [
        "Give two reasons.",
        "It can be measured at ordinary temperatures, avoiding thermal decomposition or denaturation caused by heating.",
        "Osmotic pressure is measurable for very dilute macromolecular solutions whose boiling elevation is too small to measure accurately.",
      ],
    ],
    [
      "Consider heat sensitivity.",
      "Consider the small number of macromolecules per gram.",
      "Compare measurable effects in dilute solutions.",
    ],
    ["Claiming proteins have unusually small molar masses."],
  ),
  w(
    "1.4",
    102,
    "saq",
    3,
    L`A $0.60\,\mathrm{g}$ polymer sample makes $200\,\mathrm{mL}$ solution at $300\,\mathrm{K}$. Its osmotic pressure is $0.0246\,\mathrm{atm}$. Take $R=0.082\,\mathrm{L\,atm\,mol^{-1}\,K^{-1}}$.`,
    [
      [
        "Find the amount and molar mass of polymer, assuming ideal behaviour.",
        L`$n=\pi V/(RT)$ with $V=0.200\,\mathrm{L}$.`,
        L`$n=0.0246(0.200)/(0.082(300))=2.00\times10^{-4}\,\mathrm{mol}$.`,
        L`$M=0.60/(2.00\times10^{-4})=3000\,\mathrm{g\,mol^{-1}}$.`,
      ],
    ],
    [
      "Start from pi V = n R T.",
      "Convert mL to L for the given R.",
      "Divide sample mass by amount.",
    ],
    ["Using 200 as volume with R in litre units."],
  ),
  w(
    "1.4",
    103,
    "laq",
    3,
    L`An ideal $0.050\,\mathrm{M}$ glucose solution at $300\,\mathrm{K}$ is separated from pure water by a semipermeable membrane. Take $R=0.082\,\mathrm{L\,atm\,mol^{-1}\,K^{-1}}$.`,
    [
      [
        "Calculate its osmotic pressure. Predict initial net solvent flow when 1.0 atm and then 1.5 atm are applied on the solution side.",
        L`$\pi=cRT=0.050(0.082)(300)$.`,
        L`$\pi=1.23\,\mathrm{atm}$.`,
        "At 1.0 atm, water flows toward the solution because applied pressure is below osmotic pressure.",
        "At 1.5 atm, water flows toward the pure-water side: reverse osmosis.",
      ],
      [
        "State what the membrane must retain for this reasoning to apply.",
        "It must prevent glucose transport while allowing water through.",
      ],
    ],
    [
      "Find the stopping pressure first.",
      "Compare each applied pressure with it.",
      "Reverse flow begins only above the stopping pressure.",
    ],
    ["Reversing the pressure application side."],
  ),
  w(
    "1.4",
    104,
    "case",
    3,
    L`A polymer solution has osmotic pressure $0.050\,\mathrm{atm}$ at $300\,\mathrm{K}$. The sealed solution is warmed to $330\,\mathrm{K}$ and its volume increases by $10\%$. Assume no association, decomposition or solute loss.`,
    [
      [
        "Determine the ratios of final to initial molarity and osmotic pressure.",
        L`At fixed solute amount, $c_2/c_1=V_1/V_2=1/1.10$.`,
        L`$\pi_2/\pi_1=(c_2/c_1)(330/300)=1$.`,
      ],
      [
        "State the final pressure and explain the balance.",
        L`$\pi_2=0.050\,\mathrm{atm}$.`,
        "The absolute-temperature rise and concentration fall exactly cancel here; warming alone does not determine pressure if volume also changes.",
      ],
    ],
    [
      "Conserve moles.",
      "Include both temperature and volume changes.",
      L`Use $\pi=nRT/V$.`,
    ],
    ["Holding concentration fixed despite the stated expansion."],
  ),
  mc(
    "1.5",
    101,
    2,
    L`A solute forms only dimers in a solvent. If $60\%$ of its original molecules associate, the van't Hoff factor is`,
    L`$0.70$`,
    [
      [
        L`$0.40$`,
        "Unassociated molecules are not the only particles; dimers also count.",
      ],
      [L`$1.60$`, "Association lowers, rather than increases, particle count."],
      [L`$0.30$`, "This counts only dimers and omits the remaining monomers."],
    ],
    [
      "Start with one mole of monomers.",
      "Only half as many dimers are formed from the associated monomers.",
      "Add surviving monomers and dimers.",
    ],
    [L`Particles $=(1-0.60)+0.60/2=0.70$ per original unit, so $i=0.70$.`],
  ),
  mc(
    "1.5",
    102,
    2,
    L`A salt dissociates into four ions per formula unit. Its observed van't Hoff factor is $2.5$. Under the simple dissociation model, its degree of dissociation is`,
    L`$0.50$`,
    [
      [L`$0.625$`, L`The relation is $i=1+3\alpha$, not $i=4\alpha$.`],
      [L`$0.75$`, "This value would give i=3.25."],
      [L`$1.5$`, "A degree of dissociation cannot exceed one."],
    ],
    [
      "Retain undissociated formula units.",
      L`Use $i=1+(\nu-1)\alpha$.`,
      L`Here $\nu=4$.`,
    ],
    [L`$\alpha=(2.5-1)/(4-1)=0.50$.`],
  ),
  mc(
    "1.5",
    103,
    2,
    L`A solute has true molar mass $150\,\mathrm{g\,mol^{-1}}$ and effective $i=1.5$. If particle multiplication is ignored, the colligatively inferred molar mass is`,
    L`$100\,\mathrm{g\,mol^{-1}}$`,
    [
      [
        L`$225\,\mathrm{g\,mol^{-1}}$`,
        "The apparent mass is true mass divided by i, not multiplied.",
      ],
      [L`$150\,\mathrm{g\,mol^{-1}}$`, "This would require i=1."],
      [
        L`$50\,\mathrm{g\,mol^{-1}}$`,
        "This is the difference between true and apparent mass.",
      ],
    ],
    [
      "More particles appear to mean more solute moles.",
      L`Use $i=M_{true}/M_{apparent}$.`,
      "Rearrange before substituting.",
    ],
    [L`$M_{apparent}=150/1.5=100\,\mathrm{g\,mol^{-1}}$.`],
  ),
  mc(
    "1.5",
    104,
    3,
    L`Equal-molal dilute solutions P and Q are prepared in the same solvent. P has $i=0.8$ and Q has $i=1.6$. The ratio of their freezing-point depressions P:Q is`,
    "1:2",
    [
      ["2:1", "The depression increases with i at fixed molality."],
      [
        "1:1",
        "Equal formula-unit molality does not mean equal particle molality.",
      ],
      ["1:4", "The dependence on i is linear."],
    ],
    [
      L`Use $\Delta T_f=iK_fm$.`,
      "The solvent and molality factors cancel.",
      "Compare the effective particle counts.",
    ],
    [L`$\Delta T_{f,P}/\Delta T_{f,Q}=0.8/1.6=1/2$.`],
  ),
  w(
    "1.5",
    101,
    "vsaq",
    2,
    "A student obtains a van't Hoff factor of 0.40 for a solute assumed to form only dimers. Is this possible within the monomer-dimer model? Explain.",
    [
      [
        "Test the model quantitatively.",
        L`For dimerisation, $i=1-\alpha/2$, so $0\leq\alpha\leq1$ requires $0.5\leq i\leq1$.`,
        "An i of 0.40 is outside this range; the assumed model or the measurements need revision.",
      ],
    ],
    [
      "Find the limiting case of complete dimerisation.",
      "A degree of association cannot exceed one.",
      "Compare the measured i with the allowed interval.",
    ],
    ["Accepting a degree of association greater than 100%."],
  ),
  w(
    "1.5",
    102,
    "saq",
    3,
    L`A $0.10\,\mathrm{m}$ solution of a salt yielding three ions per formula unit has $\Delta T_f=0.465\,\mathrm{K}$ in water. Take $K_f=1.86\,\mathrm{K\,kg\,mol^{-1}}$.`,
    [
      [
        "Calculate i and the degree of dissociation under the simple dissociation model.",
        L`Without dissociation the depression would be $1.86(0.10)=0.186\,\mathrm{K}$.`,
        L`$i=0.465/0.186=2.5$.`,
        L`$i=1+2\alpha$ gives $\alpha=0.75$, or $75\%$.`,
      ],
    ],
    [
      "Compare observed and undissociated effects.",
      "Three ions means two extra particles per dissociated unit.",
      "Check the resulting fraction lies between zero and one.",
    ],
    [L`Using $i=3\alpha$ and forgetting undissociated units.`],
  ),
  w(
    "1.5",
    103,
    "laq",
    3,
    L`A solute of true molar mass $120\,\mathrm{g\,mol^{-1}}$ associates only into dimers. A $2.40\,\mathrm{g}$ sample in $100\,\mathrm{g}$ solvent produces $\Delta T_f=0.60\,\mathrm{K}$. The solvent has $K_f=4.0\,\mathrm{K\,kg\,mol^{-1}}$.`,
    [
      [
        "Calculate formula-unit molality, i, association fraction and apparent molar mass.",
        L`Original amount is $2.40/120=0.020\,\mathrm{mol}$; formula-unit molality is $0.20\,\mathrm{m}$.`,
        L`Undissociated depression would be $4.0(0.20)=0.80\,\mathrm{K}$.`,
        L`$i=0.60/0.80=0.75$.`,
        L`$\alpha=2(1-i)=0.50$.`,
        L`$M_{apparent}=120/0.75=160\,\mathrm{g\,mol^{-1}}$.`,
      ],
    ],
    [
      "Use true molar mass for the original amount.",
      "Compare observed depression with the monomer prediction.",
      "Use the dimerisation relation, not a dissociation relation.",
    ],
    ["Interpreting larger apparent mass as chemical decomposition."],
  ),
  w(
    "1.5",
    104,
    "case",
    3,
    L`For three dilute solutions of equal formula-unit molality in the same solvent, measured freezing depressions relative to an undissociated reference are P: $0.90$, Q: $1.40$, R: $2.00$. P forms dimers, Q is a binary electrolyte, and R yields three ions per formula unit. Use the simple association/dissociation models.`,
    [
      [
        "Calculate the fraction associating in P and dissociating in Q.",
        L`$\alpha_P=2(1-0.90)=0.20$.`,
        L`$\alpha_Q=1.40-1=0.40$.`,
      ],
      [
        "Calculate the dissociation fraction in R and rank their apparent-to-true molar-mass ratios.",
        L`$\alpha_R=(2.00-1)/2=0.50$.`,
        L`$M_{apparent}/M_{true}=1/i$, so $P>Q>R$.`,
      ],
    ],
    [
      "The reported relative effects are the i values.",
      "Use a separate particle model for each solute.",
      "Apparent molar mass varies inversely with i.",
    ],
    [
      "Assuming i=2 always means complete dissociation, regardless of ion count.",
    ],
  ),
];
