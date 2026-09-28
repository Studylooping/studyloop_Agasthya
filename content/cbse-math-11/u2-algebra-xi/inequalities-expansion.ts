import { builder } from "../expansion-builder";
import {
  fraction as f,
  math as m,
  part,
  range,
  set,
} from "../practice-authoring";

export function inequalitiesExpansion() {
  const B = builder({ unit: "u2-algebra-xi", topic: "2.2", chapter: 5 });
  for (let v = 0; v < 8; v++) {
    const a = (v % 4) + 2,
      b = a + 3;
    if (v < 4) {
      B.mc(
        "Solve " + m(a + "x+" + b + ">" + (a * b + b)) + ".",
        m("x>" + b),
        [
          [
            m("x<" + b),
            "Division by the positive coefficient does not reverse the inequality.",
          ],
          [m("x\\ge" + b), "A strict inequality excludes its endpoint."],
          [
            m("x>" + (b + 1)),
            "Subtract the constant and then divide by the coefficient.",
          ],
        ],
        [
          "Subtract " +
            m(b) +
            " from both sides to get " +
            m(a + "x>" + a * b) +
            ".",
          "Divide by positive " + m(a) + ".",
        ],
        [
          "Isolate the x term.",
          "Check the sign of its coefficient.",
          "Preserve strictness at the endpoint.",
        ],
      );
      B.mc(
        "The solution of " + m(-a + "x+" + b + "\\le" + (b - a * b)) + " is",
        m("[" + b + ",\\infty)"),
        [
          [
            m("(-\\infty," + b + "]"),
            "Dividing by a negative coefficient reverses the inequality.",
          ],
          [m("(" + b + ",\\infty)"), "Equality is allowed."],
          [
            m("[" + -b + ",\\infty)"),
            "The quotient of the two negative terms is positive.",
          ],
        ],
        [
          m(-a + "x\\le" + -a * b) + ".",
          "Division by " + m(-a) + " gives " + m("x\\ge" + b) + ".",
        ],
        [
          "Subtract the constant term.",
          "Reverse the inequality when dividing by a negative number.",
          "Translate the final inequality into an interval.",
        ],
      );
      B.mc(
        "How many integers satisfy " + m(-a + "<x\\le" + b) + "?",
        m(a + b),
        [
          [m(a + b + 1), "The strict lower endpoint is excluded."],
          [m(a + b - 1), "The upper endpoint is included."],
          [m(b), "Negative integers and zero must also be counted."],
        ],
        [
          "The integers run from " + m(1 - a) + " through " + m(b) + ".",
          "Their count is " + m(b + "-(" + (1 - a) + ")+1=" + (a + b)) + ".",
        ],
        [
          "Identify the first allowed integer.",
          "Identify the last allowed integer.",
          "Use last minus first plus one.",
        ],
      );
      B.mc(
        "The common solution of " +
          m("x\\ge" + a) +
          " and " +
          m("x<" + b) +
          " is",
        m("[" + a + "," + b + ")"),
        [
          [
            m("(" + a + "," + b + "]"),
            "Both endpoint inclusions have been reversed.",
          ],
          [m("(-\\infty," + b + ")"), "This ignores the lower bound."],
          [m("[" + a + ",\\infty)"), "This ignores the upper bound."],
        ],
        [
          "A common solution must meet both bounds.",
          "The lower endpoint is included, but the upper endpoint is excluded.",
        ],
        [
          "Use intersection, not union.",
          "Check the equality sign at each bound.",
          "Write the resulting interval.",
        ],
      );
      B.mc(
        "For which x is " +
          m("\\frac{x-" + a + "}{3}<\\frac{x+" + b + "}{5}") +
          " true?",
        m("x<" + f(5 * a + 3 * b, 2)),
        [
          [
            m("x>" + f(5 * a + 3 * b, 2)),
            "Multiplication by 15 does not reverse the inequality.",
          ],
          [
            m("x<" + (a + b)),
            "The denominators must both be cleared before collecting x terms.",
          ],
          [
            m("x\\le" + f(5 * a + 3 * b, 2)),
            "The original inequality is strict.",
          ],
        ],
        [
          "Multiply by 15: " + m("5(x-" + a + ")<3(x+" + b + ")") + ".",
          "Thus " + m("2x<" + (5 * a + 3 * b)) + ".",
        ],
        [
          "Use the positive common denominator.",
          "Expand both sides.",
          "Collect x terms on one side.",
        ],
        3,
      );
      B.frq(
        "vsaq",
        "Solve " + m("3(x-" + a + ")\\ge2x+" + b) + ".",
        [
          part(
            "Give the solution as an interval.",
            m("[" + (3 * a + b) + ",\\infty)") + ".",
            "Expand to " +
              m("3x-" + 3 * a + "\\ge2x+" + b) +
              " and subtract 2x.",
            "Collects x terms correctly.",
            "Includes the endpoint.",
          ),
        ],
        ["Expand the bracket.", "Move x terms together.", "Retain equality."],
        ["Multiplying only the x term by 3."],
        2,
      );
      B.frq(
        "vsaq",
        "Solve " + m(a + "-2x>" + (a + 2 * b)) + ".",
        [
          part(
            "State the solution.",
            m("x<" + -b) + ".",
            "Subtract a and divide " +
              m("-2x>" + 2 * b) +
              " by -2, reversing the sign.",
            "Isolates the negative x term.",
            "Reverses the inequality.",
          ),
        ],
        [
          "Subtract the same constant on both sides.",
          "Division is by a negative number.",
          "Reverse the direction.",
        ],
        ["Failing to reverse the inequality."],
        2,
      );
      B.frq(
        "saq",
        "Find the integer solutions of " +
          m(-a + "\\le2x+1<" + (2 * b + 1)) +
          ".",
        [
          part(
            "List all integer solutions.",
            m(set(range(Math.ceil((-a - 1) / 2), b - 1))) + ".",
            "Subtract 1 and divide by 2 to obtain " +
              m(f(-a - 1, 2) + "\\le x<" + b) +
              ". Choose integers in this interval.",
            "Transforms all three parts of the inequality.",
            "Finds the first and last allowed integers.",
            "Lists the complete integer set.",
          ),
        ],
        [
          "Apply each operation to all three expressions.",
          "Division by positive 2 preserves both signs.",
          "Select integers only after solving the real inequality.",
        ],
        ["Treating a strict upper bound as inclusive."],
      );
      B.frq(
        "laq",
        "Solve simultaneously " +
          m("2x-" + a + "\\ge" + a) +
          " and " +
          m("3x+" + b + "<" + 4 * b) +
          ".",
        [
          part(
            "Solve each inequality separately.",
            m("x\\ge" + a + ";\\quad x<" + b) + ".",
            "Move constants first, then divide by each positive coefficient.",
            "Solves the first inequality.",
            "Solves the second inequality.",
          ),
          part(
            "Give the common real solution and list its integer members.",
            m("[" + a + "," + b + ")") +
              "; integers " +
              m(set(range(a, b - 1))) +
              ".",
            "Intersect the two half-lines. Include the lower endpoint and exclude the upper endpoint.",
            "Intersects the two solution sets.",
            "Handles both endpoints correctly.",
            "Lists precisely the integer solutions.",
          ),
        ],
        [
          "Treat the two inequalities separately at first.",
          "The word simultaneously requires intersection.",
          "Check endpoints before listing integers.",
        ],
        ["Taking the union of constraints that must both hold."],
      );
      B.frq(
        "case",
        "A student has Rs " +
          20 * b +
          ". A fixed delivery charge is Rs " +
          5 * a +
          " and each notebook costs Rs 15. The student buys a nonnegative integer number n of notebooks.",
        [
          part(
            "Write the budget inequality.",
            m("15n+" + 5 * a + "\\le" + 20 * b) + ".",
            "The total cost cannot exceed the budget.",
            "Translates all cost terms.",
          ),
          part(
            "Find the maximum number of notebooks.",
            m(Math.floor((20 * b - 5 * a) / 15)) + ".",
            "Solve " +
              m("n\\le" + f(20 * b - 5 * a, 15)) +
              " and take the greatest allowable integer.",
            "Solves the inequality.",
            "Rounds down for a whole-number purchase.",
          ),
          part(
            "State the money left at this maximum.",
            "Rs " +
              (20 * b - 5 * a - 15 * Math.floor((20 * b - 5 * a) / 15)) +
              ".",
            "Subtract the fixed charge and the cost of the maximum purchase.",
            "Calculates the remaining balance.",
          ),
        ],
        [
          "Account for the fixed charge before dividing.",
          "A purchase count must be an integer.",
          "An upper bound requires rounding down.",
        ],
        ["Rounding an unaffordable fractional upper bound upward."],
      );
    } else {
      B.mc(
        "Which real x satisfy " + m(a + "(x+1)>" + a + "x+" + (a + 1)) + "?",
        "No real x",
        [
          ["All real x", "The x terms cancel, leaving a false statement."],
          [m("x>1"), "No x term remains after correct simplification."],
          [m("x<0"), "Changing x cannot repair a false constant inequality."],
        ],
        [
          "Subtract " + m(a + "x") + " from both sides.",
          "The remaining statement " +
            m(a + ">" + (a + 1)) +
            " is false, so the solution set is empty.",
        ],
        [
          "Expand the left side.",
          "Cancel identical variable terms.",
          "Judge the remaining numerical statement.",
        ],
      );
      B.mc(
        "The inequality " +
          m(a + "(x+2)\\le" + a + "x+" + (2 * a + 1)) +
          " has solution set",
        m("\\mathbb R"),
        [
          [m("\\varnothing"), "The remaining constant inequality is true."],
          [m("[0,\\infty)"), "No restriction on x remains."],
          [m("(-\\infty,1]"), "The variable terms cancel exactly."],
        ],
        [
          "After cancelling " +
            m(a + "x") +
            ", the statement becomes " +
            m(2 * a + "\\le" + (2 * a + 1)) +
            ".",
          "It is true for every real x.",
        ],
        [
          "Expand and collect terms.",
          "Do any variable terms remain?",
          "A true constant statement imposes no restriction.",
        ],
      );
      B.mc(
        "For real x, the inequalities " +
          m("x>" + b) +
          " and " +
          m("x\\le" + a) +
          " have",
        "no common solution",
        [
          [m("(" + b + ",\\infty)"), "This fails the upper bound."],
          [m("(-\\infty," + a + "]"), "This fails the lower bound."],
          [
            m("[" + a + "," + b + "]"),
            "No point here can be above b and at most a simultaneously.",
          ],
        ],
        [
          "Since " +
            m(b + ">" + a) +
            ", an input cannot be both larger than b and at most a.",
          "The two half-lines do not overlap.",
        ],
        [
          "Compare the two endpoints.",
          "Both inequalities must hold.",
          "Look for an intersection.",
        ],
      );
      B.mc(
        "If " +
          m("\\frac{x}{" + a + "}+1\\ge" + b) +
          ", the least possible integer x is",
        m(a * (b - 1)),
        [
          [m(b - 1), "This omits multiplication by the denominator."],
          [m(a * b), "The constant 1 must first be subtracted."],
          [
            m(a * (b - 1) + 1),
            "The lower bound is included, so the next integer is unnecessary.",
          ],
        ],
        [
          m("x/" + a + "\\ge" + (b - 1)) +
            " gives " +
            m("x\\ge" + a * (b - 1)) +
            ".",
          "The bound itself is an integer and is allowed.",
        ],
        [
          "Subtract 1.",
          "Multiply by the positive denominator.",
          "Check whether equality is allowed.",
        ],
      );
      B.mc(
        "For which x is " + m(a + "<\\frac{x+1}{2}\\le" + b) + " true?",
        m("(" + (2 * a - 1) + "," + (2 * b - 1) + "]"),
        [
          [
            m("[" + (2 * a - 1) + "," + (2 * b - 1) + ")"),
            "Endpoint inclusion must follow the original strict and non-strict signs.",
          ],
          [
            m("(" + 2 * a + "," + 2 * b + "]"),
            "Subtract 1 after multiplying by 2.",
          ],
          [
            m("(" + (a - 1) + "," + (b - 1) + "]"),
            "The factor 2 has not been applied to both bounds.",
          ],
        ],
        [
          "Multiply all three expressions by 2, then subtract 1.",
          "This gives " + m(2 * a - 1 + "<x\\le" + (2 * b - 1)) + ".",
        ],
        [
          "Transform all three parts together.",
          "Multiply first.",
          "Keep each endpoint's original strictness.",
        ],
        3,
      );
      B.frq(
        "vsaq",
        "Find the real x for which " +
          m("5-" + a + "x\\ge5-" + a + "(x+1)") +
          ".",
        [
          part(
            "State and justify the solution set.",
            m("\\mathbb R") + ".",
            "Expanding and cancelling gives " +
              m("0\\ge" + -a) +
              ", a true statement independent of x.",
            "Cancels identical variable terms.",
            "Concludes all real x are allowed.",
          ),
        ],
        [
          "Expand the right side carefully.",
          "Cancel the x terms.",
          "Check the remaining number comparison.",
        ],
        ["Trying to divide by a zero x coefficient."],
        2,
      );
      B.frq(
        "vsaq",
        "How many natural numbers satisfy " +
          m("2x+1<" + (2 * b + 1)) +
          "? Here " +
          m("\\mathbb N=\\{1,2,3,\\ldots\\}") +
          ".",
        [
          part(
            "Give the count.",
            m(b - 1) + ".",
            "The inequality is " +
              m("x<" + b) +
              ", so the allowable natural numbers are 1 through " +
              m(b - 1) +
              ".",
            "Finds the strict bound.",
            "Counts the allowed natural numbers.",
          ),
        ],
        [
          "Solve the real inequality.",
          "Use the stated convention for natural numbers.",
          "Exclude the strict upper endpoint.",
        ],
        ["Including zero despite the stated natural-number convention."],
        2,
      );
      B.frq(
        "saq",
        "A rectangle has width " +
          m(a + "\\,\\text{cm}") +
          " and length " +
          m("x\\,\\text{cm}") +
          ", with " +
          m("x\\ge" + a) +
          ". Its perimeter is at most " +
          m(2 * (a + b) + "\\,\\text{cm}") +
          ".",
        [
          part(
            "Find the complete interval of possible lengths.",
            m("[" + a + "," + b + "]") + " cm.",
            "The perimeter condition gives " +
              m("2(x+" + a + ")\\le" + 2 * (a + b)) +
              ", hence " +
              m("x\\le" + b) +
              ". Intersect with the width-length condition.",
            "Forms the perimeter inequality.",
            "Solves the upper bound.",
            "Includes the given lower bound.",
          ),
        ],
        [
          "Use perimeter = twice the sum of dimensions.",
          "Solve for length.",
          "Retain the condition that length is at least width.",
        ],
        ["Using only the perimeter bound."],
      );
      B.frq(
        "laq",
        "Solve the pair " +
          m("\\frac{2x-" + a + "}{3}\\ge" + a) +
          " and " +
          m("\\frac{x+" + b + "}{2}<" + 2 * b) +
          ".",
        [
          part(
            "Find the two separate real solution sets.",
            m("x\\ge" + 2 * a + ",\\quad x<" + 3 * b) + ".",
            "Multiply the first by 3 and the second by 2; both multipliers are positive.",
            "Clears the first denominator and solves.",
            "Clears the second denominator and solves.",
          ),
          part(
            "Find the common interval and the number of integer solutions.",
            m("[" + 2 * a + "," + 3 * b + ")") +
              "; " +
              m(3 * b - 2 * a) +
              " integers.",
            "The integers are " +
              m(2 * a) +
              " through " +
              m(3 * b - 1) +
              ". Count inclusively.",
            "Finds the intersection.",
            "Identifies the first and last integers.",
            "Counts correctly.",
          ),
        ],
        [
          "Clear the positive denominators separately.",
          "Combine using intersection.",
          "A strict integer upper bound reduces the last integer by one.",
        ],
        ["Counting the excluded upper endpoint."],
      );
      B.frq(
        "case",
        "A test consists of three papers, each marked out of 100. A student scores " +
          (60 + a) +
          " and " +
          (65 + a) +
          " in the first two papers. The required average is at least " +
          (70 + a) +
          ". Let x be the third score.",
        [
          part(
            "Form an inequality for x.",
            m(125 + 2 * a + "+x\\ge" + (210 + 3 * a)) + ".",
            "An average of at least " +
              (70 + a) +
              " requires a total of at least three times that value.",
            "Converts the average condition into a total.",
          ),
          part(
            "Find the least required score.",
            m(85 + a) + ".",
            "Subtract the first two scores from the required total.",
            "Solves for the score.",
          ),
          part(
            "State the full interval of feasible scores and explain whether the target is attainable.",
            m("[" + (85 + a) + ",100]") + ". The target is attainable.",
            "The score must also lie between 0 and 100. The required minimum does not exceed 100.",
            "Includes the maximum possible score.",
            "Checks attainability.",
          ),
        ],
        [
          "Multiply the target average by three.",
          "Subtract the known total.",
          "Intersect with the physical score range.",
        ],
        ["Forgetting that a paper cannot have more than 100 marks."],
      );
    }
  }
  return B.items;
}
