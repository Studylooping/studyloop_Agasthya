import { builder } from "../expansion-builder";
import { math as m, part } from "../practice-authoring";

export function spaceExpansion() {
  const B = builder({
    unit: "u3-coordinate-geometry",
    topic: "3.5",
    chapter: 11,
  });
  for (let v = 0; v < 8; v++) {
    const a = (v % 4) + 2,
      b = a + 3;
    if (v < 4) {
      B.mc(
        "Find the distance between " +
          m("(" + a + ",1,2)") +
          " and " +
          m("(" + (a + 2) + ",4,8)") +
          ".",
        m(7),
        [
          [m(49), "This is the squared distance."],
          [
            m(11),
            "Coordinate differences must be combined by squares, not directly added.",
          ],
          [m("\\sqrt{13}"), "This omits the change in the z-coordinate."],
        ],
        [m("d=\\sqrt{2^2+3^2+6^2}=\\sqrt{49}=7") + "."],
        [
          "Subtract corresponding coordinates.",
          "Square all three differences.",
          "Take their sum's nonnegative square root.",
        ],
      );
      B.mc(
        "The distance of " +
          m("(" + a + "," + -b + "," + (b + 1) + ")") +
          " from the xz-plane is",
        m(b),
        [
          [m(a), "This is distance from the yz-plane."],
          [m(b + 1), "This is distance from the xy-plane."],
          [m(-b), "A distance is nonnegative."],
        ],
        [
          "The xz-plane consists of points with y=0.",
          "The perpendicular distance is the absolute y-coordinate, " +
            m(b) +
            ".",
        ],
        [
          "Identify the coordinate omitted from the plane's name.",
          "Set that coordinate to zero.",
          "Use its absolute value as the distance.",
        ],
      );
      B.mc(
        "Which point lies on the z-axis?",
        m("(0,0," + a + ")"),
        [
          [m("(" + a + ",0,0)"), "This lies on the x-axis."],
          [m("(0," + a + ",0)"), "This lies on the y-axis."],
          [
            m("(" + a + "," + a + ",0)"),
            "This lies in the xy-plane but is not on the z-axis.",
          ],
        ],
        [
          "A point on the z-axis has x=0 and y=0.",
          "Its z-coordinate may be any real number.",
        ],
        [
          "Two coordinates vanish on an axis.",
          "Keep only the coordinate named by the axis.",
          "Check both zeros.",
        ],
      );
      B.mc(
        "The distance of " +
          m("(" + 2 * a + "," + 3 * a + "," + 6 * a + ")") +
          " from the origin is",
        m(7 * a),
        [
          [
            m(11 * a),
            "This adds coordinate magnitudes instead of their squares.",
          ],
          [m(49 * a * a), "This is the squared distance."],
          [m(6 * a), "This uses only the largest coordinate."],
        ],
        [
          m(
            "d=\\sqrt{(2" +
              "\\cdot" +
              a +
              ")^2+(3\\cdot" +
              a +
              ")^2+(6\\cdot" +
              a +
              ")^2}=7\\cdot" +
              a,
          ) + ".",
        ],
        [
          "Use all three coordinates.",
          "Factor out the common scale.",
          "Take the positive square root.",
        ],
      );
      B.mc(
        "Reflecting " +
          m("(" + a + "," + -b + ",3)") +
          " in the xy-plane gives",
        m("(" + a + "," + -b + ",-3)"),
        [
          [
            m("(" + -a + "," + b + ",3)"),
            "This changes x and y instead of the perpendicular z-coordinate.",
          ],
          [m("(" + a + "," + b + ",3)"), "This is reflection in the xz-plane."],
          [
            m("(" + -a + "," + -b + ",3)"),
            "This is reflection in the yz-plane.",
          ],
        ],
        ["The xy-plane is z=0.", "Reflection keeps x and y and reverses z."],
        [
          "Identify the coordinate perpendicular to the plane.",
          "Keep the in-plane coordinates.",
          "Reverse only the perpendicular coordinate.",
        ],
      );
      B.frq(
        "vsaq",
        "A point lies in the yz-plane and has y-coordinate " +
          m(a) +
          " and z-coordinate " +
          m(-b) +
          ".",
        [
          part(
            "Write its coordinates.",
            m("(0," + a + "," + -b + ")") + ".",
            "The yz-plane requires x=0.",
            "Uses x=0.",
            "Places the other coordinates in the correct order.",
          ),
        ],
        [
          "The plane name lists the coordinates that can vary.",
          "The omitted coordinate is zero.",
          "Write the tuple in x,y,z order.",
        ],
        ["Putting the zero coordinate last."],
        2,
      );
      B.frq(
        "vsaq",
        "Find the distance from " +
          m("(" + a + ",2,3)") +
          " to " +
          m("(" + a + ",2,8)") +
          ".",
        [
          part(
            "Calculate the distance.",
            m(5) + ".",
            "Only z changes; the absolute difference is |8-3|=5.",
            "Identifies the single changing coordinate.",
            "Calculates its absolute difference.",
          ),
        ],
        [
          "Compare corresponding coordinates.",
          "Two differences vanish.",
          "Only one squared term remains.",
        ],
        ["Using the sum of the two z-coordinates."],
        2,
      );
      B.frq(
        "saq",
        "Find the points on the x-axis whose distance from " +
          m("(" + a + ",3,4)") +
          " is 13 units.",
        [
          part(
            "Determine all such points.",
            m("(" + (a - 12) + ",0,0)") +
              " and " +
              m("(" + (a + 12) + ",0,0)") +
              ".",
            "Write the point as (x,0,0). Then " +
              m("(x-" + a + ")^2+9+16=169") +
              ", so " +
              m("x-" + a + "=\\pm12") +
              ".",
            "Uses the x-axis coordinate restrictions.",
            "Forms and solves the distance equation.",
            "Gives both points.",
          ),
        ],
        [
          "Write an unknown point on the specified axis.",
          "Square the distance equation.",
          "Keep both signs when taking the square root.",
        ],
        ["Discarding the second point without a stated sign restriction."],
      );
      B.frq(
        "laq",
        "Let " +
          m("A=(" + a + ",1,2)") +
          ", " +
          m("B=(" + (a + 3) + ",1,6)") +
          " and " +
          m("C=(" + (a + 3) + ",13,6)") +
          ".",
        [
          part(
            "Find the lengths AB, BC and AC.",
            m("AB=5,\\ BC=12,\\ AC=13") + ".",
            "Apply the three-dimensional distance formula to each pair.",
            "Computes AB.",
            "Computes BC and AC.",
          ),
          part(
            "Classify the triangle and find its area.",
            "Right-angled at B; area 30 square units.",
            "Since " +
              m("5^2+12^2=13^2") +
              ", AC is the hypotenuse. The perpendicular legs are AB and BC, giving area " +
              m("5\\cdot12/2=30") +
              ".",
            "Uses the converse of Pythagoras.",
            "Identifies the right-angle vertex.",
            "Computes area from the perpendicular sides.",
          ),
        ],
        [
          "Calculate squared lengths first.",
          "Look for a Pythagorean relation.",
          "The two shorter sides meet at the right angle.",
        ],
        ["Using the hypotenuse as a perpendicular height."],
      );
      B.frq(
        "case",
        "A point P has coordinates " +
          m("(" + a + "," + b + ",-4)") +
          ". Let X, Y and Z be its nearest points in the yz-, xz-, and xy-planes respectively.",
        [
          part(
            "Write the coordinates of X, Y and Z.",
            m(
              "X=(0," +
                b +
                ",-4),\\ Y=(" +
                a +
                ",0,-4),\\ Z=(" +
                a +
                "," +
                b +
                ",0)",
            ) + ".",
            "For each plane, set only its perpendicular coordinate to zero.",
            "Finds all three projections.",
          ),
          part(
            "Find PX, PY and PZ.",
            m(a + ",\\ " + b + ",\\ 4") + ".",
            "Each segment changes one coordinate only.",
            "Finds the three nonnegative distances.",
          ),
          part(
            "Which coordinate plane is nearest to P?",
            a < 4
              ? "The yz-plane."
              : a === 4
                ? "The yz-plane and xy-plane are equally near."
                : "The xy-plane.",
            "Compare the three distances " + m(a) + ", " + m(b) + " and 4.",
            "Compares the distances.",
            "Includes a tie when it occurs.",
          ),
        ],
        [
          "A nearest point keeps the two in-plane coordinates.",
          "Use absolute values for distances.",
          "Compare all three distances, including possible ties.",
        ],
        ["Changing all coordinates when projecting onto a plane."],
      );
    } else {
      B.mc(
        "The distance from " +
          m("(" + (2 * a + 10) + ",3,4)") +
          " to the x-axis is",
        m(5),
        [
          [
            m(2 * a + 10),
            "This is the distance to the yz-plane, not to the x-axis.",
          ],
          [m(7), "Combine the perpendicular y and z distances by squares."],
          [
            m("\\sqrt{" + ((2 * a + 10) ** 2 + 25) + "}"),
            "This is distance to the origin.",
          ],
        ],
        [
          "The nearest x-axis point is " +
            m("(" + (2 * a + 10) + ",0,0)") +
            ".",
          "The required distance is " + m("\\sqrt{3^2+4^2}=5") + ".",
        ],
        [
          "The x-coordinate can match the point's x-coordinate.",
          "Only y and z then contribute.",
          "Use their Pythagorean combination.",
        ],
      );
      B.mc(
        "For " +
          m("P=(" + a + "," + b + ",-2)") +
          ", reflection in the origin gives",
        m("(" + -a + "," + -b + ",2)"),
        [
          [m("(" + a + "," + b + ",2)"), "This reflects only in the xy-plane."],
          [
            m("(" + -a + "," + b + ",-2)"),
            "This changes only the x-coordinate.",
          ],
          [
            m("(" + a + "," + -b + ",-2)"),
            "This changes only the y-coordinate.",
          ],
        ],
        [
          "The origin is the midpoint of a point and its central reflection.",
          "All three coordinates change sign.",
        ],
        [
          "A reflection in the origin differs from reflection in a plane.",
          "Each coordinate must average to zero with its reflected coordinate.",
          "Negate all three components.",
        ],
      );
      B.mc(
        "Which point is at distance " + m(3 * a) + " from the origin?",
        m("(" + a + "," + 2 * a + "," + 2 * a + ")"),
        [
          [
            m("(" + 3 * a + "," + a + ",0)"),
            "Its squared distance is 10a squared, not 9a squared.",
          ],
          [
            m("(" + a + "," + a + "," + a + ")"),
            "Its distance is a times sqrt(3).",
          ],
          [
            m("(" + 2 * a + "," + 2 * a + "," + 2 * a + ")"),
            "Its squared distance is 12a squared.",
          ],
        ],
        [
          "For the correct point, the squared distance is " +
            m(a * a + "+" + 4 * a * a + "+" + 4 * a * a + "=" + 9 * a * a) +
            ".",
          "Taking the square root gives " + m(3 * a) + ".",
        ],
        [
          "Compare squared distances to avoid rounding.",
          "The target squared distance is nine a squared.",
          "Test all three coordinates in each candidate.",
        ],
      );
      B.mc(
        "A point " +
          m("(x," + a + ",0)") +
          " is equidistant from " +
          m("(0,0,0)") +
          " and " +
          m("(" + 2 * b + ",0,0)") +
          ". Then x equals",
        m(b),
        [
          [
            m(2 * b),
            "This is the second point's x-coordinate, not the halfway coordinate.",
          ],
          [m(0), "This is the first point's x-coordinate."],
          [
            m(-b),
            "The equality of squared distances gives a positive halfway value.",
          ],
        ],
        [
          m("x^2+" + a * a + "=(x-" + 2 * b + ")^2+" + a * a) + ".",
          "Cancel common terms to obtain " + m("x=" + b) + ".",
        ],
        [
          "Equate squared distances.",
          "Cancel the common y contribution.",
          "Solve the remaining linear equation.",
        ],
        3,
      );
      B.mc(
        "Two points have the same x- and y-coordinates and z-coordinates " +
          m(-a) +
          " and " +
          m(b) +
          ". Their distance is",
        m(a + b),
        [
          [m(b - a), "The coordinates lie on opposite sides of zero."],
          [
            m(a * a + b * b),
            "Only the squared difference enters, not the sum of separate squares.",
          ],
          [m(-a - b), "Distance must be nonnegative."],
        ],
        [
          "Only the z-difference contributes.",
          "Its magnitude is " + m("|" + b + "-(" + -a + ")|=" + (a + b)) + ".",
        ],
        [
          "Subtract the signed coordinates.",
          "Negative lower coordinate increases the separation.",
          "Take the absolute value.",
        ],
      );
      B.frq(
        "vsaq",
        "State the distances of " +
          m("(-" + a + ",-" + b + ",2)") +
          " from the xy- and yz-planes.",
        [
          part(
            "Give both distances in the order requested.",
            m(2) + " and " + m(a) + ".",
            "Distance from xy is |z|; distance from yz is |x|.",
            "Identifies each perpendicular coordinate.",
            "Gives nonnegative magnitudes.",
          ),
        ],
        [
          "A plane's omitted coordinate controls distance.",
          "Use z for xy and x for yz.",
          "Take absolute values.",
        ],
        ["Returning signed coordinate values as distances."],
        2,
      );
      B.frq(
        "vsaq",
        "How far is " +
          m("(" + a + ",0," + b + ")") +
          " from " +
          m("(" + a + ",0," + -b + ")") +
          "?",
        [
          part(
            "Calculate the distance.",
            m(2 * b) + ".",
            "Only z differs; its two values are equal in magnitude and opposite in sign.",
            "Uses the coordinate difference.",
            "Obtains twice its magnitude.",
          ),
        ],
        [
          "Two coordinates are identical.",
          "Compare the z-coordinates.",
          "Measure the full separation across zero.",
        ],
        ["Returning only the magnitude of one z-coordinate."],
        2,
      );
      B.frq(
        "saq",
        "Find all points on the z-axis equidistant from " +
          m("(" + a + ",0,0)") +
          " and " +
          m("(0," + a + ",4)") +
          ".",
        [
          part(
            "Determine the point.",
            m("(0,0,2)") + ".",
            "For (0,0,z), equality gives " +
              m(a * a + "+z^2=" + a * a + "+(z-4)^2") +
              ". Hence 8z=16 and z=2.",
            "Restricts the unknown point to the z-axis.",
            "Equates and simplifies squared distances.",
            "Finds the unique point.",
          ),
        ],
        [
          "Use (0,0,z) for the unknown point.",
          "Equate squared distances.",
          "The quadratic terms cancel.",
        ],
        ["Leaving x and y arbitrary for a point on the z-axis."],
      );
      B.frq(
        "laq",
        "Consider " +
          m("A=(" + a + ",1,2)") +
          ", " +
          m("B=(" + (a + 2) + ",4,8)") +
          " and " +
          m("C=(" + (a + 4) + ",7,14)") +
          ".",
        [
          part(
            "Find AB, BC and AC.",
            m("7,\\ 7,\\ 14") + ".",
            "The displacement components for AB and BC are both (2,3,6); those for AC are twice these.",
            "Computes the two equal smaller distances.",
            "Computes the end-to-end distance.",
          ),
          part(
            "Show that the points are collinear and identify which point lies between the other two.",
            "A, B and C are collinear, with B between A and C.",
            "The equality " +
              m("AB+BC=AC") +
              " shows that B lies on the straight segment from A to C.",
            "Uses the distance-equality condition.",
            "Identifies the middle point.",
            "Distinguishes collinearity from merely equal adjacent lengths.",
          ),
        ],
        [
          "Compute the three lengths.",
          "Equal adjacent lengths alone are insufficient.",
          "Compare their sum with the third length.",
        ],
        ["Assuming every isosceles triangle is collinear."],
      );
      B.frq(
        "case",
        "A point P lies in the yz-plane with positive y and z coordinates. Its distance from the origin is " +
          m(5 * a) +
          " and its distance from the xy-plane is " +
          m(4 * a) +
          ".",
        [
          part(
            "Determine x and z.",
            m("x=0,\\quad z=" + 4 * a) + ".",
            "The yz-plane fixes x=0. Distance from the xy-plane is |z|, and z is positive.",
            "Uses the plane condition.",
            "Uses the positive z condition.",
          ),
          part(
            "Find y and hence P.",
            m("y=" + 3 * a + ",\\quad P=(0," + 3 * a + "," + 4 * a + ")") + ".",
            "Use " +
              m("y^2+(" + 4 * a + ")^2=(" + 5 * a + ")^2") +
              " and choose the positive root.",
            "Finds the remaining coordinate.",
          ),
          part(
            "Find P's distance from the z-axis.",
            m(3 * a) + ".",
            "The nearest point on that axis has the same z-coordinate; since x=0, the distance is |y|.",
            "Uses the correct axis distance.",
          ),
        ],
        [
          "Use the coordinate-plane information first.",
          "Apply the distance formula for the remaining unknown.",
          "Distinguish distance to an axis from distance to a plane.",
        ],
        ["Ignoring the positive-coordinate restrictions."],
        3,
      );
    }
  }
  return B.items;
}
