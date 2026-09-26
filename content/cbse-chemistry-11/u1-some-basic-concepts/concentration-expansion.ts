import { mc, written } from "../chapter-practice";
const L = String.raw;
const t = "1.5";
export const concentrationExpansion = [
  mc(
    t,
    101,
    2,
    L`What is the molarity of a solution containing $2.00\,\mathrm{g}$ NaOH in a final solution volume of $50.0\,\mathrm{mL}$? Use molar mass $40.0\,\mathrm{g\,mol^{-1}}$.`,
    L`$1.00\,\mathrm{mol\,L^{-1}}$`,
    [
      [
        L`$0.0400\,\mathrm{mol\,L^{-1}}$`,
        "This uses grams per millilitre rather than moles per litre.",
      ],
      [
        L`$0.0500\,\mathrm{mol\,L^{-1}}$`,
        "This is the solute amount in moles, before division by solution volume.",
      ],
      [
        L`$0.00100\,\mathrm{mol\,L^{-1}}$`,
        "The volume must be converted from millilitres to litres.",
      ],
    ],
    [
      "Convert NaOH mass to moles.",
      "Use the final solution volume in litres.",
      L`Divide $0.0500$ by $0.0500$.`,
    ],
    [
      L`$n=2.00/40.0=0.0500\,\mathrm{mol}$ and $M=0.0500/0.0500=1.00\,\mathrm{mol\,L^{-1}}$.`,
    ],
    "molarity_from_mass",
  ),
  mc(
    t,
    102,
    2,
    L`A solution contains $6.0\,\mathrm{g}$ urea in $200\,\mathrm{g}$ water. Using urea molar mass $60\,\mathrm{g\,mol^{-1}}$, its molality is`,
    L`$0.50\,\mathrm{mol\,kg^{-1}}$`,
    [
      [
        L`$0.485\,\mathrm{mol\,kg^{-1}}$`,
        "Molality uses solvent mass, not the 206 g solution mass.",
      ],
      [
        L`$0.00050\,\mathrm{mol\,kg^{-1}}$`,
        "Convert the 200 g solvent into 0.200 kg.",
      ],
      [
        L`$30\,\mathrm{mol\,kg^{-1}}$`,
        "Convert urea grams to moles before dividing by solvent mass.",
      ],
    ],
    [
      "Find urea moles.",
      "Use water mass in kilograms.",
      "The denominator excludes solute mass.",
    ],
    [
      L`$n=6.0/60=0.10\,\mathrm{mol}$; molality $=0.10/0.200=0.50\,\mathrm{mol\,kg^{-1}}$.`,
    ],
    "molality_solvent_basis",
  ),
  mc(
    t,
    103,
    2,
    L`A solution contains $18\,\mathrm{g}$ glucose and $162\,\mathrm{g}$ water. The glucose mass percentage is`,
    L`$10\%$`,
    [
      [L`$11.1\%$`, "The denominator must include both glucose and water."],
      [L`$90\%$`, "This is the water mass percentage."],
      [L`$18\%$`, "The total solution mass is 180 g, not 100 g."],
    ],
    [
      "Add solute and solvent masses.",
      "Use solute mass divided by total mass.",
      "Convert 18/180 to percent.",
    ],
    [L`Mass percentage $=[18/(18+162)]100=10\%$.`],
    "solution_mass_denominator",
  ),
  mc(
    t,
    104,
    2,
    L`A liquid mixture contains $46\,\mathrm{g}$ ethanol and $18\,\mathrm{g}$ water. With molar masses 46 and $18\,\mathrm{g\,mol^{-1}}$, the mole fraction of ethanol is`,
    L`$0.50$`,
    [
      [L`$0.719$`, "This is the ethanol mass fraction, not its mole fraction."],
      [L`$1.00$`, "The mixture also contains one mole of water."],
      [L`$0.281$`, "This is the water mass fraction."],
    ],
    [
      "Convert both masses to moles.",
      "Add the component mole amounts.",
      "The two mole amounts are equal.",
    ],
    [L`Each component is $1.0\,\mathrm{mol}$, so $x_{ethanol}=1/(1+1)=0.50$.`],
    "mole_fraction_vs_mass",
  ),
  mc(
    t,
    105,
    2,
    L`A $30.0\,\mathrm{mL}$ portion of $0.800\,\mathrm{M}$ solution is diluted to a final volume of $120\,\mathrm{mL}$. The final molarity is`,
    L`$0.200\,\mathrm{M}$`,
    [
      [
        L`$3.20\,\mathrm{M}$`,
        "Dilution lowers molarity; the volume ratio has been inverted.",
      ],
      [
        L`$0.160\,\mathrm{M}$`,
        "120 mL is the final volume, not the volume of added water.",
      ],
      [
        L`$0.800\,\mathrm{M}$`,
        "The solute amount is unchanged, but the solution volume increases.",
      ],
    ],
    [
      "Moles of solute are conserved.",
      "Use the stated final volume.",
      "The solution volume increases by a factor of four.",
    ],
    [L`$M_2=M_1V_1/V_2=0.800(30.0/120)=0.200\,\mathrm{M}$.`],
    "final_volume_dilution",
  ),
  mc(
    t,
    106,
    3,
    L`Mix $200\,\mathrm{mL}$ of $0.100\,\mathrm{M}$ NaCl and $100\,\mathrm{mL}$ of $0.400\,\mathrm{M}$ NaCl. Assuming additive volumes, the resulting molarity is`,
    L`$0.200\,\mathrm{M}$`,
    [
      [
        L`$0.250\,\mathrm{M}$`,
        "An arithmetic mean is valid only when the two solution volumes are equal.",
      ],
      [L`$0.500\,\mathrm{M}$`, "Concentrations are not added directly."],
      [
        L`$0.0600\,\mathrm{M}$`,
        "This is the combined mole amount before division by volume.",
      ],
    ],
    [
      "Find solute moles from each solution.",
      "Add the amounts and the volumes separately.",
      "Divide 0.0600 mol by 0.300 L.",
    ],
    [
      L`$n=0.100(0.200)+0.400(0.100)=0.0600\,\mathrm{mol}$.`,
      L`$M=0.0600/0.300=0.200\,\mathrm{M}$.`,
    ],
    "unequal_volume_mixing",
  ),
  mc(
    t,
    107,
    2,
    L`A $50.0\,\mathrm{mL}$ sample of $0.100\,\mathrm{M}$ solution is concentrated to $20.0\,\mathrm{mL}$ by removing solvent. Assume no solute is lost or precipitates. Its final molarity is`,
    L`$0.250\,\mathrm{M}$`,
    [
      [L`$0.0400\,\mathrm{M}$`, "Removing solvent increases concentration."],
      [
        L`$0.100\,\mathrm{M}$`,
        "Solute moles stay constant but volume decreases.",
      ],
      [
        L`$0.167\,\mathrm{M}$`,
        "Use final volume 20 mL, not the 30 mL volume decrease.",
      ],
    ],
    [
      "Conserve solute moles.",
      "Use the smaller final solution volume.",
      "The concentration factor is 50/20.",
    ],
    [L`$M_2=0.100(50.0/20.0)=0.250\,\mathrm{M}$.`],
    "concentration_by_evaporation",
  ),
  mc(
    t,
    108,
    2,
    L`What volume of $1.50\,\mathrm{M}$ stock is needed to prepare $300\,\mathrm{mL}$ of $0.200\,\mathrm{M}$ solution?`,
    L`$40.0\,\mathrm{mL}$`,
    [
      [
        L`$2250\,\mathrm{mL}$`,
        "The required stock volume must be less than the final volume for a dilution.",
      ],
      [
        L`$60.0\,\mathrm{mL}$`,
        "The desired mole amount must be divided by the 1.50 M stock concentration.",
      ],
      [
        L`$260\,\mathrm{mL}$`,
        "This is the approximate added-water volume, not the stock aliquot.",
      ],
    ],
    [
      "Use the dilution relation.",
      "Solve for the initial volume.",
      L`Calculate $0.200(300)/1.50$.`,
    ],
    [L`$V_1=M_2V_2/M_1=0.200(300)/1.50=40.0\,\mathrm{mL}$.`],
    "stock_aliquot",
  ),
  mc(
    t,
    109,
    3,
    L`A solution is $16.0\%$ KOH by mass and has density $1.12\,\mathrm{g\,mL^{-1}}$. With molar mass KOH = 56.0, its molarity is`,
    L`$3.20\,\mathrm{M}$`,
    [
      [L`$2.86\,\mathrm{M}$`, "This assumes density 1.00 g/mL."],
      [L`$0.320\,\mathrm{M}$`, "One litre weighs 1120 g, not 112 g."],
      [
        L`$16.0\,\mathrm{M}$`,
        "A mass percentage is not numerically equal to molarity.",
      ],
    ],
    [
      "Take one litre of solution.",
      "Use density to find its mass.",
      "Find 16.0% of that mass, then convert to moles.",
    ],
    [
      L`One litre has mass $1120\,\mathrm{g}$ and contains $179.2\,\mathrm{g}$ KOH.`,
      L`$n=179.2/56.0=3.20\,\mathrm{mol}$, so $M=3.20\,\mathrm{M}$.`,
    ],
    "mass_percent_density_molarity",
  ),
  mc(
    t,
    110,
    2,
    "Which concentration measure remains unchanged when a sealed solution is warmed with no loss of material and no reaction?",
    "Molality",
    [
      [
        "Molarity",
        "Molarity can change because solution volume changes with temperature.",
      ],
      [
        "Grams of solute per litre of solution",
        "This also depends on solution volume.",
      ],
      [
        "Moles of solute per cubic metre of solution",
        "Changing the volume unit does not remove temperature dependence.",
      ],
    ],
    [
      "Look for a mass-based denominator.",
      "Masses stay fixed in the stated sealed system.",
      "Solution volume can expand on warming.",
    ],
    [
      "Molality uses solute amount and solvent mass, both unchanged under the stated conditions.",
    ],
    "temperature_concentration",
  ),
  mc(
    t,
    111,
    2,
    L`A $25.0\,\mathrm{mL}$ aliquot of $0.240\,\mathrm{M}$ glucose solution is withdrawn from a well-mixed bottle. The aliquot contains`,
    L`$0.00600\,\mathrm{mol}$ glucose`,
    [
      [
        L`$0.240\,\mathrm{mol}$ glucose`,
        "0.240 M describes the amount per litre, not in this small aliquot.",
      ],
      [
        L`$6.00\,\mathrm{mol}$ glucose`,
        "The 25 mL volume must be expressed as 0.025 L.",
      ],
      [
        L`$0.00960\,\mathrm{mol}$ glucose`,
        "Moles equal concentration multiplied by volume, not concentration divided by 25.",
      ],
    ],
    [
      "An aliquot retains the bottle's concentration.",
      "Convert its volume to litres.",
      "Use n = MV.",
    ],
    [L`$n=0.240(0.0250)=0.00600\,\mathrm{mol}$.`],
    "aliquot_amount",
  ),
  mc(
    t,
    112,
    3,
    L`A $10.0\,\mathrm{mL}$ portion of $1.00\,\mathrm{M}$ solution is diluted to $100\,\mathrm{mL}$. Then $20.0\,\mathrm{mL}$ of that diluted solution is made up to $200\,\mathrm{mL}$. The final molarity is`,
    L`$0.0100\,\mathrm{M}$`,
    [
      [L`$0.100\,\mathrm{M}$`, "This accounts for only the first dilution."],
      [
        L`$0.0500\,\mathrm{M}$`,
        "The second dilution uses an aliquot of the first diluted solution, not the original stock.",
      ],
      [
        L`$1.00\,\mathrm{M}$`,
        "Each tenfold increase in volume reduces concentration tenfold.",
      ],
    ],
    [
      "Calculate the concentration after the first dilution.",
      "Use that concentration for the second aliquot.",
      "Multiply the two dilution factors.",
    ],
    [L`$M_f=1.00(10.0/100)(20.0/200)=0.0100\,\mathrm{M}$.`],
    "serial_dilution",
  ),
  mc(
    t,
    113,
    3,
    L`A solution has total mass $250\,\mathrm{g}$ and contains $25.0\,\mathrm{g}$ solute of molar mass $50.0\,\mathrm{g\,mol^{-1}}$. Its molality is approximately`,
    L`$2.22\,\mathrm{mol\,kg^{-1}}$`,
    [
      [
        L`$2.00\,\mathrm{mol\,kg^{-1}}$`,
        "This incorrectly uses total solution mass instead of solvent mass.",
      ],
      [
        L`$0.500\,\mathrm{mol\,kg^{-1}}$`,
        "0.500 is the solute mole amount, not the molality.",
      ],
      [
        L`$20.0\,\mathrm{mol\,kg^{-1}}$`,
        "The denominator is solvent mass, not solute mass.",
      ],
    ],
    [
      "Subtract solute mass to find solvent mass.",
      "Convert 225 g into kilograms.",
      "Divide 0.500 mol by 0.225 kg.",
    ],
    [
      L`$n=25.0/50.0=0.500\,\mathrm{mol}$ and solvent mass $=0.225\,\mathrm{kg}$.`,
      L`Molality $=0.500/0.225\approx2.22\,\mathrm{mol\,kg^{-1}}$.`,
    ],
    "solution_vs_solvent_mass",
  ),
  mc(
    t,
    114,
    3,
    L`A binary liquid mixture has mole fraction of component A equal to 0.30 and contains 1.50 mol A. The amount of component B is`,
    L`$3.50\,\mathrm{mol}$`,
    [
      [L`$5.00\,\mathrm{mol}$`, "This is the total amount of both components."],
      [
        L`$0.45\,\mathrm{mol}$`,
        "Multiplying amount by mole fraction does not give the other component.",
      ],
      [
        L`$1.05\,\mathrm{mol}$`,
        "0.70 must be multiplied by the total amount, not the amount of A.",
      ],
    ],
    [
      "Find total moles from nA divided by xA.",
      "Subtract the known amount of A.",
      "The two mole fractions sum to one.",
    ],
    [
      L`Total amount $=1.50/0.30=5.00\,\mathrm{mol}$; B amount $=5.00-1.50=3.50\,\mathrm{mol}$.`,
    ],
    "inverse_mole_fraction",
  ),
  mc(
    t,
    115,
    2,
    L`How much water must be mixed with $12\,\mathrm{g}$ solute to prepare a $15\%$ solution by mass?`,
    L`$68\,\mathrm{g}$`,
    [
      [
        L`$80\,\mathrm{g}$`,
        "80 g is the total solution mass, not the water mass.",
      ],
      [
        L`$1.8\,\mathrm{g}$`,
        "The 15% refers to solute divided by total solution mass.",
      ],
      [
        L`$180\,\mathrm{g}$`,
        "Solve the mass-fraction equation rather than multiplying 12 by 15.",
      ],
    ],
    [
      "Let the total solution mass be m.",
      L`Solve $12/m=0.15$.`,
      "Subtract solute mass from the total.",
    ],
    [
      L`Solution mass $=12/0.15=80\,\mathrm{g}$; water mass $=80-12=68\,\mathrm{g}$.`,
    ],
    "prepare_mass_percent",
  ),
  mc(
    t,
    116,
    3,
    L`A $100\,\mathrm{g}$ solution contains $8.0\,\mathrm{g}$ nonvolatile solute. If $20\,\mathrm{g}$ water evaporates with no solute loss, the new mass percentage is`,
    L`$10\%$`,
    [
      [
        L`$8\%$`,
        "The total solution mass decreases while solute mass stays fixed.",
      ],
      [L`$6.4\%$`, "Evaporation of solvent increases solute percentage."],
      [
        L`$40\%$`,
        "Use remaining solution mass, not evaporated water mass, as denominator.",
      ],
    ],
    [
      "Track solute and total masses separately.",
      "The remaining solution has mass 80 g.",
      "Use 8/80 as the new fraction.",
    ],
    [
      L`New solution mass $=100-20=80\,\mathrm{g}$, so percentage $=(8.0/80)100=10\%$.`,
    ],
    "evaporation_mass_percent",
  ),
  mc(
    t,
    117,
    2,
    "Assertion: With additive volumes, mixing equal volumes of 0.20 M and 0.60 M solutions of the same nonreacting solute gives 0.40 M. Reason: The final concentration is total solute moles divided by total solution volume. Choose the correct statement.",
    "Both are true, and the reason explains the assertion.",
    [
      [
        "Both are true, but the reason does not explain the assertion.",
        "Applying the stated definition to equal volumes gives their arithmetic mean.",
      ],
      [
        "The assertion is true, but the reason is false.",
        "The stated concentration definition is correct.",
      ],
      [
        "The assertion is false, but the reason is true.",
        "Equal volumes allow the arithmetic mean here.",
      ],
    ],
    [
      "Let each volume be V litres.",
      "Add 0.20V and 0.60V moles.",
      "Divide by the total volume 2V.",
    ],
    [L`$M=(0.20V+0.60V)/(2V)=0.40\,\mathrm{M}$.`],
    "assertion_reason_mixing",
  ),
  mc(
    t,
    118,
    2,
    L`For a solution prepared by dissolving a solute in water and making the final volume $250\,\mathrm{mL}$, which statement is justified?`,
    "The final solution volume is 250 mL; the starting water volume need not be 250 mL.",
    [
      [
        "Exactly 250 mL of water must be used.",
        "Solute addition can change volume; the instruction refers to final solution volume.",
      ],
      [
        "Solute mass must equal solvent mass.",
        "Making a specified volume imposes no equal-mass requirement.",
      ],
      [
        "The solute must occupy zero volume.",
        "Volume contributions need not be zero or simply additive.",
      ],
    ],
    [
      "Distinguish 'add to water' from 'make up to volume'.",
      "The volumetric mark applies to the whole solution.",
      "Solvent and solution volumes are different quantities.",
    ],
    [
      "The solution is brought to the specified final volume; the volume of water initially used is not determined by that instruction alone.",
    ],
    "volumetric_preparation",
  ),
  mc(
    t,
    119,
    2,
    L`A $0.250\,\mathrm{M}$ aqueous glucose solution has volume $200\,\mathrm{mL}$. How much glucose does it contain? Use molar mass $180\,\mathrm{g\,mol^{-1}}$.`,
    L`$9.00\,\mathrm{g}$`,
    [
      [L`$45.0\,\mathrm{g}$`, "This is the mass per litre, not in 0.200 L."],
      [
        L`$0.0500\,\mathrm{g}$`,
        "0.0500 is the amount in moles; convert it to mass.",
      ],
      [
        L`$9000\,\mathrm{g}$`,
        "The millilitre volume has not been converted into litres.",
      ],
    ],
    [
      "First use n = MV.",
      "The volume is 0.200 L.",
      "Multiply solute moles by molar mass.",
    ],
    [
      L`$n=0.250(0.200)=0.0500\,\mathrm{mol}$; $m=0.0500(180)=9.00\,\mathrm{g}$.`,
    ],
    "molarity_to_mass",
  ),
  mc(
    t,
    120,
    2,
    L`A $0.500\,\mathrm{mol\,kg^{-1}}$ aqueous solution contains $0.150\,\mathrm{mol}$ solute. The mass of water used is`,
    L`$0.300\,\mathrm{kg}$`,
    [
      [
        L`$0.0750\,\mathrm{kg}$`,
        "Solvent mass equals solute amount divided by molality, not multiplied by it.",
      ],
      [L`$3.33\,\mathrm{kg}$`, "This reverses the amount-to-molality ratio."],
      [
        L`$0.150\,\mathrm{kg}$`,
        "One mole does not correspond to one kilogram of solvent by definition.",
      ],
    ],
    [
      "Write molality as amount divided by solvent mass.",
      "Rearrange for solvent mass.",
      "Use 0.150/0.500.",
    ],
    [L`$m_{solvent}=0.150/0.500=0.300\,\mathrm{kg}$.`],
    "inverse_molality",
  ),
  written(
    t,
    101,
    "vsaq",
    2,
    "The masses of a solute and water are known, but the final solution volume and density are not. Explain why these data alone do not determine molarity, even if the solute molar mass is known.",
    [
      [
        "Identify the missing quantity and why the masses cannot replace it.",
        "Molarity requires the final solution volume in litres.",
        "The masses determine the solute amount and solution mass, but not solution volume without density or a volume measurement.",
      ],
    ],
    [
      "Write the definition of molarity.",
      "Mass is not interchangeable with volume.",
      "Do not assume that every aqueous solution has the density of water.",
    ],
    ["Assuming one gram of solution always occupies one millilitre."],
    "missing_volume_information",
  ),
  written(
    t,
    102,
    "vsaq",
    2,
    L`A solution contains $0.0360\,\mathrm{mol}$ solute in $120\,\mathrm{mL}$ solution. Calculate its molarity.`,
    [
      [
        "Convert volume and calculate.",
        L`$120\,\mathrm{mL}=0.120\,\mathrm{L}$.`,
        L`$M=0.0360/0.120=0.300\,\mathrm{mol\,L^{-1}}$.`,
      ],
    ],
    [
      "Molarity is amount per litre.",
      "Convert millilitres first.",
      "Check the units after division.",
    ],
    ["Using 120 directly as the litre volume."],
    "molarity_units",
  ),
  written(
    t,
    103,
    "vsaq",
    2,
    L`In a binary mixture, $x_A=0.18$. Find $x_B$ and state why mole fractions have no unit.`,
    [
      [
        "Give the value and unit argument.",
        L`$x_B=1-0.18=0.82$.`,
        "A mole fraction is an amount divided by total amount, so the mole units cancel.",
      ],
    ],
    [
      "All component mole fractions sum to one.",
      "Compare numerator and denominator units.",
      "A mole fraction is not a molarity.",
    ],
    ["Giving mole fraction the unit mol/L."],
    "mole_fraction_definition",
  ),
  written(
    t,
    104,
    "vsaq",
    2,
    "A sealed solution expands slightly on warming without reaction or loss of material. Explain what happens to its molarity and molality.",
    [
      [
        "Explain both concentration changes.",
        "Molarity decreases because the same solute amount occupies a larger solution volume.",
        "Molality stays unchanged because solute amount and solvent mass remain unchanged.",
      ],
    ],
    [
      "Track the denominator in each definition.",
      "The volume increases but the masses do not.",
      "Use the no-loss and no-reaction assumptions.",
    ],
    ["Claiming both measures must change because temperature changed."],
    "warming_solution",
  ),
  written(
    t,
    105,
    "saq",
    3,
    L`Calculate the mass of KOH required to prepare $400\,\mathrm{mL}$ of $0.150\,\mathrm{M}$ solution. Use molar mass KOH = 56.0. State how the final volume should be obtained.`,
    [
      [
        "Calculate mass and describe the volume step.",
        L`Required amount $=0.150(0.400)=0.0600\,\mathrm{mol}$.`,
        L`Required mass $=0.0600(56.0)=3.36\,\mathrm{g}$.`,
        "Dissolve in less than the final water volume, allow the solution to reach the preparation temperature, and make the total solution volume 400 mL.",
      ],
    ],
    [
      "Use the final solution volume in litres.",
      "Convert moles into grams.",
      "Adding solute to 400 mL water is not the same instruction.",
    ],
    ["Treating 400 mL as the volume of water rather than final solution."],
    "prepare_molar_solution",
  ),
  written(
    t,
    106,
    "saq",
    3,
    L`What volume of $0.900\,\mathrm{M}$ stock is required for $150\,\mathrm{mL}$ of $0.120\,\mathrm{M}$ solution? Explain why the stock is made up to the final mark rather than mixed with a blindly measured solvent volume.`,
    [
      [
        "Find the aliquot and explain final-volume control.",
        L`Moles needed $=0.120(0.150)=0.0180\,\mathrm{mol}$.`,
        L`Stock volume $=0.0180/0.900=0.0200\,\mathrm{L}=20.0\,\mathrm{mL}$.`,
        "Make the aliquot up to 150 mL total volume because solution volumes are not universally additive.",
      ],
    ],
    [
      "Conserve solute moles.",
      "Divide required moles by stock concentration.",
      "The requested concentration is defined using final solution volume.",
    ],
    [
      "Always assuming final volume equals the sum of separately measured liquid volumes.",
    ],
    "controlled_dilution",
  ),
  written(
    t,
    107,
    "saq",
    3,
    L`Dissolve $15.0\,\mathrm{g}$ urea in $135\,\mathrm{g}$ water. With urea molar mass 60.0, calculate the molality and mass percentage.`,
    [
      [
        "Use the correct denominator for each.",
        L`Urea amount $=15.0/60.0=0.250\,\mathrm{mol}$.`,
        L`Molality $=0.250/0.135=1.85\,\mathrm{mol\,kg^{-1}}$ approximately.`,
        L`Mass percentage $=[15.0/(15.0+135)]100=10.0\%$.`,
      ],
    ],
    [
      "Convert solvent grams to kilograms for molality.",
      "Use total solution mass for mass percentage.",
      "The two denominators deliberately differ.",
    ],
    ["Using 150 g as the solvent mass."],
    "two_concentration_measures",
  ),
  written(
    t,
    108,
    "saq",
    3,
    L`A mixture contains $9.2\,\mathrm{g}$ ethanol and $10.8\,\mathrm{g}$ water. Use molar masses 46 and 18. Calculate both mole fractions.`,
    [
      [
        "Find component amounts and fractions.",
        L`Ethanol amount $=9.2/46=0.20\,\mathrm{mol}$; water amount $=10.8/18=0.60\,\mathrm{mol}$.`,
        L`$x_{ethanol}=0.20/0.80=0.25$.`,
        L`$x_{water}=0.60/0.80=0.75$; the fractions sum to one.`,
      ],
    ],
    [
      "Convert both masses independently.",
      "Use total moles, not total mass.",
      "Check the sum of the fractions.",
    ],
    ["Reporting 9.2/20 as the ethanol mole fraction."],
    "binary_mass_to_mole_fraction",
  ),
  written(
    t,
    109,
    "saq",
    3,
    L`Mix $50.0\,\mathrm{mL}$ of $0.300\,\mathrm{M}$ NaCl with $150\,\mathrm{mL}$ of $0.100\,\mathrm{M}$ NaCl. Assuming additive volumes, find the final molarity.`,
    [
      [
        "Account for solute and volume.",
        L`First amount $=0.300(0.0500)=0.0150\,\mathrm{mol}$.`,
        L`Second amount $=0.100(0.150)=0.0150\,\mathrm{mol}$, so the total is $0.0300\,\mathrm{mol}$.`,
        L`Final molarity $=0.0300/0.200=0.150\,\mathrm{M}$.`,
      ],
    ],
    [
      "Unequal volumes require a weighted calculation.",
      "Compute moles for each portion.",
      "Use the combined volume only after summing solute amounts.",
    ],
    ["Taking the unweighted mean 0.200 M."],
    "mixing_weighted_mean",
  ),
  written(
    t,
    110,
    "saq",
    3,
    L`A solution is $12.0\%$ NaOH by mass and has density $1.10\,\mathrm{g\,mL^{-1}}$. Use NaOH molar mass 40.0 to find its molarity.`,
    [
      [
        "Use a one-litre basis.",
        L`One litre has solution mass $1.10(1000)=1100\,\mathrm{g}$.`,
        L`NaOH mass $=0.120(1100)=132\,\mathrm{g}$.`,
        L`NaOH amount $=132/40.0=3.30\,\mathrm{mol}$; molarity is $3.30\,\mathrm{M}$.`,
      ],
    ],
    [
      "Density connects the volume basis to solution mass.",
      "Apply the mass percentage to that solution mass.",
      "Convert solute mass to moles.",
    ],
    ["Assuming one litre of every solution weighs 1000 g."],
    "density_conversion",
  ),
  written(
    t,
    111,
    "saq",
    3,
    L`A $120\,\mathrm{g}$ solution is $5.0\%$ solute by mass. How much water must evaporate to make it $8.0\%$, assuming the solute is nonvolatile and remains dissolved?`,
    [
      [
        "Conserve solute mass and find the new total mass.",
        L`Solute mass $=0.050(120)=6.0\,\mathrm{g}$.`,
        L`Final solution mass $=6.0/0.080=75\,\mathrm{g}$.`,
        L`Water evaporated $=120-75=45\,\mathrm{g}$.`,
      ],
    ],
    [
      "Solute mass stays fixed.",
      "Use the target percentage to calculate final solution mass.",
      "The decrease in total mass is water lost.",
    ],
    [
      "Evaporating 3% of the initial water as if percentage changes were additive.",
    ],
    "target_mass_fraction",
  ),
  written(
    t,
    112,
    "saq",
    2,
    L`A solute has molar mass $80\,\mathrm{g\,mol^{-1}}$. What mass is needed with $250\,\mathrm{g}$ water to prepare a $0.400\,\mathrm{mol\,kg^{-1}}$ solution?`,
    [
      [
        "Find the amount from the specified solvent mass.",
        L`Solvent mass $=0.250\,\mathrm{kg}$.`,
        L`Solute amount $=0.400(0.250)=0.100\,\mathrm{mol}$.`,
        L`Solute mass $=0.100(80)=8.0\,\mathrm{g}$.`,
      ],
    ],
    [
      "The 250 g belongs to solvent, not solution.",
      "Multiply molality by solvent kilograms.",
      "Convert the result to solute mass.",
    ],
    [
      "Subtracting an unknown solute mass from the already specified solvent mass.",
    ],
    "molal_preparation",
  ),
  written(
    t,
    113,
    "laq",
    3,
    L`A glucose solution is $18.0\%$ by mass and has density $1.08\,\mathrm{g\,mL^{-1}}$. Use glucose molar mass 180 and water molar mass 18.`,
    [
      [
        "On a 100 g solution basis, find solute amount, solvent mass and molality.",
        L`Glucose amount $=18.0/180=0.100\,\mathrm{mol}$.`,
        L`Water mass $=82.0\,\mathrm{g}=0.0820\,\mathrm{kg}$.`,
        L`Molality $=0.100/0.0820\approx1.22\,\mathrm{mol\,kg^{-1}}$.`,
      ],
      [
        "Find the solution volume and molarity on the same basis.",
        L`Solution volume $=100/1.08=92.59\,\mathrm{mL}=0.09259\,\mathrm{L}$.`,
        L`Molarity $=0.100/0.09259=1.08\,\mathrm{M}$.`,
      ],
    ],
    [
      "Choose a basis that makes mass percentages convenient.",
      "Keep solvent mass distinct from solution volume.",
      "Use density only for the volume conversion.",
    ],
    ["Treating molarity and molality as interchangeable."],
    "concentration_basis_synthesis",
  ),
  written(
    t,
    114,
    "laq",
    3,
    L`A technician takes $5.00\,\mathrm{mL}$ of $2.00\,\mathrm{M}$ stock and dilutes it to $100\,\mathrm{mL}$. A $10.0\,\mathrm{mL}$ aliquot of this solution is then diluted to $250\,\mathrm{mL}$.`,
    [
      [
        "Find the first solution's solute amount and molarity.",
        L`First solute amount $=2.00(0.00500)=0.0100\,\mathrm{mol}$.`,
        L`First molarity $=0.0100/0.100=0.100\,\mathrm{M}$.`,
      ],
      [
        "Find the second aliquot's amount, final molarity and the overall dilution factor.",
        L`The 10.0 mL aliquot contains $0.100(0.0100)=0.00100\,\mathrm{mol}$.`,
        L`Final molarity $=0.00100/0.250=0.00400\,\mathrm{M}$.`,
        "The overall dilution factor is 20 times 25 = 500.",
      ],
    ],
    [
      "Not all the solute from the first flask enters the second.",
      "Calculate the second aliquot using the first diluted concentration.",
      "Multiply dilution factors, not added-water volumes.",
    ],
    ["Carrying all 0.0100 mol into the second flask."],
    "serial_aliquot_accounting",
  ),
  written(
    t,
    115,
    "laq",
    4,
    L`A $100\,\mathrm{g}$ solution is $20\%$ glucose by mass. Add $50\,\mathrm{g}$ water, then remove $25\,\mathrm{g}$ of the well-mixed solution. Assume no evaporation or reaction.`,
    [
      [
        "Find solute mass and mass percentage immediately after water addition.",
        "The solute mass remains 20 g.",
        L`The total mass becomes 150 g, so solute percentage is $(20/150)100=13.33\%$.`,
      ],
      [
        "Find the solute mass removed, solute mass left and final mass percentage.",
        L`The withdrawn solution contains $25(20/150)=10/3\,\mathrm{g}$ solute.`,
        L`Solute left is $20-10/3=50/3\,\mathrm{g}$ in 125 g solution.`,
        L`The final percentage remains $[(50/3)/125]100=13.33\%$.`,
      ],
    ],
    [
      "Dilution changes concentration; withdrawal of a uniform portion does not.",
      "Use the same mass fraction in the aliquot as in the mixed solution.",
      "Track solute and total solution masses together.",
    ],
    ["Treating the withdrawn solution as pure water."],
    "dilution_then_withdrawal",
  ),
  written(
    t,
    116,
    "laq",
    3,
    L`A $250\,\mathrm{mL}$ solution is $0.200\,\mathrm{M}$ in NaCl. A $50.0\,\mathrm{mL}$ aliquot is removed; the remainder is diluted to $400\,\mathrm{mL}$. Use NaCl molar mass 58.5.`,
    [
      [
        "Find original and withdrawn solute amounts.",
        L`Original amount $=0.200(0.250)=0.0500\,\mathrm{mol}$.`,
        L`Withdrawn amount $=0.200(0.0500)=0.0100\,\mathrm{mol}$.`,
      ],
      [
        "Find remaining solute amount, final molarity and remaining NaCl mass.",
        L`Remaining amount $=0.0500-0.0100=0.0400\,\mathrm{mol}$.`,
        L`Final molarity $=0.0400/0.400=0.100\,\mathrm{M}$.`,
        L`Remaining solute mass $=0.0400(58.5)=2.34\,\mathrm{g}$.`,
      ],
    ],
    [
      "Removing solution removes solute as well.",
      "After that withdrawal, dilution conserves the remaining moles.",
      "Use the stated final volume of 400 mL.",
    ],
    ["Using all original solute moles in the final dilution."],
    "withdrawal_then_dilution",
  ),
  written(
    t,
    117,
    "case",
    3,
    L`A student needs $250\,\mathrm{mL}$ of $0.100\,\mathrm{M}$ $\mathrm{Na_{2}CO_{3}}$ solution. The available reagent is $\mathrm{Na_2CO_3\cdot10H_2O}$. Use molar masses $\mathrm{Na_{2}CO_{3}}$ = 106 and hydrate = 286.`,
    [
      [
        "Calculate the hydrate mass required.",
        L`$\mathrm{Na_{2}CO_{3}}$ amount needed $=0.100(0.250)=0.0250\,\mathrm{mol}$.`,
        L`Each hydrate formula unit supplies one $\mathrm{Na_{2}CO_{3}}$ unit, so hydrate mass $=0.0250(286)=7.15\,\mathrm{g}$.`,
      ],
      [
        "Explain the error in weighing 2.65 g of this hydrate and find the resulting molarity if made to 250 mL.",
        "2.65 g is the anhydrous mass needed, so using it for the hydrate supplies too few formula units.",
        L`Actual molarity $=(2.65/286)/0.250\approx0.0371\,\mathrm{M}$.`,
      ],
    ],
    [
      "Match the molar mass to the reagent actually weighed.",
      "Hydration changes grams per formula-unit mole.",
      "The waters join the solvent on dissolution.",
    ],
    ["Using anhydrous molar mass for hydrated reagent."],
    "hydrate_solution_preparation",
  ),
  written(
    t,
    118,
    "case",
    3,
    L`Bottle A contains $100\,\mathrm{mL}$ of $0.200\,\mathrm{M}$ glucose; bottle B contains $400\,\mathrm{mL}$ of $0.0500\,\mathrm{M}$ glucose.`,
    [
      [
        "Compare concentrations and total glucose amounts.",
        "Bottle A is four times as concentrated as bottle B.",
        L`Both contain $0.0200\,\mathrm{mol}$ glucose: $0.200(0.100)=0.0500(0.400)$.`,
      ],
      [
        "Find the concentration after mixing, assuming additive volumes.",
        L`Combined amount $=0.0400\,\mathrm{mol}$ in $0.500\,\mathrm{L}$.`,
        L`Final molarity $=0.0800\,\mathrm{M}$.`,
      ],
    ],
    [
      "Concentration and total amount are different comparisons.",
      "Calculate MV for each bottle.",
      "The larger bottle weighs more strongly in the mixed concentration.",
    ],
    ["Assuming the more concentrated bottle necessarily contains more solute."],
    "amount_vs_concentration",
  ),
  written(
    t,
    119,
    "case",
    3,
    L`A solution is made by dissolving $10.0\,\mathrm{g}$ urea in $90.0\,\mathrm{g}$ water. A student writes both mass percentage and molality using 100 g as the denominator. Use urea molar mass 60.0.`,
    [
      [
        "Evaluate the mass-percentage calculation.",
        L`Total solution mass is 100 g, so mass percentage $=(10.0/100)100=10.0\%$ is correct.`,
      ],
      [
        "Correct the molality calculation and explain the denominator.",
        L`Urea amount $=10.0/60.0=1/6\,\mathrm{mol}$.`,
        "Molality uses 0.0900 kg water, not 0.100 kg solution.",
        L`Molality $=(1/6)/0.0900\approx1.85\,\mathrm{mol\,kg^{-1}}$.`,
      ],
    ],
    [
      "The same mixture supports different concentration measures.",
      "Check each definition independently.",
      "Retain the exact fraction until the final division.",
    ],
    ["Using total solution mass in every concentration measure."],
    "denominator_error_case",
  ),
  written(
    t,
    120,
    "case",
    3,
    L`A $200\,\mathrm{g}$ solution contains $30.0\,\mathrm{g}$ nonvolatile solute. A student wants a 10.0% solution by mass, but first evaporates $20.0\,\mathrm{g}$ water by mistake. No solute is lost.`,
    [
      [
        "Find the concentration after evaporation.",
        "The remaining solution mass is 180 g while solute mass is still 30.0 g.",
        L`Its mass percentage is $(30.0/180)100=16.7\%$ approximately.`,
      ],
      [
        "Find how much water must now be added to reach 10.0%.",
        L`The target solution mass is $30.0/0.100=300\,\mathrm{g}$.`,
        L`Water to add now is $300-180=120\,\mathrm{g}$.`,
      ],
    ],
    [
      "Track the unchanged solute mass through the mistake.",
      "Compute target total mass from the desired fraction.",
      "Compare target mass with the actual current mass, not the original mass.",
    ],
    ["Adding only the 100 g that would have been needed before evaporation."],
    "correcting_concentration_error",
  ),
];
