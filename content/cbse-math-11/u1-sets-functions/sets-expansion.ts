import type { Item } from "@/lib/content/types";
import {
  assertion,
  fraction,
  math as m,
  mc,
  part,
  range,
  set,
  written,
  type Context,
} from "../practice-authoring";

export function setsExpansion(topic: "1.1" | "1.2"): Item[] {
  const c: Context = {
    unit: "u1-sets-functions",
    topic,
    chapter: 1,
    version: "0.3.1",
  };
  const items: Item[] = [];
  for (let v = 0; v < 4; v++) {
    const j = 10 * v,
      a = v + 2,
      b = v + 7;
    if (topic === "1.1") {
      const roster = range(a + 1, b);
      items.push(
        mc(
          c,
          j,
          "Which is the roster form of " +
            m("A=\\{x\\in\\mathbb Z:" + a + "<x\\le" + b + "\\}") +
            "?",
          2,
          "roster_endpoints",
          m(set(roster)),
          [
            [
              m(set(range(a, b))),
              "The strict lower inequality excludes " + m(a) + ".",
            ],
            [
              m(set(range(a + 1, b - 1))),
              "The upper endpoint is included because its inequality is non-strict.",
            ],
            [
              m("(" + a + "," + b + "]"),
              "This interval contains non-integers; the given set contains integers only.",
            ],
          ],
          [
            "The members must be integers greater than " +
              m(a) +
              " and no greater than " +
              m(b) +
              ".",
            m("A=" + set(roster)) + ".",
          ],
          [
            "Identify the number system first.",
            "Check the two endpoints separately.",
            "List all integers satisfying both inequalities.",
          ],
        ),
      );
      items.push(
        mc(
          c,
          j + 1,
          "Let " +
            m("A=\\{" + a + "," + b + "," + a + ",k\\}") +
            " and " +
            m("B=\\{" + a + "," + b + "," + (b + 3) + "\\}") +
            ". If " +
            m("A=B") +
            ", find " +
            m("k") +
            ".",
          2,
          "equal_sets",
          m(b + 3),
          [
            [m(a), "Repeated entries do not add the missing element."],
            [m(b), "This leaves only two distinct elements in A."],
            [m(b + 4), "This introduces an element that is not in B."],
          ],
          [
            "Equal sets have exactly the same distinct members.",
            "The element " +
              m(b + 3) +
              " is missing unless " +
              m("k=" + (b + 3)) +
              ".",
          ],
          [
            "Ignore repeated entries.",
            "Identify the member of B that has not already appeared in A.",
            "The unknown must supply that member.",
          ],
        ),
      );
      const n = v + 5;
      items.push(
        mc(
          c,
          j + 2,
          "A set " +
            m("S") +
            " has " +
            m(n) +
            " elements, including distinct elements " +
            m("p") +
            " and " +
            m("q") +
            ". How many subsets of " +
            m("S") +
            " contain " +
            m("p") +
            " but not " +
            m("q") +
            "?",
          3,
          "restricted_subsets",
          m(2 ** (n - 2)),
          [
            [m(2 ** n), "The choices for p and q are fixed, not free."],
            [
              m(2 ** (n - 1)),
              "Both conditions must be imposed, not only inclusion of p.",
            ],
            [
              m(n - 2),
              "Each remaining element may independently be included or excluded.",
            ],
          ],
          [
            "Fix p as included and q as excluded.",
            "The remaining " +
              m(n - 2) +
              " elements have two choices each, so the answer is " +
              m("2^{" + (n - 2) + "}=" + 2 ** (n - 2)) +
              ".",
          ],
          [
            "Which memberships are already fixed?",
            "Count the elements whose membership is free.",
            "Use two choices for every free element.",
          ],
        ),
      );
      items.push(
        mc(
          c,
          j + 3,
          "The set " +
            m("\\{x\\in\\mathbb R:|x-" + a + "|<" + b + "\\}") +
            " is",
          2,
          "absolute_interval",
          m("(" + (a - b) + "," + (a + b) + ")"),
          [
            [
              m("[" + (a - b) + "," + (a + b) + "]"),
              "Equality is excluded by the strict inequality.",
            ],
            [
              m("(" + -b + "," + b + ")"),
              "The interval is centred at " + m(a) + ", not zero.",
            ],
            [
              m("(-\\infty," + (a - b) + ")\\cup(" + (a + b) + ",\\infty)"),
              "These points have distance greater than the bound.",
            ],
          ],
          [
            m("-" + b + "<x-" + a + "<" + b) + "; add " + m(a) + " throughout.",
            m(a - b + "<x<" + (a + b)) + ".",
          ],
          [
            "Read absolute value as distance from the centre.",
            "Write the corresponding double inequality.",
            "Translate both endpoints by the centre.",
          ],
        ),
      );
      items.push(
        assertion(
          c,
          j + 4,
          m("[" + -a + "," + b + "]") + " is a finite set.",
          m("[" + -a + "," + b + "]") +
            " contains all real numbers between its endpoints.",
          3,
          "The assertion is false: any real interval of positive length contains infinitely many numbers. The reason is true.",
          "finite_real_interval",
        ),
      );
      const N = [24, 30, 36, 42][v],
        divisors = range(1, N).filter((x) => N % x === 0);
      items.push(
        written(
          c,
          j + 5,
          "vsaq",
          "Let " + m("D=\\{x\\in\\mathbb N:x\\mid " + N + "\\}") + ".",
          2,
          "divisor_roster",
          [
            part(
              "Write " + m("D") + " in roster form.",
              m("D=" + set(divisors)) + ".",
              "Pair each divisor with its complementary factor of " +
                m(N) +
                ".",
              "Lists all positive divisors without repetition.",
            ),
          ],
          [
            "Divisors are positive integers that divide exactly.",
            "Use factor pairs to avoid missing large divisors.",
            "Include 1 and the number itself.",
          ],
          ["Confusing multiples with divisors."],
        ),
      );
      items.push(
        written(
          c,
          j + 6,
          "vsaq",
          "Consider " + m("S=\\{x\\in\\mathbb R:x^2+" + a + "=0\\}") + ".",
          2,
          "empty_set",
          [
            part(
              "State " + m("S") + " and justify.",
              m("S=\\varnothing") + ".",
              "For real x, " +
                m("x^2\\ge0") +
                ", so " +
                m("x^2+" + a + ">0") +
                ".",
              "Uses non-negativity of a real square.",
              "Concludes that there are no real solutions.",
            ),
          ],
          [
            "Can a real square be negative?",
            "Rearrange the equation to isolate the square.",
            "Use the stated real domain.",
          ],
          ["Including complex numbers in a real solution set."],
        ),
      );
      const s = [a, a + 2, a + 4];
      items.push(
        written(
          c,
          j + 7,
          "saq",
          "Let " + m("S=" + set(s)) + ".",
          2,
          "subset_enumeration",
          [
            part(
              "List every subset with exactly two elements.",
              m(
                set([set([s[0], s[1]]), set([s[0], s[2]]), set([s[1], s[2]])]),
              ) + ".",
              "Choose each distinct pair; order does not create a new subset.",
              "Lists all three two-element subsets.",
              "Does not count reordered pairs separately.",
            ),
          ],
          [
            "Choose pairs of distinct members.",
            "A subset has no ordering.",
            "There are three ways to omit one of the three elements.",
          ],
          ["Treating subsets as ordered pairs."],
        ),
      );
      items.push(
        written(
          c,
          j + 8,
          "laq",
          "Let " +
            m("A=[" + -a + "," + b + ")") +
            " and " +
            m("B=\\{x\\in\\mathbb Z:" + -a + "\\le x<" + b + "\\}") +
            ".",
          3,
          "real_integer_comparison",
          [
            part(
              "Write both sets in set-builder notation, making the number systems explicit.",
              m(
                "A=\\{x\\in\\mathbb R:" +
                  -a +
                  "\\le x<" +
                  b +
                  "\\},\\quad B=\\{x\\in\\mathbb Z:" +
                  -a +
                  "\\le x<" +
                  b +
                  "\\}",
              ) + ".",
              "The inequalities agree but their domains differ.",
              "Specifies real numbers for A.",
              "Specifies integers for B.",
            ),
            part(
              "Find " + m("n(B)") + " and explain whether " + m("A=B") + ".",
              m("n(B)=" + (a + b)) + "; the sets are unequal.",
              "B contains consecutive integers from " +
                m(-a) +
                " to " +
                m(b - 1) +
                ". The number " +
                m(fraction(1, 2)) +
                " belongs to A but not B.",
              "Counts the integers correctly.",
              "Gives a non-integer in A to disprove equality.",
              "Distinguishes a finite integer set from an infinite interval.",
            ),
          ],
          [
            "Intervals normally specify real numbers.",
            "Count integers including the left endpoint.",
            "Give one member of A that is not an integer.",
          ],
          ["Treating an interval as a list of integers."],
        ),
      );
      const lower = -a - 1,
        upper = b + 2,
        t = range(lower + 1, upper);
      items.push(
        written(
          c,
          j + 9,
          "case",
          "A set " +
            m("T") +
            " consists of the integers satisfying " +
            m(lower + "<x\\le" + upper) +
            ". A student instead records the real interval " +
            m("(" + lower + "," + upper + "]") +
            ".",
          3,
          "integer_set_analysis",
          [
            part(
              "Write " + m("T") + " in roster form.",
              m("T=" + set(t)) + ".",
              "Include exactly the integers after the lower endpoint through the upper endpoint.",
              "Lists the correct integers.",
            ),
            part(
              "Find the cardinality of " + m("T") + ".",
              m(t.length) + ".",
              "Count from " +
                m(lower + 1) +
                " to " +
                m(upper) +
                " inclusively.",
              "Finds the correct cardinality.",
            ),
            part(
              "Explain why the student's set is different, using an example.",
              m(fraction(1, 2)) + " lies in the interval but not in T.",
              "The student's interval allows all real values, whereas T allows integers only.",
              "Identifies the difference in number systems.",
              "Provides a valid counterexample.",
            ),
          ],
          [
            "Check which endpoint is included.",
            "Use last minus first plus one for consecutive integers.",
            "A fractional number can distinguish the sets.",
          ],
          ["Ignoring the integer restriction."],
        ),
      );
    } else {
      const A = [a, a + 1, a + 3, a + 5],
        B = [a + 1, a + 2, a + 5, a + 6],
        U = range(a, a + 7);
      const union = U.filter((x) => A.includes(x) || B.includes(x)),
        intersection = A.filter((x) => B.includes(x)),
        diff = A.filter((x) => !B.includes(x));
      items.push(
        mc(
          c,
          j,
          "Let " +
            m("A=" + set(A)) +
            " and " +
            m("B=" + set(B)) +
            ". Find " +
            m("(A\\cup B)-(A\\cap B)") +
            ".",
          3,
          "symmetric_difference",
          m(set(union.filter((x) => !intersection.includes(x)))),
          [
            [
              m(set(union)),
              "Remove the elements common to both sets from the union.",
            ],
            [
              m(set(intersection)),
              "The common elements are the ones excluded by the difference.",
            ],
            [
              m(set(diff)),
              "This includes A-only elements but omits B-only elements.",
            ],
          ],
          [
            "The expression contains members of exactly one set.",
            "The common elements are " +
              m(set(intersection)) +
              "; remove them from " +
              m(set(union)) +
              ".",
          ],
          [
            "Find the union and intersection separately.",
            "Subtract the intersection from the union.",
            "Keep members of exactly one of the two sets.",
          ],
        ),
      );
      const outside = U.filter((x) => !A.includes(x) && !B.includes(x));
      items.push(
        mc(
          c,
          j + 1,
          "Relative to " +
            m("U=" + set(U)) +
            ", let " +
            m("A=" + set(A)) +
            " and " +
            m("B=" + set(B)) +
            ". Find " +
            m("A'\\cap B'") +
            ".",
          3,
          "de_morgan",
          m(set(outside)),
          [
            [m(set(union)), "This is the union, not its complement."],
            [
              m(set(U.filter((x) => !intersection.includes(x)))),
              "This is the complement of the intersection, corresponding to A' union B'.",
            ],
            [
              m(set(U.filter((x) => !A.includes(x)))),
              "This ignores the requirement that the element also be outside B.",
            ],
          ],
          [
            "By De Morgan's law, " + m("A'\\cap B'=(A\\cup B)'") + ".",
            "Exclude every member of either set from U to obtain " +
              m(set(outside)) +
              ".",
          ],
          [
            "An element must be outside both sets.",
            "Find all members of either set.",
            "Remove them from the universal set.",
          ],
        ),
      );
      items.push(
        mc(
          c,
          j + 2,
          "If " +
            m("A=[" + -a + "," + b + "]") +
            " and " +
            m("B=(" + a + "," + (b + 3) + ")") +
            ", then " +
            m("A-B") +
            " equals",
          3,
          "interval_difference",
          m("[" + -a + "," + a + "]"),
          [
            [
              m("[" + -a + "," + a + ")"),
              "The value " + m(a) + " is not in B, so it stays in A-B.",
            ],
            [m("(" + a + "," + b + "]"), "This is A intersect B."],
            [m("[" + -a + "," + (b + 3) + ")"), "This is A union B."],
          ],
          [
            "Remove from A all values strictly greater than " +
              m(a) +
              " that belong to B.",
            "The point " +
              m(a) +
              " remains; hence " +
              m("A-B=[" + -a + "," + a + "]") +
              ".",
          ],
          [
            "Set difference keeps only points in the first set.",
            "Inspect whether the lower endpoint of B belongs to B.",
            "Preserve that point if it is excluded from B.",
          ],
        ),
      );
      items.push(
        mc(
          c,
          j + 3,
          "Let " +
            m("A=\\{" + a + "," + (a + 1) + "\\}") +
            ". Which statement is always true for a set " +
            m("B") +
            "?",
          2,
          "subset_identity",
          m("A\\cap B=A") + " if and only if " + m("A\\subseteq B"),
          [
            [
              m("A\\cup B=A") + " if and only if " + m("A\\subseteq B"),
              "The union equals A when B is a subset of A; the inclusion is reversed.",
            ],
            [
              m("A-B=B-A"),
              "Set difference is not commutative; try a set B disjoint from A of a different size.",
            ],
            [
              m("A\\cap B=\\varnothing") + " implies " + m("B=\\varnothing"),
              "Two nonempty sets can be disjoint.",
            ],
          ],
          [
            "The intersection retains every element of A exactly when each is also in B.",
          ],
          [
            "Translate intersection into simultaneous membership.",
            "Ask when no member of A is lost.",
            "Express that condition as a subset relation.",
          ],
        ),
      );
      items.push(
        assertion(
          c,
          j + 4,
          "For " +
            m("A=" + set(A)) +
            " and " +
            m("B=" + set(B)) +
            ", " +
            m("A-B=B-A") +
            ".",
          "In general, subtraction of one set from another keeps only members of the first set.",
          3,
          "The reason is true. The assertion is false: " +
            m("A-B=" + set(diff)) +
            " whereas " +
            m("B-A=" + set(B.filter((x) => !A.includes(x)))) +
            ".",
          "difference_not_commutative",
        ),
      );
      items.push(
        written(
          c,
          j + 5,
          "vsaq",
          "Let " +
            m("A=\\{x\\in\\mathbb Z:" + -a + "\\le x\\le" + a + "\\}") +
            " and " +
            m("B=\\{x\\in\\mathbb Z:0\\le x\\le" + b + "\\}") +
            ".",
          2,
          "intersection_roster",
          [
            part(
              "Find " + m("A\\cap B") + ".",
              m(set(range(0, a))) + ".",
              "Only integers satisfying both bounds remain.",
              "Lists all integers from 0 through " + a + ".",
            ),
          ],
          [
            "Intersection means both conditions hold.",
            "Use the greater lower bound and the smaller upper bound.",
            "Remember both endpoints are included.",
          ],
          ["Listing the union."],
        ),
      );
      items.push(
        written(
          c,
          j + 6,
          "vsaq",
          "Let the universal set be " +
            m("U=\\mathbb R") +
            " and " +
            m("A=(" + -b + "," + a + "]") +
            ".",
          2,
          "interval_complement",
          [
            part(
              "Write " + m("A'") + ".",
              m("(-\\infty," + -b + "]\\cup(" + a + ",\\infty)") + ".",
              "Points outside the interval include its excluded left endpoint but exclude its included right endpoint.",
              "Handles the left endpoint correctly.",
              "Handles the right endpoint and joins the two rays.",
            ),
          ],
          [
            "Complement means all points outside A.",
            "Reverse inclusion of each finite endpoint.",
            "Infinity never takes a closed bracket.",
          ],
          ["Keeping the same endpoint brackets when complementing."],
        ),
      );
      items.push(
        written(
          c,
          j + 7,
          "saq",
          "Let " +
            m("U=" + set(U)) +
            ", " +
            m("A=" + set(A)) +
            " and " +
            m("B=" + set(B)) +
            ".",
          3,
          "de_morgan_verification",
          [
            part(
              "Verify " +
                m("(A\\cap B)'=A'\\cup B'") +
                " by listing both sides.",
              m(
                "(" +
                  set(intersection) +
                  ")'=" +
                  set(U.filter((x) => !intersection.includes(x))),
              ) + ".",
              "First " +
                m("A'=" + set(U.filter((x) => !A.includes(x)))) +
                " and " +
                m("B'=" + set(U.filter((x) => !B.includes(x)))) +
                ". Their union is " +
                m(set(U.filter((x) => !intersection.includes(x)))) +
                ", equal to the complement of the intersection.",
              "Finds the intersection and its complement.",
              "Finds both individual complements.",
              "Shows the two resulting sets are identical.",
            ),
          ],
          [
            "Use the specified universal set for every complement.",
            "Compute the left and right sides separately.",
            "Compare their distinct members.",
          ],
          ["Taking complements outside U."],
        ),
      );
      const C = [a, a + 2, a + 4];
      items.push(
        written(
          c,
          j + 8,
          "laq",
          "Let " +
            m("A=" + set(A)) +
            ", " +
            m("B=" + set(B)) +
            ", and " +
            m("C=" + set(C)) +
            ".",
          3,
          "distributivity",
          [
            part(
              "Find " + m("A\\cap(B\\cup C)") + ".",
              m(set(A.filter((x) => B.includes(x) || C.includes(x)))) + ".",
              "Form " +
                m("B\\cup C=" + set([...B, ...C].sort((x, y) => x - y))) +
                " and retain its members that are in A.",
              "Computes B union C.",
              "Computes the intersection with A.",
            ),
            part(
              "Verify the distributive identity using " +
                m("(A\\cap B)\\cup(A\\cap C)") +
                ".",
              m(set(A.filter((x) => B.includes(x) || C.includes(x)))) + ".",
              "The two intersections are " +
                m(set(intersection)) +
                " and " +
                m(set(A.filter((x) => C.includes(x)))) +
                ". Taking their union gives the same set.",
              "Finds both intersections.",
              "Takes their union.",
              "Compares with part (a) to verify the identity.",
            ),
          ],
          [
            "Work inside parentheses first.",
            "Intersection distributes over union.",
            "Compare actual members, not only cardinalities.",
          ],
          ["Mistaking equal cardinality for equal sets."],
        ),
      );
      items.push(
        written(
          c,
          j + 9,
          "case",
          "A student checks the claim " +
            m("A-(B\\cup C)=(A-B)\\cup(A-C)") +
            " using " +
            m("A=" + set(A)) +
            ", " +
            m("B=" + set(B)) +
            ", " +
            m("C=" + set(C)) +
            ".",
          3,
          "set_claim_counterexample",
          [
            part(
              "Find the left side.",
              m(set(A.filter((x) => !B.includes(x) && !C.includes(x)))) + ".",
              "Remove all members that occur in either B or C.",
              "Calculates A minus the union.",
            ),
            part(
              "Find the right side.",
              m(set(A.filter((x) => !B.includes(x) || !C.includes(x)))) + ".",
              "Union keeps a member if it survives at least one of the two differences.",
              "Calculates the union of the two differences.",
            ),
            part(
              "Decide whether the claim is correct; state the correct identity.",
              m("A-(B\\cup C)=(A-B)\\cap(A-C)") + ".",
              "The two computed sets differ. A surviving member must avoid both B and C, requiring intersection.",
              "Rejects the displayed claim with the computed counterexample.",
              "States the correct intersection identity.",
            ),
          ],
          [
            "Compute both expressions separately.",
            "For the left side, an element must avoid both sets.",
            "Decide whether 'both' requires union or intersection.",
          ],
          ["Distributing set difference using the wrong operation."],
        ),
      );
    }
  }
  return items;
}
