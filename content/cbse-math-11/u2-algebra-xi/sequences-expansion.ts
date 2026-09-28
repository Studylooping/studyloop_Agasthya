import { builder } from "../expansion-builder";
import { fraction as f, math as m, part } from "../practice-authoring";

export function sequencesExpansion() {
  const B = builder({ unit: "u2-algebra-xi", topic: "2.5", chapter: 8 });
  for (let v = 0; v < 8; v++) {
    const a = (v % 4) + 2,
      n = a + 3;
    if (v < 4) {
      B.mc(
        "The fifth term of the GP " +
          m(a + "," + 2 * a + "," + 4 * a + ",\\ldots") +
          " is",
        m(16 * a),
        [
          [m(32 * a), "The fifth term uses the fourth power of the ratio."],
          [m(8 * a), "This is the fourth term."],
          [
            m(a + 8),
            "A GP uses repeated multiplication, not a fixed difference.",
          ],
        ],
        [
          "The first term is " + a + " and common ratio is 2.",
          m("T_5=" + a + "\\cdot2^4=" + 16 * a) + ".",
        ],
        [
          "Find the common ratio.",
          "The first term already accounts for one position.",
          "Use the fourth power for the fifth term.",
        ],
      );
      B.mc(
        "The sum of the first four terms of " +
          m(a + "," + 3 * a + "," + 9 * a + ",\\ldots") +
          " is",
        m(40 * a),
        [
          [m(27 * a), "This is the fourth term, not the sum."],
          [m(39 * a), "The first term has been omitted."],
          [m(81 * a), "This is the fifth term."],
        ],
        [
          "The four terms are " +
            m(a + "," + 3 * a + "," + 9 * a + "," + 27 * a) +
            ".",
          "Their sum is " + m(a + "(1+3+9+27)=" + 40 * a) + ".",
        ],
        [
          "List four terms using the ratio 3.",
          "Distinguish a term from a partial sum.",
          "Add the four terms.",
        ],
      );
      B.mc(
        "The positive geometric mean of " + m(a) + " and " + m(9 * a) + " is",
        m(3 * a),
        [
          [m(5 * a), "This is the arithmetic mean."],
          [m(9 * a * a), "This is the product before taking a square root."],
          [m(4 * a), "Half the difference is not the geometric mean."],
        ],
        [
          m(
            "G=\\sqrt{" +
              a +
              "\\cdot" +
              9 * a +
              "}=\\sqrt{" +
              9 * a * a +
              "}=" +
              3 * a,
          ) + ".",
        ],
        [
          "Geometric mean is the positive square root of the product.",
          "Multiply the two positive numbers.",
          "Take the positive root.",
        ],
      );
      B.mc(
        "A GP has first term " +
          m(a) +
          " and common ratio " +
          m("-2") +
          ". Its fourth term is",
        m(-8 * a),
        [
          [m(8 * a), "An odd power of -2 remains negative."],
          [m(-16 * a), "The fourth term uses ratio to the power 3."],
          [m(16 * a), "Both the exponent and sign have been mishandled."],
        ],
        [m("T_4=" + a + "(-2)^3=" + -8 * a) + "."],
        [
          "Use the exponent one less than the term index.",
          "Keep the negative ratio in parentheses.",
          "An odd exponent preserves the negative sign.",
        ],
      );
      B.mc(
        "The infinite series " +
          m(a + "+" + f(a, 2) + "+" + f(a, 4) + "+\\cdots") +
          " has sum",
        m(2 * a),
        [
          [m(a), "Later positive terms increase the sum."],
          [m(f(a, 2)), "This is the second term."],
          [m(4 * a), "The denominator is 1-r, with r=1/2."],
        ],
        [
          "Here " + m("|r|=1/2<1") + ", so the infinite GP sum exists.",
          m("S=\\frac{" + a + "}{1-1/2}=" + 2 * a) + ".",
        ],
        [
          "Identify the common ratio.",
          "Check that its absolute value is less than one.",
          "Use first term divided by 1 minus the ratio.",
        ],
      );
      B.frq(
        "vsaq",
        "Find the arithmetic mean of " + m(2 * a) + " and " + m(8 * a) + ".",
        [
          part(
            "Calculate the mean.",
            m(5 * a) + ".",
            "Add the two numbers and divide by 2.",
            "Adds the two values.",
            "Divides their sum by two.",
          ),
        ],
        [
          "Arithmetic mean uses addition.",
          "There are two observations.",
          "Divide the total by two.",
        ],
        ["Using the square root of the product."],
        2,
      );
      B.frq(
        "vsaq",
        "The first three terms of a sequence are " +
          m(a + "," + -3 * a + "," + 9 * a) +
          ".",
        [
          part(
            "Show that these terms form a GP and find its common ratio.",
            m("r=-3") + ".",
            "Both successive ratios equal -3.",
            "Checks both successive ratios.",
            "States the common ratio with its sign.",
          ),
        ],
        [
          "Divide each term by its predecessor.",
          "Check both available ratios.",
          "Retain negative signs.",
        ],
        ["Using differences to identify a GP."],
        2,
      );
      B.frq(
        "saq",
        "Insert two positive geometric means between " +
          m(a) +
          " and " +
          m(27 * a) +
          ".",
        [
          part(
            "Find the two inserted numbers.",
            m(3 * a) + " and " + m(9 * a) + ".",
            "The four-term GP satisfies " +
              m(a + "r^3=" + 27 * a) +
              ", so r=3. The intermediate terms are ar and ar squared.",
            "Forms the endpoint equation.",
            "Finds the positive common ratio.",
            "Computes the inserted means.",
          ),
        ],
        [
          "Including both endpoints gives four terms.",
          "There are three ratio steps.",
          "Use the positive cube root.",
        ],
        ["Using two ratio steps for two inserted means."],
      );
      B.frq(
        "laq",
        "A positive GP has second term " +
          m(3 * a) +
          " and fourth term " +
          m(27 * a) +
          ".",
        [
          part(
            "Find its first term and common ratio.",
            m("r=3,\\quad T_1=" + a) + ".",
            "Divide the fourth term by the second: " +
              m("r^2=9") +
              ". Positivity gives r=3, then divide T2 by r.",
            "Eliminates the first term.",
            "Chooses the positive ratio.",
            "Recovers the first term.",
          ),
          part(
            "Find the sum of its first five terms.",
            m(121 * a) + ".",
            "Use " + m("S_5=" + a + "\\frac{3^5-1}{3-1}=" + 121 * a) + ".",
            "Applies the finite-GP sum.",
            "Evaluates the result.",
          ),
        ],
        [
          "Use a ratio of known terms.",
          "The given positivity resolves the sign of r.",
          "Use the recovered parameters in the sum formula.",
        ],
        ["Assuming a squared-ratio equation always has only one real root."],
      );
      B.frq(
        "case",
        "A ball is released from height " +
          m(16 * a + "\\,\\text{m}") +
          ". Each rebound rises to half the preceding fall height.",
        [
          part(
            "Find the first and third rebound heights.",
            m(8 * a + "\\,\\text{m}") +
              " and " +
              m(2 * a + "\\,\\text{m}") +
              ".",
            "The rebound heights form a GP with first term " +
              m(8 * a) +
              " and ratio 1/2.",
            "Identifies both requested heights.",
          ),
          part(
            "Find the sum of all rebound heights.",
            m(16 * a + "\\,\\text{m}") + ".",
            "Sum the infinite GP starting at the first rebound.",
            "Applies the convergent-GP formula.",
          ),
          part(
            "Find the total vertical distance travelled before the ball comes to rest in this model.",
            m(48 * a + "\\,\\text{m}") + ".",
            "Count the initial fall once and every rebound height twice: " +
              m(16 * a + "+2(" + 16 * a + ")=" + 48 * a) +
              ".",
            "Counts the initial fall once.",
            "Counts each rebound's upward and downward travel.",
          ),
        ],
        [
          "Do not confuse initial height with first rebound.",
          "Sum the rebound-height GP.",
          "Each rebound contributes two journeys of the same height.",
        ],
        ["Doubling the initial fall or counting rebounds only once."],
        3,
      );
    } else {
      B.mc(
        "A GP has first term " +
          m(a) +
          " and positive common ratio 2. Which term equals " +
          m(a * 2 ** (n - 1)) +
          "?",
        m(n),
        [
          [
            m(n - 1),
            "The exponent of the ratio is one less than the term index.",
          ],
          [m(n + 1), "This would introduce one extra factor of 2."],
          [m(2 * n), "Term indices do not multiply by the common ratio."],
        ],
        [
          m(a + "2^{k-1}=" + a * 2 ** (n - 1)) +
            " gives " +
            m("2^{k-1}=2^{" + (n - 1) + "}") +
            ".",
          "Thus " + m("k=" + n) + ".",
        ],
        [
          "Divide by the first term.",
          "Express the remaining number as a power of 2.",
          "Add one to the exponent to obtain the term index.",
        ],
      );
      B.mc(
        "For positive numbers with arithmetic mean " +
          m(5 * a) +
          " and geometric mean " +
          m(4 * a) +
          ", their product is",
        m(16 * a * a),
        [
          [m(10 * a), "This is the sum, not the product."],
          [m(4 * a), "The product is the square of the geometric mean."],
          [
            m(25 * a * a),
            "The square of the arithmetic mean need not equal the product.",
          ],
        ],
        [
          m("G=\\sqrt{xy}") +
            ", so " +
            m("xy=G^2=(" + 4 * a + ")^2=" + 16 * a * a) +
            ".",
        ],
        [
          "Use the definition of geometric mean.",
          "Square both sides.",
          "The arithmetic mean is not needed for this part.",
        ],
      );
      B.mc(
        "For " +
          m("r=" + f(-1, a)) +
          ", the infinite GP with first term " +
          m(a + 1) +
          " has sum",
        m(a),
        [
          [m(a + 1), "This ignores all later terms."],
          [
            m(f(a * (a + 1), a - 1)),
            "This uses a positive ratio instead of the stated negative ratio.",
          ],
          [
            m(-a),
            "The first term is positive and dominates the alternating tail.",
          ],
        ],
        [
          "Since " + m("|r|<1") + ", use the infinite sum.",
          m("S=\\frac{" + (a + 1) + "}{1+1/" + a + "}=" + a) + ".",
        ],
        [
          "Check the absolute value of r.",
          "Substitute the negative ratio carefully.",
          "Subtracting a negative ratio adds in the denominator.",
        ],
      );
      B.mc(
        "Which GP has a finite infinite sum?",
        m(a + "," + f(a, 3) + "," + f(a, 9) + ",\\ldots"),
        [
          [
            m(a + "," + 2 * a + "," + 4 * a + ",\\ldots"),
            "Its ratio has magnitude 2, exceeding 1.",
          ],
          [
            m(a + "," + -a + "," + a + ",\\ldots"),
            "Ratio -1 gives partial sums that do not approach one value.",
          ],
          [
            m(a + "," + a + "," + a + ",\\ldots"),
            "Ratio 1 with a nonzero first term does not give a finite sum.",
          ],
        ],
        [
          "A nonzero GP has a finite infinite sum exactly when " +
            m("|r|<1") +
            ".",
          "Only the ratio 1/3 meets that condition.",
        ],
        [
          "Find each common ratio.",
          "A negative ratio is not automatically convergent.",
          "Compare its absolute value with one.",
        ],
      );
      B.mc(
        "If positive x and y satisfy " +
          m("x+y=" + 10 * a) +
          ", the greatest possible value of " +
          m("xy") +
          " is",
        m(25 * a * a),
        [
          [
            m(100 * a * a),
            "The product is bounded by the square of half the sum, not the full sum.",
          ],
          [
            m(5 * a),
            "This is the value of each number at equality, not their product.",
          ],
          [m(10 * a), "A sum is not a product."],
        ],
        [
          "AM is at least GM: " + m("5a\\ge\\sqrt{xy}") + " with a=" + a + ".",
          "Hence " +
            m("xy\\le" + 25 * a * a) +
            ", attained when " +
            m("x=y=" + 5 * a) +
            ".",
        ],
        [
          "Apply AM-GM to the fixed sum.",
          "Square the resulting nonnegative inequality.",
          "Check the equality condition.",
        ],
        3,
      );
      B.frq(
        "vsaq",
        "Write the first four terms of the sequence " +
          m("a_k=" + a + "(-2)^{k-1}") +
          ", " +
          m("k\\ge1") +
          ".",
        [
          part(
            "List the terms.",
            m(a + "," + -2 * a + "," + 4 * a + "," + -8 * a) + ".",
            "Substitute k=1,2,3,4; the exponents are 0,1,2,3.",
            "Starts with exponent zero.",
            "Uses the alternating sign pattern.",
          ),
        ],
        [
          "Begin at k=1.",
          "Use the exponent k-1.",
          "Evaluate successive powers of -2.",
        ],
        ["Starting the sequence with the second term."],
        2,
      );
      B.frq(
        "vsaq",
        "Find the positive geometric mean of " +
          m(a * a) +
          " and " +
          m((a + 2) ** 2) +
          ".",
        [
          part(
            "Calculate the mean.",
            m(a * (a + 2)) + ".",
            "Take the positive square root of " +
              m(a * a + "\\times" + (a + 2) ** 2) +
              ".",
            "Forms the product.",
            "Takes the positive square root.",
          ),
        ],
        [
          "Multiply the two squares.",
          "Their square root is the product of positive bases.",
          "Use the positive geometric mean.",
        ],
        ["Taking an arithmetic average."],
        2,
      );
      B.frq(
        "saq",
        "A GP has first term " + m(a) + " and common ratio " + m("-1/2") + ".",
        [
          part(
            "Find the sum of the first four terms.",
            m(f(5 * a, 8)) + ".",
            "The terms sum to " + m(a + "(1-1/2+1/4-1/8)=" + f(5 * a, 8)) + ".",
            "Uses the alternating ratio.",
            "Lists or sums four terms.",
            "Simplifies the fraction.",
          ),
        ],
        [
          "Keep the negative ratio in parentheses.",
          "Use four terms, including the first.",
          "Add with a common denominator.",
        ],
        ["Adding absolute values rather than signed terms."],
      );
      B.frq(
        "laq",
        "Two positive numbers have arithmetic mean " +
          m(5 * a) +
          " and geometric mean " +
          m(4 * a) +
          ".",
        [
          part(
            "Find the numbers.",
            m(2 * a) + " and " + m(8 * a) + ".",
            "Their sum is " +
              m(10 * a) +
              " and product " +
              m(16 * a * a) +
              ". They are roots of " +
              m(
                "t^2-" +
                  10 * a +
                  "t+" +
                  16 * a * a +
                  "=(t-" +
                  2 * a +
                  ")(t-" +
                  8 * a +
                  ")=0",
              ) +
              ".",
            "Obtains the sum.",
            "Obtains the product.",
            "Solves for both positive numbers.",
          ),
          part(
            "Insert one positive geometric mean between them and give the common ratio of the resulting GP.",
            m(4 * a) + "; common ratio 2.",
            "The middle term is the given GM. The two consecutive ratios are both 2.",
            "Inserts the correct mean.",
            "Checks the common ratio.",
          ),
        ],
        [
          "Convert the two means into a sum and product.",
          "Use these to recover the two numbers.",
          "Check both ratios after inserting the mean.",
        ],
        ["Treating the arithmetic mean as the sum."],
        3,
      );
      B.frq(
        "case",
        "A geometric series has positive first term A and ratio r with " +
          m("0<r<1") +
          ". Its infinite sum is " +
          m(12 * a) +
          " and its tail after the first term has sum " +
          m(4 * a) +
          ".",
        [
          part(
            "Find A.",
            m(8 * a) + ".",
            "Subtract the tail sum from the full sum.",
            "Isolates the first term.",
          ),
          part(
            "Find r.",
            m("r=1/3") + ".",
            "The tail is r times the original series, so " +
              m("r=" + 4 * a + "/" + 12 * a + "=1/3") +
              ".",
            "Relates the tail to the original series.",
            "Solves for the ratio.",
          ),
          part(
            "Find the sum of the first two terms.",
            m(f(32 * a, 3)) + ".",
            "Compute " + m("A(1+r)=" + 8 * a + "(1+1/3)") + ".",
            "Uses the recovered first term and ratio.",
          ),
        ],
        [
          "The difference of the two sums is the first term.",
          "Shifting a GP by one term scales it by r.",
          "Use the recovered parameters for the partial sum.",
        ],
        ["Mistaking the tail sum for the second term."],
        3,
      );
    }
  }
  return B.items;
}
