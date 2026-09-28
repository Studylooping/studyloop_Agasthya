import { chapterPractice } from "../chapter-practice";
const { mc, written: w } = chapterPractice("u1-solutions");
const L = String.raw;
export const solubilityExpansion = [
  mc(
    "1.2",
    105,
    2,
    "A saturated solution remains in contact with excess undissolved solid at constant temperature. At equilibrium,",
    "dissolution and crystallisation continue at equal rates",
    [
      ["both processes cease", "Solubility equilibrium is dynamic."],
      [
        "only dissolution continues",
        "That would increase dissolved concentration rather than maintain equilibrium.",
      ],
      [
        "only crystallisation continues",
        "That would decrease dissolved concentration.",
      ],
    ],
    [
      "Equilibrium fixes macroscopic concentration.",
      "It does not stop microscopic exchange.",
      "Compare forward and reverse rates.",
    ],
    [
      "Particles continue entering and leaving solution at equal rates, so dissolved concentration stays constant.",
    ],
  ),
  mc(
    "1.2",
    106,
    2,
    L`A salt has solubility $30\,\mathrm{g}$ per $100\,\mathrm{g}$ water at a given temperature. The maximum mass dissolved by $250\,\mathrm{g}$ water is`,
    L`$75\,\mathrm{g}$`,
    [
      [
        L`$57.7\,\mathrm{g}$`,
        "The solubility basis is water mass, not total solution mass.",
      ],
      [L`$30\,\mathrm{g}$`, "This applies to 100 g water only."],
      [
        L`$325\,\mathrm{g}$`,
        "This is the total saturated solution mass, not solute mass.",
      ],
    ],
    [
      "Identify the solubility basis.",
      "Scale with solvent mass.",
      "250 g is 2.5 times 100 g.",
    ],
    [L`Maximum dissolved mass $=30(250/100)=75\,\mathrm{g}$.`],
  ),
  mc(
    "1.2",
    107,
    3,
    L`At a high temperature a salt dissolves $50\,\mathrm{g}$ per $100\,\mathrm{g}$ water; at a lower temperature it dissolves $20\,\mathrm{g}$. A saturated $150\,\mathrm{g}$ hot solution is cooled without evaporation. The mass crystallising is`,
    L`$30\,\mathrm{g}$`,
    [
      [L`$45\,\mathrm{g}$`, "150 g is solution mass, not solvent mass."],
      [
        L`$20\,\mathrm{g}$`,
        "20 g remains dissolved; it is not the precipitated amount.",
      ],
      [
        L`$50\,\mathrm{g}$`,
        "Some solute remains dissolved at the lower temperature.",
      ],
    ],
    [
      "Separate solvent and solute in the hot solution.",
      "Water mass does not change.",
      "Subtract the new dissolved capacity.",
    ],
    [
      L`The solution has $100\,\mathrm{g}$ water and $50\,\mathrm{g}$ salt. Only $20\,\mathrm{g}$ remains dissolved, so $30\,\mathrm{g}$ crystallises.`,
    ],
  ),
  mc(
    "1.2",
    108,
    2,
    "For a solid whose dissolution is endothermic, increasing temperature generally",
    "increases its equilibrium solubility",
    [
      [
        "decreases its equilibrium solubility",
        "Added heat favours the endothermic dissolution direction.",
      ],
      [
        "has no possible effect",
        "Equilibrium solubility can depend on temperature.",
      ],
      [
        "converts every saturated solution into a gas",
        "A temperature effect on solubility does not imply vaporisation.",
      ],
    ],
    [
      "Write heat on the reactant side of dissolution.",
      "Apply the response to added heat.",
      "Distinguish dissolution rate from equilibrium solubility.",
    ],
    [
      "Heat promotes endothermic dissolution, increasing the equilibrium amount dissolved under the stated assumption.",
    ],
  ),
  mc(
    "1.2",
    109,
    2,
    "Two gases have Henry constants 100 kbar and 40 kbar in water at the same temperature. At equal partial pressures, which is more soluble?",
    "The gas with 40 kbar",
    [
      ["The gas with 100 kbar", "Larger KH in p=KHx means lower solubility."],
      [
        "Both equally",
        "Equal pressure is insufficient when the constants differ.",
      ],
      [
        "The denser gas, regardless of KH",
        "The stated Henry constants determine the mole fractions here.",
      ],
    ],
    ["Use the convention p=KHx.", "Solve for x.", "Compare inverse constants."],
    [
      "At common pressure, x=p/KH; the gas with 40 kbar has 2.5 times the dissolved mole fraction.",
    ],
  ),
  mc(
    "1.2",
    110,
    3,
    L`For a gas, $K_H$ rises from $4.0\times10^4$ to $5.0\times10^4\,\mathrm{kPa}$ upon warming. At unchanged partial pressure, the dissolved mole fraction changes by`,
    "a 20% decrease",
    [
      ["a 25% increase", "That is the fractional increase of KH, not of x."],
      ["a 25% decrease", "The new-to-old solubility ratio is 4/5, not 3/4."],
      ["no change", "KH changes, so x changes at fixed pressure."],
    ],
    [
      "Use the ratio x2/x1.",
      "Pressure cancels.",
      "Take the inverse ratio of Henry constants.",
    ],
    [L`$x_2/x_1=K_{H,1}/K_{H,2}=4/5=0.80$, a 20% decrease.`],
  ),
  mc(
    "1.2",
    111,
    2,
    "Which situation is least suitable for treating gas uptake simply by Henry's law for physical dissolution?",
    "A gas reacting substantially with the solvent",
    [
      [
        "Low gas concentration",
        "Dilute gas solutions are the usual Henry-law regime.",
      ],
      ["Constant temperature", "A fixed temperature keeps KH defined."],
      [
        "Known gas partial pressure",
        "This is the pressure required by Henry's law.",
      ],
    ],
    [
      "Henry's law models dissolved gas at equilibrium.",
      "A reaction removes dissolved gas into new species.",
      "Physical dissolution is not chemical consumption.",
    ],
    [
      "Substantial chemical reaction changes the uptake mechanism; the simple physical-solubility relation alone is inadequate.",
    ],
  ),
  mc(
    "1.2",
    112,
    3,
    L`For an ideal binary liquid, $p_A^0=60$ and $p_B^0=100\,\mathrm{kPa}$. At which liquid mole fraction $x_A$ are the two partial pressures equal?`,
    L`$5/8$`,
    [
      [
        L`$1/2$`,
        "Equal liquid fractions do not give equal partial pressures when pure pressures differ.",
      ],
      [L`$3/8$`, "This is xB at equality."],
      [L`$5/3$`, "Mole fraction cannot exceed one."],
    ],
    [
      L`Set $x_Ap_A^0=(1-x_A)p_B^0$.`,
      "Use xB=1-xA.",
      "Solve a linear equation.",
    ],
    [L`$60x_A=100(1-x_A)$ gives $x_A=100/160=5/8$.`],
  ),
  mc(
    "1.2",
    113,
    2,
    L`An ideal binary solution has total vapour pressure $40\,\mathrm{kPa}$ at $x_A=0$ and $70\,\mathrm{kPa}$ at $x_A=1$. Its total pressure at $x_A=0.20$ is`,
    L`$46\,\mathrm{kPa}$`,
    [
      [
        L`$54\,\mathrm{kPa}$`,
        "This incorrectly weights A with mole fraction 0.8.",
      ],
      [L`$14\,\mathrm{kPa}$`, "This includes only A's partial pressure."],
      [
        L`$22\,\mathrm{kPa}$`,
        "The total pressure lies between the two pure-component pressures.",
      ],
    ],
    [
      "The endpoints give pure-component pressures.",
      "Total pressure varies linearly for ideal mixing.",
      "Move 20% of the way from 40 to 70.",
    ],
    [L`$p=40+(70-40)(0.20)=46\,\mathrm{kPa}$.`],
  ),
  mc(
    "1.2",
    114,
    2,
    "Liquids A and B form an ideal solution. Which statement is correct?",
    L`$\Delta H_{mix}=0$ and $\Delta V_{mix}=0$`,
    [
      [
        L`$\Delta H_{mix}<0$ and $\Delta V_{mix}<0$`,
        "These are commonly associated with stronger unlike interactions, not ideality.",
      ],
      [
        L`$\Delta H_{mix}>0$ and $\Delta V_{mix}>0$`,
        "These indicate non-ideal mixing.",
      ],
      [
        "A and B cannot mix spontaneously",
        "An entropy increase can favour mixing even when enthalpy change is zero.",
      ],
    ],
    [
      "Compare unlike and like interactions.",
      "Ideal mixing gives no net heat effect.",
      "It also produces no volume change.",
    ],
    [
      "Similar interactions give zero enthalpy and volume changes of mixing in the ideal-solution model.",
    ],
  ),
  mc(
    "1.2",
    115,
    2,
    "Ethanol and acetone can show positive deviation from Raoult's law because mixing",
    "disrupts ethanol's hydrogen-bond network and weakens average attractions",
    [
      [
        "necessarily creates stronger unlike attractions",
        "Stronger unlike attractions would favour negative deviation.",
      ],
      ["makes acetone non-volatile", "Both components are volatile."],
      [
        "increases ethanol's molar mass",
        "Mixing does not change ethanol's chemical molar mass.",
      ],
    ],
    [
      "Consider ethanol-ethanol hydrogen bonding.",
      "Compare it with unlike contacts after mixing.",
      "Weaker attraction increases escape tendency.",
    ],
    [
      "Disruption of strong ethanol interactions raises escaping tendency relative to the ideal prediction, giving positive deviation.",
    ],
  ),
  mc(
    "1.2",
    116,
    2,
    "At an azeotropic composition in a boiling binary mixture,",
    "the liquid and vapour have the same composition",
    [
      [
        "the liquids are necessarily immiscible",
        "Azeotropy is not defined by immiscibility.",
      ],
      [
        "the vapour contains only one component",
        "Both components can be present in the vapour.",
      ],
      [
        "the mixture obeys Raoult's law at every composition",
        "An azeotrope arises from non-ideal behaviour.",
      ],
    ],
    [
      "Think about why distillation stops enriching a component.",
      "Compare the boiling liquid and its vapour.",
      "At this composition there is no separation advantage.",
    ],
    [
      "Identical vapour and liquid compositions prevent ordinary fractional distillation from separating an azeotrope completely.",
    ],
  ),
  mc(
    "1.2",
    117,
    3,
    L`An ideal binary mixture has liquid mole fraction $x_A=0.40$ and equilibrium vapour mole fraction $y_A=0.60$. The ratio $p_A^0/p_B^0$ is`,
    L`$9/4$`,
    [
      [L`$3/2$`, "This is yA/xA; the B fractions must also be included."],
      [L`$4/9$`, "This is the inverse volatility ratio."],
      [L`$1$`, "Equal pure pressures would give yA=xA."],
    ],
    [
      "Take the ratio of partial pressures.",
      L`Use $y_A/y_B=x_Ap_A^0/(x_Bp_B^0)$.`,
      "Include both complementary fractions.",
    ],
    [L`$p_A^0/p_B^0=(0.60/0.40)(0.60/0.40)=9/4$.`],
  ),
  mc(
    "1.2",
    118,
    2,
    L`A pure solvent has vapour pressure $50\,\mathrm{kPa}$. An ideal solution of a non-volatile solute has solvent mole fraction $0.94$. Its vapour pressure is`,
    L`$47\,\mathrm{kPa}$`,
    [
      [
        L`$3\,\mathrm{kPa}$`,
        "This is the lowering, not the solution pressure.",
      ],
      [
        L`$53\,\mathrm{kPa}$`,
        "A non-volatile solute lowers solvent pressure in this model.",
      ],
      [
        L`$0.94\,\mathrm{kPa}$`,
        "Mole fraction must multiply the pure-solvent pressure.",
      ],
    ],
    [
      "Only solvent contributes vapour.",
      L`Apply $p=x_1p_1^0$.`,
      "Keep pressure distinct from pressure lowering.",
    ],
    [L`$p=0.94(50)=47\,\mathrm{kPa}$.`],
  ),
  mc(
    "1.2",
    119,
    2,
    "A diver ascends too rapidly after breathing compressed air at depth. The risk of gas bubbles in blood is associated with",
    "a rapid fall in pressure reducing dissolved gas solubility",
    [
      [
        "a rise in nitrogen solubility at lower pressure",
        "Henry's law predicts the opposite.",
      ],
      [
        "instantaneous conversion of nitrogen to oxygen",
        "This is not a chemical conversion.",
      ],
      [
        "complete cessation of molecular motion",
        "Dissolved gases remain in molecular motion.",
      ],
    ],
    [
      "Pressure was higher at depth.",
      "Consider dissolved nitrogen after pressure falls.",
      "Gas may leave solution as bubbles.",
    ],
    [
      "Rapid depressurisation lowers equilibrium gas solubility; dissolved nitrogen can form bubbles faster than it is safely eliminated.",
    ],
  ),
  mc(
    "1.2",
    120,
    2,
    L`An ideal solution contains three times as many moles of B as A. If $p_A^0=160$ and $p_B^0=80\,\mathrm{kPa}$, the total vapour pressure is`,
    L`$100\,\mathrm{kPa}$`,
    [
      [L`$120\,\mathrm{kPa}$`, "This assumes equal amounts."],
      [L`$140\,\mathrm{kPa}$`, "This reverses the mole fractions."],
      [
        L`$240\,\mathrm{kPa}$`,
        "Pure pressures must be weighted by mole fractions.",
      ],
    ],
    [
      "Let amounts be n and 3n.",
      "Find fractions 1/4 and 3/4.",
      "Add weighted pure pressures.",
    ],
    [L`$p=(1/4)(160)+(3/4)(80)=100\,\mathrm{kPa}$.`],
  ),
  w(
    "1.2",
    105,
    "vsaq",
    2,
    "Why does stirring a saturated solution with excess solid not permanently increase its equilibrium concentration at fixed temperature?",
    [
      [
        "Distinguish rate and equilibrium.",
        "Stirring can accelerate transport and the approach to equilibrium.",
        "At fixed temperature and composition, equilibrium solubility is unchanged; dissolution and crystallisation ultimately balance.",
      ],
    ],
    [
      "Stirring changes mixing rate.",
      "Ask what sets equilibrium solubility.",
      "Keep temperature fixed.",
    ],
    ["Equating faster dissolution with higher equilibrium solubility."],
  ),
  w(
    "1.2",
    106,
    "vsaq",
    2,
    "Explain why two liquids may mix completely without obeying Raoult's law over the entire composition range.",
    [
      [
        "Separate miscibility from ideality.",
        "Complete miscibility means a single liquid phase forms at all proportions.",
        "Ideality additionally requires suitable intermolecular interactions and Raoult-law behaviour; fully miscible liquids can show positive or negative deviations.",
      ],
    ],
    [
      "A phase statement is not a vapour-pressure law.",
      "Consider unlike versus like attractions.",
      "Use non-ideal miscible mixtures as counterexamples.",
    ],
    ["Calling every homogeneous mixture ideal."],
  ),
  w(
    "1.2",
    107,
    "vsaq",
    2,
    "A solution shows negative deviation from Raoult's law. Does this single observation prove it forms a maximum-boiling azeotrope?",
    [
      [
        "Give a qualified conclusion.",
        "No. Negative deviation alone does not establish an azeotrope; the deviation must produce an appropriate extremum in the boiling/composition relation.",
        "If such an azeotrope forms for negative deviation, it is maximum-boiling, with equal liquid and vapour compositions.",
      ],
    ],
    [
      "Distinguish a trend from existence of an extremum.",
      "An azeotrope needs equal liquid and vapour compositions.",
      "Qualify the boiling-type statement.",
    ],
    ["Claiming every non-ideal solution must form an azeotrope."],
  ),
  w(
    "1.2",
    108,
    "saq",
    3,
    L`A salt has solubilities $60$ and $25\,\mathrm{g}$ per $100\,\mathrm{g}$ water at two temperatures. A $320\,\mathrm{g}$ saturated solution at the higher temperature is cooled without water loss.`,
    [
      [
        "Find initial water mass, dissolved salt after cooling, and crystallised salt mass.",
        L`At high temperature solution:water mass ratio is $160:100$, giving $200\,\mathrm{g}$ water.`,
        L`At low temperature $25(200/100)=50\,\mathrm{g}$ salt remains dissolved.`,
        L`Initial salt is $120\,\mathrm{g}$, so $70\,\mathrm{g}$ crystallises.`,
      ],
    ],
    [
      "Convert hot solution mass into solvent mass.",
      "Keep water mass fixed.",
      "Subtract the remaining dissolved mass.",
    ],
    ["Scaling solubility using total solution mass."],
  ),
  w(
    "1.2",
    109,
    "saq",
    2,
    L`At fixed temperature, a gas has dissolved mole fraction $0.002$ at partial pressure $60\,\mathrm{kPa}$.`,
    [
      [
        "Calculate KH, then the partial pressure required for mole fraction 0.005. State one condition needed for using the same constant.",
        L`$K_H=60/0.002=30000\,\mathrm{kPa}$.`,
        L`Required pressure $=30000(0.005)=150\,\mathrm{kPa}$.`,
        "Temperature and solvent must remain the same, with the gas still in the dilute Henry-law regime.",
      ],
    ],
    [
      "Rearrange p=KHx.",
      "KH carries pressure units.",
      "A constant belongs to a specified gas-solvent-temperature system.",
    ],
    ["Assigning units to the mole fraction."],
  ),
  w(
    "1.2",
    110,
    "saq",
    3,
    L`For an ideal binary liquid, $p_A^0=150$ and $p_B^0=50\,\mathrm{kPa}$. The measured total pressure is $90\,\mathrm{kPa}$.`,
    [
      [
        "Find liquid xA, partial pressure of A, and vapour yA.",
        L`$90=50+100x_A$, hence $x_A=0.40$.`,
        L`$p_A=0.40(150)=60\,\mathrm{kPa}$.`,
        L`$y_A=60/90=2/3$.`,
      ],
    ],
    [
      "Recover liquid composition from total pressure.",
      "Then calculate A's partial pressure.",
      "Use Dalton's law for vapour composition.",
    ],
    ["Using xA as the vapour fraction directly."],
  ),
  w(
    "1.2",
    111,
    "saq",
    3,
    L`A binary solution has $x_A=0.30$, $p_A^0=80$ and $p_B^0=40\,\mathrm{kPa}$. Its measured pressure is $60\,\mathrm{kPa}$.`,
    [
      [
        "Calculate the ideal pressure, identify deviation and explain its interaction basis.",
        L`Ideal pressure $=0.30(80)+0.70(40)=52\,\mathrm{kPa}$.`,
        "Observed pressure is higher, indicating positive deviation.",
        "Unlike interactions are weaker on average, so molecules escape more readily than predicted by ideal mixing.",
      ],
    ],
    [
      "First obtain the ideal reference.",
      "Compare observed pressure with that reference.",
      "Relate volatility to attraction strength.",
    ],
    ["Comparing the mixture only with pure A instead of the ideal mixture."],
  ),
  w(
    "1.2",
    112,
    "saq",
    2,
    "State what happens to an ideal binary solution's total vapour pressure when its composition is varied if both pure liquids have equal vapour pressures. Explain the vapour composition.",
    [
      [
        "Give the relation and conclusions.",
        L`$p=x_Ap^0+(1-x_A)p^0=p^0$.`,
        "Total vapour pressure is independent of composition at that temperature.",
        L`$y_A=x_Ap^0/p^0=x_A$, so vapour and liquid compositions match in this special ideal case.`,
      ],
    ],
    [
      "Substitute equal pure pressures into Raoult's law.",
      "Use xA+xB=1.",
      "Calculate yA from partial pressure.",
    ],
    ["Calling this a deviation-driven isolated azeotrope."],
  ),
  w(
    "1.2",
    113,
    "saq",
    3,
    L`A gas mixture contains $25\%$ gas A. At $400\,\mathrm{kPa}$ total pressure the dissolved mole fraction of A is $0.001$. The solvent and temperature are fixed.`,
    [
      [
        "Find A's partial pressure, KH and dissolved mole fraction if A's gas fraction falls to 10% at the same total pressure.",
        L`$p_A=0.25(400)=100\,\mathrm{kPa}$.`,
        L`$K_H=100/0.001=10^5\,\mathrm{kPa}$.`,
        L`New $p_A=40\,\mathrm{kPa}$, so $x_A=4.0\times10^{-4}$.`,
      ],
    ],
    [
      "Use gas composition to get partial pressure.",
      "Determine KH once.",
      "Only partial pressure changes in the second state.",
    ],
    ["Assuming unchanged total pressure guarantees unchanged solubility."],
  ),
  w(
    "1.2",
    114,
    "saq",
    3,
    L`A non-volatile non-electrolyte forms an ideal solution with solvent vapour pressure $72\,\mathrm{kPa}$, compared with $80\,\mathrm{kPa}$ for pure solvent. The solution contains $4.5\,\mathrm{mol}$ solvent.`,
    [
      [
        "Find solvent mole fraction, solute mole fraction and solute amount.",
        L`$x_1=72/80=0.90$.`,
        L`$x_2=1-0.90=0.10$.`,
        L`$n_2/(4.5+n_2)=0.10$ gives $n_2=0.50\,\mathrm{mol}$.`,
      ],
    ],
    [
      "Use the pressure ratio for solvent fraction.",
      "Fractions sum to one.",
      "Include solute in the total amount.",
    ],
    ["Using 0.10 times solvent moles as an exact result."],
  ),
  w(
    "1.2",
    115,
    "laq",
    3,
    L`An ideal solution contains $1\,\mathrm{mol}$ A and $4\,\mathrm{mol}$ B. Their pure vapour pressures are $200$ and $50\,\mathrm{kPa}$. Then $5\,\mathrm{mol}$ additional A is mixed in at the same temperature.`,
    [
      [
        "Calculate the original total pressure and vapour mole fraction of A.",
        L`Original $x_A=1/5$, so $p_A=40$, $p_B=40\,\mathrm{kPa}$.`,
        L`Total $p=80\,\mathrm{kPa}$ and $y_A=0.50$.`,
      ],
      [
        "Calculate new liquid composition, total pressure and vapour composition.",
        L`New $x_A=6/10=0.60$, $x_B=0.40$.`,
        L`$p=0.60(200)+0.40(50)=140\,\mathrm{kPa}$.`,
        L`$y_A=120/140=6/7$.`,
      ],
    ],
    [
      "Compute both states independently.",
      "Only the amount of A changes.",
      "Distinguish mole fractions in the two phases.",
    ],
    ["Keeping the original total mole count after adding A."],
  ),
  w(
    "1.2",
    116,
    "laq",
    3,
    L`At constant temperature, a gas with $K_H=50000\,\mathrm{kPa}$ is above a dilute solution containing approximately $10\,\mathrm{mol}$ solvent. Its partial pressure is $100\,\mathrm{kPa}$. After equilibration, pressure is reduced to $25\,\mathrm{kPa}$. Treat dissolved amounts as small compared with solvent amount.`,
    [
      [
        "Estimate dissolved gas amounts before and after the pressure reduction and the amount released.",
        L`Initial $x=100/50000=0.002$.`,
        L`Initially $n_{gas}\approx0.002(10)=0.020\,\mathrm{mol}$.`,
        L`Finally $x=25/50000=0.0005$ and $n_{gas}\approx0.0050\,\mathrm{mol}$.`,
        L`Approximately $0.015\,\mathrm{mol}$ gas is released.`,
      ],
      [
        "Explain why this is an approximation.",
        "The exact mole-fraction denominator includes dissolved gas as well as solvent; here gas moles were neglected in the denominator.",
      ],
    ],
    [
      "Use Henry's law at each pressure.",
      "Multiply by solvent amount in the dilute approximation.",
      "Subtract final dissolved amount from initial.",
    ],
    ["Treating approximate solute/solvent mole ratio as exact mole fraction."],
  ),
  w(
    "1.2",
    117,
    "laq",
    3,
    L`An ideal liquid mixture contains components with $p_A^0=120$ and $p_B^0=30\,\mathrm{kPa}$. Its equilibrium vapour is equimolar.`,
    [
      [
        "Determine the liquid composition and total pressure, and identify which phase is richer in A.",
        L`Equimolar vapour means $p_A=p_B$.`,
        L`$120x_A=30(1-x_A)$.`,
        L`$x_A=0.20$ and $x_B=0.80$.`,
        L`Each partial pressure is $24\,\mathrm{kPa}$, so total pressure is $48\,\mathrm{kPa}$.`,
        "Vapour is richer in A: its fraction is 0.50 compared with 0.20 in the liquid, consistent with A's greater volatility.",
      ],
    ],
    [
      "Equal vapour amounts mean equal partial pressures.",
      "They do not mean equal liquid amounts.",
      "Use both Raoult-law expressions.",
    ],
    ["Starting with xA=0.50."],
  ),
  w(
    "1.2",
    118,
    "case",
    3,
    L`A solid has solubility $40\,\mathrm{g}$ per $100\,\mathrm{g}$ water at $T_1$ and $25\,\mathrm{g}$ at $T_2<T_1$. A student cools a saturated solution containing $200\,\mathrm{g}$ water. No solvent evaporates.`,
    [
      [
        "Find the initially dissolved mass and mass crystallised.",
        L`Initially $80\,\mathrm{g}$ is dissolved.`,
        L`At $T_2$, $50\,\mathrm{g}$ remains dissolved, so $30\,\mathrm{g}$ crystallises.`,
      ],
      [
        "How much extra water at T2 would be needed to redissolve all crystals?",
        "At T2, 80 g solute needs 320 g water, so add 120 g water.",
        "The resulting solution is just saturated; adding still more water makes it unsaturated.",
      ],
    ],
    [
      "Keep water mass constant during cooling.",
      "Use the lower-temperature solubility for redissolution.",
      "Find required total water before subtracting existing water.",
    ],
    ["Using the higher-temperature solubility for the final state."],
  ),
  w(
    "1.2",
    119,
    "case",
    3,
    L`At the same temperature, pure A and B have vapour pressures $100$ and $60\,\mathrm{kPa}$. Three equimolar mixtures are recorded: P has pressure 80, Q has 90, and R has $70\,\mathrm{kPa}$.`,
    [
      [
        "Classify the pressure behaviour of P, Q and R at this composition.",
        "The ideal reference is 80 kPa. P agrees with it, Q shows positive deviation, and R negative deviation.",
        "Agreement at one composition alone does not establish ideality over the entire range.",
      ],
      [
        "Compare the unlike interactions inferred for Q and R.",
        "Q has weaker effective unlike attractions than the ideal comparison, favouring escape.",
        "R has stronger effective unlike attractions, reducing escape.",
      ],
    ],
    [
      "Calculate the ideal reference.",
      "Compare each measurement with it.",
      "Avoid extrapolating one measurement to all compositions.",
    ],
    ["Declaring P ideal at every composition from one datum."],
  ),
  w(
    "1.2",
    120,
    "case",
    3,
    "A binary mixture forms a minimum-boiling azeotrope. A student repeatedly distils a sample at the azeotropic composition at fixed pressure.",
    [
      [
        "Explain why repeated ordinary distillation does not separate it into pure components.",
        "At the azeotropic composition, equilibrium vapour has the same composition as liquid.",
        "Condensing that vapour therefore reproduces the same mixture instead of enriching a component.",
      ],
      [
        "State the deviation type and compare its boiling temperature with the pure components.",
        "It is associated with sufficiently strong positive deviation from Raoult's law.",
        "The azeotrope boils below both pure components at the same pressure.",
      ],
    ],
    [
      "Compare vapour and liquid compositions.",
      "Consider the result of condensing unchanged vapour composition.",
      "A pressure maximum corresponds to a boiling minimum.",
    ],
    ["Assuming additional distillation stages always separate every mixture."],
  ),
];
