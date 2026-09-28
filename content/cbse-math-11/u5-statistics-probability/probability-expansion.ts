import { builder } from "../expansion-builder";
import {
  fraction as f,
  math as m,
  part,
  range,
  set,
} from "../practice-authoring";

export function probabilityExpansion(topic: "5.4" | "5.5") {
  const B = builder({ unit: "u5-statistics-probability", topic, chapter: 14 });
  for (let v = 0; v < 3; v++) {
    const n = 12 + 6 * v,
      a = 4 + v;
    if (topic === "5.4") {
      const S = range(1, n),
        A = S.filter((x) => x % 2 === 0),
        D = S.filter((x) => x % 3 === 0),
        U = S.filter((x) => x % 2 === 0 || x % 3 === 0),
        I = S.filter((x) => x % 6 === 0);
      B.mc(
        "An integer is chosen uniformly from " +
          m("\\{1,2,\\ldots," + n + "\\}") +
          ". What is the probability that it is divisible by 2 or 3?",
        m(f(U.length, n)),
        [
          [
            m(f(A.length + D.length, n)),
            "Numbers divisible by both have been counted twice.",
          ],
          [m(f(I.length, n)), "This counts divisibility by both, not either."],
          [m(f(n - U.length, n)), "This is the probability of neither."],
        ],
        [
          "Count multiples of 2 and multiples of 3, then subtract multiples of 6.",
          "The favourable count is " +
            m(A.length + "+" + D.length + "-" + I.length + "=" + U.length) +
            ", out of " +
            m(n) +
            ".",
        ],
        [
          "'Or' means the union.",
          "Subtract the overlap once.",
          "Divide the favourable count by n.",
        ],
        3,
      );
      B.mc(
        "For equally likely outcomes " +
          m("S=" + set(range(1, a + 4))) +
          ", let " +
          m("A=" + set(range(1, a))) +
          " and " +
          m("B=" + set(range(a + 1, a + 4))) +
          ". Which statement is true?",
        "A and B are mutually exclusive and exhaustive.",
        [
          [
            "They are mutually exclusive but not exhaustive.",
            "Their union contains every outcome in S.",
          ],
          [
            "They are exhaustive but not mutually exclusive.",
            "Their outcome lists do not overlap.",
          ],
          [
            "They are neither mutually exclusive nor exhaustive.",
            "They are disjoint and together cover S.",
          ],
        ],
        [
          "Their intersection is empty.",
          "Their union is S, so they are both mutually exclusive and exhaustive.",
        ],
        [
          "Check the intersection.",
          "Then check whether the union equals S.",
          "The two properties answer different questions.",
        ],
      );
      B.mc(
        "A bag contains " +
          a +
          " red and " +
          (a + 3) +
          " blue balls. One ball is selected uniformly. The probability of not selecting a red ball is",
        m(f(a + 3, 2 * a + 3)),
        [
          [
            m(f(a, 2 * a + 3)),
            "This is the probability of red, not its complement.",
          ],
          [
            m(f(a + 3, a)),
            "The denominator must be the total number of balls.",
          ],
          [
            m("1/2"),
            "The two colours have different counts, so their probabilities need not be equal.",
          ],
        ],
        [
          "Not red means blue in this two-colour bag.",
          "There are " +
            (a + 3) +
            " favourable balls out of " +
            (2 * a + 3) +
            ".",
        ],
        [
          "Identify the complement event.",
          "Count all balls for the denominator.",
          "Use the blue count as the numerator.",
        ],
      );
      B.mc(
        "Let " +
          m("P(A)=" + f(a, 10)) +
          ", " +
          m("P(B)=3/10") +
          " and " +
          m("P(A\\cap B)=1/10") +
          ". Find the probability that exactly one of A and B occurs.",
        m(f(a + 1, 10)),
        [
          [
            m(f(a + 2, 10)),
            "This is the union probability, which still includes the intersection.",
          ],
          [
            m(f(a + 3, 10)),
            "Adding the event probabilities counts the intersection twice.",
          ],
          [m("1/10"), "This is the probability of both events."],
        ],
        [
          "Exactly one is the union minus the intersection.",
          "Use " + m("P(A)+P(B)-2P(A\\cap B)=" + f(a + 1, 10)) + ".",
        ],
        [
          "Separate A-only and B-only.",
          "Remove the intersection from each event.",
          "Add the two disjoint remaining probabilities.",
        ],
        3,
      );
      B.mc(
        "If " +
          m("P(A\\cup B)=" + f(a + 2, 10)) +
          ", the probability that neither A nor B occurs is",
        m(f(8 - a, 10)),
        [
          [m(f(a + 2, 10)), "This is the union itself, not its complement."],
          [m("1"), "The union has positive probability."],
          [m("0"), "The union's probability is less than 1."],
        ],
        [
          "Neither event is the complement of the union.",
          "Subtract its probability from 1: " +
            m("1-" + f(a + 2, 10) + "=" + f(8 - a, 10)) +
            ".",
        ],
        [
          "Translate 'neither' into an event operation.",
          "Take the complement of the union.",
          "Subtract from one.",
        ],
      );
      B.frq(
        "vsaq",
        "A fair die numbered 1 to 6 is thrown. Let A be the event that the result is at most " +
          a +
          ".",
        [
          part(
            "Find the probability of A's complement.",
            m(f(6 - a, 6)) + ".",
            "The complement contains the " +
              (6 - a) +
              " outcomes greater than " +
              a +
              ".",
            "Identifies the complement.",
            "Divides its count by 6.",
          ),
        ],
        [
          "The complement reverses 'at most'.",
          "Count outcomes strictly above the threshold.",
          "All six die outcomes are equally likely.",
        ],
        ["Including the boundary value in both event and complement."],
        2,
      );
      B.frq(
        "vsaq",
        "Two events have outcome sets " +
          m("A=" + set(range(1, a))) +
          " and " +
          m("B=" + set(range(a, a + 3))) +
          ".",
        [
          part(
            "Are A and B mutually exclusive? Justify.",
            "No.",
            "Their intersection is " +
              m(set([a])) +
              ", so the two events share an outcome.",
            "Finds the intersection.",
            "Uses the definition of mutual exclusivity.",
          ),
        ],
        [
          "Compare the event lists.",
          "Look carefully at the shared endpoint.",
          "Mutual exclusivity requires an empty intersection.",
        ],
        ["Ignoring a single overlapping outcome."],
        2,
      );
      B.frq(
        "saq",
        "An integer is chosen uniformly from 1 to " +
          n +
          ". Let A mean 'even' and B mean 'divisible by 3'.",
        [
          part(
            "Find the probability of A but not B.",
            m(f(A.length - I.length, n)) + ".",
            "Remove the multiples of 6 from the even outcomes. The favourable count is " +
              m(A.length + "-" + I.length) +
              " and the total is " +
              m(n) +
              ".",
            "Identifies the excluded overlap.",
            "Counts the remaining even outcomes.",
            "Forms and simplifies the probability.",
          ),
        ],
        [
          "Start with the even outcomes.",
          "Remove even multiples of 3.",
          "Keep the original total as denominator.",
        ],
        ["Using A union B instead of A minus B."],
      );
      B.frq(
        "laq",
        "The equally likely outcomes are " +
          m("S=" + set(range(1, 2 * a))) +
          ". Let A be the outcomes at most " +
          a +
          " and B the even outcomes.",
        [
          part(
            "List A intersection B and find its probability.",
            m(set(range(1, a).filter((x) => x % 2 === 0))) +
              "; probability " +
              m(f(Math.floor(a / 2), 2 * a)) +
              ".",
            "The intersection contains the even outcomes among the first a integers.",
            "Lists the intersection.",
            "Uses the correct total outcome count.",
          ),
          part(
            "Find the probability of exactly one of A and B, and of neither.",
            m(f(2 * a - 2 * Math.floor(a / 2), 2 * a)) +
              " and " +
              m(f(Math.floor(a / 2), 2 * a)) +
              ".",
            "Both events have a outcomes and their overlap has floor(a/2) outcomes. Subtract twice the overlap for exactly one; subtract the union from 2a for neither.",
            "Counts exactly-one outcomes.",
            "Counts neither outcomes.",
            "Simplifies both probabilities.",
          ),
        ],
        [
          "Draw or list the overlap before counting.",
          "Exactly one excludes the overlap from both events.",
          "Neither is outside their union.",
        ],
        ["Counting overlapping outcomes as exactly one."],
      );
      B.frq(
        "case",
        "A survey assigns probabilities " +
          m("P(A)=1/2") +
          ", " +
          m("P(B)=" + f(a, 10)) +
          " and " +
          m("P(A\\cap B)=1/5") +
          " to two events.",
        [
          part(
            "Find P(A only).",
            m("3/10") + ".",
            "Subtract the intersection from P(A).",
            "Calculates A without B.",
          ),
          part(
            "Find P(B only).",
            m(f(a - 2, 10)) + ".",
            "Subtract the same intersection from P(B).",
            "Calculates B without A.",
          ),
          part(
            "Find the probability of neither and verify that the four disjoint regions sum to 1.",
            m(f(7 - a, 10)) + ".",
            "Add A-only, B-only, both (2/10), and neither. Their numerators are 3, a-2, 2, and 7-a, totalling 10.",
            "Finds the outside region.",
            "Checks the partition totals one.",
          ),
        ],
        [
          "Split the events into disjoint regions.",
          "Subtract the shared region from each event.",
          "The four regions form a complete partition.",
        ],
        [
          "Adding overlapping event probabilities as though they were disjoint.",
        ],
      );
    } else {
      const pa = 8 + v,
        pb = 10 + v,
        pi = 3 + v,
        pu = pa + pb - pi;
      B.mc(
        "Given " +
          m("P(A)=" + f(pa, 20)) +
          ", " +
          m("P(B)=" + f(pb, 20)) +
          " and " +
          m("P(A\\cup B)=" + f(pu, 20)) +
          ", find " +
          m("P(A\\cap B)") +
          ".",
        m(f(pi, 20)),
        [
          [m(f(pa + pb, 20)), "The union must be subtracted from this sum."],
          [m(f(pu, 20)), "The union and intersection are different events."],
          [
            m(f(pb - pa, 20)),
            "A difference of marginal probabilities does not determine the intersection.",
          ],
        ],
        [
          m("P(A\\cap B)=P(A)+P(B)-P(A\\cup B)") + ".",
          "Substitution gives " + m(f(pi, 20)) + ".",
        ],
        [
          "Use the addition law for two events.",
          "Rearrange it for the overlap.",
          "Use a common denominator.",
        ],
        3,
      );
      B.mc(
        "If " +
          m("P(A)=" + f(a, 10)) +
          " and " +
          m("P(B)=" + f(a + 1, 10)) +
          ", the greatest possible value of " +
          m("P(A\\cap B)") +
          " is",
        m(f(a, 10)),
        [
          [m(f(a + 1, 10)), "The intersection cannot be larger than A."],
          [
            m(f(2 * a + 1, 10)),
            "The intersection is contained in each event, not their sum.",
          ],
          [
            m("0"),
            "Zero may be a lower bound, not the largest possible overlap.",
          ],
        ],
        [
          "The overlap cannot exceed the smaller event probability.",
          "The bound is attainable when A is contained in B.",
        ],
        [
          "An intersection is a subset of both events.",
          "Use the smaller of their probabilities.",
          "Check attainability by nested events.",
        ],
        3,
      );
      B.mc(
        "If " +
          m("P(A)=" + f(a, 10)) +
          " and " +
          m("P(B)=" + f(a + 3, 10)) +
          ", the smallest possible " +
          m("P(A\\cap B)") +
          " is",
        m(f(2 * a - 7, 10)),
        [
          [
            m("0"),
            "Here the marginal probabilities sum to more than one, forcing overlap.",
          ],
          [
            m(f(a, 10)),
            "This is the largest possible overlap, not the smallest.",
          ],
          [
            m(f(a + 3, 10)),
            "An overlap cannot exceed the smaller event's probability.",
          ],
        ],
        [
          "The union cannot have probability greater than 1.",
          "From the addition law, " +
            m("P(A\\cap B)\\ge P(A)+P(B)-1=" + f(2 * a - 7, 10)) +
            "; this bound is attainable.",
        ],
        [
          "Apply the upper bound 1 to the union.",
          "Rearrange the addition formula.",
          "Here the sum of marginals is greater than one.",
        ],
        3,
      );
      B.mc(
        "Events A and B are mutually exclusive with " +
          m("P(A)=" + f(a, 12)) +
          " and " +
          m("P(B)=1/4") +
          ". Then " +
          m("P(A\\cup B)") +
          " is",
        m(f(a + 3, 12)),
        [
          [m(f(a, 12)), "This counts A only and omits B."],
          [
            m(f(a - 3, 12)),
            "Disjoint event probabilities are added, not subtracted.",
          ],
          [m("1"), "Mutual exclusivity does not imply exhaustiveness."],
        ],
        [
          "Their intersection has probability zero.",
          "The addition law reduces to the sum " +
            m(f(a, 12) + "+1/4=" + f(a + 3, 12)) +
            ".",
        ],
        [
          "Use the stated mutual exclusivity.",
          "Remove the overlap term from the addition formula.",
          "Add the two probabilities.",
        ],
      );
      B.mc(
        "Suppose " +
          m("A\\subseteq B") +
          ", " +
          m("P(A)=" + f(a, 10)) +
          " and " +
          m("P(B)=" + f(a + 2, 10)) +
          ". Find " +
          m("P(B-A)") +
          ".",
        m("1/5"),
        [
          [m(f(a + 2, 10)), "This includes A, which must be removed."],
          [m(f(a, 10)), "This is the part being removed."],
          [
            m(f(2 * a + 2, 10)),
            "Adding cannot give the probability of a difference.",
          ],
        ],
        [
          "B is the disjoint union of A and B-A.",
          "Thus " + m("P(B-A)=P(B)-P(A)=2/10=1/5") + ".",
        ],
        [
          "Use the subset condition.",
          "Split B into two disjoint regions.",
          "Subtract the included event's probability.",
        ],
      );
      B.frq(
        "vsaq",
        "An event E has probability " + m(f(a, 9)) + ".",
        [
          part(
            "Find the probability that E does not occur.",
            m(f(9 - a, 9)) + ".",
            "An event and its complement have probabilities summing to 1.",
            "Uses the complement rule.",
            "Simplifies the fraction.",
          ),
        ],
        [
          "Identify the complement.",
          "Subtract from one.",
          "Use denominator 9.",
        ],
        ["Subtracting from the number of outcomes without normalising."],
        2,
      );
      B.frq(
        "vsaq",
        "Can two mutually exclusive events each have probability " +
          m(f(a + 2, 10)) +
          "? Justify.",
        [
          part(
            "Decide whether this is possible.",
            "No.",
            "Their disjoint union would have probability " +
              m(f(2 * a + 4, 10)) +
              ", exceeding 1.",
            "Adds probabilities for disjoint events.",
            "Applies the upper bound of one.",
          ),
        ],
        [
          "For disjoint events the union probability is the sum.",
          "Compute the proposed total.",
          "No event can have probability greater than one.",
        ],
        [
          "Accepting marginal probabilities without checking their joint constraints.",
        ],
        2,
      );
      B.frq(
        "saq",
        "Let " +
          m("P(A)=2/5") +
          ", " +
          m("P(B)=" + f(a, 10)) +
          " and " +
          m("P(A\\cap B)=1/10") +
          ".",
        [
          part(
            "Find the probabilities of A union B and of neither.",
            m(f(a + 3, 10)) + " and " + m(f(7 - a, 10)) + ".",
            "Use 4/10+a/10-1/10 for the union, then subtract that result from 1.",
            "Uses the addition law.",
            "Computes the union.",
            "Computes its complement.",
          ),
        ],
        [
          "Count the overlap only once in the union.",
          "Use a common denominator.",
          "Neither is the complement of the union.",
        ],
        ["Subtracting the overlap twice when finding a union."],
      );
      B.frq(
        "laq",
        "Suppose " +
          m("P(A)=" + f(a, 10)) +
          ", " +
          m("P(B)=" + f(a + 2, 10)) +
          " and " +
          m("P(A\\cup B)=9/10") +
          ".",
        [
          part(
            "Find P(A intersection B), P(A only) and P(B only).",
            m(f(2 * a - 7, 10)) +
              ", " +
              m(f(7 - a, 10)) +
              ", " +
              m(f(9 - a, 10)) +
              ".",
            "Recover the overlap from the addition law; subtract it from each marginal.",
            "Calculates the overlap.",
            "Finds A-only.",
            "Finds B-only.",
          ),
          part(
            "Find P(neither) and verify the probability bounds for all four regions.",
            m("1/10") +
              ". All four probabilities are between zero and one and sum to one.",
            "The outside probability is the complement of 9/10. The computed region probabilities are nonnegative for the supplied values.",
            "Finds the outside probability.",
            "Checks the partition's bounds and sum.",
          ),
        ],
        [
          "Recover the shared region first.",
          "Separate the marginal probabilities into disjoint parts.",
          "Check the partition is a valid probability model.",
        ],
        [
          "Reporting a negative region probability without checking consistency.",
        ],
        3,
      );
      B.frq(
        "case",
        "Events A and B satisfy " +
          m("P(A)=1/2") +
          ", " +
          m("P(B)=" + f(a, 10)) +
          " and " +
          m("P(A\\cap B)=t") +
          ".",
        [
          part(
            "Find the greatest possible t.",
            m(f(Math.min(5, a), 10)) + ".",
            "An intersection cannot exceed either marginal probability.",
            "Uses the smaller marginal.",
          ),
          part(
            "Find the smallest possible t.",
            m(f(Math.max(0, a - 5), 10)) + ".",
            "Probabilities are nonnegative and the union cannot exceed 1, so t is at least the larger of 0 and (a-5)/10.",
            "Uses nonnegativity.",
            "Uses the union upper bound.",
          ),
          part(
            "Give the full interval of permitted t.",
            m(
              "[" +
                f(Math.max(0, a - 5), 10) +
                "," +
                f(Math.min(5, a), 10) +
                "]",
            ) + ".",
            "Combine the lower and upper constraints. Both endpoint configurations can be realised by suitable overlapping events.",
            "States the complete feasible interval.",
          ),
        ],
        [
          "Use both subset upper bounds.",
          "The union constraint supplies a lower bound.",
          "Do not forget the universal lower bound zero.",
        ],
        ["Assuming zero overlap is always possible."],
        3,
      );
    }
  }
  if (topic === "5.4") {
    B.mc(
      "A fair coin is tossed three times. What is the probability of at least one head?",
      m("7/8"),
      [
        [m("3/8"), "This counts exactly one head, not at least one."],
        [m("1/8"), "This is the probability of no heads."],
        [
          m("1/2"),
          "The event covers seven of the eight equally likely outcomes.",
        ],
      ],
      [
        "The complement is three tails, one outcome out of eight.",
        "Subtract its probability 1/8 from 1.",
      ],
      [
        "'At least one' has an easy complement.",
        "Count the all-tail outcome.",
        "Use the complement rule.",
      ],
    );
    B.mc(
      "Two cards are chosen uniformly without replacement from cards numbered 1 to 5. What is the probability that their sum is even?",
      m("2/5"),
      [
        [
          m("3/5"),
          "This counts odd sums, obtained from one odd and one even card.",
        ],
        [m("1/2"), "The two parity groups have different sizes."],
        [m("1/5"), "There are four favourable unordered pairs, not two."],
      ],
      [
        "An even sum needs two odd cards or two even cards.",
        "There are " +
          m("\\binom32+\\binom22=4") +
          " favourable pairs out of " +
          m("\\binom52=10") +
          ".",
      ],
      [
        "Classify cards by parity.",
        "Add the two disjoint same-parity cases.",
        "Use unordered pairs in numerator and denominator.",
      ],
      3,
    );
    B.frq(
      "saq",
      "A card is selected uniformly from numbers 1 to 20. Let A be the event 'multiple of 4' and B the event 'multiple of 5'.",
      [
        part(
          "Find P(A union B) and P(A intersection B).",
          m("2/5") + " and " + m("1/20") + ".",
          "There are five multiples of 4, four of 5, and one common multiple 20. Union count =5+4-1=8.",
          "Counts each event.",
          "Counts the overlap.",
          "Uses inclusion-exclusion.",
        ),
      ],
      [
        "Count the two multiple lists.",
        "Their common multiples are multiples of 20.",
        "Subtract the overlap once for the union.",
      ],
      ["Counting 20 twice in the union."],
    );
    B.frq(
      "laq",
      "From six distinct students, two are selected uniformly as an unordered pair. Two particular students are P and Q.",
      [
        part(
          "Find the probability that both P and Q are selected.",
          m("1/15") + ".",
          "There are " + m("\\binom62=15") + " pairs and one is {P,Q}.",
          "Counts all unordered pairs.",
          "Counts the both-selected event.",
        ),
        part(
          "Find the probability that exactly one of P,Q is selected.",
          m("8/15") + ".",
          "Choose which specified student in two ways and the other student from the remaining four.",
          "Counts both disjoint choices of specified student.",
          "Forms the probability.",
        ),
        part(
          "Find the probability that neither is selected.",
          m("2/5") + ".",
          "Choose both from the other four: " + m("\\binom42/15=6/15") + ".",
          "Counts the neither-selected case.",
        ),
      ],
      [
        "Use unordered pairs throughout.",
        "Partition by how many of P and Q appear.",
        "The three case probabilities must add to one.",
      ],
      ["Counting ordered selections in only one of numerator or denominator."],
    );
    B.frq(
      "case",
      "A spinner has four sectors labelled A,B,C,D with probabilities proportional to 1,2,3,4 respectively.",
      [
        part(
          "Find the four probabilities.",
          m("1/10,\\ 1/5,\\ 3/10,\\ 2/5") + ".",
          "The ratio weights total 10; divide each by 10.",
          "Normalises the ratio weights.",
        ),
        part(
          "Find the probability of B or D.",
          m("3/5") + ".",
          "These are disjoint outcomes, so add 2/10 and 4/10.",
          "Adds the two outcome probabilities.",
        ),
        part(
          "Find the probability of neither B nor D in two ways.",
          m("2/5") + ".",
          "Either add A and C, 1/10+3/10, or subtract 3/5 from one.",
          "Uses the disjoint sum.",
          "Checks with the complement rule.",
        ),
      ],
      [
        "The sectors are not assumed equally likely.",
        "Normalise the supplied ratio first.",
        "Single labelled outcomes are disjoint.",
      ],
      ["Assigning probability 1/4 despite the unequal weights."],
    );
  } else {
    B.mc(
      "Events A and B have " +
        m("P(A)=0.6") +
        " and " +
        m("P(B)=0.7") +
        ". Which proposed intersection probability is impossible?",
      m("0.2"),
      [
        [m("0.3"), "This is attainable when their union has probability 1."],
        [m("0.4"), "This gives a valid union probability 0.9."],
        [m("0.6"), "This is attainable when A is contained in B."],
      ],
      [
        "The intersection must lie between 0.6+0.7-1=0.3 and the smaller marginal 0.6.",
        "The proposed value 0.2 violates the lower bound.",
      ],
      [
        "Use the union probability upper bound.",
        "Use the smaller-marginal upper bound.",
        "Test each proposal against the permitted interval.",
      ],
      3,
    );
    B.mc(
      "If " +
        m("P(A-B)=0.25") +
        ", " +
        m("P(B-A)=0.35") +
        " and " +
        m("P(A\\cap B)=0.15") +
        ", then " +
        m("P(A\\cup B)") +
        " is",
      m("0.75"),
      [
        [m("0.60"), "This omits the shared region."],
        [m("0.90"), "This counts the shared region twice."],
        [m("0.15"), "This counts only the intersection."],
      ],
      [
        "The two exclusive regions and the intersection are disjoint.",
        "Add their probabilities: 0.25+0.35+0.15=0.75.",
      ],
      [
        "Identify the three disjoint parts of the union.",
        "Each must be counted once.",
        "Add the supplied region probabilities.",
      ],
    );
    B.frq(
      "saq",
      "Suppose " +
        m("P(A)=0.55") +
        ", " +
        m("P(B)=0.45") +
        " and the probability of exactly one of A,B is 0.60.",
      [
        part(
          "Find the intersection and union probabilities.",
          m("0.20") + " and " + m("0.80") + ".",
          "Exactly one equals P(A)+P(B)-2t. Thus 1-2t=0.6, so t=0.2. The union is 1-t=0.8.",
          "Uses the exactly-one formula.",
          "Solves for the overlap.",
          "Computes the union.",
        ),
      ],
      [
        "The shared region is counted twice in the sum of marginals.",
        "Remove it twice to obtain exactly one.",
        "Remove it once to obtain the union.",
      ],
      ["Equating exactly one with the union."],
    );
    B.frq(
      "laq",
      "Three mutually exclusive and exhaustive events have probabilities " +
        m("x,\\ 2x+0.1,\\ 3x-0.3") +
        ".",
      [
        part(
          "Determine x and all three probabilities.",
          m("x=0.2") + "; probabilities " + m("0.2,\\ 0.5,\\ 0.3") + ".",
          "Exhaustiveness and disjointness give 6x-0.2=1. Solve x=0.2 and substitute.",
          "Uses a total probability of one.",
          "Solves the linear equation.",
          "Finds all event probabilities.",
        ),
        part(
          "Check the model is valid and find the probability that the second event does not occur.",
          "All three probabilities are nonnegative and sum to 1; the requested complement is 0.5.",
          "Verify each value before applying the complement rule.",
          "Checks nonnegativity and total.",
          "Computes the complement.",
        ),
      ],
      [
        "The three event probabilities must add to one.",
        "Solve before interpreting the values.",
        "Check each proposed probability lies in [0,1].",
      ],
      ["Accepting an algebraic solution without validating probabilities."],
    );
    B.frq(
      "case",
      "A proposed model has " +
        m("P(A)=0.4") +
        ", " +
        m("P(B)=0.5") +
        " and " +
        m("P(A\\cap B)=0.6") +
        ".",
      [
        part(
          "Explain why the model is invalid.",
          "The intersection is larger than both containing events.",
          "An intersection is a subset of each event, so its probability cannot exceed either marginal.",
          "Uses the subset-probability bound.",
        ),
        part(
          "Keeping the two marginal probabilities, find the feasible interval for the intersection.",
          m("[0,0.4]") + ".",
          "The lower bound is max(0,0.4+0.5-1)=0 and the upper bound is min(0.4,0.5)=0.4.",
          "Finds the lower bound.",
          "Finds the upper bound.",
        ),
        part(
          "If the overlap is corrected to 0.2, find P(neither).",
          m("0.3") + ".",
          "The union is 0.4+0.5-0.2=0.7; its complement is 0.3.",
          "Computes the corrected complement.",
        ),
      ],
      [
        "Check subset relations before calculating other events.",
        "Use both overlap bounds.",
        "Then apply the addition and complement laws.",
      ],
      ["Treating any three numbers in [0,1] as a consistent event model."],
      3,
    );
  }
  return B.items;
}
