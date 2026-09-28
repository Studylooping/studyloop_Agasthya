import type { ItemFigure } from "@/lib/content/types";
import { builder } from "../expansion-builder";
import { fraction as f, math as m, part } from "../practice-authoring";

function parabolaFigure(a: number): ItemFigure {
  const points = Array.from({ length: 81 }, (_, i) => {
    const y = -10 + (20 * i) / 80;
    return (
      (225 + (15 * y * y) / (4 * a)).toFixed(2) +
      "," +
      (180 - 15 * y).toFixed(2)
    );
  }).join(" ");
  return {
    type: "svg",
    title: "Parabola with a focus and directrix",
    description:
      "A right-opening parabola has vertex at the origin, focus F at (" +
      a +
      ",0), and vertical directrix x=-" +
      a +
      ".",
    svg:
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 360"><rect width="500" height="360" fill="white"/><path d="M50 180H465M225 330V25" stroke="#334155" stroke-width="2"/><path d="M' +
      (225 - 15 * a) +
      ' 30V330" stroke="#64748b" stroke-dasharray="6 5" stroke-width="2"/><polyline points="' +
      points +
      '" fill="none" stroke="#2563eb" stroke-width="3"/><circle cx="' +
      (225 + 15 * a) +
      '" cy="180" r="4" fill="#0f172a"/><g font-family="Arial" font-size="15" fill="#0f172a"><text x="211" y="201">O</text><text x="468" y="179">x</text><text x="234" y="27">y</text><text x="' +
      (230 + 15 * a) +
      '" y="204">F(' +
      a +
      ', 0)</text><text x="' +
      (204 - 15 * a) +
      '" y="22">x = -' +
      a +
      "</text></g></svg>",
  };
}
export function conicsExpansion(topic: "3.3" | "3.4") {
  const B = builder({ unit: "u3-coordinate-geometry", topic, chapter: 10 });
  for (let v = 0; v < 4; v++) {
    const a = v + 2,
      b = a + 2;
    if (topic === "3.3") {
      B.mc(
        "The circle " + m("(x-" + a + ")^2+(y+" + b + ")^2=25") + " has centre",
        m("(" + a + "," + -b + ")"),
        [
          [
            m("(" + -a + "," + b + ")"),
            "Both shift signs have been reversed incorrectly.",
          ],
          [
            m("(" + a + "," + b + ")"),
            "The y-coordinate of the centre is negative.",
          ],
          [
            m("(" + -a + "," + -b + ")"),
            "The x-coordinate of the centre is positive.",
          ],
        ],
        [
          "Compare with " + m("(x-h)^2+(y-k)^2=r^2") + ".",
          "The centre is " + m("(" + a + "," + -b + ")") + ".",
        ],
        [
          "Write each bracket as coordinate minus centre.",
          "A plus inside the y-bracket means a negative centre coordinate.",
          "Read both shifts, not the radius.",
        ],
      );
      B.mc(
        "The radius of " +
          m(
            "x^2+y^2-" +
              2 * a +
              "x-" +
              2 * b +
              "y+" +
              (a * a + b * b - 9) +
              "=0",
          ) +
          " is",
        m(3),
        [
          [m(9), "This is the squared radius."],
          [
            m("\\sqrt{" + (a * a + b * b) + "}"),
            "This is the centre's distance from the origin.",
          ],
          [m(a + b), "Radius is not the sum of centre coordinates."],
        ],
        [
          "Complete the two squares to obtain " +
            m("(x-" + a + ")^2+(y-" + b + ")^2=9") +
            ".",
          "The nonnegative square root gives radius 3.",
        ],
        [
          "Complete each coordinate square.",
          "Move the corrected constant to the right.",
          "Take the square root of the radius squared.",
        ],
        3,
      );
      B.mc(
        "Which equation represents the parabola in the figure?",
        m("y^2=" + 4 * a + "x"),
        [
          [
            m("x^2=" + 4 * a + "y"),
            "This opens upwards, unlike the given parabola.",
          ],
          [
            m("y^2=-" + 4 * a + "x"),
            "This has its focus to the left of the origin.",
          ],
          [
            m("y^2=" + a + "x"),
            "The coefficient is four times the focal distance, not the focal distance itself.",
          ],
        ],
        [
          "The vertex is O and the focus lies a=" +
            a +
            " units along the positive x-axis.",
          "The standard form is " + m("y^2=4ax") + ".",
        ],
        [
          "Identify the opening direction.",
          "Read the vertex-to-focus distance.",
          "Use four times that distance in the standard equation.",
        ],
        2,
        parabolaFigure(a),
      );
      B.mc(
        "For " + m("x^2=-" + 4 * a + "y") + ", the directrix is",
        m("y=" + a),
        [
          [
            m("y=" + -a),
            "This is the focus's y-coordinate, not the directrix.",
          ],
          [
            m("x=" + a),
            "The axis is vertical, so the directrix is horizontal.",
          ],
          [
            m("y=" + 4 * a),
            "Divide the coefficient by four to obtain the focal distance.",
          ],
        ],
        [
          "This is a downward-opening parabola with focus " +
            m("(0," + -a + ")") +
            ".",
          "The directrix is the horizontal line the same distance above the vertex.",
        ],
        [
          "Compare with x squared = -4ay.",
          "The focus is below the vertex.",
          "The directrix is on the opposite side.",
        ],
      );
      B.mc(
        "The length of the latus rectum of " + m("y^2=" + 4 * a + "x") + " is",
        m(4 * a),
        [
          [m(a), "This is the focal distance."],
          [m(2 * a), "This is half the latus rectum."],
          [m(8 * a), "This doubles the full latus rectum unnecessarily."],
        ],
        [
          "At the focus's x-coordinate x=a, the parabola gives y=+2a or -2a.",
          "The vertical separation is " + m("2a-(-2a)=4a=" + 4 * a) + ".",
        ],
        [
          "The latus rectum passes through the focus.",
          "Substitute x=a.",
          "Subtract the two endpoint y-coordinates.",
        ],
      );
      B.frq(
        "vsaq",
        "A circle has centre " +
          m("(" + a + "," + b + ")") +
          " and radius " +
          m(a + 1) +
          ".",
        [
          part(
            "Write its equation.",
            m("(x-" + a + ")^2+(y-" + b + ")^2=" + (a + 1) ** 2) + ".",
            "Use the squared-distance definition of a circle.",
            "Uses the correct centre shifts.",
            "Squares the radius.",
          ),
        ],
        [
          "Points lie at a fixed distance from the centre.",
          "Square the distance equation.",
          "Keep both centre shifts.",
        ],
        ["Using the radius instead of its square on the right."],
        2,
      );
      B.frq(
        "vsaq",
        "Find the focus of " + m("y^2=-" + 4 * a + "x") + ".",
        [
          part(
            "State the focus.",
            m("(" + -a + ",0)") + ".",
            "The coefficient gives focal distance a=" +
              a +
              "; the negative sign places the focus to the left.",
            "Finds the focal distance.",
            "Uses the correct sign and axis.",
          ),
        ],
        [
          "Compare with the standard left-opening form.",
          "Divide the magnitude of the coefficient by four.",
          "Place the focus on the negative x-axis.",
        ],
        ["Putting the focus on the y-axis."],
        2,
      );
      B.frq(
        "saq",
        "A parabola has vertex at the origin, axis along the positive y-axis, and passes through " +
          m("(" + 2 * a + "," + a + ")") +
          ".",
        [
          part(
            "Find its equation and focal distance.",
            m("x^2=" + 4 * a + "y") + "; focal distance " + m(a) + ".",
            "Write x squared =4py. Substitution gives " +
              m(4 * a * a + "=4p(" + a + ")") +
              ", hence p=a.",
            "Chooses the correct orientation.",
            "Uses the given point to solve for p.",
            "States the equation.",
          ),
        ],
        [
          "A vertical parabola uses x squared.",
          "Use an unknown focal distance.",
          "Substitute the known point.",
        ],
        ["Using a horizontal-parabola equation."],
      );
      B.frq(
        "laq",
        "The endpoints of a circle's diameter are " +
          m("(" + a + ",1)") +
          " and " +
          m("(" + (a + 6) + ",9)") +
          ".",
        [
          part(
            "Find its centre and radius.",
            m("(" + (a + 3) + ",5)") + " and " + m(5) + ".",
            "The centre is the midpoint; the diameter length is " +
              m("\\sqrt{6^2+8^2}=10") +
              ".",
            "Finds the midpoint.",
            "Finds the diameter and halves it.",
          ),
          part(
            "Write the equation and determine whether the origin lies inside, on, or outside the circle.",
            m("(x-" + (a + 3) + ")^2+(y-5)^2=25") + "; the origin is outside.",
            "The centre-origin squared distance is " +
              m((a + 3) ** 2 + 25) +
              ", larger than 25.",
            "Writes the circle equation.",
            "Compares squared distances.",
            "Classifies the origin correctly.",
          ),
        ],
        [
          "The centre bisects a diameter.",
          "The radius is half its length.",
          "Compare squared distance to radius squared for point location.",
        ],
        ["Using the full diameter as the radius."],
      );
      B.frq(
        "case",
        "A parabola is given by " + m("x^2=" + 4 * a + "y") + ".",
        [
          part(
            "Give its focus and directrix.",
            m("(0," + a + "),\\quad y=" + -a) + ".",
            "The vertex is at the origin and the focal distance is a=" +
              a +
              ".",
            "States both correctly.",
          ),
          part(
            "Find the endpoints of the latus rectum.",
            m("(" + 2 * a + "," + a + ")") +
              " and " +
              m("(" + -2 * a + "," + a + ")") +
              ".",
            "Set y=a in the equation to obtain x=+2a or -2a.",
            "Substitutes the focus's y-coordinate.",
            "Finds both endpoints.",
          ),
          part(
            "Verify that the endpoint with positive x is equidistant from the focus and directrix.",
            m(2 * a) + " units from each.",
            "Its distance to the focus is its horizontal separation 2a. Its perpendicular distance to y=-a is a-(-a)=2a.",
            "Checks both distances explicitly.",
          ),
        ],
        [
          "The latus rectum is perpendicular to the axis through the focus.",
          "Use the parabola equation for its endpoints.",
          "Compare point-to-point and point-to-line distances.",
        ],
        ["Comparing distance to the vertex instead of to the directrix."],
      );
    } else {
      const A = [5, 13, 17, 25][v],
        D = [3, 5, 8, 7][v],
        c = [4, 12, 15, 24][v];
      B.mc(
        "For the ellipse " +
          m("\\frac{x^2}{" + A * A + "}+\\frac{y^2}{" + D * D + "}=1") +
          ", the foci are",
        m("(\\pm" + c + ",0)"),
        [
          [
            m("(\\pm" + A + ",0)"),
            "These are the major-axis vertices, not the foci.",
          ],
          [
            m("(0,\\pm" + c + ")"),
            "The larger denominator places the major axis horizontally.",
          ],
          [
            m("(\\pm" + D + ",0)"),
            "The focal distance is not the semi-minor axis.",
          ],
        ],
        [
          m("c^2=a^2-b^2=" + A * A + "-" + D * D + "=" + c * c) + ".",
          "The major axis is the x-axis, so the foci are " +
            m("(\\pm" + c + ",0)") +
            ".",
        ],
        [
          "Identify the larger squared semi-axis.",
          "Subtract the squared semi-minor axis.",
          "Place the foci on the major axis.",
        ],
      );
      B.mc(
        "The eccentricity of " +
          m("\\frac{x^2}{" + A * A + "}+\\frac{y^2}{" + D * D + "}=1") +
          " is",
        m(f(c, A)),
        [
          [m(f(A, c)), "Ellipse eccentricity is c/a, less than one."],
          [m(f(D, A)), "This is the axis ratio, not the eccentricity."],
          [m(f(c, D)), "Divide the focal distance by the semi-major axis."],
        ],
        [
          m("c=\\sqrt{" + A * A + "-" + D * D + "}=" + c) + ".",
          m("e=c/a=" + f(c, A)) + ".",
        ],
        [
          "Find the focal distance.",
          "Divide by the semi-major axis.",
          "An ellipse must have eccentricity between zero and one.",
        ],
      );
      B.mc(
        "The hyperbola " +
          m("\\frac{x^2}{" + D * D + "}-\\frac{y^2}{" + c * c + "}=1") +
          " has foci",
        m("(\\pm" + A + ",0)"),
        [
          [m("(\\pm" + D + ",0)"), "These are the vertices."],
          [
            m("(0,\\pm" + A + ")"),
            "The positive squared term determines the transverse axis.",
          ],
          [
            m("(\\pm" + c + ",0)"),
            "For a hyperbola the focal distance satisfies c_f squared = a squared + b squared.",
          ],
        ],
        [
          "The focal distance is " +
            m("\\sqrt{" + D * D + "+" + c * c + "}=" + A) +
            ".",
          "The transverse axis is horizontal.",
        ],
        [
          "Identify the positive squared term.",
          "Add the two squared semi-axis lengths.",
          "Place the foci on the transverse axis.",
        ],
      );
      B.mc(
        "The length of the major axis of " +
          m("\\frac{x^2}{" + D * D + "}+\\frac{y^2}{" + A * A + "}=1") +
          " is",
        m(2 * A),
        [
          [m(A), "This is the semi-major axis."],
          [m(2 * D), "This is the minor-axis length."],
          [
            m(A * A),
            "This is the squared semi-major axis from the denominator.",
          ],
        ],
        [
          "The larger denominator is " +
            m(A * A) +
            ", so the semi-major axis is " +
            m(A) +
            ".",
          "Double it to get the full major-axis length.",
        ],
        [
          "Take the square root of the larger denominator.",
          "Distinguish a semi-axis from a full axis.",
          "Double the semi-major length.",
        ],
      );
      B.mc(
        "The eccentricity of " +
          m("\\frac{x^2}{" + D * D + "}-\\frac{y^2}{" + c * c + "}=1") +
          " equals",
        m(f(A, D)),
        [
          [m(f(D, A)), "A hyperbola has eccentricity greater than one."],
          [m(f(c, D)), "The other semi-axis is not the focal distance."],
          [
            m(f(A, c)),
            "Divide by the semi-transverse axis, not the other semi-axis.",
          ],
        ],
        [
          "The focal distance is " +
            m(A) +
            " and the semi-transverse axis is " +
            m(D) +
            ".",
          "Hence " + m("e=" + f(A, D)) + ".",
        ],
        [
          "Use the sum-of-squares relation for a hyperbola.",
          "Identify the denominator of the positive term.",
          "Divide focal distance by semi-transverse length.",
        ],
      );
      B.frq(
        "vsaq",
        "Find the vertices of " +
          m("\\frac{y^2}{" + A * A + "}+\\frac{x^2}{" + D * D + "}=1") +
          ".",
        [
          part(
            "State the major-axis vertices.",
            m("(0,\\pm" + A + ")") + ".",
            "The major axis is vertical because the larger denominator is under y squared.",
            "Identifies the major-axis direction.",
            "Gives both vertices.",
          ),
        ],
        [
          "Find the larger denominator.",
          "Take its positive square root.",
          "Place the two vertices on that axis.",
        ],
        [
          "Reading the first written term as horizontal regardless of its variable.",
        ],
        2,
      );
      B.frq(
        "vsaq",
        "An ellipse has semi-major axis " +
          m(A) +
          " and eccentricity " +
          m(f(c, A)) +
          ".",
        [
          part(
            "Find the distance between the foci.",
            m(2 * c) + ".",
            "The focal distance from the centre is ae=" +
              c +
              "; the two foci are twice that far apart.",
            "Finds the centre-to-focus distance.",
            "Doubles it for the separation.",
          ),
        ],
        [
          "Eccentricity is c/a.",
          "Find c first.",
          "There are two foci on opposite sides of the centre.",
        ],
        ["Reporting c instead of 2c."],
        2,
      );
      B.frq(
        "saq",
        "An ellipse centred at the origin has major axis on the x-axis, semi-major axis " +
          m(A) +
          ", and focal distance " +
          m(c) +
          ".",
        [
          part(
            "Find its equation.",
            m("\\frac{x^2}{" + A * A + "}+\\frac{y^2}{" + D * D + "}=1") + ".",
            "For an ellipse, " +
              m("b^2=a^2-c^2=" + A * A + "-" + c * c + "=" + D * D) +
              ".",
            "Uses the ellipse focal relation.",
            "Computes the other squared semi-axis.",
            "Writes the correctly oriented equation.",
          ),
        ],
        [
          "Use a squared minus c squared.",
          "The major axis is horizontal.",
          "Put the squared lengths in the denominators.",
        ],
        ["Using the hyperbola sum relation for an ellipse."],
      );
      B.frq(
        "laq",
        "A hyperbola centred at the origin has transverse axis along the y-axis, vertices " +
          m("(0,\\pm" + D + ")") +
          ", and foci " +
          m("(0,\\pm" + A + ")") +
          ".",
        [
          part(
            "Find its equation and eccentricity.",
            m(
              "\\frac{y^2}{" +
                D * D +
                "}-\\frac{x^2}{" +
                c * c +
                "}=1,\\quad e=" +
                f(A, D),
            ) + ".",
            "Here a=" +
              D +
              " and focal distance=" +
              A +
              ". Hence " +
              m("b^2=" + A * A + "-" + D * D + "=" + c * c) +
              ".",
            "Computes b squared.",
            "Uses the vertical transverse orientation.",
            "Finds eccentricity.",
          ),
          part(
            "Find the length of its latus rectum.",
            m(f(2 * c * c, D)) + ".",
            "For a hyperbola, the latus rectum length is " + m("2b^2/a") + ".",
            "Uses the correct latus rectum formula.",
            "Substitutes the semi-axis values.",
          ),
        ],
        [
          "Distinguish vertex distance from focal distance.",
          "The positive squared term lies along the transverse axis.",
          "Use squared b, not b, in the latus rectum formula.",
        ],
        ["Swapping the hyperbola's positive and negative terms."],
      );
      B.frq(
        "case",
        "A point P moves on the ellipse " +
          m("\\frac{x^2}{" + A * A + "}+\\frac{y^2}{" + D * D + "}=1") +
          ", with foci F1 and F2.",
        [
          part(
            "Find F1 and F2.",
            m("(-" + c + ",0)") + " and " + m("(" + c + ",0)") + ".",
            "Use c squared = a squared - b squared.",
            "Finds both foci.",
          ),
          part(
            "Find the constant value of PF1+PF2.",
            m(2 * A) + ".",
            "The defining distance sum of an ellipse is twice the semi-major axis.",
            "Uses the ellipse distance-sum property.",
          ),
          part(
            "At the point " +
              m("(0," + D + ")") +
              ", calculate both focal distances and check their sum.",
            m(A) + " and " + m(A) + ", summing to " + m(2 * A) + ".",
            "Each distance is " +
              m("\\sqrt{" + c * c + "+" + D * D + "}=" + A) +
              ".",
            "Computes the two distances.",
            "Verifies the required sum.",
          ),
        ],
        [
          "Find the focal distance from the semi-axes.",
          "The constant sum equals the major-axis length.",
          "The point on the minor axis is equally far from both foci.",
        ],
        ["Using twice the focal distance as the ellipse's constant sum."],
      );
    }
  }
  return B.items;
}
