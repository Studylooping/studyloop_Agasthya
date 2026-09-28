import { builder } from "../expansion-builder";
import { fraction as f, math as m, part } from "../practice-authoring";

const list = (x: number[]) => x.join(", ");
function table(x: number[], freq: number[], label = "x") {
  return (
    "\\begin{array}{c|" +
    x.map(() => "c").join("") +
    "}" +
    label +
    "&" +
    x.join("&") +
    "\\\\f&" +
    freq.join("&") +
    "\\end{array}"
  );
}
export function statisticsExpansion(topic: "5.1" | "5.2" | "5.3") {
  const B = builder({ unit: "u5-statistics-probability", topic, chapter: 13 });
  for (let v = 0; v < 2; v++) {
    const a = v + 2,
      k = 7 + v;
    if (topic === "5.1") {
      const data = [k - 2 * a, k - a, k, k + a, k + 2 * a];
      B.mc(
        "Find the range of the observations " + m(list(data)) + ".",
        m(4 * a),
        [
          [
            m(2 * a),
            "Range is maximum minus minimum, not maximum minus centre.",
          ],
          [m(k + 2 * a), "This is only the maximum observation."],
          [m(5), "This is the number of observations."],
        ],
        [
          "The minimum is " +
            m(k - 2 * a) +
            " and maximum is " +
            m(k + 2 * a) +
            ".",
          "Their difference is " + m(4 * a) + ".",
        ],
        [
          "Identify the extreme observations.",
          "Subtract minimum from maximum.",
          "Do not use the mean in the range formula.",
        ],
      );
      B.mc(
        "The mean deviation about the mean of " + m(list(data)) + " is",
        m(f(6 * a, 5)),
        [
          [
            m(0),
            "Signed deviations sum to zero; mean deviation uses absolute values.",
          ],
          [m(f(6 * a, 4)), "Divide by all five observations."],
          [
            m(2 * a),
            "This is the largest absolute deviation, not the mean of all absolute deviations.",
          ],
        ],
        [
          "The mean is " + m(k) + " by symmetry.",
          "Absolute deviations are " +
            m(list([2 * a, a, 0, a, 2 * a])) +
            ", with sum " +
            m(6 * a) +
            ". Divide by 5.",
        ],
        [
          "Find the mean.",
          "Take absolute, not signed, deviations.",
          "Average over every observation.",
        ],
        3,
      );
      B.mc(
        "If each observation in a data set is increased by " +
          m(k) +
          ", its mean deviation about the mean",
        "remains unchanged",
        [
          [
            "increases by " + k,
            "The mean shifts by the same amount as each observation.",
          ],
          ["is multiplied by " + k, "Addition is a translation, not scaling."],
          ["becomes zero", "The relative spread has not disappeared."],
        ],
        [
          "The new mean is old mean plus " + m(k) + ".",
          "Each difference (x+k)-(mean+k) equals x-mean, so absolute deviations are unchanged.",
        ],
        [
          "Track the mean as well as the data.",
          "Subtract the new mean from a new observation.",
          "The added constants cancel.",
        ],
      );
      const d = [a, 2 * a, 3 * a, 10 * a],
        md = (5 * a) / 2;
      B.mc(
        "For data " + m(list(d)) + ", the median is",
        m(f(5 * a, 2)),
        [
          [m(4 * a), "This is the arithmetic mean of the four observations."],
          [
            m(2 * a),
            "For even-sized data, average the two middle observations.",
          ],
          [m(3 * a), "The upper middle observation alone is not the median."],
        ],
        [
          "The data are already sorted and there are four observations.",
          "The median is " +
            m("(" + 2 * a + "+" + 3 * a + ")/2=" + f(5 * a, 2)) +
            ".",
        ],
        [
          "Order the observations.",
          "There are two central positions.",
          "Average their values.",
        ],
      );
      B.mc(
        "For " + m(list(d)) + ", the mean deviation about the median is",
        m(md),
        [
          [
            m(3 * a),
            "This is the mean deviation about the mean for these data.",
          ],
          [
            m(f(5 * a, 4)),
            "The total absolute deviation must include the distant largest observation.",
          ],
          [m(9 * a), "This is the range."],
        ],
        [
          "The median is " + m(f(5 * a, 2)) + ".",
          "The absolute deviations total " +
            m(10 * a) +
            ", so their average is " +
            m(f(10 * a, 4)) +
            ".",
        ],
        [
          "Find the median from the two central values.",
          "Measure all four absolute distances from it.",
          "Divide their sum by four.",
        ],
        3,
      );
      B.frq(
        "vsaq",
        "The minimum observation is " +
          m(-a) +
          " and the range is " +
          m(7 * a) +
          ".",
        [
          part(
            "Find the maximum observation.",
            m(6 * a) + ".",
            "Maximum = minimum + range = -a+7a.",
            "Uses the range relation.",
            "Handles the negative minimum.",
          ),
        ],
        [
          "Range equals maximum minus minimum.",
          "Rearrange for maximum.",
          "Add the signed minimum.",
        ],
        ["Adding the magnitude of the minimum instead of its signed value."],
        2,
      );
      B.frq(
        "vsaq",
        "The observations are " + m(list([k, k, k, k])) + ".",
        [
          part(
            "Find the mean deviation about the mean.",
            m(0) + ".",
            "The mean equals every observation, so all deviations are zero.",
            "Finds the common mean.",
            "Concludes zero mean deviation.",
          ),
        ],
        [
          "Find the mean of identical observations.",
          "Compare each observation with that mean.",
          "Average the zero deviations.",
        ],
        ["Reporting the common observation as the spread."],
        2,
      );
      B.frq(
        "saq",
        "Find the mean deviation about the mean of " +
          m(list([a, 2 * a, 4 * a, 5 * a])) +
          ".",
        [
          part(
            "Show the calculation.",
            m(f(3 * a, 2)) + ".",
            "The mean is 3a=" +
              3 * a +
              ". The absolute deviations are " +
              m(list([2 * a, a, a, 2 * a])) +
              ", totalling 6a=" +
              6 * a +
              ". Divide by 4.",
            "Finds the mean.",
            "Computes absolute deviations.",
            "Finds their average.",
          ),
        ],
        [
          "Calculate the mean first.",
          "Take distances from it, without signs.",
          "Divide by the number of observations.",
        ],
        ["Cancelling positive and negative deviations."],
      );
      B.frq(
        "laq",
        "Two data sets are " +
          m("A=\\{" + list([k - a, k, k + a]) + "\\}") +
          " and " +
          m("B=\\{" + list([k - 3 * a, k, k + 3 * a]) + "\\}") +
          ".",
        [
          part(
            "Find the mean and range of each.",
            "Both means are " +
              m(k) +
              "; ranges are " +
              m(2 * a) +
              " and " +
              m(6 * a) +
              ".",
            "Each set is symmetric about k; use its largest and smallest values for the range.",
            "Finds both means.",
            "Finds both ranges.",
          ),
          part(
            "Find their mean deviations about the mean and compare the spread.",
            m(f(2 * a, 3)) +
              " and " +
              m(2 * a) +
              ". B has three times the mean deviation of A.",
            "The absolute-deviation totals are " +
              m(2 * a) +
              " and " +
              m(6 * a) +
              " respectively; divide each by 3.",
            "Computes A's mean deviation.",
            "Computes B's mean deviation.",
            "Makes the correct comparison.",
          ),
        ],
        [
          "Both triples have the same centre.",
          "Compare distances from that centre.",
          "Use the same denominator for the two averages.",
        ],
        ["Inferring equal spread from equal means."],
      );
      B.frq(
        "case",
        "A data set has mean " +
          m(k) +
          " and mean deviation about the mean " +
          m(a) +
          ". Every observation is replaced by " +
          m("y=3x+4") +
          ".",
        [
          part(
            "Find the new mean.",
            m(3 * k + 4) + ".",
            "Apply the linear transformation to the mean.",
            "Transforms the mean.",
          ),
          part(
            "Express a new deviation using an old one.",
            m("y-\\bar y=3(x-\\bar x)") + ".",
            "The added 4 cancels in the subtraction.",
            "Cancels the shift correctly.",
          ),
          part(
            "Find the new mean deviation and explain why adding 4 does not increase it.",
            m(3 * a) + ".",
            "Absolute deviations are multiplied by 3; the uniform shift changes no distances from the mean.",
            "Scales absolute deviations.",
            "Distinguishes translation from a change in spread.",
          ),
        ],
        [
          "Transform the mean with the observations.",
          "Subtract before taking absolute values.",
          "Only the multiplicative factor changes the spread.",
        ],
        ["Adding the translation constant to mean deviation."],
      );
    } else if (topic === "5.2") {
      const xs = [k - 2 * a, k - a, k, k + a, k + 2 * a];
      B.mc(
        "The variance of " + m(list(xs)) + ", using divisor n, is",
        m(2 * a * a),
        [
          [
            m(10 * a * a),
            "This is the sum of squared deviations, before division.",
          ],
          [m(0), "Signed deviations cancel, but their squares do not."],
          [
            m(f(5 * a * a, 2)),
            "This uses divisor n-1 rather than the stated divisor n.",
          ],
        ],
        [
          "The mean is " +
            m(k) +
            ". Squared deviations sum to " +
            m(10 * a * a) +
            ".",
          "Divide by five to get " + m(2 * a * a) + ".",
        ],
        [
          "Find the centre.",
          "Square the five deviations.",
          "Use the stated denominator.",
        ],
        3,
      );
      B.mc(
        "A data set has variance " +
          m(9 * a * a) +
          ". Its standard deviation is",
        m(3 * a),
        [
          [m(9 * a * a), "This is the variance, not its square root."],
          [m(-3 * a), "Standard deviation is nonnegative."],
          [m(9 * a), "Take the square root of the entire variance."],
        ],
        [
          "Standard deviation is the nonnegative square root of variance.",
          m("\\sigma=\\sqrt{" + 9 * a * a + "}=" + 3 * a) + ".",
        ],
        [
          "Recall the relation between variance and standard deviation.",
          "Take the square root.",
          "Use the nonnegative value.",
        ],
      );
      B.mc(
        "Each observation is multiplied by " +
          m(-a) +
          ". If the original variance is 4, the new variance is",
        m(4 * a * a),
        [
          [m(-4 * a), "Variance cannot be negative, and scaling is quadratic."],
          [m(4 * a), "This scales variance linearly instead of quadratically."],
          [
            m(4),
            "Multiplication changes deviations unless its magnitude is 1.",
          ],
        ],
        [
          "Deviations multiply by -a; their squares multiply by a squared.",
          "Thus the new variance is " + m("4(" + a + ")^2=" + 4 * a * a) + ".",
        ],
        [
          "Track how each deviation changes.",
          "Then square the changed deviation.",
          "Variance uses the square of the scale.",
        ],
      );
      B.mc(
        "For n=5 observations, " +
          m("\\sum x_i=" + 5 * k) +
          " and " +
          m("\\sum x_i^2=" + (5 * k * k + 10 * a * a)) +
          ". Their variance is",
        m(2 * a * a),
        [
          [
            m(k * k + 2 * a * a),
            "This is the mean of the squares, before subtracting the squared mean.",
          ],
          [m(10 * a * a), "The sums have not been divided by n."],
          [m(2 * a * a - k), "Subtract mean squared, not an extra mean."],
        ],
        [
          "The mean is " +
            m(k) +
            " and mean square is " +
            m(k * k + 2 * a * a) +
            ".",
          "Variance = mean square - square of mean = " + m(2 * a * a) + ".",
        ],
        [
          "Divide both sums by n in their appropriate formulas.",
          "Square the mean.",
          "Subtract from the mean of squares.",
        ],
        3,
      );
      B.mc(
        "A data set has standard deviation " +
          m(a) +
          ". Adding 10 to every observation changes the standard deviation to",
        m(a),
        [
          [
            m(a + 10),
            "A common translation leaves deviations from the mean unchanged.",
          ],
          [
            m(a * a),
            "This is the old variance, not a shifted standard deviation.",
          ],
          [m(10 * a), "Adding 10 does not multiply the spread."],
        ],
        [
          "The mean increases by 10 as well.",
          "The deviations, their squares, and hence standard deviation are unchanged.",
        ],
        [
          "Track the new mean.",
          "Subtract it from each new observation.",
          "Check whether the added constant survives.",
        ],
      );
      B.frq(
        "vsaq",
        "The standard deviation of a data set is " + m(a + 1) + ".",
        [
          part(
            "Find its variance.",
            m((a + 1) ** 2) + ".",
            "Square the standard deviation.",
            "Uses variance = standard deviation squared.",
            "Computes the square.",
          ),
        ],
        [
          "Standard deviation is the square root of variance.",
          "Reverse that operation.",
          "Square the given value.",
        ],
        ["Taking a second square root."],
        2,
      );
      B.frq(
        "vsaq",
        "A data set contains four identical observations, all equal to " +
          m(k) +
          ".",
        [
          part(
            "State its variance and standard deviation.",
            m("0,\\ 0") + ".",
            "Every deviation from the mean is zero.",
            "Recognises zero variance.",
            "Takes its square root.",
          ),
        ],
        [
          "The common value is also the mean.",
          "All deviations vanish.",
          "Both measures therefore vanish.",
        ],
        ["Confusing a nonzero mean with nonzero dispersion."],
        2,
      );
      B.frq(
        "saq",
        "Find the variance and standard deviation of " +
          m(list([a, 3 * a, 5 * a])) +
          ", using divisor n.",
        [
          part(
            "Show both calculations.",
            m(f(8 * a * a, 3)) +
              " and " +
              m("\\sqrt{" + f(8 * a * a, 3) + "}") +
              ".",
            "The mean is " +
              m(3 * a) +
              ". Squared deviations are " +
              m(4 * a * a) +
              ", 0, " +
              m(4 * a * a) +
              ". Average over three observations and take the square root.",
            "Finds the mean.",
            "Computes variance with divisor 3.",
            "Takes the nonnegative square root.",
          ),
        ],
        [
          "The middle value is the mean.",
          "Square the two equal nonzero deviations.",
          "Divide by three before taking the square root.",
        ],
        ["Dividing by only the number of nonzero deviations."],
      );
      B.frq(
        "laq",
        "A set of five observations was recorded as " +
          m(list([k - a, k, k + a, k + 2 * a, k + 3 * a])) +
          ". The last entry should have been " +
          m(k + 4 * a) +
          ".",
        [
          part(
            "Find the corrected mean.",
            m(f(5 * k + 6 * a, 5)) + ".",
            "Replace the incorrect last value; the corrected sum is " +
              m(5 * k + 6 * a) +
              ".",
            "Adjusts the total by the correction.",
            "Divides by five.",
          ),
          part(
            "Find the corrected variance.",
            m(f(74 * a * a, 25)) + ".",
            "After subtracting k from every observation, the values are -a,0,a,2a,4a. Their mean is 6a/5 and mean square is 22a squared/5. Subtracting the squared mean gives 74a squared/25.",
            "Uses the corrected squared sum.",
            "Computes the corrected mean square.",
            "Subtracts the square of the corrected mean.",
          ),
        ],
        [
          "Correct the observation before computing summaries.",
          "A common translation can simplify arithmetic.",
          "Recompute both mean and mean square.",
        ],
        ["Correcting the mean but leaving the old sum of squares."],
        3,
      );
      B.frq(
        "case",
        "Five readings have mean " +
          m(k) +
          " and variance " +
          m(a * a) +
          ", using divisor 5. A sixth reading equal to the existing mean is added.",
        [
          part(
            "Find the new mean.",
            m(k) + ".",
            "The total changes from 5k to 6k, so the mean stays k.",
            "Calculates the new mean.",
          ),
          part(
            "Find the new sum of squared deviations.",
            m(5 * a * a) + ".",
            "The first five deviations are unchanged; the sixth deviation is zero.",
            "Retains the existing squared-deviation sum.",
          ),
          part(
            "Find the new variance and compare it with the old variance.",
            m(f(5 * a * a, 6)) + ", which is smaller.",
            "Divide the unchanged squared-deviation sum by 6 instead of 5.",
            "Uses the new denominator.",
            "Explains the decrease.",
          ),
        ],
        [
          "The added value equals the centre.",
          "It contributes zero squared deviation.",
          "The observation count still increases.",
        ],
        ["Keeping the old denominator after adding a value."],
      );
    } else {
      const x = [a, 2 * a, 3 * a],
        freq = [1, 2, 1];
      B.mc(
        "For the frequency distribution " + m(table(x, freq)) + ", the mean is",
        m(2 * a),
        [
          [
            m(6 * a),
            "This adds the distinct values without weights or averaging.",
          ],
          [
            m(f(8 * a, 3)),
            "Divide by total frequency 4, not the number of rows 3.",
          ],
          [m(a), "The lowest value is not the weighted mean."],
        ],
        [
          "The total frequency is 4.",
          "The weighted sum is " +
            m(a + "+2(" + 2 * a + ")+" + 3 * a + "=" + 8 * a) +
            ", giving mean " +
            m(2 * a) +
            ".",
        ],
        [
          "Multiply each value by its frequency.",
          "Add the frequencies separately.",
          "Divide weighted total by total frequency.",
        ],
      );
      B.mc(
        "For " +
          m(table(x, freq)) +
          ", the variance using total frequency as divisor is",
        m(f(a * a, 2)),
        [
          [m(a * a), "The middle value occurs twice and has zero deviation."],
          [m(2 * a * a), "This is the weighted sum of squared deviations."],
          [
            m(f(2 * a * a, 3)),
            "Use total frequency 4, not the three listed values.",
          ],
        ],
        [
          "The mean is " + m(2 * a) + ".",
          "Weighted squared deviations sum to " +
            m(2 * a * a) +
            "; dividing by 4 gives " +
            m(f(a * a, 2)) +
            ".",
        ],
        [
          "Find the weighted mean.",
          "Multiply squared deviations by frequencies.",
          "Divide by the total number of observations.",
        ],
        3,
      );
      const low = 10 * a;
      B.mc(
        "For the class interval " +
          m(low + "-" + (low + 10)) +
          ", the class mark used in grouped calculations is",
        m(low + 5),
        [
          [m(10), "This is the class width."],
          [m(low), "This is the lower endpoint, not the midpoint."],
          [m(low + 10), "This is the upper endpoint."],
        ],
        [
          "Average the two class boundaries.",
          m("(" + low + "+" + (low + 10) + ")/2=" + (low + 5)) + ".",
        ],
        [
          "A class mark represents the centre of the interval.",
          "Add the boundaries.",
          "Divide by two.",
        ],
      );
      B.mc(
        "For the distribution " +
          m(table([10 * a + 5, 10 * a + 15, 10 * a + 25], [2, a, 3])) +
          ", which denominator belongs in the variance formula?",
        "The sum of all frequencies",
        [
          [
            "The number of classes",
            "A class may contain more than one observation.",
          ],
          [
            "The sum of class marks",
            "Class marks are measurement values, not observation counts.",
          ],
          [
            "The largest frequency",
            "Every observation contributes to variance, not only the largest class.",
          ],
        ],
        [
          "Each listed frequency counts observations at a representative class mark.",
          "The total number represented is the sum of all frequencies.",
        ],
        [
          "Ask how many observations the table represents.",
          "Include the counts from every class.",
          "Use that total to average squared deviations.",
        ],
      );
      B.mc(
        "The observations in a frequency table are multiplied by " +
          m(a) +
          " while frequencies stay unchanged. If the old standard deviation is 3, the new one is",
        m(3 * a),
        [
          [
            m(3 * a * a),
            "This scales standard deviation as though it were variance.",
          ],
          [m(3 + a), "Multiplication of data is not addition of spread."],
          [m(3), "Changing the observation scale changes dispersion."],
        ],
        [
          "Each deviation multiplies by a, and a is positive.",
          "Standard deviation therefore becomes " + m(3 * a) + ".",
        ],
        [
          "Track the scale of the observation values.",
          "Standard deviation has the same units as the data.",
          "Use the absolute scale factor.",
        ],
      );
      B.frq(
        "vsaq",
        "A table has frequencies " + m("2," + (a + 1) + ",3") + ".",
        [
          part(
            "Find the total number of observations.",
            m(a + 6) + ".",
            "Add all frequencies.",
            "Adds the frequencies.",
            "Distinguishes count from number of classes.",
          ),
        ],
        [
          "Frequencies are counts.",
          "Add every row's count.",
          "There are three classes but more than three observations.",
        ],
        ["Using the number of classes as sample size."],
        2,
      );
      B.frq(
        "vsaq",
        "The consecutive classes are " +
          m(low + "-" + (low + 10)) +
          ", " +
          m(low + 10 + "-" + (low + 20)) +
          " and " +
          m(low + 20 + "-" + (low + 30)) +
          ".",
        [
          part(
            "Write the three class marks.",
            m(list([low + 5, low + 15, low + 25])) + ".",
            "Take the midpoint of each class.",
            "Finds all midpoints.",
            "Keeps the constant class spacing.",
          ),
        ],
        [
          "Average the boundaries of the first class.",
          "Apply the same calculation to each class.",
          "Check the equal spacing of the class marks.",
        ],
        ["Using upper boundaries as class marks."],
        2,
      );
      B.frq(
        "saq",
        "For " +
          m(table(x, [2, 1, 2])) +
          ", find mean deviation about the mean.",
        [
          part(
            "Calculate the weighted mean and mean deviation.",
            m("\\bar x=" + 2 * a + ",\\quad\\mathrm{MD}=" + f(4 * a, 5)) + ".",
            "The weighted sum is 10a and total frequency is 5. Absolute deviations from 2a have weighted sum 4a.",
            "Finds the weighted mean.",
            "Weights the absolute deviations.",
            "Divides by total frequency.",
          ),
        ],
        [
          "Use frequencies in the mean.",
          "Weight absolute deviations too.",
          "Divide by the same total count.",
        ],
        ["Using frequencies for the mean but not for dispersion."],
      );
      B.frq(
        "laq",
        "The classes " +
          m(low + "-" + (low + 10)) +
          ", " +
          m(low + 10 + "-" + (low + 20)) +
          " and " +
          m(low + 20 + "-" + (low + 30)) +
          " have frequencies 2, 4 and 2.",
        [
          part(
            "Find the grouped mean.",
            m(low + 15) + ".",
            "The class marks are " +
              m(list([low + 5, low + 15, low + 25])) +
              ". Symmetric frequencies give the middle class mark as mean.",
            "Finds the class marks.",
            "Uses their weighted mean.",
          ),
          part(
            "Find the variance and standard deviation using the class-mark approximation.",
            m("50") + " and " + m("5\\sqrt2") + ".",
            "Deviations are -10,0,10, so the weighted squared sum is 2(100)+4(0)+2(100)=400. Divide by 8 and take the square root.",
            "Computes weighted squared deviations.",
            "Divides by the total frequency.",
            "Finds the nonnegative standard deviation.",
          ),
        ],
        [
          "Use midpoints, not interval endpoints.",
          "The frequency pattern is symmetric.",
          "This grouped result uses representative class marks.",
        ],
        [
          "Presenting class-mark calculations as exact knowledge of individual observations.",
        ],
      );
      B.frq(
        "case",
        "A grouped table is " +
          m(
            table(
              [low + 5, low + 15, low + 25],
              [1, 2, 1],
              "\\text{class mark}",
            ),
          ) +
          ". All class marks are shifted upward by 20, with frequencies unchanged.",
        [
          part(
            "Find the original mean and variance.",
            m(low + 15) + " and " + m(50) + ".",
            "The weighted mean is the middle mark. Squared deviations sum to 100+0+100=200 over four observations.",
            "Finds the original mean.",
            "Computes the weighted variance.",
          ),
          part(
            "Find the shifted mean.",
            m(low + 35) + ".",
            "Every represented observation increases by 20, so the mean does too.",
            "Shifts the mean.",
          ),
          part(
            "Find the shifted variance and explain.",
            m(50) + ".",
            "The shifted mean and class marks differ by exactly the old deviations.",
            "Explains unchanged dispersion.",
          ),
        ],
        [
          "Compute the weighted centre first.",
          "Translate the mean with the class marks.",
          "Subtracting the translated mean cancels the shift.",
        ],
        ["Adding 20 or 400 to the variance."],
      );
    }
  }
  return B.items;
}
