import { mc, written } from "../chapter-practice";
const L = String.raw;
const t = "1.2";
export const moleExpansion = [
  mc(
    t,
    101,
    2,
    L`How many oxygen atoms are present in $0.20\,\mathrm{mol}$ of $\mathrm{CO_2}$? Let $N_A$ denote Avogadro's constant.`,
    L`$0.40N_A$`,
    [
      [
        L`$0.20N_A$`,
        "This counts molecules, not the two oxygen atoms in each molecule.",
      ],
      [L`$0.60N_A$`, "This counts all atoms, including carbon."],
      [
        L`$2.0N_A$`,
        "Two oxygen atoms per molecule must still be multiplied by the amount of substance.",
      ],
    ],
    [
      "Read the oxygen subscript.",
      "Find moles of oxygen atoms.",
      "Multiply that amount by Avogadro's constant.",
    ],
    [
      L`Each molecule contains two O atoms, so $n(\mathrm{O\ atoms})=2(0.20)=0.40\,\mathrm{mol}$. The number is $0.40N_A$.`,
    ],
    "atom_vs_molecule_count",
  ),
  mc(
    t,
    102,
    2,
    L`A sample of $\mathrm{CaCl_2}$ contains $0.15N_A$ formula units. How many chloride ions does it contain?`,
    L`$0.30N_A$`,
    [
      [L`$0.15N_A$`, "There are two chloride ions per formula unit."],
      [L`$0.45N_A$`, "This is the total number of calcium and chloride ions."],
      [
        L`$0.075N_A$`,
        "The subscript requires multiplication by two, not division.",
      ],
    ],
    [
      "Identify the number of chloride ions in one formula unit.",
      "Do not include calcium in a chloride-only count.",
      "Multiply 0.15 by two.",
    ],
    [L`$N(\mathrm{Cl^-})=2(0.15N_A)=0.30N_A$.`],
    "formula_unit_count",
  ),
  mc(
    t,
    103,
    2,
    L`A molecular substance has molar mass $60\,\mathrm{g\,mol^{-1}}$. The mass of $0.05N_A$ molecules is`,
    L`$3.0\,\mathrm{g}$`,
    [
      [L`$12\,\mathrm{g}$`, "The sample is 0.05 mol, not 0.20 mol."],
      [L`$60\,\mathrm{g}$`, "This is the mass of one mole, not 0.05 mole."],
      [
        L`$1200\,\mathrm{g}$`,
        "Mass equals amount multiplied by molar mass, not divided by amount.",
      ],
    ],
    [
      "Convert the particle count into moles.",
      "A count of 0.05 times Avogadro's number means 0.05 mol.",
      "Use mass = amount times molar mass.",
    ],
    [L`$n=0.05\,\mathrm{mol}$ and $m=0.05(60)=3.0\,\mathrm{g}$.`],
    "particle_to_mass",
  ),
  mc(
    t,
    104,
    3,
    L`Equal masses of $\mathrm{CO}$ and $\mathrm{CO_2}$ are taken. Their molar masses are $28$ and $44\,\mathrm{g\,mol^{-1}}$. The ratio of oxygen-atom counts in CO to those in $\mathrm{CO_{2}}$ is`,
    L`$11:14$`,
    [
      [
        L`$11:7$`,
        "This is the molecular-count ratio; $\\mathrm{CO_{2}}$ contributes two oxygen atoms per molecule.",
      ],
      [
        L`$7:11$`,
        "This uses direct rather than inverse molar masses and omits the oxygen subscripts.",
      ],
      [L`$1:2$`, "Equal masses do not imply equal numbers of molecules."],
    ],
    [
      "Write both counts for a common sample mass.",
      L`Compare $m/28$ with $2m/44$.`,
      "Cancel the common mass and Avogadro factor.",
    ],
    [L`The ratio is $(m/28):(2m/44)=44:56=11:14$.`],
    "mass_and_atom_ratio",
  ),
  mc(
    t,
    105,
    2,
    L`An element has isotopic masses $10.0\,\mathrm{u}$ and $11.0\,\mathrm{u}$ with number abundances $20.0\%$ and $80.0\%$. Its average atomic mass is`,
    L`$10.8\,\mathrm{u}$`,
    [
      [
        L`$10.5\,\mathrm{u}$`,
        "A simple mean would apply only to equal abundances.",
      ],
      [L`$10.2\,\mathrm{u}$`, "The abundance weights have been reversed."],
      [
        L`$21.0\,\mathrm{u}$`,
        "Adding isotope masses does not give a weighted average.",
      ],
    ],
    [
      "Use fractional abundances.",
      "Multiply each mass by its fraction.",
      "Add the weighted contributions.",
    ],
    [L`$\bar m=0.20(10.0)+0.80(11.0)=10.8\,\mathrm{u}$.`],
    "weighted_atomic_mass",
  ),
  mc(
    t,
    106,
    3,
    L`Two isotopes have masses $63.0$ and $65.0\,\mathrm{u}$. If the average mass is $63.6\,\mathrm{u}$, the number percentage of the lighter isotope is`,
    L`$70\%$`,
    [
      [L`$30\%$`, "This is the percentage of the heavier isotope."],
      [L`$50\%$`, "Equal abundances would give 64.0 u."],
      [L`$60\%$`, "This would give 63.8 u, not 63.6 u."],
    ],
    [
      "Let the lighter-isotope fraction be x.",
      L`Write $63x+65(1-x)=63.6$.`,
      "Solve the linear equation and convert the fraction to percent.",
    ],
    [L`$65-2x=63.6$, so $x=0.70$ and the lighter isotope is $70\%$.`],
    "isotope_abundance",
  ),
  mc(
    t,
    107,
    2,
    L`What is the molar mass of $\mathrm{Al_2(SO_4)_3}$? Use $\mathrm{Al}=27$, $\mathrm{S}=32$ and $\mathrm{O}=16$.`,
    L`$342\,\mathrm{g\,mol^{-1}}$`,
    [
      [L`$150\,\mathrm{g\,mol^{-1}}$`, "This counts only one sulfate group."],
      [
        L`$246\,\mathrm{g\,mol^{-1}}$`,
        "The formula contains three sulfate groups, not two.",
      ],
      [
        L`$310\,\mathrm{g\,mol^{-1}}$`,
        "One of the three sulfur atoms has been omitted.",
      ],
    ],
    [
      "Expand the bracket first.",
      "There are 2 Al, 3 S and 12 O atoms per formula unit.",
      "Add their atomic-mass contributions.",
    ],
    [L`$M=2(27)+3(32)+12(16)=342\,\mathrm{g\,mol^{-1}}$.`],
    "bracketed_formula_mass",
  ),
  mc(
    t,
    108,
    2,
    L`A sample contains $0.10\,\mathrm{mol}$ of $\mathrm{Na_2CO_3\cdot10H_2O}$. The amount of hydrogen atoms in it is`,
    L`$2.0\,\mathrm{mol}$`,
    [
      [
        L`$1.0\,\mathrm{mol}$`,
        "This counts water molecules, each of which has two hydrogen atoms.",
      ],
      [
        L`$0.20\,\mathrm{mol}$`,
        "This ignores the ten waters per formula unit.",
      ],
      [
        L`$20\,\mathrm{mol}$`,
        "Twenty atoms per formula unit must be multiplied by 0.10 mol.",
      ],
    ],
    [
      "Only the waters contain hydrogen.",
      "Each formula unit has ten times two hydrogen atoms.",
      "Multiply twenty by the sample amount.",
    ],
    [
      L`Hydrogen atoms per formula unit $=10(2)=20$. Thus the amount is $0.10(20)=2.0\,\mathrm{mol}$.`,
    ],
    "hydrate_atom_count",
  ),
  mc(
    t,
    109,
    2,
    L`Which sample contains the greatest number of molecules? Use molar masses: $\mathrm{H_2}=2$, $\mathrm{N_2}=28$, $\mathrm{CO_2}=44$, $\mathrm{O_2}=32\,\mathrm{g\,mol^{-1}}$.`,
    L`$3\,\mathrm{g}$ of $\mathrm{H_2}$`,
    [
      [
        L`$28\,\mathrm{g}$ of $\mathrm{N_2}$`,
        "This is 1 mol, fewer molecules than the 1.5 mol hydrogen sample.",
      ],
      [L`$22\,\mathrm{g}$ of $\mathrm{CO_2}$`, "This is only 0.5 mol."],
      [
        L`$32\,\mathrm{g}$ of $\mathrm{O_2}$`,
        "This is 1 mol; compare moles rather than masses.",
      ],
    ],
    [
      "Convert each mass to moles.",
      "Molecule count is proportional to moles.",
      "The largest mass need not give the largest particle count.",
    ],
    [
      L`The amounts are $1.5,1.0,0.5,1.0\,\mathrm{mol}$ respectively. Hydrogen has the greatest molecule count.`,
    ],
    "compare_particle_counts",
  ),
  mc(
    t,
    110,
    3,
    L`A mixture contains $0.20\,\mathrm{mol}$ helium and $0.10\,\mathrm{mol}$ nitrogen gas, $\mathrm{N_2}$. The total number of atoms is`,
    L`$0.40N_A$`,
    [
      [
        L`$0.30N_A$`,
        "This counts particles while treating each nitrogen molecule as one atom.",
      ],
      [L`$0.60N_A$`, "Helium is monatomic, not diatomic."],
      [
        L`$0.20N_A$`,
        "The helium and nitrogen atom contributions both need to be included.",
      ],
    ],
    [
      "Treat helium atoms and nitrogen molecules separately.",
      "Each nitrogen molecule contains two atoms.",
      "Add the amounts of atoms, not just the amounts of particles.",
    ],
    [
      L`Total atom amount $=0.20+2(0.10)=0.40\,\mathrm{mol}$, giving $0.40N_A$ atoms.`,
    ],
    "mixture_atom_count",
  ),
  mc(
    t,
    111,
    2,
    L`The mass of one molecule of a substance with molar mass $M\,\mathrm{g\,mol^{-1}}$ is`,
    L`$M/N_A\,\mathrm{g}$`,
    [
      [
        L`$MN_A\,\mathrm{g}$`,
        "One mole's mass must be divided among its molecules.",
      ],
      [L`$N_A/M\,\mathrm{g}$`, "This reverses mass per particle."],
      [L`$M\,\mathrm{g}$`, "This is the mass of one mole, not one molecule."],
    ],
    [
      "One mole contains Avogadro's number of molecules.",
      "Its total mass is M grams.",
      "Divide the total mass by the number of molecules.",
    ],
    [
      L`Mass per molecule is the molar mass divided by Avogadro's constant: $M/N_A\,\mathrm{g}$.`,
    ],
    "single_particle_mass",
  ),
  mc(
    t,
    112,
    2,
    L`How many formula units are present in $11.7\,\mathrm{g}$ of NaCl? Use $M(\mathrm{NaCl})=58.5\,\mathrm{g\,mol^{-1}}$.`,
    L`$0.20N_A$`,
    [
      [
        L`$0.40N_A$`,
        "This counts the total ions if each formula unit supplies two ions.",
      ],
      [
        L`$5.0N_A$`,
        "The mole calculation is mass divided by molar mass, not the reverse.",
      ],
      [L`$11.7N_A$`, "The mass in grams is not the amount in moles."],
    ],
    [
      "NaCl is counted in formula units.",
      L`Calculate $11.7/58.5$.`,
      "Multiply the resulting amount by Avogadro's constant.",
    ],
    [
      L`$n=11.7/58.5=0.20\,\mathrm{mol}$, so there are $0.20N_A$ formula units.`,
    ],
    "ionic_entity_count",
  ),
  mc(
    t,
    113,
    3,
    L`A sample contains $0.30N_A$ oxygen atoms, all present in ozone molecules. The mass of ozone is (molar mass $48\,\mathrm{g\,mol^{-1}}$)`,
    L`$4.8\,\mathrm{g}$`,
    [
      [
        L`$14.4\,\mathrm{g}$`,
        "The atom count must be divided by three to get the molecular amount.",
      ],
      [L`$9.6\,\mathrm{g}$`, "This treats the sample as diatomic oxygen."],
      [
        L`$1.6\,\mathrm{g}$`,
        "After dividing the atom count by three, use ozone's molar mass of 48.",
      ],
    ],
    [
      "Ozone is $\\mathrm{O_{3}}$.",
      "Three moles of oxygen atoms correspond to one mole of ozone molecules.",
      "Find molecule moles before using the molar mass.",
    ],
    [
      L`$n(\mathrm{O_3})=0.30/3=0.10\,\mathrm{mol}$; $m=0.10(48)=4.8\,\mathrm{g}$.`,
    ],
    "ozone_atom_conversion",
  ),
  mc(
    t,
    114,
    2,
    L`For equal amounts in moles of methane and carbon dioxide, their mass ratio $m(\mathrm{CH_4}):m(\mathrm{CO_2})$ is (molar masses 16 and 44)`,
    L`$4:11$`,
    [
      [
        L`$11:4$`,
        "Equal amounts give a direct mass ratio, not an inverse one.",
      ],
      [
        L`$1:1$`,
        "Equal mole amounts mean equal molecular counts, not equal masses.",
      ],
      [
        L`$5:3$`,
        "The number of atoms per molecule does not determine the mass ratio directly.",
      ],
    ],
    [
      "Write each mass as n times molar mass.",
      "Cancel the common amount n.",
      "Reduce 16:44.",
    ],
    [L`For equal n, masses are proportional to molar masses: $16:44=4:11$.`],
    "equal_moles_mass_ratio",
  ),
  mc(
    t,
    115,
    2,
    L`The total amount of atoms in $0.12\,\mathrm{mol}$ of $\mathrm{NH_4NO_3}$ is`,
    L`$1.08\,\mathrm{mol}$`,
    [
      [
        L`$0.84\,\mathrm{mol}$`,
        "The formula has nine atoms in total, not seven.",
      ],
      [
        L`$0.24\,\mathrm{mol}$`,
        "This counts only the two nitrogen atoms per formula unit.",
      ],
      [
        L`$0.12\,\mathrm{mol}$`,
        "This is the amount of formula units, not atoms.",
      ],
    ],
    [
      "Count nitrogen atoms in both parts of the formula.",
      "Add 2 N, 4 H and 3 O.",
      "Multiply the atom count per formula unit by 0.12.",
    ],
    [
      L`There are $2+4+3=9$ atoms per formula unit; the total amount is $9(0.12)=1.08\,\mathrm{mol}$.`,
    ],
    "polyatomic_entity_count",
  ),
  mc(
    t,
    116,
    3,
    L`A mixture has $7.0\,\mathrm{g}$ of CO and $11.0\,\mathrm{g}$ of $\mathrm{CO_{2}}$. With molar masses 28 and $44\,\mathrm{g\,mol^{-1}}$, the total amount of oxygen atoms is`,
    L`$0.75\,\mathrm{mol}$`,
    [
      [
        L`$0.50\,\mathrm{mol}$`,
        "This is the total amount of molecules, without accounting for the two O atoms in $\\mathrm{CO_{2}}$.",
      ],
      [
        L`$0.25\,\mathrm{mol}$`,
        "This counts only one component's molecular amount.",
      ],
      [L`$1.00\,\mathrm{mol}$`, "CO contains one oxygen atom, not two."],
    ],
    [
      "Calculate moles of each gas separately.",
      "Weight each by the oxygen subscript.",
      "Add the oxygen-atom amounts.",
    ],
    [
      L`$n(\mathrm{CO})=7/28=0.25$ and $n(\mathrm{CO_2})=11/44=0.25\,\mathrm{mol}$.`,
      L`O-atom amount $=0.25+2(0.25)=0.75\,\mathrm{mol}$.`,
    ],
    "mixed_oxide_atom_count",
  ),
  mc(
    t,
    117,
    2,
    "Assertion: One mole of water and one mole of carbon dioxide contain equal numbers of molecules. Reason: A mole of any specified molecular species contains Avogadro's number of molecules. Choose the correct statement.",
    "Both are true, and the reason explains the assertion.",
    [
      [
        "Both are true, but the reason does not explain the assertion.",
        "The definition of the mole is exactly why the molecular counts agree.",
      ],
      [
        "The assertion is true, but the reason is false.",
        "The stated meaning of a mole of molecules is correct.",
      ],
      [
        "The assertion is false, but the reason is true.",
        "Different molecular masses do not change the number of molecules per mole.",
      ],
    ],
    [
      "Distinguish mass from number of molecules.",
      "The specified entity is a molecule in both samples.",
      "Apply the definition of a mole.",
    ],
    [
      "Both one-mole samples contain the same number of molecules, even though their masses differ.",
    ],
    "assertion_reason_mole",
  ),
  mc(
    t,
    118,
    2,
    L`How many moles of water contain the same number of hydrogen atoms as $0.40\,\mathrm{mol}$ of ammonia?`,
    L`$0.60\,\mathrm{mol}$`,
    [
      [
        L`$0.40\,\mathrm{mol}$`,
        "Equal molecular amounts do not give equal H counts when the subscripts differ.",
      ],
      [
        L`$0.80\,\mathrm{mol}$`,
        "The ammonia amount must first be multiplied by its three H atoms.",
      ],
      [
        L`$1.20\,\mathrm{mol}$`,
        "This is the amount of H atoms, not of water molecules.",
      ],
    ],
    [
      "Ammonia has three H atoms per molecule.",
      "Water has two H atoms per molecule.",
      L`Set $2n=3(0.40)$.`,
    ],
    [
      L`Ammonia supplies $1.20\,\mathrm{mol}$ H atoms, requiring $1.20/2=0.60\,\mathrm{mol}$ water.`,
    ],
    "matching_atom_counts",
  ),
  mc(
    t,
    119,
    2,
    L`Using $N_A=6.022\times10^{23}\,\mathrm{mol^{-1}}$, the amount represented by $1.8066\times10^{23}$ molecules is`,
    L`$0.3000\,\mathrm{mol}$`,
    [
      [
        L`$3.000\,\mathrm{mol}$`,
        "The particle count is smaller than Avogadro's number.",
      ],
      [
        L`$0.03000\,\mathrm{mol}$`,
        "The powers of ten cancel; the remaining ratio is 1.8066/6.022.",
      ],
      [
        L`$1.8066\,\mathrm{mol}$`,
        "The coefficient of the particle count is not itself the mole amount.",
      ],
    ],
    [
      "Divide the number of molecules by Avogadro's constant.",
      "Cancel the common power of ten.",
      "Check that the result is less than one mole.",
    ],
    [L`$n=(1.8066\times10^{23})/(6.022\times10^{23})=0.3000\,\mathrm{mol}$.`],
    "avogadro_conversion",
  ),
  mc(
    t,
    120,
    2,
    L`In $0.050\,\mathrm{mol}$ of $\mathrm{Al_2(SO_4)_3}$, the amounts of aluminium ions and sulfate ions are respectively`,
    L`$0.100\,\mathrm{mol}$ and $0.150\,\mathrm{mol}$`,
    [
      [
        L`$0.050\,\mathrm{mol}$ and $0.050\,\mathrm{mol}$`,
        "The formula has two aluminium and three sulfate ions per formula unit.",
      ],
      [
        L`$0.150\,\mathrm{mol}$ and $0.100\,\mathrm{mol}$`,
        "The coefficients for aluminium and sulfate are reversed.",
      ],
      [
        L`$0.100\,\mathrm{mol}$ and $0.600\,\mathrm{mol}$`,
        "0.600 mol is the oxygen-atom amount, not the sulfate-ion amount.",
      ],
    ],
    [
      "Count sulfate groups as whole ions.",
      "Read the coefficient outside the sulfate bracket.",
      "Multiply 0.050 by two and by three.",
    ],
    [
      L`$n(\mathrm{Al^{3+}})=2(0.050)=0.100$ and $n(\mathrm{SO_4^{2-}})=3(0.050)=0.150\,\mathrm{mol}$.`,
    ],
    "polyatomic_ion_count",
  ),
  written(
    t,
    101,
    "vsaq",
    2,
    L`Explain why one mole of $\mathrm{O_2}$ and one mole of O atoms do not have the same mass.`,
    [
      [
        "Compare the specified entities and their molar masses.",
        "A molecule of $\\mathrm{O_{2}}$ contains two oxygen atoms, while the second sample counts individual atoms.",
        L`Using atomic mass $16\,\mathrm{u}$, the molar masses are $32$ and $16\,\mathrm{g\,mol^{-1}}$, respectively.`,
      ],
    ],
    [
      "The entity specified after 'mole' matters.",
      "Count atoms in each entity.",
      "Compare their masses per mole.",
    ],
    ["Using the same molar mass for atoms and diatomic molecules."],
    "specified_entity",
  ),
  written(
    t,
    102,
    "vsaq",
    2,
    L`Find the amount of $\mathrm{MgCl_2}$ in $19.0\,\mathrm{g}$, given its molar mass is $95.0\,\mathrm{g\,mol^{-1}}$.`,
    [
      [
        "State the relation and calculate the amount.",
        L`Use $n=m/M$.`,
        L`$n=19.0/95.0=0.200\,\mathrm{mol}$.`,
      ],
    ],
    [
      "Molar mass connects grams with moles.",
      "Divide mass by molar mass.",
      "The units of grams cancel.",
    ],
    ["Multiplying mass by molar mass."],
    "mass_to_moles",
  ),
  written(
    t,
    103,
    "vsaq",
    2,
    L`One mole of $\mathrm{Ca(NO_3)_2}$ contains how many moles of nitrate ions and how many moles of oxygen atoms?`,
    [
      [
        "Give both amounts.",
        "There are 2 mol of nitrate ions.",
        "There are 6 mol of oxygen atoms, since each of the two nitrate groups has three O atoms.",
      ],
    ],
    [
      "Read the outside bracket multiplier.",
      "Each nitrate group contains three oxygens.",
      "Distinguish counting ions from counting their constituent atoms.",
    ],
    ["Reporting six moles of nitrate ions."],
    "ions_vs_atoms",
  ),
  written(
    t,
    104,
    "vsaq",
    2,
    L`An atom has mass $24\,\mathrm{u}$. Using $1\,\mathrm{u}=1.66\times10^{-24}\,\mathrm{g}$, estimate its mass in grams to two significant figures.`,
    [
      [
        "Convert and round.",
        L`$m=24(1.66\times10^{-24})=3.984\times10^{-23}\,\mathrm{g}$.`,
        L`To two significant figures, $m=4.0\times10^{-23}\,\mathrm{g}$.`,
      ],
    ],
    [
      "Multiply the mass in u by the conversion factor.",
      "Put the product in scientific notation.",
      "Keep two significant figures including the final zero.",
    ],
    ["Confusing the mass of one atom with one mole of atoms."],
    "atomic_mass_unit",
  ),
  written(
    t,
    105,
    "saq",
    2,
    L`Find the amounts of sodium atoms and oxygen atoms in $0.075\,\mathrm{mol}$ of $\mathrm{Na_2SO_4}$, and give the ratio of their counts.`,
    [
      [
        "Show the two amounts and their ratio.",
        L`Sodium-atom amount $=2(0.075)=0.150\,\mathrm{mol}$.`,
        L`Oxygen-atom amount $=4(0.075)=0.300\,\mathrm{mol}$.`,
        "Their atom-count ratio is 1:2 because Avogadro's constant cancels.",
      ],
    ],
    [
      "Use the element subscripts separately.",
      "Particle ratios equal mole-amount ratios for the specified atoms.",
      "Do not count sulfur when only sodium and oxygen are requested.",
    ],
    ["Using a formula-unit ratio of 1:1 for both elements."],
    "element_specific_counts",
  ),
  written(
    t,
    106,
    "saq",
    2,
    L`An element has isotopic masses $24.0$, $25.0$ and $26.0\,\mathrm{u}$ in number abundances $80\%$, $10\%$ and $10\%$. Calculate its average atomic mass.`,
    [
      [
        "Set up and evaluate the weighted mean.",
        "The fractional abundances are 0.80, 0.10 and 0.10, whose sum is one.",
        L`$\bar m=0.80(24.0)+0.10(25.0)+0.10(26.0)$.`,
        L`The average is $24.3\,\mathrm{u}$.`,
      ],
    ],
    [
      "Use the abundances as weights.",
      "A simple mean would ignore the dominant isotope.",
      "The result should lie close to 24 u.",
    ],
    ["Averaging the three isotope masses without weights."],
    "three_isotope_average",
  ),
  written(
    t,
    107,
    "saq",
    3,
    L`A sample contains $0.25\,\mathrm{mol}$ methane and $0.10\,\mathrm{mol}$ ethane. Calculate the amounts of carbon and hydrogen atoms and the total atom count in terms of $N_A$.`,
    [
      [
        "Calculate the element amounts and total count.",
        L`Carbon amount $=0.25+2(0.10)=0.45\,\mathrm{mol}$.`,
        L`Hydrogen amount $=4(0.25)+6(0.10)=1.60\,\mathrm{mol}$.`,
        L`Total atom count $=(0.45+1.60)N_A=2.05N_A$.`,
      ],
    ],
    [
      "Use $\\mathrm{CH_{4}}$ and $\\mathrm{C_{2}H_{6}}$.",
      "Sum contributions to each element separately.",
      "Add the element amounts only after weighting by subscripts.",
    ],
    ["Adding molecular amounts and calling the result the atom amount."],
    "hydrocarbon_mixture_counts",
  ),
  written(
    t,
    108,
    "saq",
    3,
    L`What mass of nitrogen gas contains the same number of molecules as $8.0\,\mathrm{g}$ of oxygen gas? Use molar masses $28$ and $32\,\mathrm{g\,mol^{-1}}$.`,
    [
      [
        "Compare amounts before calculating the mass.",
        L`Oxygen amount $=8.0/32=0.25\,\mathrm{mol}$.`,
        "Equal numbers of molecules require 0.25 mol nitrogen.",
        L`Nitrogen mass $=0.25(28)=7.0\,\mathrm{g}$.`,
      ],
    ],
    [
      "Molecular count is fixed by mole amount.",
      "Convert the oxygen sample first.",
      "Use nitrogen's own molar mass for the final conversion.",
    ],
    ["Assuming equal molecular counts require equal masses."],
    "equal_particle_mass",
  ),
  written(
    t,
    109,
    "saq",
    2,
    L`A substance with molar mass $90\,\mathrm{g\,mol^{-1}}$ has $0.40N_A$ molecules in a sample. Calculate its mass and the number of molecules in half of that sample.`,
    [
      [
        "Calculate both quantities.",
        L`The full sample contains $0.40\,\mathrm{mol}$.`,
        L`Its mass is $0.40(90)=36\,\mathrm{g}$.`,
        L`Half the sample contains $0.20N_A$ molecules.`,
      ],
    ],
    [
      "Interpret the Avogadro factor as a mole amount.",
      "Multiply by the molar mass.",
      "Halving a uniform sample halves its molecular count.",
    ],
    ["Dividing the molar mass by the particle count."],
    "sample_scaling",
  ),
  written(
    t,
    110,
    "saq",
    3,
    L`Calculate the molar mass of $\mathrm{MgSO_4\cdot7H_2O}$ and the amount in $12.3\,\mathrm{g}$. Use $\mathrm{Mg}=24$, $\mathrm{S}=32$, $\mathrm{O}=16$, $\mathrm{H}=1$.`,
    [
      [
        "Include the waters of crystallisation.",
        L`$M(\mathrm{MgSO_4})=24+32+64=120\,\mathrm{g\,mol^{-1}}$.`,
        L`Hydrate molar mass $=120+7(18)=246\,\mathrm{g\,mol^{-1}}$.`,
        L`Amount $=12.3/246=0.0500\,\mathrm{mol}$.`,
      ],
    ],
    [
      "Calculate the anhydrous salt contribution.",
      "Add the seven waters.",
      "Use the hydrate molar mass for the given hydrate sample.",
    ],
    ["Dividing the hydrate mass by the anhydrous molar mass."],
    "hydrate_molar_mass",
  ),
  written(
    t,
    111,
    "saq",
    3,
    L`Equal masses of helium and methane are compared. Use molar masses $4$ and $16\,\mathrm{g\,mol^{-1}}$. Find the ratio of their particle counts and the ratio of their total atom counts, helium first.`,
    [
      [
        "Distinguish particles and atoms.",
        L`Particle counts are proportional to $m/4:m/16=4:1$.`,
        "Each helium particle is one atom; each methane molecule contains five atoms.",
        L`Total atom-count ratio is $4:5$.`,
      ],
    ],
    [
      "First calculate the particle ratio.",
      "Then multiply each component by atoms per particle.",
      "Helium is monatomic.",
    ],
    ["Using the molecular ratio unchanged for total atoms."],
    "particles_vs_total_atoms",
  ),
  written(
    t,
    112,
    "saq",
    3,
    L`The isotopic masses of an element are $35.0$ and $37.0\,\mathrm{u}$. Its average atomic mass is $35.8\,\mathrm{u}$. Determine both number abundances.`,
    [
      [
        "Set up and solve for the lighter isotope's fraction.",
        L`For lighter-isotope fraction x, $35x+37(1-x)=35.8$.`,
        L`$37-2x=35.8$ gives $x=0.60$.`,
        "The lighter and heavier isotopes have abundances 60% and 40%, respectively.",
      ],
    ],
    [
      "The two fractions add to one.",
      "Average mass is weighted by numbers of atoms.",
      "Check that the larger abundance belongs to the isotope nearer the mean.",
    ],
    ["Using mass fractions in place of number fractions."],
    "inverse_isotope_average",
  ),
  written(
    t,
    113,
    "laq",
    3,
    L`A mixture contains $4.0\,\mathrm{g}$ helium and $16.0\,\mathrm{g}$ oxygen gas. Use molar masses $4$ and $32\,\mathrm{g\,mol^{-1}}$.`,
    [
      [
        "Find the amount of each component and the total number of gas particles.",
        L`The helium amount is $4.0/4=1.0\,\mathrm{mol}$.`,
        L`The oxygen amount is $16.0/32=0.50\,\mathrm{mol}$.`,
        L`Total particles, counting He atoms and $\mathrm{O_{2}}$ molecules, number $1.50N_A$.`,
      ],
      [
        "Find the total atom count and explain why it differs from the particle count.",
        L`Total atoms number $[1.0+2(0.50)]N_A=2.0N_A$.`,
        "Each oxygen molecule is one gas particle but contains two atoms.",
      ],
    ],
    [
      "Specify what is counted as a particle.",
      "Find moles from each mass.",
      "Only oxygen needs a factor of two when counting atoms.",
    ],
    ["Calling helium particles molecules."],
    "mixture_entity_accounting",
  ),
  written(
    t,
    114,
    "laq",
    3,
    L`A sample of ammonium sulfate has mass $6.60\,\mathrm{g}$. Its formula is $\mathrm{(NH_4)_2SO_4}$. Use $\mathrm{N}=14$, $\mathrm{H}=1$, $\mathrm{S}=32$, $\mathrm{O}=16$.`,
    [
      [
        "Find its molar mass and amount.",
        L`$M=2(14)+8(1)+32+4(16)=132\,\mathrm{g\,mol^{-1}}$.`,
        L`The amount is $6.60/132=0.0500\,\mathrm{mol}$.`,
      ],
      [
        "Give the amounts of ammonium ions, hydrogen atoms and oxygen atoms.",
        L`Ammonium-ion amount is $2(0.0500)=0.100\,\mathrm{mol}$.`,
        L`Hydrogen-atom amount is $8(0.0500)=0.400\,\mathrm{mol}$.`,
        L`Oxygen-atom amount is $4(0.0500)=0.200\,\mathrm{mol}$.`,
      ],
    ],
    [
      "Expand the ammonium bracket.",
      "Convert sample mass using the full formula mass.",
      "Use different multipliers for ions and constituent atoms.",
    ],
    ["Failing to multiply the four H atoms by the bracket subscript two."],
    "ammonium_salt_counts",
  ),
  written(
    t,
    115,
    "laq",
    3,
    L`Two equal-mass samples consist of $\mathrm{CO_2}$ and $\mathrm{SO_2}$. Use molar masses $44$ and $64\,\mathrm{g\,mol^{-1}}$.`,
    [
      [
        "Find the ratios, $\\mathrm{CO_{2}}$ first, of molecular counts, oxygen-atom counts and total atom counts.",
        L`Molecule ratio is $(m/44):(m/64)=16:11$.`,
        "Both molecules contain two oxygen atoms, so the oxygen-atom ratio is also 16:11.",
        "Both molecules contain three total atoms, so the total atom ratio is also 16:11.",
      ],
      [
        "If the $\\mathrm{CO_{2}}$ sample contains 0.50 mol, find both sample masses and the $\\mathrm{SO_{2}}$ amount.",
        L`Each sample has mass $0.50(44)=22\,\mathrm{g}$.`,
        L`The $\mathrm{SO_{2}}$ amount is $22/64=0.34375\,\mathrm{mol}$ (about $0.34\,\mathrm{mol}$).`,
      ],
    ],
    [
      "Equal masses give inverse molar-mass ratios.",
      "Compare atoms per molecule before changing a ratio.",
      "Use the known $\\mathrm{CO_{2}}$ amount to find the common mass.",
    ],
    ["Treating equal masses as equal moles."],
    "comparative_mole_reasoning",
  ),
  written(
    t,
    116,
    "laq",
    3,
    L`A molecular substance has molar mass $120\,\mathrm{g\,mol^{-1}}$. A sample contains $0.025N_A$ molecules, each with four oxygen atoms.`,
    [
      [
        "Find the sample amount, sample mass and amount of oxygen atoms.",
        L`The substance amount is $0.025\,\mathrm{mol}$.`,
        L`Its mass is $0.025(120)=3.0\,\mathrm{g}$.`,
        L`The oxygen-atom amount is $4(0.025)=0.100\,\mathrm{mol}$.`,
      ],
      [
        "Using oxygen atomic mass 16, find the mass and percentage of oxygen in the sample.",
        L`Oxygen mass $=0.100(16)=1.6\,\mathrm{g}$.`,
        L`The oxygen percentage is $(1.6/3.0)100\approx53\%$.`,
      ],
    ],
    [
      "Begin with the molecular amount.",
      "The four-oxygen count multiplies the amount of atoms only.",
      "Check oxygen mass against the full sample mass.",
    ],
    ["Multiplying the full sample mass by four."],
    "molecule_to_element_mass",
  ),
  written(
    t,
    117,
    "case",
    3,
    L`A laboratory compares samples P, Q and R: $18\,\mathrm{g}$ water, $17\,\mathrm{g}$ ammonia and $16\,\mathrm{g}$ methane. Their molar masses are 18, 17 and $16\,\mathrm{g\,mol^{-1}}$, respectively.`,
    [
      [
        "Compare their molecular counts.",
        "Each sample contains 1 mol of molecules, so all three contain the same molecular count.",
      ],
      [
        "Compare the amounts of hydrogen atoms and identify the largest.",
        "Water contains 2 mol H atoms and ammonia contains 3 mol H atoms.",
        "Methane contains 4 mol H atoms.",
        "Methane therefore has the largest hydrogen-atom count, despite having the smallest sample mass.",
      ],
    ],
    [
      "Calculate mole amounts first.",
      "Use H subscripts 2, 3 and 4.",
      "A common molecular count need not mean a common atom count.",
    ],
    ["Ranking molecule counts by sample mass."],
    "compare_hydrogen_inventory",
  ),
  written(
    t,
    118,
    "case",
    3,
    L`A label reads $0.080\,\mathrm{mol}$ of $\mathrm{Ca_3(PO_4)_2}$. A student claims it contains $0.080\,\mathrm{mol}$ of each ion and $0.320\,\mathrm{mol}$ of oxygen atoms.`,
    [
      [
        "Correct the calcium-ion and phosphate-ion amounts.",
        L`Calcium-ion amount is $3(0.080)=0.240\,\mathrm{mol}$.`,
        L`Phosphate-ion amount is $2(0.080)=0.160\,\mathrm{mol}$.`,
      ],
      [
        "Correct the oxygen amount and identify the omitted factor.",
        L`Oxygen-atom amount is $2(4)(0.080)=0.640\,\mathrm{mol}$.`,
        "The student omitted the multiplier two outside the phosphate bracket.",
      ],
    ],
    [
      "Expand one formula unit before multiplying by moles.",
      "Treat phosphate as one polyatomic ion.",
      "Oxygen atoms require both bracket and internal subscripts.",
    ],
    ["Counting only one phosphate group."],
    "formula_interpretation_error",
  ),
  written(
    t,
    119,
    "case",
    3,
    L`An element occurs as two isotopes of masses $68.0$ and $70.0\,\mathrm{u}$. Sample A has 25% lighter-isotope atoms; sample B has 75% lighter-isotope atoms.`,
    [
      [
        "Calculate the average atomic mass in each sample.",
        L`For A, $\bar m=0.25(68)+0.75(70)=69.5\,\mathrm{u}$.`,
        L`For B, $\bar m=0.75(68)+0.25(70)=68.5\,\mathrm{u}$.`,
      ],
      [
        "Compare their numbers of atoms if 0.10 mol of each sample is taken.",
        L`Each contains $0.10N_A$ atoms, so the atom counts are equal.`,
        "The average masses differ because the isotopic proportions differ, not because one mole contains more atoms.",
      ],
    ],
    [
      "Weights are number fractions.",
      "A greater fraction of the lighter isotope lowers the average.",
      "The definition of mole is independent of isotope distribution.",
    ],
    ["Assuming different average atomic masses change Avogadro's number."],
    "isotopes_and_mole",
  ),
  written(
    t,
    120,
    "case",
    3,
    L`A student describes $9.5\,\mathrm{g}$ of $\mathrm{MgCl_2}$ as containing $0.10N_A$ molecules and $0.10N_A$ ions. Its molar mass is $95\,\mathrm{g\,mol^{-1}}$.`,
    [
      [
        "Correct the entity name and calculate the formula-unit count.",
        "For this ionic solid, use formula units rather than discrete molecules.",
        L`$n=9.5/95=0.10\,\mathrm{mol}$, giving $0.10N_A$ formula units.`,
      ],
      [
        "Calculate magnesium-ion, chloride-ion and total ion counts.",
        L`There are $0.10N_A$ magnesium ions and $0.20N_A$ chloride ions.`,
        L`The total ion count is $0.30N_A$.`,
      ],
    ],
    [
      "Check whether the compound is ionic.",
      "Read the ion numbers in each formula unit.",
      "Add the two types of ion only at the end.",
    ],
    ["Calling an ionic formula unit a discrete molecule."],
    "ionic_count_correction",
  ),
];
