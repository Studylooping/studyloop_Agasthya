import { chapterPractice } from "../chapter-practice";
const { mc, written: w } = chapterPractice("u1-solutions");
const L = String.raw;
export const thermalExpansion = [
  mc(
    "1.3",
    105,
    2,
    "Which condition is essential when applying the usual boiling-point-elevation formula to a dilute molecular solute?",
    "The solute should be non-volatile",
    [
      [
        "The solute must be a salt",
        "Non-electrolytes also produce boiling elevation.",
      ],
      [
        "The solvent must be water",
        "The formula applies to other solvents with their own Kb.",
      ],
      [
        "The solute must weigh more than the solvent",
        "Dilute solutions contain a relatively small solute amount.",
      ],
    ],
    [
      "Consider which species contribute to the vapour.",
      "The standard derivation uses lowered solvent pressure.",
      "A volatile second component changes the situation.",
    ],
    [
      "For a non-volatile solute, the vapour pressure is due to solvent alone; the standard dilute-solution relation applies with the appropriate particle factor.",
    ],
  ),
  mc(
    "1.3",
    106,
    2,
    L`A non-electrolyte solution has molality $0.15\,\mathrm{m}$ and solvent $K_b=2.0\,\mathrm{K\,kg\,mol^{-1}}$. If pure solvent boils at $80.0^\circ\mathrm{C}$ at the stated pressure, the solution boils at`,
    L`$80.3^\circ\mathrm{C}$`,
    [
      [L`$79.7^\circ\mathrm{C}$`, "Boiling point rises, not falls."],
      [
        L`$0.30^\circ\mathrm{C}$`,
        "This is the change, not the final boiling temperature.",
      ],
      [L`$82.0^\circ\mathrm{C}$`, "Kb must be multiplied by molality."],
    ],
    [
      "Calculate the elevation.",
      "An elevation is added to the pure-solvent temperature.",
      "A one-kelvin change equals a one-degree Celsius change.",
    ],
    [
      L`$\Delta T_b=2.0(0.15)=0.30\,\mathrm{K}$, so $T_b=80.3^\circ\mathrm{C}$.`,
    ],
  ),
  mc(
    "1.3",
    107,
    2,
    L`A solvent freezes at $5.5^\circ\mathrm{C}$. A dilute solution has freezing depression $1.2\,\mathrm{K}$. Its freezing point is`,
    L`$4.3^\circ\mathrm{C}$`,
    [
      [L`$6.7^\circ\mathrm{C}$`, "Depression must be subtracted."],
      [
        L`$-1.2^\circ\mathrm{C}$`,
        "That assumes the pure solvent freezes at zero Celsius.",
      ],
      [
        L`$1.2^\circ\mathrm{C}$`,
        "This confuses the magnitude of the change with the final temperature.",
      ],
    ],
    [
      "Identify the pure-solvent freezing point.",
      "A depression lowers it.",
      "Subtract the change without converting a temperature difference.",
    ],
    [L`$T_f=5.5-1.2=4.3^\circ\mathrm{C}$.`],
  ),
  mc(
    "1.3",
    108,
    2,
    L`A $2.0\,\mathrm{g}$ non-electrolyte in $80\,\mathrm{g}$ solvent raises its boiling point by $0.25\,\mathrm{K}$. If $K_b=1.0\,\mathrm{K\,kg\,mol^{-1}}$, its molar mass is`,
    L`$100\,\mathrm{g\,mol^{-1}}$`,
    [
      [
        L`$10\,\mathrm{g\,mol^{-1}}$`,
        "Check the kg conversion: 80 g is 0.080 kg.",
      ],
      [
        L`$400\,\mathrm{g\,mol^{-1}}$`,
        "This is not obtained from the measured molality 0.25.",
      ],
      [
        L`$0.10\,\mathrm{g\,mol^{-1}}$`,
        "Using solvent grams with Kb in kg units causes a thousand-fold error.",
      ],
    ],
    [
      "Find molality from elevation.",
      "Multiply by solvent mass in kg to get moles.",
      "Divide solute mass by amount.",
    ],
    [
      L`$m=0.25$, $n=0.25(0.080)=0.020\,\mathrm{mol}$ and $M=2.0/0.020=100\,\mathrm{g\,mol^{-1}}$.`,
    ],
  ),
  mc(
    "1.3",
    109,
    2,
    L`Equal masses of two non-electrolytes P and Q separately dissolved in equal masses of the same solvent produce freezing depressions $0.20$ and $0.50\,\mathrm{K}$. The molar-mass ratio $M_P/M_Q$ is`,
    L`$5/2$`,
    [
      [
        L`$2/5$`,
        "Molar mass is inversely proportional to the measured depression.",
      ],
      [L`$1$`, "Equal masses do not give equal numbers of molecules."],
      [L`$25/4$`, "The dependence is inverse-linear, not inverse-square."],
    ],
    [
      "Use the same solvent constant and masses.",
      "Compare the inverse depressions.",
      "The smaller effect implies larger molar mass.",
    ],
    [L`$M_P/M_Q=\Delta T_{f,Q}/\Delta T_{f,P}=0.50/0.20=5/2$.`],
  ),
  mc(
    "1.3",
    110,
    2,
    L`A solution has $\Delta T_f=0.60\,\mathrm{K}$. Half of its solvent evaporates without solute loss. Assuming it remains in the dilute ideal regime, the new depression is`,
    L`$1.20\,\mathrm{K}$`,
    [
      [
        L`$0.30\,\mathrm{K}$`,
        "Solvent removal increases, rather than decreases, molality.",
      ],
      [L`$0.60\,\mathrm{K}$`, "The composition changed."],
      [
        L`$2.40\,\mathrm{K}$`,
        "Halving solvent mass doubles molality; it does not quadruple it.",
      ],
    ],
    [
      "Keep solute amount fixed.",
      "Halving the denominator doubles molality.",
      "Depression is proportional to molality.",
    ],
    [L`$m_2=2m_1$, so $\Delta T_{f,2}=2(0.60)=1.20\,\mathrm{K}$.`],
  ),
  mc(
    "1.3",
    111,
    2,
    "For an ideal dilute solution of a fixed non-electrolyte, a plot of boiling-point elevation against molality is",
    "a straight line through the origin with slope Kb",
    [
      [
        "a straight line with slope 1/Kb",
        "The relation is elevation=Kb times molality.",
      ],
      ["a horizontal line", "Elevation changes with molality."],
      [
        "a line with intercept equal to the pure boiling point",
        "That intercept applies to boiling temperature, not elevation.",
      ],
    ],
    [
      "Write the equation in y=mx+c form.",
      "The vertical axis is a change, not absolute temperature.",
      "Zero solute means zero elevation.",
    ],
    [L`$\Delta T_b=K_bm$ is linear through the origin; its slope is $K_b$.`],
  ),
  mc(
    "1.3",
    112,
    2,
    L`A dilute non-electrolyte solution contains $0.10\,\mathrm{mol}$ solute in $0.40\,\mathrm{kg}$ solvent. Its freezing depression is $1.25\,\mathrm{K}$. The solvent's $K_f$ is`,
    L`$5.0\,\mathrm{K\,kg\,mol^{-1}}$`,
    [
      [
        L`$0.3125\,\mathrm{K\,kg\,mol^{-1}}$`,
        "Divide depression by molality, rather than multiply.",
      ],
      [
        L`$12.5\,\mathrm{K\,kg\,mol^{-1}}$`,
        "This divides by amount instead of molality.",
      ],
      [
        L`$0.20\,\mathrm{K\,kg\,mol^{-1}}$`,
        "This is the reciprocal of the required constant.",
      ],
    ],
    [
      "Calculate molality first.",
      L`Rearrange $\Delta T_f=K_fm$.`,
      "Keep the units consistent.",
    ],
    [
      L`$m=0.10/0.40=0.25$, hence $K_f=1.25/0.25=5.0\,\mathrm{K\,kg\,mol^{-1}}$.`,
    ],
  ),
  mc(
    "1.3",
    113,
    2,
    L`In $100\,\mathrm{g}$ water, solution P contains $3\,\mathrm{g}$ urea ($M=60$), and Q contains $9\,\mathrm{g}$ glucose ($M=180$). Their ideal freezing depressions are`,
    "equal",
    [
      ["larger for P by a factor of three", "Both amounts equal 0.05 mol."],
      [
        "larger for Q by a factor of three",
        "The larger mass compensates for glucose's larger molar mass.",
      ],
      [
        "zero for both",
        "Dissolved non-electrolytes also lower freezing point.",
      ],
    ],
    [
      "Compare moles, not grams.",
      "Both have the same solvent mass.",
      "Both have i=1.",
    ],
    [
      L`$3/60=9/180=0.05\,\mathrm{mol}$; equal molalities give equal depressions.`,
    ],
  ),
  mc(
    "1.3",
    114,
    2,
    "For a dilute non-electrolyte solution in a given solvent, the ratio of freezing-point depression to boiling-point elevation is",
    L`$K_f/K_b$`,
    [
      [L`$K_b/K_f$`, "The numerator corresponds to Kf."],
      [
        L`$K_fK_b$`,
        "Molality cancels in a ratio, leaving a quotient of constants.",
      ],
      [L`$1$`, "The two solvent constants need not be equal."],
    ],
    [
      "Write both colligative equations.",
      "Use the same molality.",
      "Cancel common factors.",
    ],
    [L`$\Delta T_f/\Delta T_b=(K_fm)/(K_bm)=K_f/K_b$.`],
  ),
  mc(
    "1.3",
    115,
    3,
    L`A $1.0\,\mathrm{g}$ impure non-volatile sample is assumed pure in a freezing-point molar-mass experiment. It contains $20\%$ inert insoluble material, which is removed before measurement. The true solute molar mass is $80\,\mathrm{g\,mol^{-1}}$. The inferred molar mass using the original 1.0 g is`,
    L`$100\,\mathrm{g\,mol^{-1}}$`,
    [
      [
        L`$64\,\mathrm{g\,mol^{-1}}$`,
        "Using excessive solute mass inflates the inferred molar mass.",
      ],
      [
        L`$80\,\mathrm{g\,mol^{-1}}$`,
        "Only 0.80 g actually supplies dissolved particles.",
      ],
      [
        L`$400\,\mathrm{g\,mol^{-1}}$`,
        "The active fraction is 0.80, not 0.20.",
      ],
    ],
    [
      "Find the mass actually dissolved.",
      "The colligative effect measures its amount.",
      "Use the stated incorrect mass in the final inference.",
    ],
    [
      L`Dissolved amount $=0.80/80=0.010\,\mathrm{mol}$, so inferred $M=1.0/0.010=100\,\mathrm{g\,mol^{-1}}$.`,
    ],
  ),
  mc(
    "1.3",
    116,
    2,
    "When some pure solvent freezes out of a dilute solution without trapping solute, the remaining liquid",
    "becomes more concentrated and has a lower equilibrium freezing point",
    [
      ["becomes more dilute", "Solvent is being removed from the liquid."],
      [
        "keeps exactly the original freezing point throughout",
        "The remaining liquid composition changes.",
      ],
      [
        "necessarily becomes pure solute immediately",
        "Only part of the solvent has frozen.",
      ],
    ],
    [
      "Track solvent in the liquid phase.",
      "Solute remains in the liquid.",
      "Higher molality gives greater depression.",
    ],
    [
      "Removal of pure solvent raises solute molality; the remaining liquid therefore freezes at a progressively lower temperature.",
    ],
  ),
  mc(
    "1.3",
    117,
    2,
    L`A solution of $0.030\,\mathrm{mol}$ non-electrolyte must have freezing depression $0.279\,\mathrm{K}$ in water ($K_f=1.86$). The required water mass is`,
    L`$200\,\mathrm{g}$`,
    [
      [
        L`$50\,\mathrm{g}$`,
        "That gives molality 0.60 and a much larger depression.",
      ],
      [L`$20\,\mathrm{g}$`, "Check kilograms-to-grams conversion."],
      [L`$500\,\mathrm{g}$`, "That gives depression 0.1116 K."],
    ],
    [
      "Determine target molality.",
      "Molality is amount divided by solvent mass in kg.",
      "Solve for solvent mass.",
    ],
    [L`$m=0.279/1.86=0.15$, so water mass $=0.030/0.15=0.200\,\mathrm{kg}$.`],
  ),
  mc(
    "1.3",
    118,
    2,
    "A solvent with a larger Kf is useful for detecting a small amount of dissolved non-electrolyte because, at fixed molality, it gives",
    "a larger freezing-point depression",
    [
      [
        "a larger number of solute molecules",
        "The constant changes the response, not molecule count.",
      ],
      ["a smaller depression", "Depression is directly proportional to Kf."],
      [
        "no need for a temperature measurement",
        "The experiment still measures a temperature difference.",
      ],
    ],
    [
      "Hold molality fixed.",
      "Compare the multiplier Kf.",
      "Separate sensitivity from particle number.",
    ],
    [
      L`Since $\Delta T_f=K_fm$, a larger $K_f$ amplifies the temperature change for a fixed solute molality.`,
    ],
  ),
  mc(
    "1.3",
    119,
    2,
    L`A non-electrolyte solution has solvent mole fraction $0.98$. The pure-solvent vapour pressure is $75\,\mathrm{kPa}$. The absolute pressure lowering is`,
    L`$1.5\,\mathrm{kPa}$`,
    [
      [
        L`$73.5\,\mathrm{kPa}$`,
        "This is the solution pressure, not its lowering.",
      ],
      [L`$0.02\,\mathrm{kPa}$`, "0.02 is the dimensionless relative lowering."],
      [
        L`$76.5\,\mathrm{kPa}$`,
        "Adding non-volatile solute does not raise the solvent pressure.",
      ],
    ],
    [
      "Find solute mole fraction.",
      "Multiply relative lowering by pure pressure.",
      "Keep relative and absolute lowering distinct.",
    ],
    [L`$\Delta p=(1-0.98)(75)=1.5\,\mathrm{kPa}$.`],
  ),
  mc(
    "1.3",
    120,
    3,
    L`A non-electrolyte solution has $\Delta T_b=0.20\,\mathrm{K}$. An equal mass of the same solute is added and enough solvent is then added to triple the original solvent mass. The new elevation is`,
    L`$2/15\,\mathrm{K}$`,
    [
      [
        L`$0.40\,\mathrm{K}$`,
        "This accounts for added solute but ignores added solvent.",
      ],
      [L`$0.60\,\mathrm{K}$`, "Increasing solvent mass reduces molality."],
      [L`$0.10\,\mathrm{K}$`, "The net molality factor is 2/3, not 1/2."],
    ],
    [
      "Amount doubles.",
      "Solvent mass triples.",
      "Apply the net change in molality.",
    ],
    [L`$m_2/m_1=2/3$, so $\Delta T_{b,2}=0.20(2/3)=2/15\,\mathrm{K}$.`],
  ),
  w(
    "1.3",
    105,
    "vsaq",
    2,
    "Why must the freezing point of the pure solvent be measured at the same pressure as that of the solution when determining freezing-point depression?",
    [
      [
        "Identify the controlled variable and the required comparison.",
        "Freezing temperature can depend on pressure, so changing pressure introduces an unrelated temperature shift.",
        "The desired depression compares pure solvent and solution under the same external conditions, isolating the solute effect.",
      ],
    ],
    [
      "Identify what is being subtracted.",
      "Pressure also affects phase equilibrium.",
      "Control variables other than solute addition.",
    ],
    ["Attributing every temperature difference solely to dissolved solute."],
  ),
  w(
    "1.3",
    106,
    "vsaq",
    2,
    "Why are equal-molarity glucose solutions in different solvents not guaranteed to show equal boiling-point elevations?",
    [
      [
        "Give two distinct reasons.",
        "Boiling elevation depends on molality, not molarity; equal molarity need not mean equal molality.",
        "Different solvents have different ebullioscopic constants Kb.",
      ],
    ],
    [
      "Check the concentration unit in the formula.",
      "Check the solvent constant.",
      "Equal molarity fixes neither of those universally.",
    ],
    ["Treating Kb as a universal constant."],
  ),
  w(
    "1.3",
    107,
    "vsaq",
    2,
    "A student writes a measured freezing-point depression as -0.40 K because the solution freezes below the solvent. Correct the notation and distinguish the final temperature.",
    [
      [
        "Explain the sign convention.",
        L`Depression is defined as $\Delta T_f=T_f^0-T_f$ and is positive: $0.40\,\mathrm{K}$.`,
        L`The final temperature is $T_f=T_f^0-0.40\,\mathrm{K}$; it is not necessarily negative in Celsius.`,
      ],
    ],
    [
      "Recall the definition of a depression magnitude.",
      "Separate change from final temperature.",
      "The pure-solvent freezing point need not be zero.",
    ],
    ["Calling the solution temperature -0.40 Celsius for every solvent."],
  ),
  w(
    "1.3",
    108,
    "saq",
    2,
    L`A non-electrolyte of molar mass $150\,\mathrm{g\,mol^{-1}}$ is to produce a freezing depression of $0.372\,\mathrm{K}$ in $250\,\mathrm{g}$ water. Take $K_f=1.86$.`,
    [
      [
        "Find target molality, solute amount and required mass.",
        L`$m=0.372/1.86=0.200\,\mathrm{m}$.`,
        L`$n=0.200(0.250)=0.0500\,\mathrm{mol}$.`,
        L`Mass $=0.0500(150)=7.50\,\mathrm{g}$.`,
      ],
    ],
    [
      "Start with the desired colligative effect.",
      "Use solvent mass in kg.",
      "Convert amount to mass last.",
    ],
    ["Using solution mass before the solute has been determined."],
  ),
  w(
    "1.3",
    109,
    "saq",
    2,
    L`A $0.40\,\mathrm{m}$ non-electrolyte solution in solvent S boils $0.80\,\mathrm{K}$ above pure S. A second $0.15\,\mathrm{m}$ solution uses the same solvent.`,
    [
      [
        "Find Kb, the second elevation and the second boiling point if pure S boils at 60 Celsius.",
        L`$K_b=0.80/0.40=2.0\,\mathrm{K\,kg\,mol^{-1}}$.`,
        L`Second $\Delta T_b=2.0(0.15)=0.30\,\mathrm{K}$.`,
        L`Second boiling point is $60.30^\circ\mathrm{C}$ at the same pressure.`,
      ],
    ],
    [
      "Calibrate the solvent constant from the first experiment.",
      "Apply it to the second molality.",
      "Add elevation to the pure boiling point.",
    ],
    ["Using the first molality for both samples."],
  ),
  w(
    "1.3",
    110,
    "saq",
    2,
    L`Two non-electrolytes of molar masses 60 and $180\,\mathrm{g\,mol^{-1}}$ are to give equal freezing depressions in the same mass of water. A $4.0\,\mathrm{g}$ sample of the first solute is used.`,
    [
      [
        "Find its amount, the required amount of the second solute and the second mass.",
        L`First amount $=4.0/60=1/15\,\mathrm{mol}$.`,
        "Equal effects require equal molalities and hence equal amounts for equal water masses.",
        L`Second mass $=(1/15)(180)=12.0\,\mathrm{g}$.`,
      ],
    ],
    [
      "Translate equal depressions into equal molalities.",
      "Water masses are equal.",
      "Equal amounts need not have equal masses.",
    ],
    ["Using 4 g of each solute."],
  ),
  w(
    "1.3",
    111,
    "saq",
    3,
    L`A dilute non-electrolyte solution shows $\Delta T_f=0.93\,\mathrm{K}$ and $\Delta T_b=0.26\,\mathrm{K}$. The solvent's $K_f$ is $1.86\,\mathrm{K\,kg\,mol^{-1}}$.`,
    [
      [
        "Find the molality, Kb, and amount in 200 g solvent.",
        L`$m=0.93/1.86=0.50$.`,
        L`$K_b=0.26/0.50=0.52\,\mathrm{K\,kg\,mol^{-1}}$.`,
        L`$n=0.50(0.200)=0.100\,\mathrm{mol}$.`,
      ],
    ],
    [
      "Use the known constant first.",
      "The same molality appears in both measurements.",
      "Convert solvent mass to kg.",
    ],
    ["Equating the two temperature changes."],
  ),
  w(
    "1.3",
    112,
    "saq",
    2,
    L`A solution contains $0.20\,\mathrm{mol}$ non-volatile solute and $9.8\,\mathrm{mol}$ solvent. Pure-solvent vapour pressure is $50\,\mathrm{kPa}$. Assume ideality.`,
    [
      [
        "Find solvent mole fraction, solution pressure and relative lowering.",
        L`$x_1=9.8/(9.8+0.2)=0.98$.`,
        L`$p=0.98(50)=49\,\mathrm{kPa}$.`,
        L`$(p^0-p)/p^0=(50-49)/50=0.02$.`,
      ],
    ],
    [
      "Use total component moles.",
      "Only the solvent is volatile.",
      "Relative lowering is dimensionless.",
    ],
    [
      "Dividing solute amount by solvent amount when an exact result is needed.",
    ],
  ),
  w(
    "1.3",
    113,
    "saq",
    3,
    L`A solution contains $0.10\,\mathrm{mol}$ non-electrolyte in $500\,\mathrm{g}$ water. Then $100\,\mathrm{g}$ pure ice freezes out, leaving all solute in the liquid. Take $K_f=1.86$.`,
    [
      [
        "Find initial depression, final liquid molality and final depression, using the dilute model.",
        L`Initially $\Delta T_f=1.86(0.10/0.500)=0.372\,\mathrm{K}$.`,
        L`Remaining water is $0.400\,\mathrm{kg}$, giving $m=0.250$.`,
        L`Final $\Delta T_f=1.86(0.250)=0.465\,\mathrm{K}$.`,
      ],
    ],
    [
      "Track water only in the liquid.",
      "Solute amount remains unchanged.",
      "Recalculate molality for the remaining liquid.",
    ],
    [
      "Removing solute in the same proportion as water despite the pure-ice assumption.",
    ],
  ),
  w(
    "1.3",
    114,
    "saq",
    3,
    L`An experiment gives apparent molar mass $200\,\mathrm{g\,mol^{-1}}$ for a non-electrolyte. The student later finds the entered solute mass was twice its actual mass; all other measurements were correct.`,
    [
      [
        "Explain the error direction and calculate the corrected molar mass.",
        L`In $M=K_fw/(W\Delta T_f)$, inferred molar mass is proportional to entered solute mass $w$.`,
        "Doubling the entered mass doubles the inferred molar mass, without changing the measured effect.",
        L`Corrected $M=200/2=100\,\mathrm{g\,mol^{-1}}$.`,
      ],
    ],
    [
      "Identify where solute mass enters the formula.",
      "The measured freezing depression is unchanged.",
      "Undo the factor-of-two input error.",
    ],
    ["Doubling the corrected molar mass again."],
  ),
  w(
    "1.3",
    115,
    "laq",
    3,
    L`A $4.0\,\mathrm{g}$ mixture of urea ($M=60$) and glucose ($M=180$) in $100\,\mathrm{g}$ water has freezing depression $0.62\,\mathrm{K}$. Take $K_f=1.86$ and ideal non-electrolyte behaviour.`,
    [
      [
        "Determine the mass of each solute.",
        L`Total molality is $0.62/1.86=1/3\,\mathrm{m}$.`,
        L`Total solute amount is $(1/3)(0.100)=1/30\,\mathrm{mol}$.`,
        L`Let urea mass be $a$ grams: $a/60+(4-a)/180=1/30$.`,
        L`Multiplying by 180 gives $3a+4-a=6$, so $a=1.0\,\mathrm{g}$.`,
        L`Glucose mass is $3.0\,\mathrm{g}$; amounts $1/60+3/180=1/30$ check the result.`,
      ],
    ],
    [
      "The colligative effect fixes total amount.",
      "The total mass supplies a second equation.",
      "Use different molar masses for the two components.",
    ],
    ["Using one average molar mass without first determining composition."],
  ),
  w(
    "1.3",
    116,
    "laq",
    3,
    L`A $2.0\,\mathrm{g}$ non-electrolyte in $200\,\mathrm{g}$ solvent raises its boiling point by $0.10\,\mathrm{K}$. The solvent has $K_b=1.0$ and $K_f=4.0\,\mathrm{K\,kg\,mol^{-1}}$. Half the solvent is then removed without solute loss.`,
    [
      [
        "Find molar mass and initial freezing depression.",
        L`Initial $m=0.10/1.0=0.10$.`,
        L`$n=0.10(0.200)=0.020\,\mathrm{mol}$, so $M=100\,\mathrm{g\,mol^{-1}}$.`,
        L`Initial $\Delta T_f=4.0(0.10)=0.40\,\mathrm{K}$.`,
      ],
      [
        "Find both temperature changes after solvent removal, assuming continued ideal dilute behaviour.",
        L`New $m=0.020/0.100=0.20$, so $\Delta T_b=0.20\,\mathrm{K}$.`,
        L`New $\Delta T_f=4.0(0.20)=0.80\,\mathrm{K}$.`,
      ],
    ],
    [
      "Extract amount from the first measurement.",
      "Only solvent mass changes later.",
      "Use the new molality for both effects.",
    ],
    ["Changing the solute molar mass after evaporation."],
  ),
  w(
    "1.3",
    117,
    "laq",
    3,
    L`For two dilute solutions of the same non-electrolyte, sample A uses $3.0\,\mathrm{g}$ solute in $150\,\mathrm{g}$ solvent and has depression $0.40\,\mathrm{K}$. Sample B uses $5.0\,\mathrm{g}$ solute in $250\,\mathrm{g}$ of the same solvent. A student reports $0.80\,\mathrm{K}$ for B.`,
    [
      [
        "Test the report and identify a solvent-mass error that would explain it.",
        L`A has solute/solvent mass ratio $3/150=0.020$.`,
        L`B's stated ratio is $5/250=0.020$, so the same solute gives equal molality.`,
        L`Expected depression for B is $0.40\,\mathrm{K}$, not $0.80\,\mathrm{K}$.`,
        "A doubled depression would require doubled molality if the substance and constant are unchanged.",
        L`For $5.0\,\mathrm{g}$ solute that corresponds to $125\,\mathrm{g}$ solvent, not $250\,\mathrm{g}$.`,
      ],
    ],
    [
      "Compare solute/solvent mass ratios.",
      "The solute molar mass cancels.",
      "To double molality at fixed solute amount, halve solvent mass.",
    ],
    ["Assuming the larger solute mass alone guarantees a larger effect."],
  ),
  w(
    "1.3",
    118,
    "case",
    3,
    L`A lab compares two dilute solutions in the same solvent. P contains $0.020\,\mathrm{mol}$ non-electrolyte in $100\,\mathrm{g}$ solvent; Q contains $0.030\,\mathrm{mol}$ in $300\,\mathrm{g}$. The solvent has $K_f=2.0$ and $K_b=0.80\,\mathrm{K\,kg\,mol^{-1}}$.`,
    [
      [
        "Calculate their freezing depressions.",
        L`P: $m=0.20$ and $\Delta T_f=0.40\,\mathrm{K}$.`,
        L`Q: $m=0.10$ and $\Delta T_f=0.20\,\mathrm{K}$.`,
      ],
      [
        "Calculate Q's boiling elevation and say which freezes at a lower temperature.",
        L`Q has $\Delta T_b=0.80(0.10)=0.080\,\mathrm{K}$.`,
        "P freezes lower because its depression is larger, despite containing fewer total solute moles.",
      ],
    ],
    [
      "Normalise amounts to solvent mass.",
      "Compare molalities, not total amounts.",
      "Larger depression means lower freezing temperature.",
    ],
    ["Ranking solely by total solute moles."],
  ),
  w(
    "1.3",
    119,
    "case",
    3,
    L`A non-volatile non-electrolyte solution has vapour pressure $38\,\mathrm{kPa}$, while the pure solvent has $40\,\mathrm{kPa}$. It contains $9.5\,\mathrm{mol}$ solvent and $30\,\mathrm{g}$ solute. Assume ideality.`,
    [
      [
        "Find relative lowering and solute amount.",
        L`Relative lowering $=(40-38)/40=0.05$.`,
        L`$n_2/(9.5+n_2)=0.05$, hence $n_2=0.50\,\mathrm{mol}$.`,
      ],
      [
        "Find molar mass and explain why replacing the denominator by solvent moles is approximate.",
        L`$M=30/0.50=60\,\mathrm{g\,mol^{-1}}$.`,
        "The exact mole-fraction denominator includes both components; omitting solute changes the result unless its contribution is negligible.",
      ],
    ],
    [
      "Use the exact mole-fraction relation.",
      "Solve for amount before using sample mass.",
      "Total moles are not just solvent moles.",
    ],
    ["Using n2=0.05 times 9.5 as an exact value."],
  ),
  w(
    "1.3",
    120,
    "case",
    3,
    L`A student uses $0.020\,\mathrm{mol}$ glucose in $200\,\mathrm{g}$ water. A second student uses twice that glucose amount in twice the water mass. Take $K_f=1.86$ and $K_b=0.52$. Both solutions are dilute.`,
    [
      [
        "Compare molalities and freezing depressions.",
        "Both molalities are 0.10 mol/kg: doubling numerator and denominator leaves their ratio unchanged.",
        L`Each has $\Delta T_f=0.186\,\mathrm{K}$.`,
      ],
      [
        "Calculate the boiling elevation and state whether the two total solute amounts are equal.",
        L`Each has $\Delta T_b=0.052\,\mathrm{K}$.`,
        "Total amounts differ by a factor of two; colligative temperature changes depend on concentration, not batch size alone.",
      ],
    ],
    [
      "Evaluate the ratios.",
      "Use one concentration for both effects.",
      "Separate extensive amount from concentration.",
    ],
    ["Doubling a temperature change merely because the entire batch doubles."],
  ),
];
