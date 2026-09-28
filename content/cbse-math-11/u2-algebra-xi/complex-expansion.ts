import { builder } from "../expansion-builder";
import { fraction as f, math as m, part } from "../practice-authoring";

const z = (a: number, b: number) => {
  if (b === 0) return String(a);
  const imaginary = (Math.abs(b) === 1 ? "" : Math.abs(b)) + "i";
  if (a === 0) return (b < 0 ? "-" : "") + imaginary;
  return a + (b < 0 ? "-" : "+") + imaginary;
};
export function complexExpansion() {
  const B = builder({
    unit: "u2-algebra-xi",
    topic: "2.1",
    chapter: 4,
    version: "0.3.1",
  });
  for (let v = 0; v < 8; v++) {
    const a = (v % 4) + 2,
      b = a + 1,
      N = 4 * a + (v < 4 ? 3 : 1);
    if (v < 4) {
      B.mc(
        "The value of " + m("i^{" + N + "}") + " is",
        m("-i"),
        [
          [m("i"), "The exponent leaves remainder 3, not 1, on division by 4."],
          [m("-1"), "This corresponds to remainder 2."],
          [m("1"), "This corresponds to remainder 0."],
        ],
        [
          "Since " + m("i^4=1") + ", reduce the exponent modulo 4.",
          m("i^{" + N + "}=i^3=-i") + ".",
        ],
        [
          "The powers of i repeat every four terms.",
          "Divide the exponent by four.",
          "Use the remainder, not the quotient.",
        ],
      );
      B.mc(
        "Find " + m("(" + z(a, 1) + ")(" + z(b, -1) + ")") + ".",
        m(z(a * b + 1, b - a)),
        [
          [m(z(a * b - 1, b - a)), "The product of i and -i equals +1."],
          [
            m(z(a * b + 1, a - b)),
            "The imaginary cross terms are b i minus a i.",
          ],
          [
            m(z(a + b, 0)),
            "Multiplication is not addition of the two complex numbers.",
          ],
        ],
        [
          "Expand to " + m(a * b + "-" + a + "i+" + b + "i-i^2") + ".",
          "Use " + m("i^2=-1") + " and collect real and imaginary terms.",
        ],
        [
          "Distribute all four products.",
          "Replace i squared by -1.",
          "Collect like parts.",
        ],
      );
      B.mc(
        "The imaginary part of " + m("\\frac{" + a + "+i}{1+i}") + " is",
        m(f(1 - a, 2)),
        [
          [m(f(a + 1, 2)), "This is the real part after rationalising."],
          [
            m(f(a - 1, 2)),
            "The sign changes when multiplying by the conjugate of the denominator.",
          ],
          [
            m(0),
            "Equal imaginary coefficients in numerator and denominator do not make their quotient real.",
          ],
        ],
        [
          "Multiply numerator and denominator by " + m("1-i") + ".",
          "The quotient is " +
            m(f(a + 1, 2) + f(1 - a, 2, "i")) +
            ", with imaginary coefficient " +
            m(f(1 - a, 2)) +
            ".",
        ],
        [
          "Use the conjugate of the denominator.",
          "The new denominator is 2.",
          "Read the coefficient of i.",
        ],
      );
      B.mc(
        "If " + m("z=" + z(a, -b)) + ", then " + m("z+\\overline z") + " is",
        m(2 * a),
        [
          [m(-2 * b + "i"), "This is z minus its conjugate."],
          [m(0), "Only imaginary parts cancel in this sum."],
          [m(a * a + b * b), "This is z times its conjugate."],
        ],
        [
          m("\\overline z=" + z(a, b)) + ".",
          "Adding cancels the imaginary parts, leaving " + m(2 * a) + ".",
        ],
        [
          "Conjugation changes only the imaginary sign.",
          "Add corresponding parts.",
          "The result is twice the real part.",
        ],
      );
      B.mc(
        "For " + m("z=" + z(3 * a, 4 * a)) + ", " + m("|z|") + " equals",
        m(5 * a),
        [
          [
            m(7 * a),
            "The modulus is not the sum of absolute coordinate values.",
          ],
          [m(25 * a * a), "This is the squared modulus."],
          [m(a), "Subtracting coordinate magnitudes does not give modulus."],
        ],
        [m("|z|=\\sqrt{(" + 3 * a + ")^2+(" + 4 * a + ")^2}=" + 5 * a) + "."],
        [
          "Use the distance from the origin.",
          "Square both coordinates.",
          "Take the nonnegative square root.",
        ],
      );
      B.frq(
        "vsaq",
        "Simplify " + m("(" + z(a, b) + ")+(" + z(2 * a, -1) + ")") + ".",
        [
          part(
            "Write the answer in a+ib form.",
            m(z(3 * a, b - 1)) + ".",
            "Add real parts and imaginary coefficients separately.",
            "Adds both real parts.",
            "Adds both imaginary coefficients.",
          ),
        ],
        [
          "Group real terms.",
          "Group multiples of i.",
          "Do not multiply the terms.",
        ],
        ["Combining real and imaginary terms into one coefficient."],
        2,
      );
      B.frq(
        "vsaq",
        "Let " + m("z=" + z(a, b)) + ".",
        [
          part(
            "Find " + m("z\\overline z") + ".",
            m(a * a + b * b) + ".",
            "The product is " +
              m("(" + a + ")^2-(" + b + "i)^2=" + (a * a + b * b)) +
              ".",
            "Forms the conjugate product.",
            "Uses i squared = -1.",
          ),
        ],
        [
          "Write the conjugate.",
          "Use the difference of two squares.",
          "The result should be real and nonnegative.",
        ],
        ["Writing a squared minus b squared."],
        2,
      );
      B.frq(
        "saq",
        "Solve " + m("(" + a + "+i)z=" + z(a * b - 1, a + b)) + " for z.",
        [
          part(
            "Find z in standard form.",
            m("z=" + z(b, 1)) + ".",
            "Divide by " +
              m(a + "+i") +
              " and multiply by its conjugate. The numerator becomes " +
              m((a * a + 1) * b + "+" + (a * a + 1) + "i") +
              ", and the denominator is " +
              m(a * a + 1) +
              ".",
            "Uses the conjugate denominator.",
            "Simplifies the real part.",
            "Simplifies the imaginary part.",
          ),
        ],
        [
          "Isolate z by division.",
          "Rationalise the denominator.",
          "Check by multiplying the proposed z by the original coefficient.",
        ],
        ["Dividing real and imaginary parts separately."],
      );
      B.frq(
        "laq",
        "Let " + m("z=" + z(a, b)) + ".",
        [
          part(
            "Find " + m("z^2") + " and " + m("\\overline{z^2}") + ".",
            m("z^2=" + z(a * a - b * b, 2 * a * b)) +
              " and " +
              m("\\overline{z^2}=" + z(a * a - b * b, -2 * a * b)) +
              ".",
            "Expand z squared; then reverse the imaginary sign.",
            "Computes the square including the cross term.",
            "Takes its conjugate.",
          ),
          part(
            "Verify " +
              m("\\overline{z^2}=(\\overline z)^2") +
              " and " +
              m("|z^2|=|z|^2") +
              ".",
            "Both identities hold.",
            "Squaring " +
              m(z(a, -b)) +
              " gives the same conjugate. Also " +
              m("(a^2-b^2)^2+4a^2b^2=(a^2+b^2)^2") +
              ", so the modulus of z squared is " +
              m(a * a + b * b) +
              ".",
            "Computes the square of the conjugate.",
            "Relates the squared coordinate sum to (a squared+b squared) squared.",
            "Takes the nonnegative square root.",
          ),
        ],
        [
          "Expand before conjugating.",
          "Calculate the other side independently.",
          "Use a sum-of-squares identity for the modulus.",
        ],
        ["Confusing modulus with squared modulus."],
      );
      B.frq(
        "case",
        "Points P and Q on an Argand plane represent " +
          m(z(a, 2)) +
          " and " +
          m(z(a + 3, 6)) +
          " respectively.",
        [
          part(
            "Write the complex number represented by the displacement from P to Q.",
            m("3+4i") + ".",
            "Subtract the complex coordinate of P from that of Q.",
            "Subtracts coordinates in the specified direction.",
          ),
          part(
            "Find the distance PQ.",
            m(5) + ".",
            "The distance is " + m("|3+4i|=\\sqrt{9+16}") + ".",
            "Computes the modulus of the difference.",
          ),
          part(
            "Find the complex coordinate of the midpoint.",
            m(f(2 * a + 3, 2) + "+4i") + ".",
            "Average the real coordinates and the imaginary coordinates separately.",
            "Averages real coordinates.",
            "Averages imaginary coordinates.",
          ),
        ],
        [
          "A displacement is final minus initial.",
          "Distance is its modulus.",
          "The midpoint is the average of the two complex coordinates.",
        ],
        ["Using the difference of the two moduli as the distance."],
      );
    } else {
      B.mc(
        "For real x, " + m("(x+" + a + "i)(1+i)") + " is purely real if",
        m("x=" + -a),
        [
          [m("x=" + a), "The imaginary coefficient is x+a, not x-a."],
          [m("x=0"), "The imaginary coefficient would still equal a."],
          [
            m("x=" + -2 * a),
            "This does not make the imaginary coefficient zero.",
          ],
        ],
        [
          "Expansion gives " + m("(x-" + a + ")+(x+" + a + ")i") + ".",
          "Set the imaginary coefficient to zero: " + m("x+" + a + "=0") + ".",
        ],
        [
          "Expand into real and imaginary parts.",
          "A real number has zero imaginary coefficient.",
          "Solve that linear condition.",
        ],
      );
      B.mc(
        "For real y, " + m("(" + a + "+yi)(1-i)") + " is purely imaginary if",
        m("y=" + -a),
        [
          [
            m("y=" + a),
            "This cancels the imaginary, rather than real, coefficient.",
          ],
          [m("y=0"), "The real part would remain a."],
          [m("y=" + 2 * a), "The real part a+y would be nonzero."],
        ],
        [
          "The product is " + m("(" + a + "+y)+(y-" + a + ")i") + ".",
          "The real part vanishes when " +
            m("y=" + -a) +
            "; the remaining imaginary part is nonzero.",
        ],
        [
          "Expand first.",
          "Set the real part to zero.",
          "Check the imaginary part does not also vanish.",
        ],
      );
      B.mc(
        "The point representing " +
          m("\\overline{" + z(-a, b) + "}") +
          " lies in which quadrant?",
        "III",
        [
          ["I", "Conjugation does not change the negative real coordinate."],
          ["II", "This is the quadrant of the original number."],
          ["IV", "The real coordinate remains negative."],
        ],
        [
          "Conjugation gives " + m(z(-a, -b)) + ".",
          "Both coordinates are negative, so the point lies in quadrant III.",
        ],
        [
          "Change only the imaginary sign.",
          "Read the signs of both coordinates.",
          "Use the Argand-plane quadrants.",
        ],
      );
      B.mc(
        "Evaluate " + m("i^{-" + N + "}") + ".",
        m("-i"),
        [
          [m("i"), "The reciprocal of i is -i, not i."],
          [m("1"), "The exponent is not divisible by four."],
          [
            m("-1"),
            "This would require an exponent congruent to 2 modulo four.",
          ],
        ],
        [
          "Since " +
            m("i^{" + N + "}=i") +
            ", the requested value is " +
            m("1/i=-i") +
            ".",
        ],
        [
          "First reduce the positive exponent.",
          "A negative exponent means reciprocal.",
          "Rationalise 1/i.",
        ],
      );
      B.mc(
        "For " +
          m("z_1=" + z(3 * a, 4 * a)) +
          " and " +
          m("z_2=" + z(0, a)) +
          ", find " +
          m("\\left|z_1/z_2\\right|") +
          ".",
        m(5),
        [
          [m(4 * a), "Moduli divide in a quotient; they are not subtracted."],
          [m(5 * a * a), "This is the product of the moduli."],
          [m(25), "This is the square of the required ratio."],
        ],
        [
          m("|z_1|=" + 5 * a + ",\\ |z_2|=" + a) + ".",
          "Hence " + m("|z_1/z_2|=|z_1|/|z_2|=5") + ".",
        ],
        [
          "Compute each modulus.",
          "Check the denominator is nonzero.",
          "Use the quotient property.",
        ],
      );
      B.frq(
        "vsaq",
        "Simplify " +
          m(
            "i^{" +
              4 * a +
              "}+i^{" +
              (4 * a + 1) +
              "}+i^{" +
              (4 * a + 2) +
              "}+i^{" +
              (4 * a + 3) +
              "}",
          ) +
          ".",
        [
          part(
            "Find the sum.",
            m(0) + ".",
            "The four consecutive values are 1, i, -1, and -i.",
            "Reduces the powers modulo four.",
            "Cancels the real and imaginary pairs.",
          ),
        ],
        [
          "Use a complete four-power cycle.",
          "List the four values.",
          "Combine opposite terms.",
        ],
        ["Adding exponents when terms are being added."],
        2,
      );
      B.frq(
        "vsaq",
        "A complex number z satisfies " +
          m("z+\\overline z=" + 2 * a) +
          " and " +
          m("z-\\overline z=" + 2 * b + "i") +
          ".",
        [
          part(
            "Find z.",
            m(z(a, b)) + ".",
            "Adding the equations gives " + m("2z=" + z(2 * a, 2 * b)) + ".",
            "Adds the equations.",
            "Divides both parts by two.",
          ),
        ],
        [
          "Add the two given equations.",
          "The conjugate terms cancel.",
          "Divide by two.",
        ],
        ["Forgetting the factor two in conjugate sums."],
        2,
      );
      B.frq(
        "saq",
        "Let " +
          m("z_1=" + z(a, -2)) +
          " and " +
          m("z_2=" + z(a + 5, 10)) +
          ".",
        [
          part(
            "Find " + m("|z_1-z_2|") + " and explain its geometric meaning.",
            m(13) + ".",
            "The difference is " +
              m("-5-12i") +
              ", whose modulus is " +
              m("\\sqrt{25+144}=13") +
              ". This is the distance between the two Argand points.",
            "Computes the difference.",
            "Computes its modulus.",
            "Identifies the point-to-point distance.",
          ),
        ],
        [
          "Subtract real and imaginary parts.",
          "Use modulus as distance.",
          "The direction of subtraction does not change the distance.",
        ],
        ["Subtracting individual distances from the origin."],
      );
      B.frq(
        "laq",
        "For real x,y, suppose " +
          m("(x+yi)(" + a + "+i)=" + z(a * b - 2, b + 2 * a)) +
          ".",
        [
          part(
            "Form two real equations and solve for x and y.",
            m("x=" + b + ",\\ y=2") + ".",
            "Equating parts gives " +
              m(a + "x-y=" + (a * b - 2)) +
              " and " +
              m("x+" + a + "y=" + (b + 2 * a)) +
              ". Eliminating y gives " +
              m(a * a + 1 + "x=" + (a * a + 1) * b) +
              ".",
            "Expands the product.",
            "Equates real and imaginary parts.",
            "Solves the two equations.",
          ),
          part(
            "Find the modulus and conjugate of x+yi.",
            m("\\sqrt{" + (b * b + 4) + "}") + " and " + m(z(b, -2)) + ".",
            "Use the recovered values in the definitions of modulus and conjugate.",
            "Computes the modulus.",
            "Forms the conjugate.",
          ),
        ],
        [
          "Expand the left side using i squared = -1.",
          "Equate real and imaginary components independently.",
          "Substitute the recovered pair into the final definitions.",
        ],
        ["Equating a real component to an imaginary component."],
      );
      B.frq(
        "case",
        "A rectangle on an Argand plane has consecutive vertices " +
          m(a + "+i") +
          ", " +
          m(a + 6 + "+i") +
          ", " +
          m(a + 6 + "+9i") +
          ", and D.",
        [
          part(
            "Find the complex coordinate of D.",
            m(a + "+9i") + ".",
            "Opposite rectangle sides are parallel to the coordinate axes.",
            "Uses the shared real and imaginary coordinates.",
          ),
          part(
            "Find the two side lengths and area.",
            "Lengths 6 and 8; area 48 square units.",
            "Subtract adjacent coordinates; both differences are along an axis.",
            "Finds side lengths and area.",
          ),
          part(
            "Find the diagonal length and the rectangle's centre.",
            m("10") + " and " + m(a + 3 + "+5i") + ".",
            "The diagonal modulus is " +
              m("|6+8i|=10") +
              ". The centre is the average of opposite vertices.",
            "Finds the diagonal modulus.",
            "Finds the midpoint of a diagonal.",
          ),
        ],
        [
          "Match the missing vertex coordinates.",
          "Use absolute coordinate differences for the sides.",
          "Opposite vertices determine both diagonal and centre.",
        ],
        ["Treating imaginary coordinates as negative distances."],
      );
    }
  }
  return B.items;
}
