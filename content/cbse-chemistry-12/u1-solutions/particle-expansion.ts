import { chapterPractice } from "../chapter-practice";
const { mc, written: w } = chapterPractice("u1-solutions");
const L = String.raw;
export const particleExpansion = [
  mc(
    "1.5",
    105,
    2,
    L`Under complete dissociation, one formula unit of $\mathrm{Al_2(SO_4)_3}$ gives a van't Hoff factor of`,
    L`$5$`,
    [
      [L`$2$`, "This counts only aluminium ions."],
      [L`$3$`, "This counts only sulphate ions."],
      [
        L`$12$`,
        "Count independently moving ions, not individual oxygen atoms.",
      ],
    ],
    [
      "Write the dissociation into ions.",
      "Keep each polyatomic ion intact.",
      "Add the ion coefficients.",
    ],
    [
      L`$\mathrm{Al_2(SO_4)_3\rightarrow2Al^{3+}+3SO_4^{2-}}$ produces five ions, so the ideal limiting factor is 5.`,
    ],
  ),
  mc(
    "1.5",
    106,
    3,
    L`A binary electrolyte has effective $i=1.4$ before dilution and $i=1.8$ afterwards. Its formula-unit molality halves. The ratio of final to initial freezing depression is`,
    L`$9/14$`,
    [
      [L`$1/2$`, "This ignores the increase in i."],
      [L`$9/7$`, "This includes only the i ratio and omits dilution."],
      [L`$14/9$`, "This inverts the required ratio."],
    ],
    [
      L`Compare $i_2m_2$ with $i_1m_1$.`,
      "The solvent constant cancels.",
      "Use both the dilution and factor change.",
    ],
    [L`Ratio $=(1.8/1.4)(1/2)=9/14$.`],
  ),
  mc(
    "1.5",
    107,
    2,
    L`A solute has apparent molar mass $90\,\mathrm{g\,mol^{-1}}$ in water and $360\,\mathrm{g\,mol^{-1}}$ in another solvent. Its true molar mass is $180\,\mathrm{g\,mol^{-1}}$. The two effective i values are`,
    "2 and 0.5",
    [
      ["0.5 and 2", "This reverses true/apparent mass."],
      [
        "2 and 2",
        "The second measurement indicates fewer particles, not more.",
      ],
      ["1 and 1", "Both apparent masses differ from the true mass."],
    ],
    [
      L`Use $i=M_{true}/M_{apparent}$.`,
      "Evaluate separately in each solvent.",
      "Do not assume identical molecular behaviour in different solvents.",
    ],
    [L`$i_{water}=180/90=2$ and $i_{other}=180/360=0.5$.`],
  ),
  mc(
    "1.5",
    108,
    2,
    "Which observation is consistent with association, rather than dissociation, of a molecular solute?",
    "Smaller colligative effect and larger apparent molar mass than the monomer prediction",
    [
      [
        "Larger effect and smaller apparent mass",
        "This is the particle-multiplication pattern.",
      ],
      [
        "Larger effect and larger apparent mass",
        "Effect and apparent mass vary inversely.",
      ],
      [
        "Smaller effect and smaller apparent mass",
        "A smaller effect implies fewer apparent moles and hence larger apparent mass.",
      ],
    ],
    [
      "Association merges particles.",
      "Fewer particles produce a smaller effect.",
      "With fixed mass, fewer inferred moles means a larger inferred molar mass.",
    ],
    [
      "Association lowers effective particle number: i<1, so the measured effect is reduced and apparent molar mass is increased.",
    ],
  ),
  mc(
    "1.5",
    109,
    2,
    L`A solute dissociates only into two ions. A calculated degree of dissociation is $1.20$. The most justified response is to`,
    "reject the result as incompatible with the stated model and recheck data or assumptions",
    [
      [
        "accept 120% dissociation",
        "A fraction of original units cannot exceed one.",
      ],
      [
        "replace it with 100% without explanation",
        "That conceals an inconsistency rather than resolving it.",
      ],
      [
        "call it dimerisation",
        "Dimerisation lowers i and does not justify a dissociation fraction above one.",
      ],
    ],
    [
      "A degree is a fraction of the initial units.",
      "Its allowable range is 0 to 1.",
      "A result outside it tests the model or inputs.",
    ],
    [
      L`For a binary electrolyte, $1\leq i\leq2$ in the simple model. A dissociation fraction $\alpha=1.20$ would imply $i=2.20$, outside that range.`,
    ],
  ),
  mc(
    "1.5",
    110,
    2,
    L`A solute forms only trimers. Complete association gives van't Hoff factor`,
    L`$1/3$`,
    [
      [
        L`$3$`,
        "Association reduces particle count; it does not produce three particles per unit.",
      ],
      [L`$1/2$`, "That is complete dimerisation."],
      [L`$0$`, "Trimers still count as dissolved particles."],
    ],
    [
      "Start with three monomer units.",
      "They become one independently moving trimer.",
      "Compare final particles to original units.",
    ],
    ["Three units form one particle, so complete trimerisation gives i=1/3."],
  ),
  mc(
    "1.5",
    111,
    3,
    L`For a solute associating into n-mers with association fraction $\alpha$, the simple particle-count expression for i is`,
    L`$1-\alpha+\alpha/n$`,
    [
      [
        L`$1+(n-1)\alpha$`,
        "This is the dissociation expression for n particles.",
      ],
      [L`$1-\alpha$`, "This omits the associated clusters."],
      [L`$\alpha/n$`, "This omits the unassociated monomers."],
    ],
    [
      "Keep the unassociated fraction.",
      "Divide associated units by cluster size.",
      "Add both particle populations.",
    ],
    [
      L`One initial mole leaves $1-\alpha$ mol monomers and $\alpha/n$ mol clusters, giving $i=1-\alpha+\alpha/n$.`,
    ],
  ),
  mc(
    "1.5",
    112,
    2,
    L`A salt yields three ions on complete dissociation. In $0.020\,\mathrm{mol}$ of the salt, $0.012\,\mathrm{mol}$ formula units dissociate. The total amount of solute particles is`,
    L`$0.044\,\mathrm{mol}$`,
    [
      [
        L`$0.036\,\mathrm{mol}$`,
        "This counts ions but omits undissociated formula units.",
      ],
      [
        L`$0.060\,\mathrm{mol}$`,
        "This assumes every formula unit dissociates.",
      ],
      [
        L`$0.032\,\mathrm{mol}$`,
        "Each dissociated unit contributes three particles.",
      ],
    ],
    [
      "Find the undissociated amount.",
      "Multiply dissociated amount by ion count.",
      "Add both contributions.",
    ],
    [L`Particles $=(0.020-0.012)+3(0.012)=0.044\,\mathrm{mol}$.`],
  ),
  mc(
    "1.5",
    113,
    3,
    L`A dilute aqueous mixture contains $0.10\,\mathrm{mol}$ urea and $0.05\,\mathrm{mol}\ \mathrm{NaCl}$ in $1.0\,\mathrm{kg}$ water. With full salt dissociation and $K_f=1.86$, its freezing depression is`,
    L`$0.372\,\mathrm{K}$`,
    [
      [L`$0.279\,\mathrm{K}$`, "This treats NaCl as undissociated."],
      [L`$0.558\,\mathrm{K}$`, "This incorrectly assigns i=2 to urea as well."],
      [L`$0.186\,\mathrm{K}$`, "This omits one solute contribution."],
    ],
    [
      "Count urea molecules and salt ions separately.",
      "Sum effective particle amounts.",
      "Divide by the common solvent mass.",
    ],
    [
      L`Particle molality $=0.10+2(0.05)=0.20$; depression $=1.86(0.20)=0.372\,\mathrm{K}$.`,
    ],
  ),
  mc(
    "1.5",
    114,
    2,
    "Real electrolyte solutions can have measured i below the ideal complete-ion-count value because",
    "interionic interactions and ion pairing can reduce the effective colligative particle response",
    [
      [
        "ionic charge must be counted as extra particles",
        "Charge magnitude does not multiply particle number.",
      ],
      [
        "the solvent's molar mass must always increase",
        "This is not the explanation for the effective response.",
      ],
      [
        "every electrolyte is necessarily a non-electrolyte",
        "Measured non-ideality does not make the dissolved substance molecular in every respect.",
      ],
    ],
    [
      "Separate the ideal ion-count model from real behaviour.",
      "Oppositely charged ions interact.",
      "Measured i is an effective experimental factor.",
    ],
    [
      "Ion interactions cause departures from ideal independent-particle behaviour; measured i need not equal the stoichiometric ion count.",
    ],
  ),
  mc(
    "1.5",
    115,
    2,
    L`A salt produces $\nu$ ions per dissociated unit. Its degree of dissociation is $0.50$ and measured $i=2.0$. Under the simple model, $\nu$ equals`,
    L`$3$`,
    [
      [L`$2$`, "With half dissociation, two ions would give i=1.5."],
      [L`$4$`, "That would give i=2.5."],
      [L`$1$`, "One particle per unit cannot raise i above one."],
    ],
    [
      L`Use $i=1+(\nu-1)\alpha$.`,
      "Insert i and alpha.",
      "Solve for the integer ion count.",
    ],
    [L`$2=1+0.5(\nu-1)$ gives $\nu=3$.`],
  ),
  mc(
    "1.5",
    116,
    2,
    L`A weak acid is $20\%$ dissociated into two ions. Compared with an undissociated solution of the same formula-unit molality, its apparent molar mass is`,
    L`$5/6$ of the true molar mass`,
    [
      [
        L`$6/5$ of the true molar mass`,
        "This multiplies by i instead of dividing.",
      ],
      [
        L`$1/5$ of the true molar mass`,
        "The dissociation fraction is not the van't Hoff factor.",
      ],
      [
        "equal to the true molar mass",
        "Dissociation changes the effective particle count.",
      ],
    ],
    [
      L`Calculate $i=1+\alpha$.`,
      "Use apparent mass=true mass/i.",
      "Convert the ratio to a fraction.",
    ],
    [L`$i=1.20$, so $M_{apparent}/M_{true}=1/1.20=5/6$.`],
  ),
  mc(
    "1.5",
    117,
    3,
    L`A solute forms only dimers. The numbers of dimers and remaining monomers are equal. The fraction of original monomer units associated is`,
    L`$2/3$`,
    [
      [
        L`$1/2$`,
        "Equal numbers of particles do not mean equal numbers of original units; each dimer uses two.",
      ],
      [L`$1/3$`, "That is the unassociated fraction."],
      [L`$1$`, "Some monomers remain by the stated condition."],
    ],
    [
      "Let each final particle population be N.",
      "Count original units in dimers and monomers.",
      "Associated fraction uses original units.",
    ],
    [
      L`Dimers contain $2N$ units and monomers $N$ units, so $\alpha=2N/(3N)=2/3$.`,
    ],
  ),
  mc(
    "1.5",
    118,
    2,
    L`A solution contains a fully dissociated salt with $i=3$. What formula-unit molality gives the same freezing depression as $0.12\,\mathrm{m}$ urea in the same solvent?`,
    L`$0.040\,\mathrm{m}$`,
    [
      [
        L`$0.36\,\mathrm{m}$`,
        "The salt needs fewer formula units because each yields more particles.",
      ],
      [L`$0.12\,\mathrm{m}$`, "That would triple the depression."],
      [L`$0.060\,\mathrm{m}$`, "This assumes i=2 rather than 3."],
    ],
    [
      "Match effective particle molality.",
      "Urea has i=1.",
      "Divide the urea molality by the salt factor.",
    ],
    [L`$3m=0.12$ gives $m=0.040\,\mathrm{m}$.`],
  ),
  mc(
    "1.5",
    119,
    2,
    "An observed i of 1.5 alone is insufficient to determine a degree of dissociation because",
    "the number of particles produced per dissociated formula unit must also be known",
    [
      [
        "i has no connection to particle count",
        "Its definition directly compares effective particle counts or effects.",
      ],
      [
        "the solute mass must be zero",
        "A measurable solution contains solute.",
      ],
      [
        "every solute with i=1.5 must form three ions",
        "Two ions at 50% and three ions at 25% both give i=1.5 in the simple model.",
      ],
    ],
    [
      L`Inspect $i=1+(\nu-1)\alpha$.`,
      "One measurement leaves nu unspecified.",
      "Different ion counts can give the same i.",
    ],
    [
      "The same effective factor can arise from different degrees for different dissociation stoichiometries; nu must be specified.",
    ],
  ),
  mc(
    "1.5",
    120,
    2,
    L`One mole of a solute partly dimerises. The solution contains $0.20\,\mathrm{mol}$ dimers. The effective van't Hoff factor is`,
    L`$0.80$`,
    [
      [
        L`$0.90$`,
        "0.20 mol dimers consume 0.40 mol monomer units, not 0.20 mol.",
      ],
      [L`$0.60$`, "This counts surviving monomers only."],
      [L`$1.20$`, "Association decreases the number of particles."],
    ],
    [
      "Each dimer consumes two original units.",
      "Find remaining monomers.",
      "Add monomers and dimers.",
    ],
    [
      L`Monomers left $=1-2(0.20)=0.60\,\mathrm{mol}$; total particles $=0.60+0.20=0.80\,\mathrm{mol}$, giving $i=0.80$.`,
    ],
  ),
  w(
    "1.5",
    105,
    "vsaq",
    2,
    "Why is the stoichiometric ion count only an ideal limiting prediction for i in an electrolyte solution?",
    [
      [
        "State the assumption and its limitation.",
        "The ion-count prediction assumes complete dissociation and independently behaving particles.",
        "Finite-concentration interionic interactions or pairing can change the effective colligative response, so measured i may differ.",
      ],
    ],
    [
      "Recall what complete dissociation counts.",
      "Real ions attract and repel.",
      "An experimental i is an effective factor.",
    ],
    [
      "Reporting every measured i as an exact chemical dissociation fraction without a model.",
    ],
  ),
  w(
    "1.5",
    106,
    "vsaq",
    2,
    "A carboxylic acid has a larger apparent molar mass in a non-polar solvent than in a solvent where it stays monomeric. Explain without claiming its molecular formula has changed.",
    [
      [
        "Relate association to the experimental inference.",
        "Intermolecular association, such as hydrogen-bonded dimers, reduces the number of independently moving solute particles.",
        "The smaller colligative effect is interpreted as fewer moles for the same mass, giving a larger apparent molar mass; the monomer's molecular formula need not change.",
      ],
    ],
    [
      "The measurement counts particles indirectly.",
      "Association combines molecules into clusters.",
      "Distinguish apparent particle mass from monomer formula mass.",
    ],
    ["Calling a colligative apparent mass a new elemental composition."],
  ),
  w(
    "1.5",
    107,
    "vsaq",
    2,
    "Two equal-molal solutions of different salts show the same freezing depression in the same solvent. Must their degrees of dissociation be equal?",
    [
      [
        "State the inference and limitation.",
        "Equal effects imply equal effective i values under the same conditions.",
        L`Degrees need not be equal because $i=1+(\nu-1)\alpha$ also depends on the ion count $\nu$ for each salt.`,
      ],
    ],
    [
      "Cancel the common Kf and molality.",
      "Equal i is not necessarily equal alpha.",
      "Compare salts with different ion counts.",
    ],
    ["Ignoring dissociation stoichiometry."],
  ),
  w(
    "1.5",
    108,
    "saq",
    2,
    L`A salt yields four ions per formula unit and is $40\%$ dissociated in a $0.050\,\mathrm{m}$ aqueous solution. Use $K_f=1.86$.`,
    [
      [
        "Find i, effective particle molality and freezing depression.",
        L`$i=1+3(0.40)=2.20$.`,
        L`Particle molality $=2.20(0.050)=0.110\,\mathrm{m}$.`,
        L`$\Delta T_f=1.86(0.110)=0.2046\,\mathrm{K}$.`,
      ],
    ],
    [
      "Four ions create three extra particles per dissociated unit.",
      "Multiply formula-unit molality by i.",
      "Use Kf for the final temperature change.",
    ],
    ["Using i=4 for incomplete dissociation."],
  ),
  w(
    "1.5",
    109,
    "saq",
    3,
    L`A solute has true molar mass $200\,\mathrm{g\,mol^{-1}}$ and apparent mass $250\,\mathrm{g\,mol^{-1}}$ in a solvent. Assume only dimerisation.`,
    [
      [
        "Find i, the association fraction and moles of dimers formed from one initial mole.",
        L`$i=200/250=0.80$.`,
        L`$\alpha=2(1-0.80)=0.40$.`,
        L`Dimers formed $=\alpha/2=0.20\,\mathrm{mol}$.`,
      ],
    ],
    [
      "Use true/apparent mass.",
      "Apply the dimer relation.",
      "Two original units make each dimer.",
    ],
    ["Equating alpha with moles of dimers directly."],
  ),
  w(
    "1.5",
    110,
    "saq",
    3,
    L`A solute forms trimers only. If $75\%$ of its original units associate, calculate i and apparent molar mass for true molar mass $90\,\mathrm{g\,mol^{-1}}$.`,
    [
      [
        "Show the particle count and mass inference.",
        L`One initial mole leaves $0.25\,\mathrm{mol}$ monomers and makes $0.75/3=0.25\,\mathrm{mol}$ trimers.`,
        L`Thus $i=0.25+0.25=0.50$.`,
        L`$M_{apparent}=90/0.50=180\,\mathrm{g\,mol^{-1}}$.`,
      ],
    ],
    [
      "Count surviving units and clusters separately.",
      "Cluster size is three, not two.",
      "Divide true molar mass by i.",
    ],
    ["Applying the dimer formula to trimers."],
  ),
  w(
    "1.5",
    111,
    "saq",
    3,
    L`A $0.10\,\mathrm{m}$ solution of a binary electrolyte has boiling elevation $0.078\,\mathrm{K}$. The solvent has $K_b=0.52$.`,
    [
      [
        "Find i, dissociation fraction and the factor by which apparent molar mass differs from true mass.",
        L`$i=0.078/(0.52(0.10))=1.50$.`,
        L`For two ions, $\alpha=i-1=0.50$.`,
        L`$M_{apparent}/M_{true}=1/1.50=2/3$.`,
      ],
    ],
    [
      "Compare with the undissociated elevation.",
      "Use the specified two-ion stoichiometry.",
      "The apparent mass ratio is reciprocal to i.",
    ],
    ["Treating i itself as the dissociation fraction."],
  ),
  w(
    "1.5",
    112,
    "saq",
    3,
    L`An electrolyte at formula-unit concentration $0.020\,\mathrm{M}$ is isotonic with $0.050\,\mathrm{M}$ glucose at the same temperature. It yields three ions per dissociated unit.`,
    [
      [
        "Calculate i and alpha, and identify whether complete dissociation has occurred.",
        L`$i(0.020)=0.050$ gives $i=2.50$.`,
        L`$\alpha=(2.50-1)/2=0.75$.`,
        "Dissociation is 75%, not complete; complete dissociation would give i=3 under this model.",
      ],
    ],
    [
      "Match effective particle concentrations.",
      "Convert i into alpha using three-ion stoichiometry.",
      "Compare alpha with unity.",
    ],
    ["Calling every i greater than two complete dissociation."],
  ),
  w(
    "1.5",
    113,
    "saq",
    2,
    L`A weak binary electrolyte has $i=1.10$ at one concentration and $i=1.30$ at a lower concentration. Assume the simple dissociation model applies.`,
    [
      [
        "Find both degrees of dissociation and explain why the second osmotic pressure cannot be ranked without concentration data.",
        "Degrees are 0.10 and 0.30, respectively.",
        "The more dilute solution has a larger dissociated fraction.",
        L`Osmotic pressure depends on $icRT$, so increased $i$ competes with decreased concentration; the actual concentrations and temperature are needed.`,
      ],
    ],
    [
      L`Use $\alpha=i-1$.`,
      "Do not confuse a fraction with a total amount.",
      "Pressure includes concentration as well as i.",
    ],
    [
      "Concluding higher i always means higher osmotic pressure for any two solutions.",
    ],
  ),
  w(
    "1.5",
    114,
    "saq",
    3,
    L`A sample initially contains $0.060\,\mathrm{mol}$ monomer units. After dimerisation it contains $0.045\,\mathrm{mol}$ total solute particles.`,
    [
      [
        "Find i, association fraction and dimer amount.",
        L`$i=0.045/0.060=0.75$.`,
        L`$\alpha=2(1-0.75)=0.50$.`,
        L`Dimer amount $=0.060(0.50)/2=0.015\,\mathrm{mol}$.`,
      ],
    ],
    [
      "Use final particles per initial unit.",
      "Apply the dimer relation.",
      "Account for two units per cluster.",
    ],
    ["Calling the entire final particle amount dimers."],
  ),
  w(
    "1.5",
    115,
    "laq",
    4,
    L`A $6.0\,\mathrm{g}$ mixture contains a fully dissociated salt $\mathrm{AB_2}$ ($M=100$) and a non-electrolyte ($M=50\,\mathrm{g\,mol^{-1}}$). In $500\,\mathrm{g}$ solvent its freezing depression is $0.56\,\mathrm{K}$. Take $K_f=2.0$ and ideal independent-particle behaviour.`,
    [
      [
        "Determine the mass of each component, accounting for dissociation.",
        L`Effective particle molality $=0.56/2.0=0.28\,\mathrm{m}$.`,
        L`Total particle amount $=0.28(0.500)=0.14\,\mathrm{mol}$.`,
        L`If salt mass is $a$ grams, particle balance is $3a/100+(6-a)/50=0.14$.`,
        L`Multiplying by 100 gives $3a+12-2a=14$, so salt mass is $2.0\,\mathrm{g}$.`,
        L`Non-electrolyte mass is $4.0\,\mathrm{g}$; particles $3(2/100)+4/50=0.14\,\mathrm{mol}$ verify the answer.`,
      ],
    ],
    [
      "Convert the measured effect to total particle amount.",
      "The salt contributes three times its formula-unit amount.",
      "Combine the mass balance and particle balance.",
    ],
    ["Treating both components as one-particle solutes."],
  ),
  w(
    "1.5",
    116,
    "laq",
    3,
    L`A solute of true molar mass $160\,\mathrm{g\,mol^{-1}}$ is studied in two solvents. It is monomeric in S and partly dimerised in T. Equal sample masses in equal solvent masses give measured $\Delta T_f/K_f$ values $0.20$ in S and $0.14$ in T.`,
    [
      [
        "Determine i in T, association fraction, apparent molar mass in T, and explain why comparing raw depressions alone would be inadequate.",
        "Dividing by each solvent's Kf removes the differing solvent response constants.",
        L`Equal formula-unit molalities give $i_T=0.14/0.20=0.70$.`,
        L`$\alpha=2(1-0.70)=0.60$.`,
        L`$M_{apparent,T}=160/0.70=1600/7\,\mathrm{g\,mol^{-1}}$.`,
        "Raw depressions depend on both particle molality and the solvent-specific Kf, so their ratio alone need not equal the factor ratio.",
      ],
    ],
    [
      "Use normalised effects rather than raw temperature changes.",
      "The monomeric sample supplies the reference.",
      "Apply the dimer particle relation.",
    ],
    ["Ignoring different solvent constants."],
  ),
  w(
    "1.5",
    117,
    "laq",
    4,
    L`A mixture contains $0.020\,\mathrm{mol}$ of a fully dissociated binary electrolyte and $0.040\,\mathrm{mol}$ of a solute that partly dimerises. There are $0.50\,\mathrm{kg}$ solvent. The freezing depression is $0.248\,\mathrm{K}$ with $K_f=1.86$. Assume the two solutes do not react and their particle contributions add.`,
    [
      [
        "Find total particle amount, the associating solute's i and its association fraction.",
        L`Particle molality $=0.248/1.86=2/15\,\mathrm{mol\,kg^{-1}}$.`,
        L`Total particle amount $=(2/15)(0.50)=1/15\,\mathrm{mol}$.`,
        L`Electrolyte contributes $0.040\,\mathrm{mol}$ particles; remaining contribution is $1/15-0.040=2/75\,\mathrm{mol}$.`,
        L`Associating solute has $i=(2/75)/0.040=2/3$.`,
        L`Dimerisation fraction $\alpha=2(1-2/3)=2/3$.`,
      ],
    ],
    [
      "Extract total effective particle amount.",
      "Subtract the known electrolyte contribution.",
      "Only then calculate the molecular solute's i.",
    ],
    ["Applying one common i to chemically different solutes."],
  ),
  w(
    "1.5",
    118,
    "case",
    3,
    "A lab obtains effective i values 1.5 for P and 0.75 for Q. P is known to yield either two or three ions on dissociation, but its formula is not supplied. Q forms only dimers.",
    [
      [
        "Find the two possible dissociation fractions for P.",
        L`If P yields two ions, $\alpha=(1.5-1)/(2-1)=0.50$.`,
        L`If P yields three ions, $\alpha=(1.5-1)/(3-1)=0.25$.`,
      ],
      [
        "Find Q's association fraction and state what extra information is needed for a unique P answer.",
        L`For Q, $\alpha=2(1-0.75)=0.50$.`,
        "P's dissociation stoichiometry, or equivalently its ion count per unit, must be known.",
      ],
    ],
    [
      "One i value can fit multiple dissociation models.",
      "Q's model is specified.",
      "State the missing information instead of guessing.",
    ],
    ["Assuming every electrolyte is binary."],
  ),
  w(
    "1.5",
    119,
    "case",
    3,
    L`A monomer of molar mass $100\,\mathrm{g\,mol^{-1}}$ shows apparent mass $125\,\mathrm{g\,mol^{-1}}$ in one solvent. A student attributes the result to dissociation into two particles.`,
    [
      [
        "Calculate i and evaluate the student's explanation.",
        L`$i=100/125=0.80$.`,
        L`Two-particle dissociation would require $i\geq1$, so it cannot explain this result within the simple model.`,
      ],
      [
        "If dimerisation is assumed instead, find the association fraction and final particle amount from 0.10 mol monomer.",
        L`$\alpha=2(1-0.80)=0.40$.`,
        L`Final particles $=0.10(0.80)=0.080\,\mathrm{mol}$.`,
      ],
    ],
    [
      "Use the true/apparent mass ratio.",
      "Check whether the proposed process raises or lowers particle count.",
      "Apply a model only if its allowed range fits.",
    ],
    ["Using a negative dissociation fraction as a physical answer."],
  ),
  w(
    "1.5",
    120,
    "case",
    3,
    L`A $0.10\,\mathrm{m}$ salt solution yields an experimental depression of $0.558\,\mathrm{K}$ in water ($K_f=1.86$). The salt's formula predicts four ions on complete dissociation. A second student assumes complete dissociation while interpreting the result.`,
    [
      [
        "Find measured i and the dissociation fraction in the simple model.",
        L`$i=0.558/(1.86(0.10))=3.0$.`,
        L`$\alpha=(3.0-1)/(4-1)=2/3$.`,
      ],
      [
        "What depression would complete dissociation predict? State a limitation of reading the calculated fraction as a literal measured fraction for real electrolytes.",
        L`Complete dissociation predicts $4(1.86)(0.10)=0.744\,\mathrm{K}$.`,
        "Interionic non-ideality can also affect i; the alpha inference is conditional on the specified ideal particle-count model.",
      ],
    ],
    [
      "Compare with the undissociated reference first.",
      "Use four-ion stoichiometry.",
      "Keep model-based inference distinct from direct observation.",
    ],
    ["Equating any integer experimental i with complete dissociation."],
  ),
];
