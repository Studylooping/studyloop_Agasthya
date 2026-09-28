import { builder, choose as C, factorial as F } from "../expansion-builder";
import { math as m, part, range, set } from "../practice-authoring";

export function countingExpansion() {
  const B = builder({ unit: "u2-algebra-xi", topic: "2.3", chapter: 6 });
  for (let v = 0; v < 8; v++) {
    const a = (v % 4) + 3,
      n = a + 3;
    if (v < 4) {
      B.mc(
        "A traveller may choose one of " +
          a +
          " roads from A to B and one of " +
          (a + 2) +
          " roads from B to C. How many routes from A to C via B are possible?",
        m(a * (a + 2)),
        [
          [
            m(2 * a + 2),
            "Both stages must be chosen, so multiply instead of adding.",
          ],
          [m(a * a), "The second stage has a+2 choices, not a."],
          [m(a + 2), "This counts only the second stage."],
        ],
        [
          "For each first-stage road there are " +
            (a + 2) +
            " possible second-stage roads.",
          "By the multiplication principle the total is " +
            m(a + "(" + (a + 2) + ")=" + a * (a + 2)) +
            ".",
        ],
        [
          "Separate the journey into stages.",
          "Count independent choices at each stage.",
          "Multiply the two counts.",
        ],
      );
      B.mc(
        "How many three-digit numbers can be formed from " +
          m(set(range(1, a))) +
          " without repeating a digit?",
        m(a * (a - 1) * (a - 2)),
        [
          [m(a ** 3), "This permits repeated digits."],
          [m(C(a, 3)), "Choosing the digits alone ignores their order."],
          [
            m(a * (a - 1) * (a - 1)),
            "One more used digit must be excluded when choosing the units digit.",
          ],
        ],
        [
          "There are " +
            a +
            ", " +
            (a - 1) +
            ", and " +
            (a - 2) +
            " choices for the three positions.",
          "Multiply these counts.",
        ],
        [
          "Fill positions in order.",
          "Remove each used digit from later choices.",
          "All supplied digits are nonzero.",
        ],
      );
      B.mc(
        "A committee of three is chosen from " +
          n +
          " students. How many committees are possible?",
        m(C(n, 3)),
        [
          [
            m(n * (n - 1) * (n - 2)),
            "This assigns an order to a committee whose members have no roles.",
          ],
          [m(C(n, 2)), "The committee has three members, not two."],
          [m(n ** 3), "This allows repetition and treats order as relevant."],
        ],
        [
          m(
            "\\binom{" +
              n +
              "}{3}=\\frac{" +
              n +
              "(" +
              (n - 1) +
              ")(" +
              (n - 2) +
              ")}{3!}=" +
              C(n, 3),
          ) + ".",
        ],
        [
          "Does changing the order change the committee?",
          "Choose three distinct members.",
          "Use a combination, not a permutation.",
        ],
      );
      const total = F(n - 1) * 2;
      B.mc(
        n +
          " distinct books are placed in a row. Two specified books must be adjacent. How many arrangements are possible?",
        m(total),
        [
          [
            m(F(n - 1)),
            "The two books can be ordered inside their block in two ways.",
          ],
          [m(F(n)), "This ignores the adjacency requirement."],
          [
            m(2 * F(n - 2)),
            "The block and the remaining books form n-1 objects, not n-2.",
          ],
        ],
        [
          "Treat the specified pair as one block, leaving " +
            (n - 1) +
            " objects.",
          "Arrange the objects and the two books within the block: " +
            m("(" + (n - 1) + ")!\\,2!=" + total) +
            ".",
        ],
        [
          "Join the adjacent pair into one object.",
          "Arrange that block with the other books.",
          "Count the orders inside the block.",
        ],
        3,
      );
      B.mc(
        "The number of distinct arrangements of the letters in " +
          ["BANANA", "PEPPER", "TOMATO", "PAPAYA"][v] +
          " is",
        m([60, 60, 180, 60][v]),
        [
          [m(720), "Repeated letters make some permutations identical."],
          [m(360), "There is more than one duplicated-letter correction."],
          [m(30), "The repeated-letter factorials have been overcounted."],
        ],
        [
          "There are six letters.",
          "Divide 6! by factorials of repeated multiplicities: " +
            m(
              ["6!/(3!2!)=60", "6!/(3!2!)=60", "6!/(2!2!)=180", "6!/(3!2!)=60"][
                v
              ],
            ) +
            ".",
        ],
        [
          "Count occurrences of each letter.",
          "Begin with six factorial.",
          "Divide only for indistinguishable copies.",
        ],
      );
      B.frq(
        "vsaq",
        "From " +
          n +
          " distinct students, a captain and a vice-captain are chosen.",
        [
          part(
            "Find the number of choices.",
            m(n * (n - 1)) + ".",
            "The first role has n choices; the second has n-1. The roles are distinct.",
            "Counts the first role.",
            "Counts a different student for the second role.",
          ),
        ],
        [
          "The two roles are different.",
          "Choose the captain first.",
          "Do not reuse that student.",
        ],
        ["Using a two-member committee count."],
        2,
      );
      B.frq(
        "vsaq",
        "Evaluate " + m("\\frac{" + n + "!}{" + (n - 2) + "!}") + ".",
        [
          part(
            "Simplify without expanding both factorials completely.",
            m(n * (n - 1)) + ".",
            "Cancel the common factorial, leaving " +
              m(n + "\\times" + (n - 1)) +
              ".",
            "Cancels the common factorial.",
            "Multiplies the remaining factors.",
          ),
        ],
        [
          "Expand the numerator only far enough.",
          "Cancel the common factorial.",
          "Two consecutive factors remain.",
        ],
        ["Subtracting factorials instead of cancelling factors."],
        2,
      );
      B.frq(
        "saq",
        "A group contains " +
          a +
          " girls and " +
          (a + 1) +
          " boys. A three-member committee must contain exactly two girls.",
        [
          part(
            "Find the number of committees.",
            m(C(a, 2) * (a + 1)) + ".",
            "Choose two of the girls and one of the boys independently: " +
              m("\\binom{" + a + "}{2}\\binom{" + (a + 1) + "}{1}") +
              ".",
            "Chooses two girls.",
            "Chooses one boy.",
            "Multiplies the independent selections.",
          ),
        ],
        [
          "Exactly two girls leaves one boy.",
          "Order inside the committee does not matter.",
          "Multiply the two combination counts.",
        ],
        ["Including committees with three girls."],
      );
      B.frq(
        "laq",
        "Use digits " + m(set(range(0, a))) + " without repetition.",
        [
          part(
            "Count all three-digit numbers.",
            m(a * a * (a - 1)) + ".",
            "The hundreds digit has a nonzero choices. Then a digits remain for tens and a-1 for units.",
            "Excludes zero initially.",
            "Counts the remaining positions.",
          ),
          part(
            "Count the even three-digit numbers.",
            m(a * (a - 1) + Math.floor(a / 2) * (a - 1) * (a - 1)) + ".",
            "If the units digit is 0: a(a-1) possibilities. For each of the " +
              Math.floor(a / 2) +
              " nonzero even units digits: (a-1) choices for hundreds, then (a-1) for tens. Add disjoint cases.",
            "Splits zero and nonzero even units digits.",
            "Counts each case correctly.",
            "Adds the disjoint totals.",
          ),
        ],
        [
          "A leading zero is not allowed.",
          "For even numbers, choose the units digit first.",
          "Zero at the units position behaves differently from a nonzero even digit.",
        ],
        ["Using the same hundreds count in both units-digit cases."],
        3,
      );
      B.frq(
        "case",
        "A school has " +
          n +
          " finalists. Three distinct prizes are awarded, and no finalist may receive more than one prize.",
        [
          part(
            "Count all possible prize allocations.",
            m(n * (n - 1) * (n - 2)) + ".",
            "Choose the first, second and third winners in order.",
            "Counts the ordered winners.",
          ),
          part(
            "A specified finalist must win the first prize. Count the allocations.",
            m((n - 1) * (n - 2)) + ".",
            "Fix the first winner and assign the other two prizes.",
            "Counts the remaining roles.",
          ),
          part(
            "A specified finalist must receive some prize. Count the allocations.",
            m(3 * (n - 1) * (n - 2)) + ".",
            "Choose that finalist's prize in three ways and assign the other two prizes from the remaining finalists.",
            "Chooses the specified finalist's role.",
            "Counts and multiplies the remaining choices.",
          ),
        ],
        [
          "Prizes are distinct, so order matters.",
          "Fix the required recipient when appropriate.",
          "For 'some prize', consider the three possible roles.",
        ],
        ["Counting the same allocation in overlapping prize cases."],
      );
    } else {
      B.mc(
        "From " +
          n +
          " students, how many four-member committees contain a specified student?",
        m(C(n - 1, 3)),
        [
          [
            m(C(n, 4)),
            "This includes committees omitting the specified student.",
          ],
          [
            m(C(n - 2, 3)),
            "Only one student is fixed; the remaining pool has n-1 students, not n-2.",
          ],
          [
            m((n - 1) * (n - 2) * (n - 3)),
            "The remaining members have no ordered roles.",
          ],
        ],
        [
          "Fix the specified student.",
          "Choose the other three from the remaining " +
            (n - 1) +
            ": " +
            m("\\binom{" + (n - 1) + "}{3}=" + C(n - 1, 3)) +
            ".",
        ],
        [
          "Reserve one place for the required student.",
          "Reduce both the pool and remaining committee size.",
          "Use combinations.",
        ],
      );
      B.mc(
        "How many arrangements of " +
          n +
          " distinct books keep two specified books apart?",
        m(F(n) - 2 * F(n - 1)),
        [
          [m(2 * F(n - 1)), "This counts adjacent arrangements."],
          [m(F(n) - F(n - 1)), "The adjacent block has two internal orders."],
          [
            m(F(n - 1)),
            "This is neither the unrestricted nor the nonadjacent count.",
          ],
        ],
        [
          "Count all arrangements: " + m(n + "!") + ".",
          "Subtract adjacent arrangements " +
            m("2(" + (n - 1) + ")!") +
            " to get " +
            m(F(n) - 2 * F(n - 1)) +
            ".",
        ],
        [
          "The complement is easier to count.",
          "Treat the specified pair as an adjacent block.",
          "Subtract all adjacent orders from all orders.",
        ],
        3,
      );
      B.mc(
        "Using digits " +
          m(set(range(1, a))) +
          ", how many four-digit numbers can be formed if repetition is allowed?",
        m(a ** 4),
        [
          [m(F(a)), "There is no restriction against repeating digits."],
          [m(a * 4), "Independent position choices multiply."],
          [m(a ** 3), "Four positions, not three, must be filled."],
        ],
        [
          "Each of the four positions has " + a + " choices.",
          "The multiplication principle gives " + m(a + "^4=" + a ** 4) + ".",
        ],
        [
          "Repetition leaves the available choices unchanged.",
          "Count choices for each of four positions.",
          "Multiply them.",
        ],
      );
      B.mc(
        "If " +
          m("\\binom{" + n + "}{r}=\\binom{" + n + "}{2}") +
          " for an integer " +
          m("0\\le r\\le" + n) +
          ", which set lists all possible r?",
        m(set([2, n - 2])),
        [
          [
            m(set([2])),
            "The complementary selection size also gives the same count.",
          ],
          [m(set([2, n - 1])), "The complementary index is n-2, not n-1."],
          [m(set([0, n])), "These binomial coefficients equal 1."],
        ],
        [
          "For a fixed n, binomial coefficients increase up to the middle and are symmetric.",
          "The matching indices are " +
            m("r=2") +
            " and " +
            m("r=" + (n - 2)) +
            ".",
        ],
        [
          "Use symmetry of complementary selections.",
          "Find the index complementary to 2.",
          "Check that the two indices are distinct for this n.",
        ],
      );
      B.mc(
        "An " + a + "-element set has how many nonempty subsets?",
        m(2 ** a - 1),
        [
          [m(2 ** a), "This includes the empty subset."],
          [
            m(2 ** a - 2),
            "This excludes the whole set as well as the empty set.",
          ],
          [m(a), "This counts only the singleton subsets."],
        ],
        [
          "Each element is either included or excluded, giving " +
            m("2^{" + a + "}") +
            " subsets.",
          "Remove only the empty subset.",
        ],
        [
          "Think of two choices per member.",
          "Count all subsets first.",
          "Remove the one forbidden subset.",
        ],
      );
      B.frq(
        "vsaq",
        "How many diagonals has a convex polygon with " + n + " vertices?",
        [
          part(
            "Find the number.",
            m(C(n, 2) - n) + ".",
            "Every pair of vertices gives a segment; remove the n sides from " +
              m("\\binom{" + n + "}{2}") +
              ".",
            "Counts vertex pairs.",
            "Subtracts the sides.",
          ),
        ],
        [
          "Choose two vertices.",
          "Some pairs form sides, not diagonals.",
          "There are n sides to remove.",
        ],
        ["Counting the sides as diagonals."],
        2,
      );
      B.frq(
        "vsaq",
        "A group has " + n + " people. Each pair shakes hands exactly once.",
        [
          part(
            "Find the total number of handshakes.",
            m(C(n, 2)) + ".",
            "Each handshake corresponds to one unordered pair.",
            "Counts unordered pairs.",
            "Evaluates the combination.",
          ),
        ],
        [
          "A handshake has two participants.",
          "Order does not make a second handshake.",
          "Use n choose 2.",
        ],
        ["Counting each handshake twice."],
        2,
      );
      B.frq(
        "saq",
        "A shelf has " +
          a +
          " distinct mathematics books and " +
          (a + 1) +
          " distinct physics books. Select two books with at least one mathematics book.",
        [
          part(
            "Find the number of selections.",
            m(C(2 * a + 1, 2) - C(a + 1, 2)) + ".",
            "From all two-book selections, subtract the selections containing two physics books: " +
              m("\\binom{" + (2 * a + 1) + "}{2}-\\binom{" + (a + 1) + "}{2}") +
              ".",
            "Counts all selections.",
            "Counts the excluded all-physics selections.",
            "Subtracts the complement correctly.",
          ),
        ],
        [
          "The complement contains no mathematics book.",
          "Count unordered pairs from the full collection.",
          "Subtract only all-physics pairs.",
        ],
        ["Counting only one-mathematics, one-physics selections."],
      );
      B.frq(
        "laq",
        "A committee of four is chosen from " +
          a +
          " senior students and " +
          (a + 1) +
          " junior students.",
        [
          part(
            "Count committees containing exactly two seniors.",
            m(C(a, 2) * C(a + 1, 2)) + ".",
            "Choose two from each group independently.",
            "Selects the senior pair.",
            "Selects the junior pair and multiplies.",
          ),
          part(
            "Count committees containing at least two seniors.",
            m(C(a, 2) * C(a + 1, 2) + C(a, 3) * (a + 1) + C(a, 4)) + ".",
            "Use the disjoint cases of two, three, and four seniors; impossible cases have zero count.",
            "Includes the two-senior case.",
            "Counts the three- and four-senior cases.",
            "Adds without overlap.",
          ),
        ],
        [
          "Exactly and at least require different counts.",
          "For at least two, separate the possible senior counts.",
          "Respect the available group sizes.",
        ],
        [
          "Adding an overlapping 'at least three' case to an 'at least two' count.",
        ],
        3,
      );
      const word = ["PLANET", "GARDEN", "MARKET", "SILVER"][v - 4];
      B.frq(
        "case",
        "Consider all arrangements of the six distinct letters of " +
          word +
          ".",
        [
          part(
            "Count the unrestricted arrangements.",
            m(720) + ".",
            "There are six distinct letters, so the count is 6!.",
            "Uses factorial for distinct letters.",
          ),
          part(
            "Count arrangements in which the two vowels are together.",
            m(240) + ".",
            "Treat the vowels as a block: " + m("5!\\,2!=240") + ".",
            "Arranges the block with four consonants.",
            "Counts the two internal vowel orders.",
          ),
          part(
            "Count arrangements in which the vowels are separated.",
            m(480) + ".",
            "Subtract the adjacent-vowel count from 720.",
            "Uses the complement without double counting.",
          ),
        ],
        [
          "All six letters are distinct.",
          "There are exactly two vowels.",
          "Use an adjacent block, then its complement.",
        ],
        ["Failing to permute the vowels within their block."],
      );
    }
  }
  return B.items;
}
