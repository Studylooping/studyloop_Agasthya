import type { Item, ItemFigure } from "@/lib/content/types";
import {
  assertion,
  fraction as f,
  math as m,
  mc,
  part,
  written,
  type Context,
} from "../practice-authoring";

const trig = (name: "sin" | "cos", coefficient: number) =>
  "\\" + name + (coefficient === 1 ? " x" : "(" + coefficient + "x)");

function sineGraph(a: number): ItemFigure {
  const pts = Array.from({ length: 161 }, (_, i) => {
    const t = (2 * Math.PI * i) / 160;
    return (
      (55 + (420 * i) / 160).toFixed(2) +
      "," +
      (175 - 32 * a * Math.sin(t)).toFixed(2)
    );
  }).join(" ");
  return {
    type: "svg",
    title: "A trigonometric graph over one cycle",
    description:
      "A smooth sine-shaped curve through (0,0), (pi,0), and (2 pi,0), with maximum " +
      a +
      " at pi/2 and minimum -" +
      a +
      " at 3 pi/2.",
    svg:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 360"><rect width="540" height="360" fill="white"/><g stroke="#cbd5e1"><path d="M55 ' +
      (175 - 32 * a) +
      "H475M55 " +
      (175 + 32 * a) +
      'H475"/></g><path d="M35 175H495M55 335V15" stroke="#334155" fill="none" stroke-width="2"/><polyline points="' +
      pts +
      '" fill="none" stroke="#2563eb" stroke-width="3"/><g font-family="Arial" font-size="15" fill="#0f172a"><text x="33" y="194">0</text><text x="140" y="194">&#960;/2</text><text x="259" y="194">&#960;</text><text x="349" y="194">3&#960;/2</text><text x="463" y="194">2&#960;</text><text x="23" y="' +
      (180 - 32 * a) +
      '">' +
      a +
      '</text><text x="17" y="' +
      (180 + 32 * a) +
      '">-' +
      a +
      '</text><text x="501" y="173">x</text><text x="65" y="22">y</text></g></svg>',
  };
}

export function trigonometryExpansion(
  topic: "1.6" | "1.7" | "1.8" | "1.9",
): Item[] {
  const c: Context = {
      unit: "u1-sets-functions",
      topic,
      chapter: 3,
      version: "0.3.1",
    },
    out: Item[] = [];
  const triples = [
    [3, 4, 5],
    [5, 12, 13],
    [8, 15, 17],
    [7, 24, 25],
  ];
  for (let v = 0; v < 4; v++) {
    const j = v * 10,
      [p, q, r] = triples[v],
      n = v + 2;
    if (topic === "1.6") {
      const degrees = [135, 150, 210, 240][v],
        num = [3, 5, 7, 4][v],
        den = [4, 6, 6, 3][v];
      out.push(
        mc(
          c,
          j,
          "Express " + m(degrees + "^\\circ") + " in radians.",
          2,
          "degrees_radians",
          m(f(num, den, "\\pi")),
          [
            [
              m(f(degrees, 90, "\\pi")),
              "The conversion factor is pi/180, not pi/90.",
            ],
            [m(f(degrees, 360, "\\pi")), "A complete turn is 2 pi, not pi."],
            [
              m(f(180, degrees, "\\pi")),
              "The conversion factor has been inverted.",
            ],
          ],
          [
            "Multiply degrees by " + m("\\pi/180") + ".",
            m(degrees + "\\times\\frac{\\pi}{180}=" + f(num, den, "\\pi")) +
              ".",
          ],
          [
            "A half-turn is pi radians.",
            "Use degrees times pi/180.",
            "Reduce the fraction.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 1,
          "An arc of length " +
            m(3 * n + "\\,\\text{cm}") +
            " belongs to a circle of radius " +
            m(2 * n + "\\,\\text{cm}") +
            ". Its angle at the centre is",
          2,
          "arc_radian",
          m("\\frac32\\,\\text{rad}"),
          [
            [
              m("\\frac23\\,\\text{rad}"),
              "The angle is arc length divided by radius, not the reverse.",
            ],
            [m("3\\,\\text{rad}"), "The radius factor of 2 has been omitted."],
            [
              m("1.5^\\circ"),
              "The ratio of arc length to radius gives radians, not degrees.",
            ],
          ],
          [
            m("s=r\\theta") + " holds when theta is in radians.",
            m("\\theta=" + 3 * n + "/" + 2 * n + "=3/2") + " radians.",
          ],
          [
            "Use the arc-length formula.",
            "Ensure angle units are radians.",
            "Divide arc length by radius.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 2,
          "If " +
            m("\\sin\\theta=" + f(p, r)) +
            " and " +
            m("\\pi/2<\\theta<\\pi") +
            ", then " +
            m("\\cos\\theta") +
            " equals",
          3,
          "quadrant_sign",
          m(f(-q, r)),
          [
            [m(f(q, r)), "Cosine is negative in the second quadrant."],
            [
              m(f(-p, r)),
              "The cosine magnitude must be found from the identity, not copied from sine.",
            ],
            [m(f(-q, p)), "This is a ratio involving tangent, not cosine."],
          ],
          [
            m(
              "\\cos^2\\theta=1-" +
                p * p +
                "/" +
                r * r +
                "=" +
                q * q +
                "/" +
                r * r,
            ) + ".",
            "Choose the negative root because theta is in quadrant II.",
          ],
          [
            "Use sine squared plus cosine squared equals one.",
            "Find the magnitude first.",
            "Then use the quadrant to choose the sign.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 3,
          "Evaluate " + m("\\sin(" + (360 * n + 30) + "^\\circ)") + ".",
          2,
          "periodic_reduction",
          m("\\frac12"),
          [
            [
              m("-\\frac12"),
              "Subtracting full turns does not change sine's sign.",
            ],
            [
              m("\\frac{\\sqrt3}{2}"),
              "This is sine of 60 degrees, not 30 degrees.",
            ],
            [m("0"), "The remaining angle is not a multiple of 180 degrees."],
          ],
          [
            "Subtract " +
              m(n + "\\times360^\\circ") +
              " to reduce the angle to " +
              m("30^\\circ") +
              ".",
            "Sine has period " +
              m("360^\\circ") +
              ", so the value is " +
              m("1/2") +
              ".",
          ],
          [
            "Remove complete revolutions.",
            "Identify the reference angle.",
            "Use its standard sine value.",
          ],
        ),
      );
      out.push(
        assertion(
          c,
          j + 4,
          m("\\tan(" + (180 * n + 45) + "^\\circ)=1") + ".",
          "The tangent function has period " + m("180^\\circ") + ".",
          0,
          "Both statements are true; reducing by " +
            m(n + "\\times180^\\circ") +
            " leaves 45 degrees, whose tangent is 1.",
          "tangent_period",
        ),
      );
      out.push(
        written(
          c,
          j + 5,
          "vsaq",
          "An angle measures " + m(f(2 * n + 1, 6, "\\pi")) + " radians.",
          2,
          "radians_degrees",
          [
            part(
              "Convert the angle to degrees.",
              m(30 * (2 * n + 1) + "^\\circ") + ".",
              "Multiply by " + m("180/\\pi") + ".",
              "Uses the correct conversion factor.",
              "Simplifies correctly.",
            ),
          ],
          [
            "Pi radians equals 180 degrees.",
            "Multiply by 180/pi.",
            "Cancel pi before calculating.",
          ],
          ["Multiplying radians by pi/180."],
        ),
      );
      out.push(
        written(
          c,
          j + 6,
          "vsaq",
          "The terminal arm of an angle passes through " +
            m("(" + -q + "," + -p + ")") +
            ".",
          2,
          "coordinate_trig",
          [
            part(
              "Find sine and cosine of the angle.",
              m(
                "\\sin\\theta=" + f(-p, r) + ",\\quad\\cos\\theta=" + f(-q, r),
              ) + ".",
              "The distance from the origin is " +
                m("\\sqrt{" + q * q + "+" + p * p + "}=" + r) +
                ". Use y/r and x/r.",
              "Finds the positive radius.",
              "Uses signed coordinates in both ratios.",
            ),
          ],
          [
            "Compute the distance from the origin.",
            "Sine uses the vertical coordinate.",
            "Cosine uses the horizontal coordinate.",
          ],
          ["Using a negative radius in the third quadrant."],
        ),
      );
      out.push(
        written(
          c,
          j + 7,
          "saq",
          "Suppose " +
            m("\\tan\\theta=" + f(-p, q)) +
            " and theta lies in quadrant IV.",
          3,
          "recover_trig",
          [
            part(
              "Find sine, cosine, and secant of theta.",
              m(
                "\\sin\\theta=" +
                  f(-p, r) +
                  ",\\ \\cos\\theta=" +
                  f(q, r) +
                  ",\\ \\sec\\theta=" +
                  f(r, q),
              ) + ".",
              "Choose a positive horizontal coordinate " +
                m(q) +
                " and negative vertical coordinate " +
                m(-p) +
                ". The radius is " +
                m(r) +
                ".",
              "Uses the quadrant signs.",
              "Finds sine and cosine.",
              "Takes the reciprocal for secant.",
            ),
          ],
          [
            "Tangent fixes the vertical-to-horizontal ratio.",
            "Choose signs consistent with quadrant IV.",
            "Find the hypotenuse and then the ratios.",
          ],
          [
            "Treating a negative tangent as a negative cosine in every quadrant.",
          ],
        ),
      );
      out.push(
        written(
          c,
          j + 8,
          "laq",
          "Let " + m("\\sin\\theta=" + f(p, r)) + " with theta in quadrant II.",
          3,
          "trig_ratios_combination",
          [
            part(
              "Find cosine, tangent, cosecant, secant and cotangent.",
              m(
                "\\cos\\theta=" +
                  f(-q, r) +
                  ",\\ \\tan\\theta=" +
                  f(-p, q) +
                  ",\\ \\csc\\theta=" +
                  f(r, p) +
                  ",\\ \\sec\\theta=" +
                  f(-r, q) +
                  ",\\ \\cot\\theta=" +
                  f(-q, p),
              ) + ".",
              "First use the Pythagorean identity and the quadrant sign for cosine. Form each quotient or reciprocal.",
              "Obtains cosine with its sign.",
              "Obtains tangent and cotangent.",
              "Obtains secant and cosecant.",
            ),
            part(
              "Evaluate " +
                m(
                  "\\frac{\\sin\\theta+\\cos\\theta}{\\sin\\theta-\\cos\\theta}",
                ) +
                ".",
              m(f(p - q, p + q)) + ".",
              "Substitute the signed values; their common denominator cancels.",
              "Substitutes signed values.",
              "Simplifies the resulting fraction.",
            ),
          ],
          [
            "Find cosine before the remaining ratios.",
            "Use reciprocal and quotient definitions.",
            "Keep the negative cosine sign in the final expression.",
          ],
          ["Dropping the quadrant sign in a later substitution."],
        ),
      );
      out.push(
        written(
          c,
          j + 9,
          "case",
          "A circular sector has radius " +
            m(4 * n + "\\,\\text{cm}") +
            " and central angle " +
            m(f(3, 4) + "\\,\\text{rad}") +
            ".",
          3,
          "sector_radian_application",
          [
            part(
              "Find its arc length.",
              m(3 * n + "\\,\\text{cm}") + ".",
              "Use " + m("s=r\\theta") + ".",
              "Calculates the arc length.",
            ),
            part(
              "Find its area.",
              m(6 * n * n + "\\,\\text{cm}^2") + ".",
              "Use " + m("A=\\frac12r^2\\theta") + ".",
              "Calculates the sector area.",
            ),
            part(
              "A second sector has twice the radius but the same arc length. Find its angle and the ratio of its area to the first area.",
              m("\\theta_2=3/8\\,\\text{rad},\\quad A_2/A_1=2") + ".",
              "For fixed s, theta=s/r halves. Also " +
                m("A=rs/2") +
                ", so doubling r doubles the area.",
              "Finds the halved angle.",
              "Justifies the area ratio.",
            ),
          ],
          [
            "Use radians in both sector formulas.",
            "For fixed arc length, angle varies inversely with radius.",
            "Eliminate theta from the area formula.",
          ],
          ["Assuming fixed arc length also means fixed angle."],
        ),
      );
    } else if (topic === "1.7") {
      const amp = v + 1;
      out.push(
        mc(
          c,
          j,
          "One complete cycle of a sinusoidal function is shown. Its range is",
          2,
          "sine_graph_range",
          m("[" + -amp + "," + amp + "]"),
          [
            [
              m("(" + -amp + "," + amp + ")"),
              "The maximum and minimum are attained.",
            ],
            [m("[0," + amp + "]"), "The graph also has negative values."],
            [m("\\mathbb R"), "The vertical extent is bounded."],
          ],
          [
            "The graph reaches a maximum of " +
              m(amp) +
              " and minimum of " +
              m(-amp) +
              ".",
            "Both endpoints belong to the range.",
          ],
          [
            "Read the highest and lowest y-values.",
            "Check whether those values are attained.",
            "Range concerns y-values, not x-values.",
          ],
          sineGraph(amp),
        ),
      );
      out.push(
        mc(
          c,
          j + 1,
          "For real x, the minimum value of " +
            m(n + "+" + (n + 1) + "\\cos x") +
            " is",
          2,
          "shifted_cosine_range",
          m(-1),
          [
            [m(2 * n + 1), "This is the maximum, obtained when cosine is 1."],
            [m(n), "Cosine can be negative, not only zero or positive."],
            [m(-(n + 1)), "The vertical shift must also be included."],
          ],
          [
            m("-1\\le\\cos x\\le1") + ".",
            "The minimum occurs at cosine = -1 and is " +
              m(n + "-" + (n + 1) + "=-1") +
              ".",
          ],
          [
            "Start with the range of cosine.",
            "The coefficient is positive.",
            "Apply the scale and then the shift.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 2,
          "Which input is excluded from the domain of " +
            m("f(x)=\\tan x") +
            "?",
          2,
          "tangent_domain",
          m(f(2 * n + 1, 2, "\\pi")),
          [
            [m(n + "\\pi"), "Cosine is nonzero at an integer multiple of pi."],
            [
              m(f(4 * n + 1, 4, "\\pi")),
              "An odd multiple of pi/4 has nonzero cosine.",
            ],
            [m("0"), "Tangent is defined and equals zero at the origin."],
          ],
          [
            "Tangent equals sine divided by cosine.",
            "The excluded inputs satisfy " +
              m("\\cos x=0") +
              ", namely odd multiples of " +
              m("\\pi/2") +
              ".",
          ],
          [
            "Use tangent as a quotient.",
            "Identify zeros of the denominator.",
            "Test the options against that condition.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 3,
          "The least positive period of " + m("f(x)=\\sin(" + n + "x)") + " is",
          2,
          "scaled_period",
          m(f(2, n, "\\pi")),
          [
            [
              m(2 * n + "\\pi"),
              "Multiplying the input compresses, not stretches, the period.",
            ],
            [
              m("2\\pi"),
              "This is a period but not the least one for this integer multiplier.",
            ],
            [
              m(f(1, n, "\\pi")),
              "This changes sine's sign rather than completing a full cycle.",
            ],
          ],
          [
            "A full repeat needs the argument to increase by " +
              m("2\\pi") +
              ".",
            "Thus " +
              m(n + "T=2\\pi") +
              ", giving " +
              m("T=" + f(2, n, "\\pi")) +
              ".",
          ],
          [
            "A sine cycle spans 2 pi in its argument.",
            "Let T be the input increment.",
            "Solve nT=2 pi for the least positive T.",
          ],
        ),
      );
      out.push(
        assertion(
          c,
          j + 4,
          "The domain of " +
            m("f(x)=\\csc x") +
            " includes " +
            m(n + "\\pi") +
            ".",
          "Cosecant is the reciprocal of sine.",
          3,
          "The reason is true, but the assertion is false: sine vanishes at integer multiples of pi, so its reciprocal is undefined there.",
          "cosecant_domain",
        ),
      );
      out.push(
        written(
          c,
          j + 5,
          "vsaq",
          "Consider " + m("f(x)=" + n + "\\sin x-" + (n + 2)) + ".",
          2,
          "sine_affine_range",
          [
            part(
              "Find the range.",
              m("[" + (-2 * n - 2) + ",-2]") + ".",
              "Multiply the sine bounds by " +
                m(n) +
                " and subtract " +
                m(n + 2) +
                ".",
              "Transforms the lower bound.",
              "Transforms the upper bound with inclusion.",
            ),
          ],
          [
            "Use the standard sine bounds.",
            "Apply the same scale to both endpoints.",
            "Apply the vertical shift last.",
          ],
          ["Shifting only one bound."],
        ),
      );
      out.push(
        written(
          c,
          j + 6,
          "vsaq",
          "Let " + m("f(x)=\\sec x") + " and " + m("x=" + n + "\\pi") + ".",
          2,
          "secant_integer_pi",
          [
            part(
              "Find f(x).",
              m(n % 2 === 0 ? 1 : -1) + ".",
              "Since " +
                m("\\cos(n\\pi)=(-1)^n") +
                ", its reciprocal has the same value.",
              "Evaluates cosine at the given input.",
              "Takes the reciprocal.",
            ),
          ],
          [
            "Secant is 1/cosine.",
            "Cosine at successive multiples of pi alternates sign.",
            "The reciprocal of 1 or -1 is itself.",
          ],
          ["Confusing secant with cosecant."],
        ),
      );
      out.push(
        written(
          c,
          j + 7,
          "saq",
          "Let " + m("f(x)=" + n + "-" + (n + 1) + "\\sin x") + ".",
          3,
          "negative_scale_range",
          [
            part(
              "Find the range and one input in " +
                m("[0,2\\pi]") +
                " attaining each endpoint.",
              m("[-1," + (2 * n + 1) + "]") +
                "; minimum at " +
                m("x=\\pi/2") +
                ", maximum at " +
                m("x=3\\pi/2") +
                ".",
              "The negative coefficient reverses order: the largest sine gives the smallest output.",
              "Obtains both bounds.",
              "Gives an input for the minimum.",
              "Gives an input for the maximum.",
            ),
          ],
          [
            "A negative multiplier reverses inequalities.",
            "Check sine equal to 1 and -1.",
            "Use standard angles within the stated interval.",
          ],
          ["Pairing the maximum sine with the maximum output."],
        ),
      );
      out.push(
        written(
          c,
          j + 8,
          "laq",
          "Study " +
            m("f(x)=\\sqrt{" + n + "+" + n + "\\cos x}") +
            " for real x.",
          3,
          "trig_root_range",
          [
            part(
              "Find its domain and range.",
              m("\\mathbb R,\\quad[0,\\sqrt{" + 2 * n + "}]") + ".",
              "The radicand lies in " +
                m("[0," + 2 * n + "]") +
                " for every real x; square root preserves its order.",
              "Bounds the radicand.",
              "Establishes the complete real domain.",
              "Finds the square-root range.",
            ),
            part(
              "Give inputs in " +
                m("[0,2\\pi]") +
                " where the least and greatest values occur.",
              "Least at " +
                m("x=\\pi") +
                "; greatest at " +
                m("x=0") +
                " or " +
                m("2\\pi") +
                ".",
              "The least radicand occurs when cosine is -1, the greatest when cosine is 1.",
              "Identifies the minimum location.",
              "Identifies the maximum locations.",
            ),
          ],
          [
            "Bound the radicand before taking the square root.",
            "Check if it ever becomes negative.",
            "Find standard angles where cosine reaches its endpoints.",
          ],
          ["Excluding radicand zero from a square-root domain."],
        ),
      );
      out.push(
        written(
          c,
          j + 9,
          "case",
          "A graph is described by " +
            m("y=" + n + "\\cos x") +
            " for " +
            m("0\\le x\\le2\\pi") +
            ".",
          3,
          "cosine_graph_features",
          [
            part(
              "Give its values at 0, pi/2 and pi.",
              m(n + ",\\ 0,\\ " + -n) + ".",
              "Use cosine at the three standard arguments.",
              "Gives the three values.",
            ),
            part(
              "State its range.",
              m("[" + -n + "," + n + "]") + ".",
              "Cosine attains both -1 and 1 on this interval.",
              "Gives both included endpoints.",
            ),
            part(
              "How does replacing x with 2x affect amplitude and the number of complete cycles on the same interval?",
              "Amplitude remains " + m(n) + "; there are two complete cycles.",
              "The coefficient of cosine is unchanged; the input multiplier halves the period from 2 pi to pi.",
              "Distinguishes amplitude from period.",
              "Counts two cycles.",
            ),
          ],
          [
            "Use standard cosine values.",
            "The output multiplier controls amplitude.",
            "The input multiplier changes the period.",
          ],
          ["Doubling amplitude when the input is doubled."],
        ),
      );
    } else if (topic === "1.8") {
      const [s, t, u] = triples[(v + 1) % 4],
        D = r * u,
        plus = p * t + q * s,
        minus = p * t - q * s,
        cp = q * t - p * s;
      out.push(
        mc(
          c,
          j,
          "Angles A and B are acute, with " +
            m("\\sin A=" + f(p, r)) +
            " and " +
            m("\\sin B=" + f(s, u)) +
            ". Find " +
            m("\\sin(A+B)") +
            ".",
          3,
          "sine_addition",
          m(f(plus, D)),
          [
            [
              m(f(p * u + s * r, D)),
              "Sine of a sum is not the sum of the sines.",
            ],
            [
              m(f(minus, D)),
              "The addition identity has a plus sign between the two products.",
            ],
            [
              m(f(cp, D)),
              "This is the cosine-addition expression, not sine-addition.",
            ],
          ],
          [
            "The acute-angle conditions give " +
              m("\\cos A=" + f(q, r) + ",\\ \\cos B=" + f(t, u)) +
              ".",
            m("\\sin(A+B)=\\sin A\\cos B+\\cos A\\sin B=" + f(plus, D)) + ".",
          ],
          [
            "Recover both cosines with positive signs.",
            "Use the sine-addition identity.",
            "Put both products over a common denominator.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 1,
          "For acute A and B with " +
            m("\\tan A=" + f(p, q)) +
            " and " +
            m("\\tan B=" + f(s, t)) +
            ", find " +
            m("\\tan(A-B)") +
            ".",
          3,
          "tangent_difference",
          m(f(p * t - q * s, q * t + p * s)),
          [
            [
              m(f(p * t - q * s, q * t - p * s)),
              "The denominator for a difference is 1 plus the product of tangents.",
            ],
            [
              m(f(p * t + q * s, q * t + p * s)),
              "The numerator must subtract the tangents.",
            ],
            [
              m(f(p * t - q * s, q * t)),
              "The denominator correction for the tangent product has been omitted.",
            ],
          ],
          [
            m("\\tan(A-B)=\\frac{\\tan A-\\tan B}{1+\\tan A\\tan B}") + ".",
            "Multiplying numerator and denominator by " +
              m(q * t) +
              " gives " +
              m(f(p * t - q * s, q * t + p * s)) +
              ".",
          ],
          [
            "Use the tangent-difference identity.",
            "Pay attention to the opposite sign in its denominator.",
            "Clear fractional denominators.",
          ],
        ),
      );
      const x = [15, 75, 105, 165][v],
        exact = [
          "\\frac{\\sqrt6-\\sqrt2}{4}",
          "\\frac{\\sqrt6+\\sqrt2}{4}",
          "\\frac{\\sqrt6+\\sqrt2}{4}",
          "\\frac{\\sqrt6-\\sqrt2}{4}",
        ][v];
      out.push(
        mc(
          c,
          j + 2,
          "The exact value of " + m("\\sin " + x + "^\\circ") + " is",
          3,
          "exact_compound_angle",
          m(exact),
          [
            [
              m("-" + exact),
              "Sine is positive for this angle between 0 and 180 degrees.",
            ],
            [
              m(
                exact === "\\frac{\\sqrt6-\\sqrt2}{4}"
                  ? "\\frac{\\sqrt6+\\sqrt2}{4}"
                  : "\\frac{\\sqrt6-\\sqrt2}{4}",
              ),
              "The sum or difference in the compound-angle expression has been swapped.",
            ],
            [m("\\frac12"), "This angle is not 30 or 150 degrees."],
          ],
          [
            "Use " +
              m("\\sin15^\\circ=\\sin(45^\\circ-30^\\circ)") +
              " or " +
              m("\\sin75^\\circ=\\sin(45^\\circ+30^\\circ)") +
              ", together with supplementary-angle symmetry if needed.",
            "Substitution gives " + m(exact) + ".",
          ],
          [
            "Reduce to 15 or 75 degrees using symmetry if needed.",
            "Express that angle using 45 and 30 degrees.",
            "Apply the sine sum or difference formula.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 3,
          "Simplify " +
            m("\\sin(" + n + "x)\\cos x-\\cos(" + n + "x)\\sin x") +
            ".",
          2,
          "recognise_sine_difference",
          m(trig("sin", n - 1)),
          [
            [
              m("\\sin(" + (n + 1) + "x)"),
              "That corresponds to adding, not subtracting, the products.",
            ],
            [
              m(trig("cos", n - 1)),
              "The given pattern is the sine-difference identity.",
            ],
            [
              m("0"),
              "The angles are different, so the products do not generally cancel.",
            ],
          ],
          [
            "Match the expression to " +
              m("\\sin A\\cos B-\\cos A\\sin B=\\sin(A-B)") +
              ".",
            "Take " + m("A=" + n + "x,\\ B=x") + ".",
          ],
          [
            "Identify the two arguments.",
            "Compare with the sine-difference identity.",
            "Subtract the arguments only after applying the identity.",
          ],
        ),
      );
      out.push(
        assertion(
          c,
          j + 4,
          m(
            "\\cos(" +
              n +
              "x+x)=\\cos(" +
              n +
              "x)\\cos x-\\sin(" +
              n +
              "x)\\sin x",
          ) + ".",
          "The cosine of a sum is always the sum of the individual cosines.",
          2,
          "The assertion is the valid cosine-addition formula. The reason is false; for example, cosine(0+0)=1 while cosine(0)+cosine(0)=2.",
          "cosine_addition",
        ),
      );
      out.push(
        written(
          c,
          j + 5,
          "vsaq",
          "Consider " +
            m("\\cos(" + n + "x)\\cos x+\\sin(" + n + "x)\\sin x") +
            ".",
          2,
          "recognise_cosine_difference",
          [
            part(
              "Write it as one trigonometric function.",
              m(trig("cos", n - 1)) + ".",
              "Use " + m("\\cos(A-B)=\\cos A\\cos B+\\sin A\\sin B") + ".",
              "Recognises the cosine-difference identity.",
              "Subtracts the two arguments.",
            ),
          ],
          [
            "Match the product pattern.",
            "The plus between the products means a cosine difference.",
            "Set A=nx and B=x.",
          ],
          ["Replacing the expression by cosine of the sum."],
        ),
      );
      out.push(
        written(
          c,
          j + 6,
          "vsaq",
          "Let " +
            m("A=" + (30 + v * 10) + "^\\circ") +
            " and " +
            m("B=" + (10 + v * 10) + "^\\circ") +
            ".",
          2,
          "product_to_sum",
          [
            part(
              "Express " + m("2\\sin A\\cos B") + " as a sum of two sines.",
              m("\\sin(" + (40 + 20 * v) + "^\\circ)+\\sin20^\\circ") + ".",
              "Use " + m("2\\sin A\\cos B=\\sin(A+B)+\\sin(A-B)") + ".",
              "Applies the product-to-sum identity.",
              "Calculates both arguments.",
            ),
          ],
          [
            "Use the product-to-sum formula for sine times cosine.",
            "Compute both A+B and A-B.",
            "Keep the two sine terms.",
          ],
          ["Using two cosine terms for sine times cosine."],
        ),
      );
      out.push(
        written(
          c,
          j + 7,
          "saq",
          "A and B are acute with " +
            m("\\sin A=" + f(p, r)) +
            " and " +
            m("\\cos B=" + f(t, u)) +
            ".",
          3,
          "cosine_difference_values",
          [
            part(
              "Find " + m("\\cos(A-B)") + ".",
              m(f(q * t + p * s, D)) + ".",
              "The missing values are " +
                m("\\cos A=" + f(q, r)) +
                " and " +
                m("\\sin B=" + f(s, u)) +
                ". Then use " +
                m("\\cos(A-B)=\\cos A\\cos B+\\sin A\\sin B") +
                ".",
              "Finds both missing ratios.",
              "Uses the correct difference formula.",
              "Simplifies the exact value.",
            ),
          ],
          [
            "Acute angles have positive missing ratios.",
            "Cosine of a difference uses a plus between products.",
            "Keep the result as an exact fraction.",
          ],
          ["Choosing a negative missing ratio for an acute angle."],
        ),
      );
      out.push(
        written(
          c,
          j + 8,
          "laq",
          "Let " + m("A=" + n + "x") + " and " + m("B=x") + ".",
          3,
          "sum_to_product_proof",
          [
            part(
              "Derive an expression for sin A + sin B as a product.",
              m("2\\sin\\frac{A+B}{2}\\cos\\frac{A-B}{2}") + ".",
              "Put " +
                m("P=(A+B)/2,\\ Q=(A-B)/2") +
                ". Then " +
                m("A=P+Q,\\ B=P-Q") +
                ". Expand the two sines; the opposite cross terms cancel.",
              "Introduces half-sum and half-difference.",
              "Expands both sine formulas.",
              "Combines the surviving terms.",
            ),
            part(
              "Apply the result to sin(nx)+sin x.",
              m("2\\sin " + f(n + 1, 2, "x") + "\\cos " + f(n - 1, 2, "x")) +
                ".",
              "Substitute A=nx and B=x into the derived formula.",
              "Substitutes the two angles.",
              "Simplifies both half-arguments.",
            ),
          ],
          [
            "Introduce the half-sum and half-difference.",
            "Express A and B as their sum and difference.",
            "Add the two sine expansions.",
          ],
          ["Forgetting the factor 2 in sum-to-product."],
        ),
      );
      out.push(
        written(
          c,
          j + 9,
          "case",
          "A student claims " +
            m(
              "\\frac{\\sin(" +
                n +
                "x)+\\sin x}{\\cos(" +
                n +
                "x)+\\cos x}=\\tan\\frac{" +
                (n + 1) +
                "x}{2}",
            ) +
            " whenever the original quotient is defined.",
          3,
          "identity_with_conditions",
          [
            part(
              "Factor the numerator and denominator using sum-to-product identities.",
              m("N=2\\sin " + f(n + 1, 2, "x") + "\\cos " + f(n - 1, 2, "x")) +
                " and " +
                m(
                  "D=2\\cos " + f(n + 1, 2, "x") + "\\cos " + f(n - 1, 2, "x"),
                ) +
                ".",
              "Apply the sine-sum and cosine-sum identities separately.",
              "Factors both expressions correctly.",
            ),
            part(
              "Verify the claim.",
              "The claim is correct on the stated domain.",
              "Since D is nonzero, both cosine factors are nonzero. Cancel the common one and use sine/cosine=tangent.",
              "Justifies cancellation.",
              "Obtains the tangent quotient.",
            ),
            part(
              "Why must the original domain be retained?",
              "A point where the cancelled factor is zero makes the original quotient undefined.",
              "Algebraic cancellation cannot assign a value to a zero denominator.",
              "Explains the domain restriction.",
            ),
          ],
          [
            "Factor before dividing.",
            "Use the nonzero-denominator condition to justify cancellation.",
            "Do not extend the domain merely because a factor disappears.",
          ],
          [
            "Claiming an identity at points where the original quotient is undefined.",
          ],
        ),
      );
    } else {
      out.push(
        mc(
          c,
          j,
          "If " +
            m("\\tan\\theta=" + f(p, q)) +
            ", then " +
            m("\\sin2\\theta") +
            " equals",
          2,
          "double_sine_tangent",
          m(f(2 * p * q, r * r)),
          [
            [
              m(f(2 * p, q)),
              "The denominator 1+tan squared theta is essential.",
            ],
            [
              m(f(2 * p * q, q * q - p * p)),
              "This uses the denominator from the tangent-double-angle formula.",
            ],
            [
              m(f(q * q - p * p, r * r)),
              "This is cos 2 theta, not sin 2 theta.",
            ],
          ],
          [
            m("\\sin2\\theta=\\frac{2\\tan\\theta}{1+\\tan^2\\theta}") + ".",
            "Substitute and multiply numerator and denominator by " +
              m(q * q) +
              ".",
          ],
          [
            "Use a double-angle expression involving tangent.",
            "The denominator uses a plus sign.",
            "Clear the fractions.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 1,
          "For " +
            m("\\cos\\theta=" + f(q, r)) +
            ", find " +
            m("\\cos2\\theta") +
            ".",
          2,
          "double_cosine",
          m(f(q * q - p * p, r * r)),
          [
            [
              m(f(2 * q, r)),
              "Cosine of twice an angle is not twice its cosine.",
            ],
            [
              m(f(p * p - q * q, r * r)),
              "This reverses the signs in 2 cos squared theta minus 1.",
            ],
            [m(f(q * q, r * r)), "Cos squared theta alone is not cos 2 theta."],
          ],
          [
            m(
              "\\cos2\\theta=2\\cos^2\\theta-1=2(" +
                f(q, r) +
                ")^2-1=" +
                f(q * q - p * p, r * r),
            ) + ".",
          ],
          [
            "Choose the form involving cosine.",
            "Square before doubling.",
            "Subtract one using a common denominator.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 2,
          "If " +
            m("\\tan\\theta=" + f(p, q)) +
            ", find " +
            m("\\tan2\\theta") +
            ".",
          2,
          "double_tangent",
          m(f(2 * p * q, q * q - p * p)),
          [
            [
              m(f(2 * p * q, q * q + p * p)),
              "The denominator is 1 minus tan squared theta.",
            ],
            [
              m(f(2 * p, q)),
              "Twice tangent is not tangent of twice the angle.",
            ],
            [
              m(f(p * q, q * q - p * p)),
              "The factor 2 in the numerator has been dropped.",
            ],
          ],
          [
            m("\\tan2\\theta=\\frac{2\\tan\\theta}{1-\\tan^2\\theta}") + ".",
            "Substitution gives " +
              m(f(2 * p * q, q * q - p * p)) +
              "; the denominator is nonzero.",
          ],
          [
            "Recall the tangent-double-angle identity.",
            "Check the denominator is nonzero.",
            "Clear the fractional terms.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 3,
          "Simplify " + m("3\\sin(" + n + "x)-4\\sin^3(" + n + "x)") + ".",
          2,
          "triple_sine",
          m("\\sin(" + 3 * n + "x)"),
          [
            [
              m("\\sin(" + n + "x)"),
              "The cubic term changes the argument through the triple-angle identity.",
            ],
            [m("3\\sin(" + n + "x)"), "The cubic term cannot be discarded."],
            [
              m("\\cos(" + 3 * n + "x)"),
              "This polynomial is the sine triple-angle formula.",
            ],
          ],
          [
            "Use " +
              m("\\sin3A=3\\sin A-4\\sin^3 A") +
              " with " +
              m("A=" + n + "x") +
              ".",
          ],
          [
            "Identify the triple-angle polynomial.",
            "Treat nx as one angle.",
            "Multiply that whole argument by three.",
          ],
        ),
      );
      out.push(
        assertion(
          c,
          j + 4,
          m("1-\\cos(" + 2 * n + "x)=2\\sin^2(" + n + "x)") + ".",
          "For any angle t, " + m("\\cos2t=1-2\\sin^2t") + ".",
          0,
          "Both are true, and substituting t=nx in the reason and rearranging proves the assertion.",
          "double_angle_rearrangement",
        ),
      );
      out.push(
        written(
          c,
          j + 5,
          "vsaq",
          "Let " + m("\\sin\\theta=" + f(p, r)) + ".",
          2,
          "triple_sine_value",
          [
            part(
              "Find sin 3 theta.",
              m(f(3 * p * r * r - 4 * p * p * p, r * r * r)) + ".",
              "Substitute into " +
                m("\\sin3\\theta=3\\sin\\theta-4\\sin^3\\theta") +
                ".",
              "Uses the triple-angle formula.",
              "Calculates the exact fraction.",
            ),
          ],
          [
            "Use the identity in sine alone.",
            "Cube both numerator and denominator.",
            "Combine the two terms.",
          ],
          ["Using three times sine theta as sine three theta."],
        ),
      );
      out.push(
        written(
          c,
          j + 6,
          "vsaq",
          "Simplify " +
            m("\\frac{1-\\cos(" + 2 * n + "x)}{\\sin(" + 2 * n + "x)}") +
            " where its denominator is nonzero.",
          2,
          "double_angle_quotient",
          [
            part(
              "Write the result as a single trigonometric ratio.",
              m("\\tan(" + n + "x)") + ".",
              "Replace the numerator by " +
                m("2\\sin^2(" + n + "x)") +
                " and the denominator by " +
                m("2\\sin(" + n + "x)\\cos(" + n + "x)") +
                ", then cancel.",
              "Uses both double-angle forms.",
              "Cancels only on the original domain.",
            ),
          ],
          [
            "Use sine squared for the numerator.",
            "Factor the sine of twice the angle.",
            "Keep the original nonzero-denominator condition.",
          ],
          ["Losing the original domain after cancellation."],
        ),
      );
      out.push(
        written(
          c,
          j + 7,
          "saq",
          "Angle theta is acute and " + m("\\cos\\theta=" + f(q, r)) + ".",
          3,
          "triple_cosine_value",
          [
            part(
              "Find cos 3 theta and decide whether it is positive or negative.",
              m(f(4 * q * q * q - 3 * q * r * r, r * r * r)) +
                "; " +
                (4 * q * q * q - 3 * q * r * r > 0 ? "positive." : "negative."),
              "Use " +
                m("\\cos3\\theta=4\\cos^3\\theta-3\\cos\\theta") +
                ". The sign follows from the numerator after substitution.",
              "Uses the triple-angle identity.",
              "Obtains the exact value.",
              "Reads the sign of the result.",
            ),
          ],
          [
            "Triple angle may lie in a different quadrant from theta.",
            "Use the identity in cosine alone.",
            "Determine the sign from the calculated result.",
          ],
          ["Assuming every multiple of an acute angle is acute."],
        ),
      );
      out.push(
        written(
          c,
          j + 8,
          "laq",
          "Suppose " +
            m("\\sin\\theta=" + f(p, r)) +
            " and theta lies in quadrant II.",
          3,
          "double_angle_signed",
          [
            part(
              "Find cos theta and sin 2 theta.",
              m(
                "\\cos\\theta=" +
                  f(-q, r) +
                  ",\\ \\sin2\\theta=" +
                  f(-2 * p * q, r * r),
              ) + ".",
              "The cosine is negative in quadrant II; multiply sine and cosine and then double.",
              "Uses the quadrant sign.",
              "Computes sine of twice the angle.",
            ),
            part(
              "Find cos 2 theta and verify the identity for the two computed double-angle values.",
              m("\\cos2\\theta=" + f(q * q - p * p, r * r)) +
                " and " +
                m("\\sin^22\\theta+\\cos^22\\theta=1") +
                ".",
              "The squared numerators add to " +
                m(
                  "4(" +
                    p * q +
                    ")^2+(" +
                    (q * q - p * p) +
                    ")^2=(" +
                    r * r +
                    ")^2",
                ) +
                ". Divide by " +
                m(r + "^4") +
                ".",
              "Computes cos 2 theta.",
              "Adds the squares using the common denominator.",
              "Verifies unity.",
            ),
          ],
          [
            "Determine the missing ratio with its sign.",
            "Use two different double-angle formulas.",
            "Verify by exact fractions rather than rounded decimals.",
          ],
          ["Taking a positive square root for quadrant-II cosine."],
        ),
      );
      out.push(
        written(
          c,
          j + 9,
          "case",
          "A student writes " +
            m("\\sin(" + 2 * n + "x)=2\\sin(" + n + "x)") +
            " for every real x.",
          3,
          "double_angle_error_analysis",
          [
            part(
              "Use " + m("x=\\pi/" + 2 * n) + " to test the claim.",
              "Left side is 0, right side is 2; the claim is false.",
              "Then nx=pi/2 and 2nx=pi.",
              "Evaluates both sides at the supplied input.",
              "Rejects the universal claim.",
            ),
            part(
              "State the correct identity.",
              m("\\sin(" + 2 * n + "x)=2\\sin(" + n + "x)\\cos(" + n + "x)") +
                ".",
              "The missing factor is cosine of the original argument.",
              "States the corrected formula.",
            ),
            part(
              "At " + m("x=\\pi/" + 6 * n) + ", calculate the correct value.",
              m("\\sqrt3/2") + ".",
              "Here nx=pi/6; use " + m("2(1/2)(\\sqrt3/2)") + ".",
              "Computes the correct exact value.",
            ),
          ],
          [
            "Test the proposed equality at the specified input.",
            "The double-angle formula contains a product.",
            "Use standard sine and cosine values.",
          ],
          ["Treating a trigonometric function as a linear function."],
        ),
      );
    }
  }
  return out;
}
