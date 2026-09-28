import { builder, choose as C } from "../expansion-builder";
import { fraction as f, math as m, part } from "../practice-authoring";

export function binomialExpansion() {
  const B = builder({ unit: "u2-algebra-xi", topic: "2.4", chapter: 7 });
  for (let v = 0; v < 8; v++) {
    const a = (v % 4) + 2,
      n = a + 3;
    if (v < 4) {
      B.mc(
        "The sum of the coefficients in " + m("(1+" + a + "x)^" + n) + " is",
        m((a + 1) ** n),
        [
          [m(2 ** n), "The coefficient of x inside the bracket is not 1."],
          [
            m(n * a),
            "This is only the linear coefficient, not the sum of all coefficients.",
          ],
          [m(1), "This is the constant term, obtained at x=0."],
        ],
        [
          "Substituting x=1 adds every coefficient.",
          "The result is " + m("(1+" + a + ")^" + n + "=" + (a + 1) ** n) + ".",
        ],
        [
          "Think of the expanded polynomial at x=1.",
          "Every power of x becomes 1.",
          "Evaluate the original compact expression.",
        ],
      );
      B.mc(
        "The coefficient of " +
          m("x^2") +
          " in " +
          m("(1+" + a + "x)^4") +
          " is",
        m(6 * a * a),
        [
          [
            m(4 * a * a),
            "The quadratic coefficient in a fourth power is 6, not 4.",
          ],
          [m(6 * a), "The factor a is squared with x."],
          [m(a * a), "The binomial coefficient 6 is missing."],
        ],
        [
          "The fourth-power expansion has binomial coefficients 1,4,6,4,1.",
          "The quadratic term is " +
            m("6(" + a + "x)^2=" + 6 * a * a + "x^2") +
            ".",
        ],
        [
          "Use the fourth row of binomial coefficients.",
          "Square the entire second term.",
          "Read the coefficient, without x squared.",
        ],
      );
      B.mc(
        "The coefficient of x in " + m("(" + a + "-x)^" + n) + " is",
        m(-n * a ** (n - 1)),
        [
          [
            m(n * a ** (n - 1)),
            "An odd power of the subtracted x contributes a negative sign.",
          ],
          [m(-n * a), "The first term must appear to power n-1."],
          [
            m(-(a ** (n - 1))),
            "There are n ways to choose the one factor contributing -x.",
          ],
        ],
        [
          "Choose -x from one of the n factors and a from the other n-1.",
          "This gives " +
            m(
              "-" +
                n +
                "\\cdot" +
                a +
                "^{" +
                (n - 1) +
                "}=" +
                -n * a ** (n - 1),
            ) +
            ".",
        ],
        [
          "A linear term uses exactly one x.",
          "All other factors contribute a.",
          "Keep the minus sign.",
        ],
      );
      B.mc(
        "After like powers are collected, how many nonzero terms occur in " +
          m("(1+x)^" + n) +
          "?",
        m(n + 1),
        [
          [m(n), "Both the constant and the highest power are included."],
          [m(2 * n), "There is one term for each power, not two."],
          [
            m(2 ** n),
            "This counts uncollected choices of factors, not distinct powers.",
          ],
        ],
        [
          "The powers are " + m("x^0,x^1,\\ldots,x^" + n) + ".",
          "There are " + m(n + 1) + " different nonzero terms.",
        ],
        [
          "List the possible powers.",
          "Start with the constant term.",
          "Include the highest power.",
        ],
      );
      B.mc(
        "The constant term in " + m("(" + a + "+x)^" + n) + " is",
        m(a ** n),
        [
          [m(a), "Every factor must contribute a for the constant term."],
          [m(n * a), "Multiply n copies of a rather than adding them."],
          [m(1), "The constant inside the bracket is a, not 1."],
        ],
        [
          "Set x=0 to isolate the constant term.",
          m("(" + a + ")^" + n + "=" + a ** n) + ".",
        ],
        [
          "A constant term contains no x.",
          "Set x to zero.",
          "Evaluate the remaining power.",
        ],
      );
      B.frq(
        "vsaq",
        "Expand " + m("(x+" + a + ")^2") + ".",
        [
          part(
            "Give all terms.",
            m("x^2+" + 2 * a + "x+" + a * a) + ".",
            "Use " + m("(u+v)^2=u^2+2uv+v^2") + ".",
            "Includes the cross term.",
            "Computes the constant correctly.",
          ),
        ],
        [
          "Square both terms.",
          "Include twice their product.",
          "Arrange by descending power of x.",
        ],
        ["Omitting the cross term."],
        2,
      );
      B.frq(
        "vsaq",
        "Find the coefficient of " + m("x^3") + " in " + m("(1+x)^" + n) + ".",
        [
          part(
            "State the coefficient.",
            m(C(n, 3)) + ".",
            "An x cubed term chooses x from three of the n factors; the other factors contribute 1. Thus the coefficient is " +
              m("\\binom{" + n + "}{3}") +
              ".",
            "Counts choices of three contributing factors.",
            "Evaluates the combination.",
          ),
        ],
        [
          "Exactly three factors must contribute x.",
          "Their order does not matter.",
          "Choose three positions from n.",
        ],
        ["Counting ordered choices of factors."],
        2,
      );
      B.frq(
        "saq",
        "Expand " + m("(" + a + "x-1)^3") + ".",
        [
          part(
            "Write the polynomial in descending powers.",
            m(a ** 3 + "x^3-" + 3 * a * a + "x^2+" + 3 * a + "x-1") + ".",
            "Use " + m("(u-v)^3=u^3-3u^2v+3uv^2-v^3") + " with u=ax and v=1.",
            "Computes the cubic and quadratic terms.",
            "Computes the linear and constant terms.",
            "Uses alternating signs correctly.",
          ),
        ],
        [
          "Use the cubic binomial coefficients.",
          "Odd powers of the subtracted term are negative.",
          "Raise a along with x in each term.",
        ],
        ["Giving every non-leading term a negative sign."],
      );
      B.frq(
        "laq",
        "Consider " + m("P(x)=(x+" + a + ")^4+(x-" + a + ")^4") + ".",
        [
          part(
            "Expand and simplify P(x).",
            m("2x^4+" + 12 * a * a + "x^2+" + 2 * a ** 4) + ".",
            "In the paired expansions, terms containing an odd power of a have opposite signs and cancel.",
            "Expands both fourth powers.",
            "Cancels the odd cross terms.",
            "Combines the even terms.",
          ),
          part(
            "Use this to evaluate " + m("P(1)") + ".",
            m(2 + 12 * a * a + 2 * a ** 4) + ".",
            "Substitute x=1 into the simplified polynomial; equivalently add " +
              m(1 + a + "^4") +
              " and " +
              m("(" + (1 - a) + ")^4") +
              ".",
            "Substitutes into the simplified form.",
            "Computes the exact total.",
          ),
        ],
        [
          "Write matching powers side by side.",
          "Odd signed contributions cancel.",
          "Use the simplified polynomial for evaluation.",
        ],
        ["Cancelling even terms in a sum of symmetric expansions."],
      );
      B.frq(
        "case",
        "Let " +
          m("P(x)=(1+x)^" + n) +
          ". A student wants sums of its coefficients without writing every term.",
        [
          part(
            "Find P(1).",
            m(2 ** n) + ".",
            "At x=1, every coefficient is added.",
            "Finds the total coefficient sum.",
          ),
          part(
            "Find P(-1).",
            m(0) + ".",
            "At x=-1, even-power coefficients are added and odd-power coefficients subtracted.",
            "Finds the alternating sum.",
          ),
          part(
            "Find the sum of even-power coefficients and the sum of odd-power coefficients.",
            m(2 ** (n - 1)) + " each.",
            "If E and O are these sums, E+O=2 to power n and E-O=0. Add and subtract these equations.",
            "Forms the two sum equations.",
            "Solves for both sums.",
          ),
        ],
        [
          "Evaluate at 1 and -1.",
          "Call the even and odd sums E and O.",
          "Solve the resulting pair of linear equations.",
        ],
        ["Assuming an alternating sum equals the full coefficient sum."],
      );
    } else {
      B.mc(
        "The coefficient of " +
          m("x^2") +
          " in " +
          m("(1+x)^" + n + "(1-x)") +
          " is",
        m(C(n, 2) - n),
        [
          [m(C(n, 2)), "The -x factor also contributes to x squared."],
          [
            m(C(n, 2) + n),
            "The contribution from multiplying by -x is subtracted.",
          ],
          [
            m(C(n, 2) - 1),
            "The linear coefficient being subtracted is n, not 1.",
          ],
        ],
        [
          "The x squared contributions are the first factor's quadratic term times 1 and its linear term times -x.",
          "The coefficient is " +
            m("\\binom{" + n + "}{2}-" + n + "=" + (C(n, 2) - n)) +
            ".",
        ],
        [
          "Only degrees adding to two matter.",
          "Identify the two contributing products.",
          "Use the sign from the second factor.",
        ],
        3,
      );
      B.mc(
        "The coefficient of x in " + m("(1+" + a + "x)^2(1-x)^3") + " is",
        m(2 * a - 3),
        [
          [m(2 * a + 3), "The second factor has linear coefficient -3."],
          [
            m(-6 * a),
            "Multiplying the two linear terms gives an x-squared term, not x.",
          ],
          [
            m(2 * a),
            "This omits the linear contribution from the second factor.",
          ],
        ],
        [
          "To obtain x, choose the linear term from one factor and the constant from the other.",
          "The coefficient is " + m(2 * a + "-3=" + (2 * a - 3)) + ".",
        ],
        [
          "First identify both constant terms.",
          "There are two ways to form a linear term.",
          "Add those contributions.",
        ],
        3,
      );
      B.mc(
        "In the expansion of " +
          m("(" + a + "+x)^3") +
          ", the ratio of the coefficient of x to the coefficient of " +
          m("x^2") +
          " is",
        m(a),
        [
          [m(f(1, a)), "This reverses the requested ratio."],
          [m(a * a), "The denominator still contains one factor of a."],
          [m(1), "The coefficients have different powers of a."],
        ],
        [
          "The coefficients are " + m(3 * a * a) + " and " + m(3 * a) + ".",
          "Their ratio is " + m(a) + ".",
        ],
        [
          "Expand only the required terms.",
          "Take the ratio in the stated order.",
          "Cancel common factors.",
        ],
      );
      B.mc(
        "For " +
          m("P(x)=(1-" + a + "x)^4") +
          ", the value of " +
          m("P(1)") +
          " is",
        m((a - 1) ** 4),
        [
          [m((a + 1) ** 4), "The sign inside the bracket is minus."],
          [
            m(-((a - 1) ** 4)),
            "An even power of a negative number is nonnegative.",
          ],
          [m(a ** 4), "The constant 1 inside the bracket must remain."],
        ],
        [
          "Substitute x=1 before expanding.",
          m("P(1)=(1-" + a + ")^4=" + (a - 1) ** 4) + ".",
        ],
        [
          "Evaluate the input directly.",
          "Keep the sign inside parentheses.",
          "The fourth power is even.",
        ],
      );
      B.mc(
        "The coefficient of " + m("x^4") + " in " + m("(1+x)^" + n) + " equals",
        m(C(n, 4)),
        [
          [
            m(n * (n - 1) * (n - 2) * (n - 3)),
            "This orders the four selected factors unnecessarily.",
          ],
          [
            m(C(n, 4) + 1),
            "The coefficient is the exact number of four-factor selections.",
          ],
          [
            m(-C(n, 4)),
            "All terms of (1+x) to a positive integer power have positive coefficients.",
          ],
        ],
        [
          "Exactly four of the n factors must supply x.",
          "There are " +
            m("\\binom{" + n + "}{4}=" + C(n, 4)) +
            " such choices.",
        ],
        [
          "Choose which factors contribute x.",
          "Their order within the product is irrelevant.",
          "Evaluate n choose 4.",
        ],
      );
      B.frq(
        "vsaq",
        "Expand " + m("(1-" + a + "x)^2") + ".",
        [
          part(
            "Give the resulting polynomial.",
            m("1-" + 2 * a + "x+" + a * a + "x^2") + ".",
            "The middle term is negative and the squared last term is positive.",
            "Uses the negative cross term.",
            "Squares the whole second term.",
          ),
        ],
        [
          "Use the square-of-a-difference identity.",
          "Double the cross product.",
          "The square of a negative term is positive.",
        ],
        ["Making the x-squared term negative."],
        2,
      );
      B.frq(
        "vsaq",
        "In " +
          m("(1+x)^" + n) +
          ", find the coefficients of x and " +
          m("x^{" + (n - 1) + "}") +
          ".",
        [
          part(
            "State both coefficients.",
            m(n) + " and " + m(n) + ".",
            "The coefficients are " +
              m("\\binom{" + n + "}{1}") +
              " and " +
              m("\\binom{" + n + "}{" + (n - 1) + "}") +
              ", which agree by complementary selection.",
            "Identifies both selection counts.",
            "Uses symmetry.",
          ),
        ],
        [
          "One end coefficient counts a single selected factor.",
          "The other counts a single omitted factor.",
          "Both have n choices.",
        ],
        ["Confusing a power index with its coefficient."],
        2,
      );
      B.frq(
        "saq",
        "Use a binomial expansion to evaluate " + m(100 + a + "^3") + ".",
        [
          part(
            "Show the expansion and exact value.",
            m((100 + a) ** 3) + ".",
            "Expand " +
              m(
                "(100+" +
                  a +
                  ")^3=100^3+3(100)^2(" +
                  a +
                  ")+3(100)(" +
                  a +
                  ")^2+" +
                  a +
                  "^3",
              ) +
              ".",
            "Uses the cubic expansion.",
            "Evaluates the two cross terms.",
            "Adds all four terms correctly.",
          ),
        ],
        [
          "Split the base into 100 and the small increment.",
          "Use the four terms of a cubic expansion.",
          "Calculate cross terms before summing.",
        ],
        ["Keeping only the cubes of the two summands."],
      );
      B.frq(
        "laq",
        "Let " + m("Q(x)=(1+" + a + "x)^3(1-x)^2") + ".",
        [
          part(
            "Find the coefficient of x.",
            m(3 * a - 2) + ".",
            "Combine the linear terms " +
              m(3 * a + "x") +
              " and " +
              m("-2x") +
              ".",
            "Identifies both linear contributions.",
            "Adds their coefficients.",
          ),
          part(
            "Find the coefficient of x squared.",
            m(3 * a * a - 6 * a + 1) + ".",
            "Use the quadratic term of the first factor, the product of the linear terms, and the quadratic term of the second: " +
              m(3 * a * a + "-" + 6 * a + "+1") +
              ".",
            "Includes the quadratic-constant contribution.",
            "Includes the linear-linear contribution.",
            "Includes the constant-quadratic contribution.",
          ),
        ],
        [
          "Keep only terms up to degree two.",
          "For a target power, list all degree pairs summing to it.",
          "Collect all contributions with their signs.",
        ],
        ["Omitting the product of the two linear terms."],
        3,
      );
      B.frq(
        "case",
        "The dimensions of a cube change from 10 cm to " +
          m("(10+" + a + ")\\,\\text{cm}") +
          ".",
        [
          part(
            "Write the new volume as a four-term binomial expansion.",
            m("1000+" + 300 * a + "+" + 30 * a * a + "+" + a ** 3) +
              " cubic centimetres.",
            "Expand " + m("(10+" + a + ")^3") + ".",
            "Writes all four correctly scaled terms.",
          ),
          part(
            "Find the exact increase in volume.",
            m((10 + a) ** 3 - 1000) + " cubic centimetres.",
            "Subtract the original volume 1000.",
            "Computes the exact increase.",
          ),
          part(
            "A student keeps only the linear increase " +
              m("300\\times" + a) +
              ". By how much does this underestimate the increase?",
            m(30 * a * a + a ** 3) + " cubic centimetres.",
            "The omitted quadratic and cubic contributions are both positive.",
            "Identifies both omitted terms.",
            "Calculates their sum.",
          ),
        ],
        [
          "Volume is a cube of the side length.",
          "Separate the original volume from the increase.",
          "Compare the exact expansion with the proposed shortened expression.",
        ],
        [
          "Assuming the percentage change in side equals the percentage change in volume.",
        ],
      );
    }
  }
  return B.items;
}
