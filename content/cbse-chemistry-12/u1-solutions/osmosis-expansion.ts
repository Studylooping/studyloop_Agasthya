import { chapterPractice } from "../chapter-practice";
const { mc, written: w } = chapterPractice("u1-solutions");
const L = String.raw;
export const osmosisExpansion = [
  mc(
    "1.4",
    105,
    2,
    "A membrane separates 0.10 M glucose from 0.30 M glucose at equal temperature and pressure. It passes only water. The initial net water flow is",
    "from 0.10 M to 0.30 M",
    [
      [
        "from 0.30 M to 0.10 M",
        "Osmosis proceeds toward the higher solute particle concentration under these conditions.",
      ],
      [
        "zero because both contain glucose",
        "Chemical identity alone does not make concentrations isotonic.",
      ],
      [
        "glucose flows through instead",
        "The stated membrane excludes glucose.",
      ],
    ],
    [
      "Compare particle concentrations.",
      "Glucose is a non-electrolyte.",
      "Water flows toward the higher osmotic pressure.",
    ],
    [
      "At common temperature, osmotic pressure is proportional to glucose molarity; water initially moves toward the 0.30 M side.",
    ],
  ),
  mc(
    "1.4",
    106,
    2,
    "A red blood cell placed in a sufficiently hypertonic solution initially",
    "loses water and shrinks",
    [
      [
        "takes up water and swells",
        "This describes a hypotonic surrounding medium.",
      ],
      [
        "shows no net water transfer",
        "That would require isotonic conditions.",
      ],
      [
        "loses all solute through a perfectly semipermeable membrane",
        "A solvent-selective membrane need not pass solute.",
      ],
    ],
    [
      "Hypertonic means higher effective external osmotic pressure.",
      "Track water rather than salt.",
      "Water tends toward the more concentrated side.",
    ],
    [
      "Water leaves the cell into the hypertonic medium, reducing its volume. This is a qualitative osmotic model, not a formulation recommendation.",
    ],
  ),
  mc(
    "1.4",
    107,
    2,
    L`Two non-electrolyte solutions have equal osmotic pressures. One is $0.030\,\mathrm{M}$ at $300\,\mathrm{K}$; the other is at $360\,\mathrm{K}$. The second molarity is`,
    L`$0.025\,\mathrm{M}$`,
    [
      [
        L`$0.036\,\mathrm{M}$`,
        "Higher temperature requires lower concentration for equal pressure.",
      ],
      [
        L`$0.030\,\mathrm{M}$`,
        "Equal concentrations are not required when temperatures differ.",
      ],
      [L`$0.005\,\mathrm{M}$`, "This is the decrease, not the final molarity."],
    ],
    [
      L`Set $c_1T_1=c_2T_2$.`,
      "R cancels.",
      "Solve for the unknown concentration.",
    ],
    [L`$c_2=0.030(300/360)=0.025\,\mathrm{M}$.`],
  ),
  mc(
    "1.4",
    108,
    2,
    L`A dilute solution has osmotic pressure $0.80\,\mathrm{atm}$. It is diluted from $100$ to $400\,\mathrm{mL}$ at unchanged temperature without solute loss. Its final pressure is`,
    L`$0.20\,\mathrm{atm}$`,
    [
      [L`$3.2\,\mathrm{atm}$`, "Dilution lowers concentration."],
      [L`$0.80\,\mathrm{atm}$`, "The volume changed fourfold."],
      [
        L`$0.60\,\mathrm{atm}$`,
        "This is the decrease, not the final pressure.",
      ],
    ],
    [
      "Amount and temperature stay fixed.",
      "Pressure is inversely proportional to volume.",
      "The volume becomes four times as large.",
    ],
    [L`$\pi_2=0.80(100/400)=0.20\,\mathrm{atm}$.`],
  ),
  mc(
    "1.4",
    109,
    2,
    L`Equal masses of non-electrolytes P and Q form equal solution volumes at the same temperature. Their osmotic pressures are in ratio 3:2. The ratio of molar masses $M_P:M_Q$ is`,
    "2:3",
    [
      [
        "3:2",
        "At fixed mass and volume, osmotic pressure is inversely proportional to molar mass.",
      ],
      ["1:1", "Different pressures imply different solute amounts."],
      ["9:4", "No squared dependence is involved."],
    ],
    [
      L`Use $\pi=wRT/(MV)$.`,
      "Cancel common mass, temperature and volume.",
      "Invert the pressure ratio.",
    ],
    [L`$\pi_P/\pi_Q=M_Q/M_P=3/2$, hence $M_P:M_Q=2:3$.`],
  ),
  mc(
    "1.4",
    110,
    2,
    "A polymer molar-mass measurement uses a membrane that leaks polymer into the pure-solvent side. Compared with a perfectly retaining membrane, the measured pressure difference will tend to be",
    "smaller, making the uncorrected apparent molar mass too high",
    [
      [
        "larger, making apparent mass too low",
        "Leakage reduces the concentration difference.",
      ],
      [
        "unchanged because temperature is fixed",
        "The pressure difference also depends on retained particle concentration.",
      ],
      [
        "zero only if the solvent is water",
        "Leakage is not specific to water.",
      ],
    ],
    [
      "Osmotic pressure difference needs unequal retained-solute concentrations.",
      "Leakage reduces that difference.",
      "Inferred molar mass is inversely proportional to measured pressure.",
    ],
    [
      "Polymer transfer reduces the maintained concentration difference; using that smaller pressure as if all polymer were retained overestimates molar mass.",
    ],
  ),
  mc(
    "1.4",
    111,
    3,
    L`At fixed temperature, two compartments contain $0.010$ and $0.020\,\mathrm{mol}$ of the same non-electrolyte, separated by a water-permeable membrane. If hydrostatic pressure differences are negligible and total liquid volume is $300\,\mathrm{mL}$, equal equilibrium molarities require volumes`,
    "100 mL and 200 mL",
    [
      [
        "150 mL and 150 mL",
        "Equal volumes would leave unequal concentrations.",
      ],
      [
        "200 mL and 100 mL",
        "Volumes must be proportional to retained amounts, not inversely proportional.",
      ],
      ["50 mL and 250 mL", "These volumes do not give equal molarity."],
    ],
    [
      "At zero pressure difference, equilibrium needs equal osmotic pressures.",
      "The temperatures and solute species match.",
      "Set n1/V1=n2/V2 with V1+V2=300 mL.",
    ],
    [
      "The volume ratio must be 1:2, yielding 100 and 200 mL. Both then contain 0.10 M solute.",
    ],
  ),
  mc(
    "1.4",
    112,
    2,
    "In a reverse-osmosis desalination model, the membrane should",
    "pass water while largely retaining dissolved salts",
    [
      [
        "pass salts while retaining water",
        "That is the opposite separation selectivity.",
      ],
      [
        "pass both equally freely",
        "Then a useful osmotic separation is not maintained.",
      ],
      [
        "chemically convert salt into water",
        "Reverse osmosis is a separation, not such a reaction.",
      ],
    ],
    [
      "Identify the desired permeate.",
      "Pressure drives solvent through.",
      "Solute must be retained for desalination.",
    ],
    [
      "Applied pressure above the osmotic-pressure difference drives water through the selectively permeable membrane while salts are largely retained.",
    ],
  ),
  mc(
    "1.4",
    113,
    2,
    L`A dilute solution has $0.005\,\mathrm{mol}$ particles in $0.50\,\mathrm{L}$ at $300\,\mathrm{K}$. Using $R=0.082\,\mathrm{L\,atm\,mol^{-1}\,K^{-1}}$, its osmotic pressure is`,
    L`$0.246\,\mathrm{atm}$`,
    [
      [L`$0.123\,\mathrm{atm}$`, "That is nRT before dividing by volume."],
      [
        L`$2.46\,\mathrm{atm}$`,
        "The particle concentration is 0.010 M, not 0.10 M.",
      ],
      [L`$0.00082\,\mathrm{atm}$`, "Absolute temperature must be included."],
    ],
    [
      "Calculate particle concentration.",
      "Use kelvin temperature.",
      "Keep litres consistent with R.",
    ],
    [L`$\pi=(0.005/0.50)(0.082)(300)=0.246\,\mathrm{atm}$.`],
  ),
  mc(
    "1.4",
    114,
    2,
    "A semipermeable membrane separates identical solutions at the same temperature and pressure. Which statement is correct?",
    "Solvent exchange can occur, but there is no net osmotic flow",
    [
      [
        "All molecular motion stops",
        "Thermal molecular motion continues at equilibrium.",
      ],
      [
        "Water moves permanently in only one direction",
        "The two sides are equivalent.",
      ],
      [
        "A concentration difference must spontaneously grow",
        "No stated driving force favours that change.",
      ],
    ],
    [
      "Distinguish microscopic exchange from net transport.",
      "Both sides have the same state.",
      "Equilibrium is dynamic.",
    ],
    [
      "Equivalent conditions give balanced solvent exchange; net flow is zero without stopping molecular motion.",
    ],
  ),
  mc(
    "1.4",
    115,
    2,
    L`A membrane separates dilute non-electrolyte solutions whose osmotic pressures are $3.0$ and $1.2\,\mathrm{atm}$ at the same temperature. What excess pressure on the more concentrated side just stops osmosis?`,
    L`$1.8\,\mathrm{atm}$`,
    [
      [
        L`$3.0\,\mathrm{atm}$`,
        "That would be the stopping pressure against pure solvent, not this second solution.",
      ],
      [
        L`$4.2\,\mathrm{atm}$`,
        "The relevant quantity is the difference, not the sum.",
      ],
      [
        L`$1.2\,\mathrm{atm}$`,
        "This is the osmotic pressure of the dilute side alone.",
      ],
    ],
    [
      "Both sides contain solute.",
      "Compare their osmotic pressures.",
      "Applied pressure balances the difference.",
    ],
    [L`Required pressure difference $=3.0-1.2=1.8\,\mathrm{atm}$.`],
  ),
  mc(
    "1.4",
    116,
    3,
    L`A polymer solution's osmotic pressure doubles at fixed mass concentration and temperature after every original chain splits into two retained fragments. Ignoring reaction-volume changes, the number of dissolved particles has`,
    "doubled",
    [
      ["halved", "Chain splitting increases particle count."],
      ["remained unchanged", "Mass is conserved, but particle number is not."],
      ["quadrupled", "Each chain makes two particles, not four."],
    ],
    [
      "Count chains before and fragments after.",
      "Mass concentration can stay unchanged.",
      "Osmotic pressure counts particles.",
    ],
    [
      "Each chain becomes two independently dissolved fragments; particle concentration and osmotic pressure double under the stated ideal model.",
    ],
  ),
  mc(
    "1.4",
    117,
    2,
    L`Which ideal dilute solution is isotonic with $0.030\,\mathrm{M}$ glucose at the same temperature, assuming complete dissociation?`,
    L`$0.010\,\mathrm{M}\ \mathrm{CaCl_2}$`,
    [
      [
        L`$0.030\,\mathrm{M}\ \mathrm{NaCl}$`,
        "Two ions per formula unit give 0.060 M particles.",
      ],
      [
        L`$0.010\,\mathrm{M}$ urea`,
        "Urea stays molecular and gives only 0.010 M particles.",
      ],
      [
        L`$0.020\,\mathrm{M}\ \mathrm{CaCl_2}$`,
        "Three ions give 0.060 M particles.",
      ],
    ],
    [
      "Compare i times molarity.",
      "Glucose gives one particle per molecule.",
      "Calcium chloride gives three ions in the ideal model.",
    ],
    [L`$i c=3(0.010)=0.030\,\mathrm{M}$ particles, matching glucose.`],
  ),
  mc(
    "1.4",
    118,
    2,
    "For an aqueous macromolecular solution, which quantity must be used with R expressed in litre-atmosphere units in the osmotic-pressure equation?",
    "Solution volume in litres and absolute temperature in kelvin",
    [
      [
        "Solvent volume in mL and Celsius temperature",
        "Both the volume basis and temperature scale are wrong.",
      ],
      [
        "Solvent mass in kg instead of volume",
        "That is the denominator used in molality, not osmotic pressure.",
      ],
      [
        "Solution volume in litres and Celsius temperature",
        "The temperature must be absolute.",
      ],
    ],
    [
      L`Recall $\pi V=nRT$.`,
      "Check the units of R.",
      "V refers to solution, not solvent alone.",
    ],
    [
      "The equation uses solution volume and kelvin temperature; units must match those of the gas constant.",
    ],
  ),
  mc(
    "1.4",
    119,
    2,
    L`Solutions P and Q have equal osmotic pressures and volumes at the same temperature. P contains $2\,\mathrm{g}$ non-electrolyte and Q contains $5\,\mathrm{g}$ another non-electrolyte. Their molar-mass ratio $M_Q/M_P$ is`,
    L`$5/2$`,
    [
      [L`$2/5$`, "Equal amounts require masses proportional to molar masses."],
      [L`$1$`, "The masses differ while amounts are equal."],
      [L`$7/2$`, "Masses are compared as a ratio, not added."],
    ],
    [
      "Equal pressure, volume and temperature imply equal moles.",
      "Use n=w/M.",
      "Rearrange the equality.",
    ],
    [L`$2/M_P=5/M_Q$, so $M_Q/M_P=5/2$.`],
  ),
  mc(
    "1.4",
    120,
    3,
    L`A solution at $300\,\mathrm{K}$ has osmotic pressure $0.60\,\mathrm{atm}$. Its volume is doubled by dilution and it is then warmed to $350\,\mathrm{K}$. Solute amount is unchanged and the stated final volume is twice the initial volume. Its final pressure is`,
    L`$0.35\,\mathrm{atm}$`,
    [
      [L`$0.30\,\mathrm{atm}$`, "This includes dilution but not warming."],
      [L`$0.70\,\mathrm{atm}$`, "This includes warming but not dilution."],
      [L`$1.40\,\mathrm{atm}$`, "The volume factor is inverted."],
    ],
    [
      "Use both changes in nRT/V.",
      "Amount stays fixed.",
      "Multiply temperature ratio by inverse volume ratio.",
    ],
    [L`$\pi_2=0.60(350/300)(1/2)=0.35\,\mathrm{atm}$.`],
  ),
  w(
    "1.4",
    105,
    "vsaq",
    2,
    "Two solutions of different solutes are isotonic at one temperature. Must they have equal mass concentrations? Explain for non-electrolytes.",
    [
      [
        "State the concentration condition and distinguish mass concentration.",
        "For ideal non-electrolytes at the same temperature, isotonicity means equal molarity.",
        "Mass concentration is molarity times molar mass, so it need not be equal for different molar masses.",
      ],
    ],
    [
      "Osmotic pressure depends on particle amount.",
      "A gram is not a fixed number of molecules.",
      "Use mass concentration = cM.",
    ],
    ["Equating isotonic with equal grams per litre."],
  ),
  w(
    "1.4",
    106,
    "vsaq",
    2,
    "Explain the difference between osmosis and diffusion of a dissolved solute through a non-selective porous partition.",
    [
      [
        "State the transported species and membrane requirement.",
        "Osmosis is net solvent movement through a solvent-selective membrane owing to a solvent chemical-potential difference, commonly caused by unequal solute concentrations.",
        "A non-selective partition may also allow solute diffusion down its own concentration gradient; that is not the defining solvent-selective osmotic process.",
      ],
    ],
    [
      "Identify which species crosses.",
      "Specify membrane selectivity.",
      "Do not call every mixing process osmosis.",
    ],
    [
      "Saying osmosis is the movement of solute from concentrated to dilute solution.",
    ],
  ),
  w(
    "1.4",
    107,
    "vsaq",
    2,
    "Why does a solution's rise in a narrow tube during osmosis eventually stop even if the outside liquid is still pure solvent?",
    [
      [
        "Explain the opposing effect and equilibrium.",
        "The rising solution column creates a hydrostatic pressure difference opposing further inward solvent flow.",
        "At equilibrium that pressure difference balances the osmotic driving force, so there is no net solvent flow.",
      ],
    ],
    [
      "The liquid levels no longer match.",
      "A column of liquid exerts pressure.",
      "Balance rather than depletion can stop net flow.",
    ],
    ["Claiming all outside solvent must first be used up."],
  ),
  w(
    "1.4",
    108,
    "saq",
    2,
    L`A solution contains $0.90\,\mathrm{g}$ glucose ($M=180$) in $250\,\mathrm{mL}$ at $300\,\mathrm{K}$. Use $R=0.082\,\mathrm{L\,atm\,mol^{-1}\,K^{-1}}$.`,
    [
      [
        "Calculate amount, molarity and osmotic pressure.",
        L`$n=0.90/180=0.0050\,\mathrm{mol}$.`,
        L`$c=0.0050/0.250=0.020\,\mathrm{M}$.`,
        L`$\pi=0.020(0.082)(300)=0.492\,\mathrm{atm}$.`,
      ],
    ],
    [
      "Convert glucose mass to amount.",
      "Use final solution volume.",
      "Apply cRT.",
    ],
    ["Dividing by solvent mass for osmotic pressure."],
  ),
  w(
    "1.4",
    109,
    "saq",
    3,
    L`An ideal urea solution is isotonic with $0.020\,\mathrm{M}\ \mathrm{NaCl}$ at the same temperature. Assume full salt dissociation and urea molar mass $60\,\mathrm{g\,mol^{-1}}$.`,
    [
      [
        "Find urea molarity and mass required for 500 mL of solution.",
        L`NaCl particle molarity is $2(0.020)=0.040\,\mathrm{M}$.`,
        L`Required urea molarity is $0.040\,\mathrm{M}$ and amount $0.040(0.500)=0.020\,\mathrm{mol}$.`,
        L`Urea mass $=0.020(60)=1.20\,\mathrm{g}$.`,
      ],
    ],
    [
      "Match particle molarity.",
      "Urea does not dissociate.",
      "Convert target moles to mass.",
    ],
    ["Matching formula-unit molarities without accounting for ions."],
  ),
  w(
    "1.4",
    110,
    "saq",
    2,
    L`At $300\,\mathrm{K}$, a membrane separates $0.020\,\mathrm{M}$ and $0.050\,\mathrm{M}$ glucose. Take $R=0.082$ in litre-atmosphere units.`,
    [
      [
        "Find the pressure difference needed to stop osmosis and identify the side requiring applied pressure.",
        L`Particle concentration difference is $0.030\,\mathrm{M}$.`,
        L`$\Delta\pi=0.030(0.082)(300)=0.738\,\mathrm{atm}$.`,
        "Apply this excess pressure on the 0.050 M side; water otherwise moves into that more concentrated solution.",
      ],
    ],
    [
      "Both sides are solutions.",
      "Use the concentration difference.",
      "Pressure opposes entry into the concentrated side.",
    ],
    [
      "Using the larger concentration alone as if the other side were pure water.",
    ],
  ),
  w(
    "1.4",
    111,
    "saq",
    3,
    L`A $1.20\,\mathrm{g}$ polymer in $200\,\mathrm{mL}$ solution at $300\,\mathrm{K}$ gives osmotic pressure $0.0492\,\mathrm{atm}$. Use $R=0.082$.`,
    [
      [
        "Find molar mass and predict pressure after dilution to 500 mL at the same temperature.",
        L`$n=\pi V/(RT)=0.0492(0.200)/24.6=0.00040\,\mathrm{mol}$.`,
        L`$M=1.20/0.00040=3000\,\mathrm{g\,mol^{-1}}$.`,
        L`New pressure $=0.0492(200/500)=0.01968\,\mathrm{atm}$.`,
      ],
    ],
    [
      "Calculate amount from pressure first.",
      "Molar mass does not change on dilution.",
      "Pressure scales inversely with final volume.",
    ],
    ["Changing the polymer's molar mass when adding water."],
  ),
  w(
    "1.4",
    112,
    "saq",
    3,
    L`The osmotic pressure of a $2.0\,\mathrm{g\,L^{-1}}$ macromolecular solution is $0.0082\,\mathrm{atm}$ at $300\,\mathrm{K}$. Use $R=0.082$.`,
    [
      [
        "Calculate molarity, molar mass and pressure at half the mass concentration at the same temperature.",
        L`$c=0.0082/24.6=1/3000\,\mathrm{mol\,L^{-1}}$.`,
        L`$M=(2.0\,\mathrm{g\,L^{-1}})/(1/3000\,\mathrm{mol\,L^{-1}})=6000\,\mathrm{g\,mol^{-1}}$.`,
        L`At half concentration, $\pi=0.0041\,\mathrm{atm}$.`,
      ],
    ],
    [
      "The supplied concentration is mass per litre.",
      "Convert pressure into molarity.",
      "Divide mass concentration by molarity.",
    ],
    ["Using 2.0 as a molarity."],
  ),
  w(
    "1.4",
    113,
    "saq",
    2,
    "A solution made from intact polymer chains has osmotic pressure 0.030 atm. At the same volume and temperature, every chain is cleaved into three fragments retained by the membrane. Assume ideality and negligible volume change.",
    [
      [
        "Find the new pressure, particle-count ratio and inferred mean fragment molar mass relative to the original chain mass.",
        "The particle count triples because each original molecule yields three fragments.",
        "The pressure becomes 0.090 atm at fixed volume and temperature.",
        "Total mass is conserved, so number-average fragment molar mass is one third of the original chain molar mass.",
      ],
    ],
    [
      "Count fragments per original chain.",
      "Use pressure proportional to particle count.",
      "Conserve total polymer mass.",
    ],
    ["Confusing conserved mass with conserved molecule count."],
  ),
  w(
    "1.4",
    114,
    "saq",
    2,
    L`Solutions A and B contain the same mass of different non-electrolytes in equal volumes at $300\,\mathrm{K}$. Their pressures are $0.30$ and $0.45\,\mathrm{atm}$. Solute A has molar mass $180\,\mathrm{g\,mol^{-1}}$.`,
    [
      [
        "Determine the molar-mass relation, molar mass of B and which solution contains more particles.",
        L`At fixed mass and volume, $\pi_A/\pi_B=M_B/M_A$.`,
        L`$M_B=180(0.30/0.45)=120\,\mathrm{g\,mol^{-1}}$.`,
        "B contains more particles: its amount is 1.5 times A's.",
      ],
    ],
    [
      "Cancel mass, volume, temperature and R.",
      "Molar mass and pressure vary inversely.",
      "Larger pressure means more particles per volume.",
    ],
    ["Assigning larger molar mass to the larger pressure."],
  ),
  w(
    "1.4",
    115,
    "laq",
    3,
    L`A $3.0\,\mathrm{g}$ mixture of urea ($M=60$) and glucose ($M=180$) is made into $1.0\,\mathrm{L}$ solution at $300\,\mathrm{K}$. Its osmotic pressure is $0.820\,\mathrm{atm}$. Use $R=0.082$ and ideality.`,
    [
      [
        "Determine the component masses.",
        L`Total dissolved amount $=\pi V/(RT)=0.820/24.6=1/30\,\mathrm{mol}$.`,
        L`Let urea mass be $a$ grams and glucose mass $3-a$.`,
        L`$a/60+(3-a)/180=1/30$.`,
        L`$3a+3-a=6$, so urea mass is $1.5\,\mathrm{g}$.`,
        L`Glucose mass is $1.5\,\mathrm{g}$; despite equal masses, their amounts differ by a factor of three.`,
      ],
    ],
    [
      "Pressure determines total particle amount.",
      "Total sample mass is a second constraint.",
      "Use each component's own molar mass.",
    ],
    ["Assuming total amount belongs to either pure solute."],
  ),
  w(
    "1.4",
    116,
    "laq",
    3,
    L`Two flexible compartments at the same temperature contain $0.020$ and $0.030\,\mathrm{mol}$ retained non-electrolyte. They are separated by a water-permeable membrane and have combined solution volume $500\,\mathrm{mL}$. Initially each volume is $250\,\mathrm{mL}$. Neglect hydrostatic pressure differences and assume additive volumes.`,
    [
      [
        "Find the initial concentrations, direction of water flow, equilibrium volumes and final concentration.",
        L`Initial concentrations are $0.020/0.250=0.080\,\mathrm{M}$ and $0.030/0.250=0.120\,\mathrm{M}$.`,
        "Water initially flows from the first to the second compartment.",
        L`At equilibrium, $0.020/V_1=0.030/V_2$, giving $V_1:V_2=2:3$.`,
        L`With total volume 500 mL, $V_1=200\,\mathrm{mL}$ and $V_2=300\,\mathrm{mL}$.`,
        L`Both final concentrations are $0.100\,\mathrm{M}$.`,
      ],
    ],
    [
      "Calculate initial molarities.",
      "Zero pressure difference makes equal osmotic pressure the equilibrium condition.",
      "Retained solute amounts do not change.",
    ],
    ["Assuming equal final volumes even though retained amounts differ."],
  ),
  w(
    "1.4",
    117,
    "laq",
    3,
    L`A dilute solution of a non-electrolyte has density approximately $1.00\,\mathrm{g\,mL^{-1}}$ and concentration $0.010\,\mathrm{M}$ at $300\,\mathrm{K}$. Take $R=0.082$, $K_f=1.86$ and solute molar mass $100\,\mathrm{g\,mol^{-1}}$.`,
    [
      [
        "Calculate osmotic pressure, then obtain molality and freezing depression on a one-litre basis rather than simply equating molarity and molality.",
        L`$\pi=0.010(0.082)(300)=0.246\,\mathrm{atm}$.`,
        L`A litre has approximately $1000\,\mathrm{g}$ total mass and $1.00\,\mathrm{g}$ solute.`,
        L`Solvent mass is approximately $999\,\mathrm{g}=0.999\,\mathrm{kg}$.`,
        L`$m=0.010/0.999\approx0.01001\,\mathrm{mol\,kg^{-1}}$.`,
        L`$\Delta T_f\approx1.86(0.01001)=0.01862\,\mathrm{K}$.`,
      ],
    ],
    [
      "Osmotic pressure uses molarity directly.",
      "For molality, subtract solute mass from solution mass.",
      "Keep the small distinction until the end.",
    ],
    [
      "Calling molarity and molality exactly identical for every dilute solution.",
    ],
  ),
  w(
    "1.4",
    118,
    "case",
    3,
    "A membrane retains polymer but allows water and a small dissolved salt to pass. Two solutions initially have the same polymer concentration but different salt concentrations. Temperature and external pressure are equal.",
    [
      [
        "Can the initial salt difference drive transient water movement? Will it necessarily sustain an equilibrium osmotic-pressure difference after the salt equilibrates?",
        "Yes. Before equilibration, unequal total solute concentrations can affect water transport.",
        "No. A freely permeating salt cannot by itself maintain that concentration difference at equilibrium.",
      ],
      [
        "What retained component sets the lasting osmotic difference in the ideal model? What if its concentrations are equal?",
        "The retained polymer determines the sustained solute-dependent osmotic difference.",
        "With equal polymer concentrations and equilibrated permeating species, the ideal model predicts no sustained net osmotic flow.",
      ],
    ],
    [
      "Distinguish transient behaviour from equilibrium.",
      "Ask which species the membrane retains.",
      "Permeating salt can redistribute.",
    ],
    [
      "Treating a permeable solute as permanently confined to its original side.",
    ],
  ),
  w(
    "1.4",
    119,
    "case",
    3,
    L`At $300\,\mathrm{K}$, dilute solution A contains $0.020\,\mathrm{M}$ urea, B contains $0.015\,\mathrm{M}$ glucose, and C contains $0.010\,\mathrm{M}\ \mathrm{NaCl}$ with full dissociation.`,
    [
      [
        "Identify the isotonic pair and rank osmotic pressures.",
        "A and C are isotonic because both have effective particle concentration 0.020 M.",
        L`$\pi_B<\pi_A=\pi_C$.`,
      ],
      [
        "If A and B are separated by a solvent-only membrane at equal pressure, where does water initially move? Would equal mass percentages guarantee isotonicity?",
        "Water moves from B toward A.",
        "No. Particle molarity depends on molar mass, dissociation, and the mass-to-volume conversion, not mass percentage alone.",
      ],
    ],
    [
      "Compare i times c.",
      "Osmotic water flow is toward higher effective particle concentration.",
      "Mass and particle amount are different measures.",
    ],
    ["Ranking by formula-unit molarity while ignoring salt dissociation."],
  ),
  w(
    "1.4",
    120,
    "case",
    3,
    "A polymer experiment reports 0.060 atm osmotic pressure at a given temperature. The student uses an entered solution volume of 200 mL, but the actual volume is 250 mL. The solute mass and pressure measurement are correct.",
    [
      [
        "Compare the student's inferred molar mass with the true value.",
        L`Since $M=wRT/(\pi V)$, using too small a volume overestimates $M$.`,
        L`$M_{entered}/M_{true}=250/200=1.25$.`,
      ],
      [
        "If the reported molar mass was 5000 g/mol, correct it and name the quantity that must be measured.",
        L`Correct mass $=5000/1.25=4000\,\mathrm{g\,mol^{-1}}$.`,
        "The final solution volume, not the volume of solvent added, must be measured at the experiment temperature.",
      ],
    ],
    [
      "Locate volume in the molar-mass expression.",
      "Compare entered and actual denominators.",
      "Undo the overestimate.",
    ],
    ["Reducing the volume while keeping the inferred mass unchanged."],
  ),
];
