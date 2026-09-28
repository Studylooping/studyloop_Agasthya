import { chapterPractice } from "../chapter-practice";
const { mc, written: w } = chapterPractice("u1-solutions");
const L = String.raw;
export const concentrationExpansion = [
  mc(
    "1.1",
    105,
    1,
    "Hydrogen dissolved in palladium is classified, by the physical states of solute and solvent, as",
    "gas in solid",
    [
      ["solid in gas", "Palladium is the solid solvent, not the solute."],
      ["gas in liquid", "Palladium is not a liquid under ordinary conditions."],
      ["solid in solid", "The dissolved species is hydrogen."],
    ],
    [
      "Identify the dissolved component.",
      "Identify the continuous solvent phase.",
      "Name solute state first.",
    ],
    [
      "Hydrogen is the gaseous solute and palladium is the solid solvent; the resulting solution is solid.",
    ],
  ),
  mc(
    "1.1",
    106,
    2,
    L`A $300\,\mathrm{g}$ solution contains $24\,\mathrm{g}$ solute. How much water must be added to make it $5\%$ by mass?`,
    L`$180\,\mathrm{g}$`,
    [
      [L`$480\,\mathrm{g}$`, "480 g is final solution mass, not added water."],
      [L`$156\,\mathrm{g}$`, "The initial solution already weighs 300 g."],
      [L`$276\,\mathrm{g}$`, "This is the original solvent mass."],
    ],
    [
      "Solute mass remains 24 g.",
      "Find the final solution mass required for 5%.",
      "Subtract the existing solution mass.",
    ],
    [
      L`Final mass $=24/0.05=480\,\mathrm{g}$; added water $=480-300=180\,\mathrm{g}$.`,
    ],
  ),
  mc(
    "1.1",
    107,
    2,
    L`A $2.0\,\mathrm{kg}$ solution contains $6.0\,\mathrm{mg}$ dissolved impurity. Its mass fraction expressed in ppm is`,
    L`$3.0$`,
    [
      [L`$3000$`, "This misses the conversion between grams and milligrams."],
      [L`$0.003$`, "For mass ppm, 1 mg per kg equals 1 ppm."],
      [L`$12$`, "Divide by the solution mass, rather than multiply."],
    ],
    [
      "Use matching units for the mass fraction.",
      "Multiply that fraction by a million.",
      "Equivalently, calculate mg per kg.",
    ],
    [L`$6.0\,\mathrm{mg}/2.0\,\mathrm{kg}=3.0\,\mathrm{ppm}$.`],
  ),
  mc(
    "1.1",
    108,
    3,
    L`An aqueous solution has solute mole fraction $0.10$ and water molar mass $18\,\mathrm{g\,mol^{-1}}$. Its solute molality is`,
    L`$500/81\,\mathrm{mol\,kg^{-1}}$`,
    [
      [
        L`$50/9\,\mathrm{mol\,kg^{-1}}$`,
        "This omits the solvent mole fraction in converting total moles to solvent mass.",
      ],
      [L`$0.10\,\mathrm{mol\,kg^{-1}}$`, "Mole fraction is not molality."],
      [
        L`$81/500\,\mathrm{mol\,kg^{-1}}$`,
        "This is the reciprocal of the required molality.",
      ],
    ],
    [
      "Take one mole of solution components.",
      "Water contributes 0.90 mol.",
      "Convert that water amount to kilograms.",
    ],
    [L`$m=0.10/[0.90(0.018)]=500/81\,\mathrm{mol\,kg^{-1}}$.`],
  ),
  mc(
    "1.1",
    109,
    2,
    L`A stock solution is $0.80\,\mathrm{M}$. An aliquot of $25\,\mathrm{mL}$ is diluted to $100\,\mathrm{mL}$; then $20\,\mathrm{mL}$ of that solution is diluted to $200\,\mathrm{mL}$. The final molarity is`,
    L`$0.020\,\mathrm{M}$`,
    [
      [L`$0.20\,\mathrm{M}$`, "This includes only the first dilution."],
      [
        L`$0.080\,\mathrm{M}$`,
        "This includes only the second dilution factor.",
      ],
      [L`$0.002\,\mathrm{M}$`, "The overall dilution factor is 40, not 400."],
    ],
    [
      "Apply each dilution sequentially.",
      "The first dilution factor is four.",
      "The second factor is ten.",
    ],
    [L`$c=0.80(25/100)(20/200)=0.020\,\mathrm{M}$.`],
  ),
  mc(
    "1.1",
    110,
    2,
    L`A $100\,\mathrm{mL}$ aliquot contains $0.050\,\mathrm{mol}$ solute. An additional $0.025\,\mathrm{mol}$ of the same solute is added, and the final solution volume is $150\,\mathrm{mL}$. Its molarity is`,
    L`$0.50\,\mathrm{M}$`,
    [
      [L`$0.75\,\mathrm{M}$`, "This keeps the old 100 mL denominator."],
      [L`$0.167\,\mathrm{M}$`, "This omits the solute originally present."],
      [L`$0.333\,\mathrm{M}$`, "This omits the added solute."],
    ],
    [
      "Add both solute amounts.",
      "Use final measured volume.",
      "Convert mL to litres.",
    ],
    [L`$c=(0.050+0.025)/0.150=0.50\,\mathrm{M}$.`],
  ),
  mc(
    "1.1",
    111,
    2,
    "At fixed composition, which pair of concentration measures both remain unchanged when a sealed liquid solution is warmed?",
    "Molality and mole fraction",
    [
      ["Molarity and molality", "Molarity changes if the volume changes."],
      [
        "Molarity and mass percentage",
        "Only mass percentage is independent of thermal expansion.",
      ],
      [
        "Molarity and mass-by-volume percentage",
        "Both involve solution volume.",
      ],
    ],
    [
      "Identify the denominators.",
      "Thermal expansion changes volume.",
      "Amounts and masses stay fixed here.",
    ],
    [
      "Molality is based on solvent mass; mole fraction is based on component amounts. Neither changes under the stated conditions.",
    ],
  ),
  mc(
    "1.1",
    112,
    2,
    L`A liquid formulation is $12\%$ by volume. The volume of solute required to prepare $250\,\mathrm{mL}$ of formulation is`,
    L`$30\,\mathrm{mL}$`,
    [
      [
        L`$220\,\mathrm{mL}$`,
        "This is not the solute volume; final volumes need not be additive.",
      ],
      [L`$12\,\mathrm{mL}$`, "12 mL applies to a 100 mL final solution."],
      [
        L`$300\,\mathrm{mL}$`,
        "The solute volume cannot exceed final volume for the stated percentage.",
      ],
    ],
    [
      "Volume percentage refers to final solution volume.",
      "Multiply the final volume by 0.12.",
      "Do not assume an added-solvent volume.",
    ],
    [
      L`Solute volume $=0.12(250)=30\,\mathrm{mL}$; make the solution up to 250 mL.`,
    ],
  ),
  mc(
    "1.1",
    113,
    2,
    L`A solution is $2.0\,\mathrm{m}$ in a solute of molar mass $50\,\mathrm{g\,mol^{-1}}$. The solute mass percentage is`,
    L`$100/11\%$`,
    [
      [
        L`$10\%$`,
        "100 g solute is added to 1000 g solvent, so solution mass is 1100 g.",
      ],
      [L`$20\%$`, "Molality is not a mass percentage."],
      [L`$1/11\%$`, "The mass fraction still needs multiplication by 100."],
    ],
    [
      "Take one kilogram solvent.",
      "Find the solute mass.",
      "Use total solution mass in the percentage.",
    ],
    [
      L`Solute mass $=2(50)=100\,\mathrm{g}$; percentage $=100(100/1100)=100/11\%$.`,
    ],
  ),
  mc(
    "1.1",
    114,
    2,
    L`A solution containing $0.20\,\mathrm{mol}$ solute and $1.0\,\mathrm{kg}$ solvent has volume $1.1\,\mathrm{L}$. Its numerical molality-to-molarity ratio is`,
    L`$1.1$`,
    [
      [L`$1/1.1$`, "This is the reverse ratio."],
      [
        L`$1$`,
        "Solvent mass in kg and solution volume in L are not equal here.",
      ],
      [L`$5.5$`, "The common solute amount cancels in the ratio."],
    ],
    [
      "Write each concentration separately.",
      "Use the given units.",
      "Cancel the common amount.",
    ],
    [L`$m=0.20$ and $c=0.20/1.1$, so $m/c=1.1$.`],
  ),
  mc(
    "1.1",
    115,
    2,
    "A solution labelled 0.50 M is used to fill two identical 20 mL pipettes. Compared with one pipette, the combined liquid has",
    "twice the solute amount but the same molarity",
    [
      [
        "twice the molarity and same amount",
        "Amount and volume double together.",
      ],
      [
        "half the molarity and twice the amount",
        "No dilution occurs when identical solution portions are combined.",
      ],
      [
        "the same amount and same molarity",
        "The amount is extensive and doubles.",
      ],
    ],
    [
      "Separate amount from concentration.",
      "Both portions have the same composition.",
      "Add their volumes as well as their amounts.",
    ],
    [
      "Combining two equal portions doubles moles and volume; their ratio, molarity, stays fixed.",
    ],
  ),
  mc(
    "1.1",
    116,
    3,
    L`What mass ratio of $20\%$ and $5\%$ by mass solutions of the same solute produces a $10\%$ solution without loss?`,
    "1:2",
    [
      ["2:1", "This gives 15%, not 10%."],
      ["1:1", "An equal-mass mixture gives 12.5%."],
      ["3:1", "This overweights the concentrated solution."],
    ],
    [
      "Let the two solution masses be a and b.",
      "Conserve solute mass.",
      L`Set $0.20a+0.05b=0.10(a+b)$.`,
    ],
    [L`$0.10a=0.05b$, so $a:b=1:2$.`],
  ),
  mc(
    "1.1",
    117,
    2,
    L`Two non-reacting liquids have molar masses $40$ and $80\,\mathrm{g\,mol^{-1}}$. Equal masses are mixed. The mole fraction of the lighter-molar-mass liquid is`,
    L`$2/3$`,
    [
      [
        L`$1/2$`,
        "Equal masses are not equal amounts for different molar masses.",
      ],
      [L`$1/3$`, "This belongs to the heavier-molar-mass liquid."],
      [L`$2$`, "That is the amount ratio, not the mole fraction."],
    ],
    [
      "Use a common mass for each liquid.",
      "Amounts are inversely proportional to molar mass.",
      "Divide by total amount.",
    ],
    [L`Amount ratio is $2:1$, giving mole fraction $2/(2+1)=2/3$.`],
  ),
  mc(
    "1.1",
    118,
    2,
    L`A solute solution is $4\%$ by mass. A $75\,\mathrm{g}$ sample is removed from a well-mixed bottle. The sample contains`,
    L`$3\,\mathrm{g}$ solute`,
    [
      [L`$4\,\mathrm{g}$ solute`, "4 g corresponds to 100 g solution."],
      [L`$72\,\mathrm{g}$ solute`, "72 g is solvent mass."],
      [
        L`$18.75\,\mathrm{g}$ solute`,
        "Divide by 100 and multiply by 4, not divide by 4.",
      ],
    ],
    [
      "A homogeneous aliquot retains the same composition.",
      "Apply the mass fraction to the aliquot.",
      "Four percent is 0.04.",
    ],
    [L`$w_2=0.04(75)=3\,\mathrm{g}$.`],
  ),
  mc(
    "1.1",
    119,
    3,
    L`A solute has mass fraction $0.10$ and molar mass $100\,\mathrm{g\,mol^{-1}}$. Its solution is $1.20\,\mathrm{M}$. The solution density is`,
    L`$1.20\,\mathrm{g\,mL^{-1}}$`,
    [
      [
        L`$0.12\,\mathrm{g\,mL^{-1}}$`,
        "120 g is solute mass per litre, not solution mass.",
      ],
      [
        L`$12.0\,\mathrm{g\,mL^{-1}}$`,
        "This introduces an extra factor of ten.",
      ],
      [
        L`$0.833\,\mathrm{g\,mL^{-1}}$`,
        "Density is mass divided by volume, not the inverse.",
      ],
    ],
    [
      "Use one litre.",
      "Find solute mass from molarity.",
      "Solute is one tenth of solution mass.",
    ],
    [
      L`Solute mass is $120\,\mathrm{g}$ per litre; solution mass is $1200\,\mathrm{g}$, so density $=1.20\,\mathrm{g\,mL^{-1}}$.`,
    ],
  ),
  mc(
    "1.1",
    120,
    3,
    L`A homogeneous $500\,\mathrm{mL}$ solution is $0.40\,\mathrm{M}$. After withdrawing $100\,\mathrm{mL}$, the remaining solution is diluted back to $500\,\mathrm{mL}$. The final molarity is`,
    L`$0.32\,\mathrm{M}$`,
    [
      [
        L`$0.40\,\mathrm{M}$`,
        "Withdrawal alone preserves molarity, but subsequent dilution lowers it.",
      ],
      [
        L`$0.08\,\mathrm{M}$`,
        "This uses the withdrawn amount instead of the remaining amount.",
      ],
      [L`$0.50\,\mathrm{M}$`, "Adding solvent cannot increase molarity."],
    ],
    [
      "Find the solute amount remaining after withdrawal.",
      "The remaining 400 mL initially still has concentration 0.40 M.",
      "Divide its amount by the final 0.500 L.",
    ],
    [
      L`Remaining amount $=0.40(0.400)=0.160\,\mathrm{mol}$; final $c=0.160/0.500=0.32\,\mathrm{M}$.`,
    ],
  ),
  w(
    "1.1",
    105,
    "vsaq",
    2,
    "A student mixes 25 mL ethanol with 75 mL water and labels the mixture 25% by volume. Explain why a volume measurement is needed before accepting the label.",
    [
      [
        "Identify the assumption and correct preparation method.",
        "The label assumes the final volume is 100 mL; ethanol-water mixing may cause volume contraction.",
        "For a 25% volume solution, measure 25 mL ethanol and add water to a measured final volume of 100 mL at the specified temperature.",
      ],
    ],
    [
      "Use final volume in the definition.",
      "Volumes need not add on mixing.",
      "Distinguish solvent added from final volume.",
    ],
    ["Assuming liquid volumes are always additive."],
  ),
  w(
    "1.1",
    106,
    "vsaq",
    2,
    "A homogeneous solution is split into two unequal portions. State what happens to mole fraction and solute amount in each portion compared with the original.",
    [
      [
        "Explain both quantities.",
        "Each portion retains the original mole fractions because all components are sampled in the same proportions.",
        "Each contains fewer solute moles than the original; amounts divide in proportion to portion size.",
      ],
    ],
    [
      "Composition is intensive.",
      "Amount is extensive.",
      "Homogeneity fixes proportions.",
    ],
    ["Halving concentration when dividing a solution."],
  ),
  w(
    "1.1",
    107,
    "vsaq",
    2,
    "A label gives 2 ppm by mass. Can this always be interpreted as 2 mg per litre? Explain.",
    [
      [
        "State the exact interpretation and the condition for the approximation.",
        "Exactly, 2 ppm by mass means 2 mg solute per kilogram of solution.",
        "It is approximately 2 mg/L only when solution density is approximately 1 kg/L.",
      ],
    ],
    [
      "ppm needs a stated basis.",
      "A kilogram is not always one litre.",
      "Use density to convert.",
    ],
    ["Treating ppm as a universal molarity unit."],
  ),
  w(
    "1.1",
    108,
    "saq",
    2,
    L`A $400\,\mathrm{g}$ solution contains $32\,\mathrm{g}$ solute. Water evaporates until the solution is $20\%$ by mass.`,
    [
      [
        "Find initial percentage, final solution mass and water lost.",
        L`Initial percentage $=100(32/400)=8\%$.`,
        L`Final mass $=32/0.20=160\,\mathrm{g}$.`,
        L`Water lost $=400-160=240\,\mathrm{g}$, with no solute loss.`,
      ],
    ],
    [
      "Conserve solute mass.",
      "Apply the target mass fraction.",
      "Only water is removed.",
    ],
    ["Removing a proportional amount of solute during evaporation."],
  ),
  w(
    "1.1",
    109,
    "saq",
    2,
    L`A $10\%$ by mass sucrose solution has density $1.026\,\mathrm{g\,mL^{-1}}$. Use sucrose molar mass $342\,\mathrm{g\,mol^{-1}}$.`,
    [
      [
        "For one litre, find solution mass, sucrose amount and molarity.",
        L`Solution mass is $1026\,\mathrm{g}$.`,
        L`Sucrose mass is $102.6\,\mathrm{g}$ and amount $102.6/342=0.300\,\mathrm{mol}$.`,
        L`Molarity is $0.300\,\mathrm{M}$.`,
      ],
    ],
    [
      "Choose a litre basis.",
      "Mass percentage applies to solution mass.",
      "Divide solute mass by molar mass.",
    ],
    ["Applying 10% directly to volume."],
  ),
  w(
    "1.1",
    110,
    "saq",
    3,
    L`Mix $150\,\mathrm{g}$ of a $12\%$ mass solution with $250\,\mathrm{g}$ of a $4\%$ mass solution of the same solute.`,
    [
      [
        "Find both solute masses and the resulting mass percentage.",
        L`First portion contains $18\,\mathrm{g}$ solute.`,
        L`Second portion contains $10\,\mathrm{g}$; total solution mass is $400\,\mathrm{g}$.`,
        L`Final percentage $=100(28/400)=7\%$.`,
      ],
    ],
    [
      "Use mass fractions separately.",
      "Add solution masses.",
      "Use a weighted average, not a simple average.",
    ],
    ["Averaging 12 and 4 to get 8 despite unequal masses."],
  ),
  w(
    "1.1",
    111,
    "saq",
    2,
    L`An aqueous solution contains $0.30\,\mathrm{mol}$ solute and $0.60\,\mathrm{kg}$ water. After adding water its molality becomes $0.25\,\mathrm{m}$.`,
    [
      [
        "Find initial molality, final water mass and added water mass.",
        L`Initial $m=0.30/0.60=0.50\,\mathrm{m}$.`,
        L`Final water mass $=0.30/0.25=1.20\,\mathrm{kg}$.`,
        L`Added water mass $=1.20-0.60=0.60\,\mathrm{kg}$.`,
      ],
    ],
    [
      "Moles do not change.",
      "Molality determines solvent mass.",
      "Subtract the initial water mass.",
    ],
    ["Calculating final solution mass instead of solvent mass."],
  ),
  w(
    "1.1",
    112,
    "saq",
    2,
    L`A water sample has mass $1.25\,\mathrm{kg}$ and contains $5.0\,\mathrm{mg}$ contaminant. It is diluted with $3.75\,\mathrm{kg}$ pure water.`,
    [
      [
        "Find original ppm, final sample mass and final ppm.",
        L`Original concentration $=5.0/1.25=4.0\,\mathrm{ppm}$.`,
        L`Final solution mass is $5.00\,\mathrm{kg}$.`,
        L`Final concentration $=5.0/5.00=1.0\,\mathrm{ppm}$.`,
      ],
    ],
    [
      "Use mg/kg for mass ppm.",
      "Contaminant amount is conserved.",
      "Include original sample mass in the final mass.",
    ],
    ["Dividing by added water mass alone."],
  ),
  w(
    "1.1",
    113,
    "saq",
    3,
    L`A binary solution has solute mole fraction $0.20$. The solute and solvent molar masses are $80$ and $40\,\mathrm{g\,mol^{-1}}$, respectively.`,
    [
      [
        "Using one mole of components, find each component mass and solute mass percentage.",
        L`Solute mass $=0.20(80)=16\,\mathrm{g}$.`,
        L`Solvent mass $=0.80(40)=32\,\mathrm{g}$.`,
        L`Solute mass percentage $=100(16/48)=33\tfrac13\%$.`,
      ],
    ],
    [
      "One mole total gives the component amounts immediately.",
      "Masses require different molar masses.",
      "Use combined mass for the percentage.",
    ],
    ["Equating mole percentage and mass percentage."],
  ),
  w(
    "1.1",
    114,
    "saq",
    3,
    L`A student dilutes $40\,\mathrm{mL}$ of $1.5\,\mathrm{M}$ stock by adding $160\,\mathrm{mL}$ water. The measured final volume is $198\,\mathrm{mL}$.`,
    [
      [
        "Calculate solute amount, actual molarity and the concentration if final volume were exactly 200 mL.",
        L`$n=1.5(0.040)=0.060\,\mathrm{mol}$.`,
        L`Actual $c=0.060/0.198=10/33\,\mathrm{M}$.`,
        L`At $200\,\mathrm{mL}$, $c=0.300\,\mathrm{M}$; use measured volume when additivity fails.`,
      ],
    ],
    [
      "Conserve solute amount.",
      "Do not replace measured volume with summed volumes.",
      "Compare both denominators.",
    ],
    ["Ignoring measured contraction."],
  ),
  w(
    "1.1",
    115,
    "laq",
    3,
    L`A laboratory has $0.50\,\mathrm{M}$ and $0.10\,\mathrm{M}$ solutions of the same non-reacting solute. It needs $300\,\mathrm{mL}$ of $0.20\,\mathrm{M}$ solution by mixing them. Volumes are additive.`,
    [
      [
        "Determine the required volume of each stock, showing the amount balance.",
        L`Let the concentrated stock volume be $V\,\mathrm{L}$; the other volume is $0.300-V$.`,
        L`Target amount is $0.20(0.300)=0.060\,\mathrm{mol}$.`,
        L`$0.50V+0.10(0.300-V)=0.060$.`,
        L`$0.40V=0.030$, hence $V=0.075\,\mathrm{L}=75\,\mathrm{mL}$.`,
        L`Dilute stock volume is $225\,\mathrm{mL}$; the amounts $0.0375+0.0225=0.060\,\mathrm{mol}$ verify the result.`,
      ],
    ],
    [
      "Let one volume be unknown.",
      "Use the target volume to express the other.",
      "Conserve solute amount, not concentration.",
    ],
    ["Taking equal volumes to reach an unweighted mean."],
  ),
  w(
    "1.1",
    116,
    "laq",
    3,
    L`A solute of molar mass $60\,\mathrm{g\,mol^{-1}}$ forms a $1.5\,\mathrm{m}$ solution. Its density is $1.09\,\mathrm{g\,mL^{-1}}$.`,
    [
      [
        "On a 1 kg solvent basis, calculate solute mass, solution mass, solution volume and molarity.",
        L`Solute amount is $1.5\,\mathrm{mol}$, so its mass is $90\,\mathrm{g}$.`,
        L`Solution mass is $1000+90=1090\,\mathrm{g}$.`,
        L`Volume $=1090/1.09=1000\,\mathrm{mL}$.`,
        L`Molarity is $1.5/1.0=1.5\,\mathrm{M}$.`,
      ],
      [
        "Does this numerical equality prove that molarity and molality are identical definitions?",
        "No. Their denominators differ; equality here follows only from the given density and composition.",
      ],
    ],
    [
      "Use the definition of molality to choose a basis.",
      "Convert total mass to volume using density.",
      "Check definitions even when numbers agree.",
    ],
    ["Generalising numerical equality to all solutions."],
  ),
  w(
    "1.1",
    117,
    "laq",
    3,
    L`A $250\,\mathrm{g}$ solution contains $25\,\mathrm{g}$ non-volatile solute of molar mass $100\,\mathrm{g\,mol^{-1}}$. A $50\,\mathrm{g}$ aliquot is removed, then $50\,\mathrm{g}$ water is added to the remainder.`,
    [
      [
        "Calculate the final solute mass, solvent mass, mass percentage and molality.",
        L`The withdrawn aliquot contains $50(25/250)=5\,\mathrm{g}$ solute.`,
        L`Remaining solute mass is $20\,\mathrm{g}$, or $0.20\,\mathrm{mol}$.`,
        L`Remaining solvent is $180\,\mathrm{g}$; after addition it is $230\,\mathrm{g}$.`,
        L`Final solution mass is $250\,\mathrm{g}$ and mass percentage $8\%$.`,
        L`Molality $=0.20/0.230=20/23\,\mathrm{mol\,kg^{-1}}$.`,
      ],
    ],
    [
      "The aliquot has the original composition.",
      "Remove both solute and solvent with it.",
      "The replacement is pure solvent.",
    ],
    ["Treating withdrawal as evaporation of pure water."],
  ),
  w(
    "1.1",
    118,
    "case",
    3,
    L`A technician prepares a solution using $8.0\,\mathrm{g}$ of a solute ($M=80$) and $192\,\mathrm{g}$ water. The measured final volume is $180\,\mathrm{mL}$.`,
    [
      [
        "Calculate mass percentage and molality.",
        L`Mass percentage $=100(8/200)=4.0\%$.`,
        L`Molality $=0.10/0.192=25/48\,\mathrm{m}$.`,
      ],
      [
        "Calculate molarity and explain why 4% by mass is not 4% by volume here.",
        L`Molarity $=0.10/0.180=5/9\,\mathrm{M}$.`,
        "Mass percentage uses component mass per solution mass. Volume percentage would require solute volume, which is not supplied.",
      ],
    ],
    [
      "Convert solute mass to amount once.",
      "Use the appropriate denominator for each concentration.",
      "A solid's mass does not specify its volume percentage.",
    ],
    ["Using solvent mass as solution volume."],
  ),
  w(
    "1.1",
    119,
    "case",
    3,
    L`A bottle contains $600\,\mathrm{mL}$ of $0.30\,\mathrm{M}$ solution. A student removes $200\,\mathrm{mL}$, dilutes that portion to $500\,\mathrm{mL}$, and keeps the original remainder separately.`,
    [
      [
        "Find solute amount and molarity of the diluted portion.",
        L`Withdrawn amount $=0.30(0.200)=0.060\,\mathrm{mol}$.`,
        L`Diluted concentration $=0.060/0.500=0.12\,\mathrm{M}$.`,
      ],
      [
        "Find amount and molarity of the original remainder.",
        L`Remaining amount $=0.30(0.400)=0.120\,\mathrm{mol}$.`,
        L`Its molarity remains $0.30\,\mathrm{M}$ because only a homogeneous aliquot was removed.`,
      ],
    ],
    [
      "Follow each portion separately.",
      "Withdrawal preserves composition.",
      "Only the removed portion receives extra solvent.",
    ],
    ["Applying the dilution to the entire bottle."],
  ),
  w(
    "1.1",
    120,
    "case",
    3,
    L`Two preparations contain $10\,\mathrm{g}$ solute each. P uses $100\,\mathrm{g}$ solvent; Q is made to $100\,\mathrm{g}$ total solution. The solute molar mass is $50\,\mathrm{g\,mol^{-1}}$.`,
    [
      [
        "Calculate the molality of each preparation.",
        L`P: $m=0.20/0.100=2.0\,\mathrm{m}$.`,
        L`Q has $90\,\mathrm{g}$ solvent, so $m=0.20/0.090=20/9\,\mathrm{m}$.`,
      ],
      [
        "Which has higher mass percentage? Can their molarities be found from this information alone?",
        L`Q has $10\%$, whereas P has $100/11\%$.`,
        "No. Solution volumes or densities are needed to calculate molarity.",
      ],
    ],
    [
      "Distinguish mass of solvent from mass of solution.",
      "Use equal solute amounts.",
      "Molarity needs volume.",
    ],
    ["Treating both preparations as identical 10% solutions."],
  ),
];
