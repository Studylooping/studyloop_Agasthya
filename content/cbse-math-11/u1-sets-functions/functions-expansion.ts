import type { Item, ItemFigure } from "@/lib/content/types";
import {
  assertion,
  fraction as f,
  math as m,
  mc,
  pair,
  part,
  range,
  set,
  signed,
  written,
  type Context,
} from "../practice-authoring";

function modulusGraph(h: number, k: number): ItemFigure {
  const X = (x: number) => 235 + 30 * x,
    Y = (y: number) => 280 - 25 * y;
  return {
    type: "svg",
    title: "Graph of a real-valued function",
    description:
      "A V-shaped graph with vertex labelled (" +
      h +
      ", " +
      k +
      "), passing through (" +
      (h + 2) +
      ", " +
      (k + 2) +
      "). Each grid division is one unit.",
    svg:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 360" role="img"><rect width="500" height="360" fill="white"/><g stroke="#cbd5e1">' +
      range(-6, 7)
        .map((x) => '<path d="M' + X(x) + ' 30V320"/>')
        .join("") +
      range(-1, 10)
        .map((y) => '<path d="M30 ' + Y(y) + 'H470"/>')
        .join("") +
      '</g><g stroke="#334155" stroke-width="2"><path d="M30 280H475M235 325V20"/></g><g fill="#334155" font-size="15" font-family="Arial"><text x="480" y="277">x</text><text x="244" y="22">y</text><text x="218" y="299">O</text></g><path d="M' +
      X(h - 5) +
      " " +
      Y(k + 5) +
      "L" +
      X(h) +
      " " +
      Y(k) +
      "L" +
      X(h + 5) +
      " " +
      Y(k + 5) +
      '" fill="none" stroke="#2563eb" stroke-width="3"/><g fill="#0f172a" font-family="Arial" font-size="15"><text x="' +
      (X(h) + 8) +
      '" y="' +
      (Y(k) + 20) +
      '">(' +
      h +
      ", " +
      k +
      ')</text><text x="' +
      (X(h + 2) + 8) +
      '" y="' +
      (Y(k + 2) - 8) +
      '">(' +
      (h + 2) +
      ", " +
      (k + 2) +
      ")</text></g></svg>",
  };
}

export function functionsExpansion(topic: "1.3" | "1.4" | "1.5"): Item[] {
  const c: Context = { unit: "u1-sets-functions", topic, chapter: 2 },
    out: Item[] = [];
  for (let v = 0; v < 4; v++) {
    const j = 10 * v,
      a = v + 2,
      b = v + 5;
    if (topic === "1.3") {
      const A = [a, a + 1, a + 2],
        B = [b, b + 2],
        product = A.flatMap((x) => B.map((y) => pair(x, y)));
      out.push(
        mc(
          c,
          j,
          "For " +
            m("A=" + set(A)) +
            " and " +
            m("B=" + set(B)) +
            ", which ordered pair belongs to " +
            m("A\\times B") +
            "?",
          2,
          "cartesian_order",
          m(pair(a, b + 2)),
          [
            [m(pair(b + 2, a)), "The first entry must belong to A, not B."],
            [m(pair(a - 1, b)), "The first entry is not in A."],
            [m(pair(a + 1, b + 1)), "The second entry is not in B."],
          ],
          [
            "Membership requires a first entry in A and a second entry in B.",
            m(pair(a, b + 2)) + " satisfies both conditions.",
          ],
          [
            "Check the first coordinate against A.",
            "Check the second coordinate against B.",
            "Order matters in a Cartesian product.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 1,
          "Let " +
            m("A=" + set(range(1, a + 2))) +
            " and " +
            m("R=\\{(x,y)\\in A\\times A:y=x+1\\}") +
            ". The range of " +
            m("R") +
            " is",
          2,
          "relation_range",
          m(set(range(2, a + 2))),
          [
            [
              m(set(range(1, a + 1))),
              "These are the first coordinates, which form the domain.",
            ],
            [
              m(set(range(1, a + 2))),
              "The value 1 cannot equal x+1 for x in A.",
            ],
            [
              m(set(range(2, a + 3))),
              "The value beyond the largest member of A is not allowed.",
            ],
          ],
          [
            "The allowed pairs run from (1,2) through " +
              m(pair(a + 1, a + 2)) +
              ".",
            "Collect their second coordinates: " +
              m(set(range(2, a + 2))) +
              ".",
          ],
          [
            "List pairs that satisfy the rule.",
            "Do not include a coordinate outside A.",
            "The range consists of second coordinates.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 2,
          "If " +
            m("n(A)=2") +
            " and " +
            m("n(B)=" + b) +
            ", the number of relations from " +
            m("A") +
            " to " +
            m("B") +
            " is",
          2,
          "relations_as_subsets",
          m(2 ** (2 * b)),
          [
            [
              m(2 * b),
              "This counts ordered pairs, not subsets of the product.",
            ],
            [
              m(b * b),
              "This counts functions from a two-element domain, not all relations.",
            ],
            [
              m(2 ** b),
              "The Cartesian product has twice as many members as B.",
            ],
          ],
          [
            m("n(A\\times B)=" + 2 * b) + ".",
            "A relation is any subset of that product, so there are " +
              m("2^{" + 2 * b + "}=" + 2 ** (2 * b)) +
              " relations.",
          ],
          [
            "First count ordered pairs.",
            "Every relation is a subset of the Cartesian product.",
            "A set of n elements has 2 to the power n subsets.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 3,
          "Let " +
            m(
              "R=\\{(" +
                a +
                "," +
                b +
                "),(" +
                (a + 1) +
                "," +
                b +
                "),(" +
                (a + 2) +
                "," +
                (b + 1) +
                ")\\}",
            ) +
            " be a relation from " +
            m("A=" + set(A)) +
            " to " +
            m("B=" + set([b, b + 1, b + 2])) +
            ". Which statement is correct?",
          2,
          "range_codomain",
          "The range is a proper subset of the codomain.",
          [
            [
              "The domain contains four elements.",
              "The domain contains the three distinct first coordinates.",
            ],
            [
              "The relation is not a function because two inputs have the same image.",
              "Different inputs may share one image.",
            ],
            [
              "The range equals the codomain.",
              "The codomain element " + m(b + 2) + " is not an image.",
            ],
          ],
          [
            "Each element of A has one image, so this relation is a function.",
            "Its range is " +
              m(set([b, b + 1])) +
              ", which omits " +
              m(b + 2) +
              " from the codomain.",
          ],
          [
            "Distinguish allowed outputs from outputs actually attained.",
            "Repeated second coordinates are permitted for a function.",
            "Check which codomain element never occurs.",
          ],
        ),
      );
      out.push(
        assertion(
          c,
          j + 4,
          "For " +
            m("A=" + set(A)) +
            " and " +
            m("B=" + set(B)) +
            ", " +
            m("n(A\\times B)=n(B\\times A)") +
            ".",
          "Multiplication of finite cardinalities is commutative.",
          0,
          "Both products have " +
            m(A.length * B.length) +
            " elements because " +
            m("n(A)n(B)=n(B)n(A)") +
            ". Equal cardinalities do not assert equality of the two products.",
          "product_cardinality",
        ),
      );
      out.push(
        written(
          c,
          j + 5,
          "vsaq",
          "Let " + m("A=" + set([a, a + 1])) + " and " + m("B=" + set(B)) + ".",
          2,
          "list_product",
          [
            part(
              "List " + m("A\\times B") + ".",
              m(set([a, a + 1].flatMap((x) => B.map((y) => pair(x, y))))) + ".",
              "Pair each of the two members of A with each of the two members of B.",
              "Lists all four ordered pairs.",
              "Preserves coordinate order.",
            ),
          ],
          [
            "Fix one member of A at a time.",
            "Pair it with every member of B.",
            "Check that four pairs have been listed.",
          ],
          ["Treating an ordered pair as an unordered set."],
        ),
      );
      out.push(
        written(
          c,
          j + 6,
          "vsaq",
          "The ordered pairs " +
            m("(2x+1,y-" + a + ")") +
            " and " +
            m("(" + (2 * b + 1) + "," + b + ")") +
            " are equal.",
          2,
          "equal_ordered_pairs",
          [
            part(
              "Find " + m("x") + " and " + m("y") + ".",
              m("x=" + b + ",\\ y=" + (a + b)) + ".",
              "Equality gives " +
                m("2x+1=" + (2 * b + 1)) +
                " and " +
                m("y-" + a + "=" + b) +
                ".",
              "Equates corresponding coordinates.",
              "Solves both linear equations.",
            ),
          ],
          [
            "Equate first coordinates.",
            "Equate second coordinates.",
            "Solve independently for the two unknowns.",
          ],
          ["Equating the two coordinates within one pair."],
        ),
      );
      const R = range(1, a + 2)
          .filter((x) => x * x <= b + 4)
          .map((x) => pair(x, x * x)),
        xs = range(1, a + 2).filter((x) => x * x <= b + 4);
      out.push(
        written(
          c,
          j + 7,
          "saq",
          "Let " +
            m("A=" + set(range(1, a + 2))) +
            ", " +
            m("B=" + set(range(1, b + 4))) +
            " and " +
            m("R=\\{(x,y)\\in A\\times B:y=x^2\\}") +
            ".",
          3,
          "relation_restrictions",
          [
            part(
              "List R and find its domain and range.",
              m("R=" + set(R)) +
                ", domain " +
                m(set(xs)) +
                ", range " +
                m(set(xs.map((x) => x * x))) +
                ".",
              "Square each possible input and discard outputs outside B.",
              "Lists precisely the admissible pairs.",
              "States the domain.",
              "States the range.",
            ),
          ],
          [
            "The relation must stay inside A times B.",
            "An input is absent if its square lies outside B.",
            "Read domain and range from the surviving pairs.",
          ],
          ["Keeping outputs beyond the codomain."],
        ),
      );
      const S = range(1, a + 2),
        pairs = S.flatMap((x) =>
          S.filter((y) => x + y === a + 3).map((y) => pair(x, y)),
        );
      out.push(
        written(
          c,
          j + 8,
          "laq",
          "On " +
            m("S=" + set(S)) +
            ", a relation is defined by " +
            m("xRy\\iff x+y=" + (a + 3)) +
            ".",
          3,
          "relation_function_check",
          [
            part(
              "Write R in roster form and state its domain and range.",
              m("R=" + set(pairs)) +
                "; both domain and range are " +
                m(set(S)) +
                ".",
              "For each x in S, the required partner is " +
                m("y=" + (a + 3) + "-x") +
                ", which is again in S.",
              "Lists every admissible pair.",
              "States both projections.",
            ),
            part(
              "Does R define a function from S to S? Justify.",
              "Yes.",
              "Every input x has exactly one partner, " + m(a + 3 + "-x") + ".",
              "Checks every input is covered.",
              "Checks uniqueness of each image.",
              "Concludes that this is a function.",
            ),
          ],
          [
            "Solve the relation for y.",
            "Check the endpoints of S.",
            "Use the definition of a function, not a one-to-one requirement.",
          ],
          ["Mistaking different images for a requirement for all functions."],
        ),
      );
      out.push(
        written(
          c,
          j + 9,
          "case",
          "A relation from " +
            m("A=" + set([a, a + 1, a + 2])) +
            " to " +
            m("B=" + set([b, b + 1, b + 2])) +
            " is " +
            m("R=" + set([pair(a, b), pair(a + 1, b), pair(a + 2, b + 1)])) +
            ". A student adds " +
            m(pair(a, b + 2)) +
            ".",
          3,
          "relation_change",
          [
            part(
              "State the original domain and range.",
              m(set([a, a + 1, a + 2])) + " and " + m(set([b, b + 1])) + ".",
              "Collect first and second coordinates separately.",
              "Gives both sets correctly.",
            ),
            part(
              "Is the original relation a function?",
              "Yes.",
              "Every member of A has exactly one image.",
              "Applies the one-image condition.",
            ),
            part(
              "Does the enlarged relation remain a function? Explain.",
              "No.",
              "Input " +
                m(a) +
                " now has two different images, " +
                m(b) +
                " and " +
                m(b + 2) +
                ".",
              "Identifies the repeated input.",
              "Identifies its two distinct outputs.",
            ),
          ],
          [
            "Check images input by input.",
            "Shared images of different inputs are permitted.",
            "Two different images of the same input are not permitted.",
          ],
          ["Rejecting a many-to-one function."],
        ),
      );
    } else if (topic === "1.4") {
      out.push(
        mc(
          c,
          j,
          "The domain of the real function " +
            m("f(x)=\\frac{\\sqrt{x-" + a + "}}{x-" + b + "}") +
            " is",
          3,
          "root_quotient_domain",
          m("[" + a + "," + b + ")\\cup(" + b + ",\\infty)"),
          [
            [m("[" + a + ",\\infty)"), "The denominator must also be nonzero."],
            [
              m("(" + a + "," + b + ")"),
              "The square root may be zero, and inputs above b are also allowed.",
            ],
            [
              m("\\mathbb R-\\{" + b + "\\}"),
              "Negative radicands are not permitted for a real square root.",
            ],
          ],
          [
            "The square root requires " +
              m("x\\ge" + a) +
              "; the denominator requires " +
              m("x\\ne" + b) +
              ".",
            "Intersect the two conditions.",
          ],
          [
            "Write the radicand condition.",
            "Exclude any zero of the denominator.",
            "Combine the restrictions, rather than choosing only one.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 1,
          "The range of " +
            m("f(x)=(x-" + a + ")^2+" + b) +
            ", " +
            m("x\\in\\mathbb R") +
            ", is",
          2,
          "quadratic_range",
          m("[" + b + ",\\infty)"),
          [
            [
              m("(" + b + ",\\infty)"),
              "The minimum is attained at x=" + a + ".",
            ],
            [
              m("[" + a + ",\\infty)"),
              "The horizontal shift does not set the minimum value.",
            ],
            [m("\\mathbb R"), "A square cannot be negative."],
          ],
          [
            m("(x-" + a + ")^2\\ge0") +
              " with equality at " +
              m("x=" + a) +
              ".",
            "The least output is " + m(b) + ", and all larger outputs occur.",
          ],
          [
            "Use non-negativity of a square.",
            "Check whether the lower bound is attained.",
            "A horizontal shift changes the input giving the minimum.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 2,
          "Let " +
            m("f(x)=" + a + "x+1") +
            " and " +
            m("g(x)=x-" + b) +
            ". The function " +
            m("(fg)(x)") +
            " is",
          2,
          "product_functions",
          m(a + "x^2" + signed(1 - a * b) + "x-" + b),
          [
            [m(a + 1 + "x" + signed(1 - b)), "This is f+g, not the product."],
            [
              m(a + "x" + signed(1 - a * b)),
              "This is f evaluated at g(x), not pointwise multiplication.",
            ],
            [m(a + "x^2-" + b), "The two cross terms have been omitted."],
          ],
          [
            "Here fg means pointwise multiplication: " +
              m("(" + a + "x+1)(x-" + b + ")") +
              ".",
            "Expansion gives " +
              m(a + "x^2" + signed(1 - a * b) + "x-" + b) +
              ".",
          ],
          [
            "Multiply the two outputs at the same input.",
            "Distribute both terms of each factor.",
            "Collect the coefficient of x.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 3,
          "If " +
            m("f(x)=\\frac{x^2-" + a * a + "}{x-" + a + "}") +
            ", which statement is correct?",
          3,
          "cancelled_domain",
          m("f(x)=x+" + a) + " for " + m("x\\ne" + a),
          [
            [
              m("f(x)=x+" + a) + " for all real x.",
              "Cancellation does not restore a value excluded by the original denominator.",
            ],
            [
              m("f(" + a + ")=" + 2 * a),
              "The original expression is undefined at this input.",
            ],
            [
              m("f(x)=x-" + a) + " for " + m("x\\ne" + a),
              "The remaining factor after cancellation is x+" + a + ".",
            ],
          ],
          [
            "Factor the numerator as " + m("(x-" + a + ")(x+" + a + ")") + ".",
            "Cancellation is valid only when " + m("x\\ne" + a) + ".",
          ],
          [
            "Factor the difference of two squares.",
            "Record the original domain before cancelling.",
            "Keep that restriction after simplification.",
          ],
        ),
      );
      out.push(
        assertion(
          c,
          j + 4,
          m("f:\\mathbb R\\to\\mathbb R,\\ f(x)=x^2+" + a) + " is a function.",
          "A function must assign different outputs to different inputs.",
          2,
          "The assertion is true: each real input has one output. The reason is false: a function can send x and -x to the same output.",
          "function_not_injective",
        ),
      );
      out.push(
        written(
          c,
          j + 5,
          "vsaq",
          "Let " + m("f(x)=" + a + "x^2-" + b + "x+1") + ".",
          2,
          "function_evaluation",
          [
            part(
              "Find " + m("f(-2)") + ".",
              m(4 * a + 2 * b + 1) + ".",
              "Substitute -2: " +
                m(a + "(-2)^2-" + b + "(-2)+1=" + (4 * a + 2 * b + 1)) +
                ".",
              "Squares the negative input correctly.",
              "Evaluates all signed terms.",
            ),
          ],
          [
            "Substitute using parentheses.",
            "Square -2 before multiplying.",
            "Subtracting a negative term adds its magnitude.",
          ],
          ["Replacing the square of -2 by -4."],
        ),
      );
      out.push(
        written(
          c,
          j + 6,
          "vsaq",
          "Consider " + m("g(x)=\\sqrt{" + b + "-x}") + ".",
          2,
          "root_domain_range",
          [
            part(
              "State its domain and range.",
              "Domain " +
                m("(-\\infty," + b + "]") +
                ", range " +
                m("[0,\\infty)") +
                ".",
              "The radicand must be nonnegative. As x decreases without bound, the square root increases without bound.",
              "Obtains the domain.",
              "Obtains the nonnegative range.",
            ),
          ],
          [
            "Require the radicand to be nonnegative.",
            "A square root has nonnegative outputs.",
            "Check the output at the finite endpoint.",
          ],
          ["Giving the radicand's range as the function's range."],
        ),
      );
      out.push(
        written(
          c,
          j + 7,
          "saq",
          "A linear function " +
            m("f(x)=px+q") +
            " satisfies " +
            m("f(1)=" + (a + b)) +
            " and " +
            m("f(3)=" + (3 * a + b)) +
            ".",
          3,
          "linear_function_recovery",
          [
            part(
              "Find p and q, then find " + m("f(-1)") + ".",
              m("p=" + a + ",\\ q=" + b + ",\\ f(-1)=" + (b - a)) + ".",
              "The conditions give " +
                m("p+q=" + (a + b)) +
                " and " +
                m("3p+q=" + (3 * a + b)) +
                ". Subtract to find p, then substitute to find q.",
              "Forms the two equations.",
              "Solves both coefficients.",
              "Evaluates the requested image.",
            ),
          ],
          [
            "Turn the two function values into simultaneous equations.",
            "Subtract to eliminate q.",
            "Use the recovered rule for the new input.",
          ],
          ["Using an input difference of one instead of two."],
        ),
      );
      out.push(
        written(
          c,
          j + 8,
          "laq",
          "Let " +
            m("f(x)=\\sqrt{x-" + a + "}") +
            " and " +
            m("g(x)=x-" + b) +
            ", each on its natural real domain.",
          3,
          "algebra_function_domains",
          [
            part(
              "Find the domain of " + m("f+g") + " and write its rule.",
              m(
                "[ " +
                  a +
                  ",\\infty),\\quad (f+g)(x)=\\sqrt{x-" +
                  a +
                  "}+x-" +
                  b,
              ) + ".",
              "Addition requires both functions to be defined.",
              "Intersects the individual domains.",
              "Writes the sum.",
            ),
            part(
              "Find the domain and rule of " + m("f/g") + ".",
              m(
                "[" +
                  a +
                  "," +
                  b +
                  ")\\cup(" +
                  b +
                  ",\\infty),\\quad (f/g)(x)=\\frac{\\sqrt{x-" +
                  a +
                  "}}{x-" +
                  b +
                  "}",
              ) + ".",
              "Start with the common domain, then exclude the zero of g.",
              "Starts with the common domain.",
              "Excludes the denominator zero.",
              "Writes the quotient.",
            ),
          ],
          [
            "The domain of a sum is the common domain.",
            "A quotient needs an additional restriction.",
            "Check where g vanishes.",
          ],
          ["Assuming every algebraic combination has the same domain."],
        ),
      );
      out.push(
        written(
          c,
          j + 9,
          "case",
          "A parking charge is modelled by " +
            m(
              "C(t)=\\begin{cases}" +
                a +
                "t,&0\\le t\\le2\\\\" +
                2 * a +
                "+" +
                b +
                "(t-2),&2<t\\le6\\end{cases}",
            ) +
            ", where t is time in hours and C is in rupees.",
          3,
          "piecewise_function",
          [
            part(
              "Find C(2) and C(4).",
              m("C(2)=" + 2 * a + ",\\ C(4)=" + (2 * a + 2 * b)) + ".",
              "Use the first branch at 2 and the second at 4.",
              "Uses the correct branches.",
            ),
            part(
              "State the domain.",
              m("[0,6]") + ".",
              "Both given time intervals together cover 0 through 6.",
              "States the complete domain.",
            ),
            part(
              "Find the range and justify whether the branch boundary leaves a gap.",
              m("[0," + (2 * a + 4 * b) + "]") + ".",
              "Both rates are positive. The first branch reaches " +
                m(2 * a) +
                " and the second approaches that value immediately above t=2, then reaches " +
                m(2 * a + 4 * b) +
                " at t=6. No output gap occurs.",
              "Checks values near the joining point.",
              "Finds both range endpoints.",
            ),
          ],
          [
            "Read which branch includes the boundary.",
            "Both branches are increasing.",
            "Check their values at the join and at the domain endpoints.",
          ],
          ["Substituting every time into the same branch."],
        ),
      );
    } else {
      const h = v - 2,
        k = v + 1;
      out.push(
        mc(
          c,
          j,
          "Which function has the graph shown? The arms have slopes -1 and 1.",
          2,
          "modulus_graph",
          m("f(x)=|x" + signed(-h) + "|+" + k),
          [
            [
              m("f(x)=|x" + signed(-h) + "|-" + k),
              "This puts the vertex below the x-axis.",
            ],
            [
              m("f(x)=-|x" + signed(-h) + "|+" + k),
              "This opens downwards, unlike the graph.",
            ],
            [
              m("f(x)=|x" + signed(-h) + "|+" + (k + 1)),
              "This places the vertex one unit too high.",
            ],
          ],
          [
            "An upward V with slopes -1 and 1 is a translated absolute-value graph.",
            "Its vertex is " +
              m(pair(h, k)) +
              ", so " +
              m("f(x)=|x" + signed(-h) + "|+" + k) +
              ".",
          ],
          [
            "Identify the vertex.",
            "A horizontal translation appears inside the modulus.",
            "A vertical translation appears outside the modulus.",
          ],
          modulusGraph(h, k),
        ),
      );
      const x = -a - 0.25;
      out.push(
        mc(
          c,
          j + 1,
          "If " +
            m("[x]") +
            " denotes the greatest integer not exceeding x, find " +
            m("[" + x + "]") +
            ".",
          2,
          "floor_negative",
          m(-a - 1),
          [
            [m(-a), "This truncates toward zero rather than taking the floor."],
            [m(a), "The sign of the input cannot be discarded."],
            [
              m(-a - 2),
              "There is a larger integer that still does not exceed the input.",
            ],
          ],
          [
            m(-a - 1 + "\\le" + x + "<" + -a) + ".",
            "Therefore the greatest allowable integer is " + m(-a - 1) + ".",
          ],
          [
            "Locate the input between consecutive integers.",
            "Floor means the lower integer, including for negative numbers.",
            "Choose the greatest integer no larger than the input.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 2,
          "For " +
            m("f(x)=\\operatorname{sgn}(x-" + a + ")") +
            ", find " +
            m("f(" + (a - 2) + ")+f(" + a + ")+f(" + (a + 3) + ")") +
            ".",
          2,
          "signum_values",
          m(0),
          [
            [
              m(1),
              "At the middle input the signum argument is zero, so that term is zero.",
            ],
            [m(3), "A signum value is not always positive."],
            [m(-1), "The positive argument contributes +1 as well."],
          ],
          [
            "The arguments have signs negative, zero, positive.",
            "The sum is " + m("-1+0+1=0") + ".",
          ],
          [
            "Evaluate the sign of each argument.",
            "Use -1, 0, or 1 as appropriate.",
            "Add the three outputs.",
          ],
        ),
      );
      out.push(
        mc(
          c,
          j + 3,
          "The natural real domain of " +
            m("f(x)=\\log_" + a + "(x-" + b + ")") +
            " is",
          2,
          "log_domain",
          m("(" + b + ",\\infty)"),
          [
            [
              m("[" + b + ",\\infty)"),
              "A real logarithm is undefined at zero.",
            ],
            [
              m("(0,\\infty)"),
              "It is the shifted argument, not x alone, that must be positive.",
            ],
            [m("\\mathbb R"), "A nonpositive argument has no real logarithm."],
          ],
          [
            "The base " + m(a) + " is positive and not 1.",
            "Require " + m("x-" + b + ">0") + ", giving " + m("x>" + b) + ".",
          ],
          [
            "Check the logarithm's argument.",
            "Its argument must be strictly positive.",
            "Solve the resulting inequality.",
          ],
        ),
      );
      out.push(
        assertion(
          c,
          j + 4,
          "The range of " +
            m("f(x)=" + a + "^x") +
            ", for real x, contains zero.",
          "For every real x, " + m(a + "^x>0") + ".",
          3,
          "The assertion is false and the reason is true. Values can approach zero without ever being zero.",
          "exponential_range",
        ),
      );
      out.push(
        written(
          c,
          j + 5,
          "vsaq",
          "Let " + m("f(x)=|x-" + a + "|") + ".",
          2,
          "modulus_values",
          [
            part(
              "Find " +
                m("f(" + (a - b) + ")") +
                " and " +
                m("f(" + (a + b) + ")") +
                ".",
              m(b) + " and " + m(b) + ".",
              "The arguments of the modulus are -" +
                b +
                " and " +
                b +
                " respectively.",
              "Computes both arguments.",
              "Uses their absolute values.",
            ),
          ],
          [
            "Subtract the horizontal shift first.",
            "Opposite arguments have equal absolute values.",
            "Both requested inputs are equally far from the vertex.",
          ],
          ["Keeping a negative sign after taking the modulus."],
        ),
      );
      out.push(
        written(
          c,
          j + 6,
          "vsaq",
          "The greatest-integer function satisfies " + m("[x]=" + -a) + ".",
          2,
          "floor_preimage",
          [
            part(
              "Give the complete interval of possible x.",
              m("[" + -a + "," + (-a + 1) + ")") + ".",
              "By definition " + m(-a + "\\le x<" + (-a + 1)) + ".",
              "Includes the lower integer.",
              "Excludes the next integer.",
            ),
          ],
          [
            "The floor value is the lower endpoint.",
            "The next integer starts a new step.",
            "Express the half-open interval.",
          ],
          ["Including the upper endpoint of a floor step."],
        ),
      );
      out.push(
        written(
          c,
          j + 7,
          "saq",
          "Let " + m("f(x)=\\log_" + a + "(x-" + b + ")") + ".",
          3,
          "log_range_inverse_value",
          [
            part(
              "Find x when f(x)=2; state the domain and range of f.",
              m("x=" + (b + a * a)) +
                "; domain " +
                m("(" + b + ",\\infty)") +
                ", range " +
                m("\\mathbb R") +
                ".",
              "The equation gives " +
                m("x-" + b + "=" + a + "^2") +
                ". A positive logarithm argument can attain every positive value, producing all real logarithm outputs.",
              "Converts logarithmic to exponential form.",
              "States the domain.",
              "States the range.",
            ),
          ],
          [
            "Convert the logarithmic equation into an exponential equation.",
            "Keep the argument positive.",
            "The logarithm can have negative, zero, or positive outputs.",
          ],
          ["Restricting logarithm outputs to positive numbers."],
        ),
      );
      out.push(
        written(
          c,
          j + 8,
          "laq",
          "Let " +
            m("f(x)=\\frac{1}{|x-" + a + "|}") +
            " on its natural domain.",
          3,
          "reciprocal_modulus",
          [
            part(
              "Determine the domain and range.",
              "Domain " +
                m("\\mathbb R-\\{" + a + "\\}") +
                ", range " +
                m("(0,\\infty)") +
                ".",
              "The denominator must be nonzero and is then positive. Every positive output y is obtained by taking " +
                m("x=" + a + "+1/y") +
                ".",
              "Excludes the zero of the denominator.",
              "Proves outputs are positive.",
              "Shows every positive output is attainable.",
            ),
            part(
              "Solve " + m("f(x)=" + f(1, b)) + ".",
              m("x=" + (a - b) + "\\ \\text{or}\\ x=" + (a + b)) + ".",
              "The equation becomes " + m("|x-" + a + "|=" + b) + ".",
              "Forms the absolute-value equation.",
              "Gives both valid inputs.",
            ),
          ],
          [
            "Check the denominator first.",
            "A reciprocal of a positive quantity is positive.",
            "An absolute-value equation with a positive right side has two branches.",
          ],
          ["Omitting one solution or including the undefined input."],
        ),
      );
      out.push(
        written(
          c,
          j + 9,
          "case",
          "A function is given by " +
            m(
              "f(x)=\\begin{cases}x+" +
                a +
                ",&x<0\\\\" +
                a +
                ",&x=0\\\\" +
                a +
                "-x,&x>0\\end{cases}",
            ) +
            ".",
          3,
          "piecewise_modulus",
          [
            part(
              "Find f(-2), f(0), and f(2).",
              m(a - 2 + ",\\ " + a + ",\\ " + (a - 2)) + ".",
              "Choose the branch using the sign of the input.",
              "Evaluates all three branches.",
            ),
            part(
              "Express f using an absolute value.",
              m("f(x)=" + a + "-|x|") + ".",
              "For negative x, -|x|=x; for positive x, -|x|=-x.",
              "Obtains an equivalent modulus expression.",
            ),
            part(
              "Find its range and the inputs where f(x)=0.",
              m("(-\\infty," + a + "],\\quad x=\\pm" + a) + ".",
              "The modulus is nonnegative, so the maximum is " +
                m(a) +
                " at zero. Solve " +
                m("|x|=" + a) +
                " for the zeros.",
              "Finds the range with its attained maximum.",
              "Finds both zeros.",
            ),
          ],
          [
            "Treat negative, zero, and positive inputs separately.",
            "Compare the branches with the definition of absolute value.",
            "The function decreases as distance from zero increases.",
          ],
          [
            "Taking the range to be nonnegative merely because a modulus appears.",
          ],
        ),
      );
    }
  }
  return out;
}
