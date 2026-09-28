import { builder } from "../expansion-builder";
import { fraction as f, math as m, part, signed } from "../practice-authoring";

export function linesExpansion(topic: "3.1" | "3.2") {
  const B = builder({ unit: "u3-coordinate-geometry", topic, chapter: 9 });
  for (let v = 0; v < 4; v++) {
    const a = v + 2,
      b = a + 3;
    if (topic === "3.1") {
      B.mc(
        "Find the slope of the line through " +
          m("(" + a + ",1)") +
          " and " +
          m("(" + (a + 3) + ",7)") +
          ".",
        m(2),
        [
          [m("1/2"), "This divides horizontal change by vertical change."],
          [
            m(-2),
            "Both coordinate differences must be taken in the same order.",
          ],
          [
            m(6),
            "The vertical change must be divided by the horizontal change.",
          ],
        ],
        [m("m=\\frac{7-1}{" + (a + 3) + "-" + a + "}=6/3=2") + "."],
        [
          "Find the change in y.",
          "Find the change in x in the same order.",
          "Divide vertical change by horizontal change.",
        ],
      );
      B.mc(
        "Which line passes through " +
          m("(" + a + "," + b + ")") +
          " and has slope 3?",
        m("y-" + b + "=3(x-" + a + ")"),
        [
          [
            m("y-" + a + "=3(x-" + b + ")"),
            "The two coordinates of the given point are interchanged.",
          ],
          [
            m("y+" + b + "=3(x+" + a + ")"),
            "This generally passes through the negated point instead.",
          ],
          [
            m("x-" + a + "=3(y-" + b + ")"),
            "This has slope 1/3 rather than 3.",
          ],
        ],
        [
          "Use point-slope form " + m("y-y_1=m(x-x_1)") + ".",
          "Insert the slope and the given point.",
        ],
        [
          "Use point-slope form.",
          "Keep x and y coordinates in their respective positions.",
          "Check the proposed line at the given point.",
        ],
      );
      B.mc(
        "The line through " +
          m("(" + a + ",0)") +
          " and " +
          m("(0," + b + ")") +
          " has equation",
        m("\\frac{x}{" + a + "}+\\frac{y}{" + b + "}=1"),
        [
          [
            m("\\frac{x}{" + b + "}+\\frac{y}{" + a + "}=1"),
            "This swaps the intercepts.",
          ],
          [
            m("\\frac{x}{" + a + "}-\\frac{y}{" + b + "}=1"),
            "This gives a negative y-intercept.",
          ],
          [
            m("\\frac{x}{" + a + "}+\\frac{y}{" + b + "}=0"),
            "This would pass through the origin.",
          ],
        ],
        [
          "The intercepts on the axes are a=" + a + " and b=" + b + ".",
          "Apply the intercept form x/a+y/b=1.",
        ],
        [
          "Identify the x-intercept.",
          "Identify the y-intercept.",
          "Substitute into intercept form.",
        ],
      );
      B.mc(
        "A line perpendicular to " + m("y=" + a + "x+1") + " has slope",
        m(f(-1, a)),
        [
          [m(a), "Equal slopes indicate parallel lines."],
          [
            m(-a),
            "Perpendicular slopes are negative reciprocals, not just negatives.",
          ],
          [
            m(f(1, a)),
            "The product of perpendicular finite slopes must be -1.",
          ],
        ],
        [
          m("m_1m_2=-1") + ".",
          "With " + m("m_1=" + a) + ", obtain " + m("m_2=" + f(-1, a)) + ".",
        ],
        [
          "Read the slope from the given equation.",
          "Use the perpendicular-slope condition.",
          "Take the negative reciprocal.",
        ],
      );
      B.mc(
        "The line through " +
          m("(" + a + "," + b + ")") +
          " parallel to the y-axis is",
        m("x=" + a),
        [
          [m("y=" + b), "This is parallel to the x-axis."],
          [m("x=" + b), "The fixed coordinate is the point's x-coordinate."],
          [m("y=" + a + "x"), "A vertical line does not have a finite slope."],
        ],
        [
          "A vertical line keeps the x-coordinate constant.",
          "At the specified point that coordinate is " + m(a) + ".",
        ],
        [
          "Decide which coordinate stays fixed.",
          "A vertical line allows every y-value.",
          "Use the point's x-coordinate.",
        ],
      );
      B.frq(
        "vsaq",
        "A line has slope " +
          m("-1") +
          " and passes through " +
          m("(" + a + "," + b + ")") +
          ".",
        [
          part(
            "Write its equation in slope-intercept form.",
            m("y=-x+" + (a + b)) + ".",
            "Use y-b=-(x-a), then collect the constant terms.",
            "Uses the given point and slope.",
            "Rearranges correctly.",
          ),
        ],
        [
          "Start with point-slope form.",
          "Expand the minus sign.",
          "Isolate y.",
        ],
        ["Subtracting instead of adding the two coordinates in the intercept."],
        2,
      );
      B.frq(
        "vsaq",
        "Find the inclination of the line through " +
          m("(" + a + ",2)") +
          " and " +
          m("(" + (a + 2) + ",4)") +
          ". Use " +
          m("0^\\circ\\le\\theta<180^\\circ") +
          ".",
        [
          part(
            "Find theta.",
            m("45^\\circ") + ".",
            "The slope is 2/2=1 and tan theta=1 in the specified inclination interval.",
            "Computes the slope.",
            "Identifies the correct inclination.",
          ),
        ],
        [
          "Find the slope first.",
          "Slope is tangent of inclination.",
          "Use the stated interval.",
        ],
        ["Giving a coterminal angle outside the inclination convention."],
        2,
      );
      B.frq(
        "saq",
        "Find the equation of the line through " +
          m("(" + a + "," + b + ")") +
          " parallel to " +
          m("y=2x-1") +
          ".",
        [
          part(
            "Give the slope-intercept equation.",
            m("y=2x" + signed(b - 2 * a)) + ".",
            "The parallel line has slope 2. Point-slope form gives " +
              m("y-" + b + "=2(x-" + a + ")") +
              ".",
            "Uses the equal-slope condition.",
            "Substitutes the point.",
            "Simplifies the intercept.",
          ),
        ],
        [
          "Parallel lines have the same slope.",
          "Use the point to set the intercept.",
          "Check the final equation at the supplied point.",
        ],
        ["Copying the original line's intercept."],
      );
      B.frq(
        "laq",
        "Points A, B and C are " +
          m("(" + a + ",1)") +
          ", " +
          m("(" + (a + 2) + ",5)") +
          " and " +
          m("(" + (a + 5) + ",11)") +
          ".",
        [
          part(
            "Show that the points are collinear.",
            "Both AB and BC have slope 2.",
            "Compute " + m("(5-1)/2=2") + " and " + m("(11-5)/3=2") + ".",
            "Computes the first slope.",
            "Computes the second and concludes collinearity.",
          ),
          part(
            "Find the line's equation and its two axis intercepts.",
            m("y=2x" + signed(1 - 2 * a)) +
              "; x-intercept " +
              m(f(2 * a - 1, 2)) +
              ", y-intercept " +
              m(1 - 2 * a) +
              ".",
            "Use A with slope 2. Set y=0 for the x-intercept and x=0 for the y-intercept.",
            "Finds the equation.",
            "Finds the x-intercept.",
            "Finds the y-intercept.",
          ),
        ],
        [
          "Compare slopes of consecutive segments.",
          "Use any one point for the common line.",
          "Set the other coordinate to zero for each intercept.",
        ],
        ["Using x=0 to find the x-intercept."],
      );
      B.frq(
        "case",
        "A straight road on a coordinate map passes through " +
          m("(0," + b + ")") +
          " and " +
          m("(" + a + ",0)") +
          ".",
        [
          part(
            "Find its slope.",
            m(f(-b, a)) + ".",
            "Use the difference of the given y-coordinates divided by the corresponding x difference.",
            "Computes the signed slope.",
          ),
          part(
            "Write its equation.",
            m("y=" + f(-b, a) + "x+" + b) + ".",
            "The first point gives the y-intercept directly.",
            "Combines slope and intercept.",
          ),
          part(
            "A second road passes through the origin perpendicular to this road. Find its equation.",
            m("y=" + f(a, b) + "x") + ".",
            "Take the negative reciprocal of the first slope; the new intercept is zero.",
            "Uses the perpendicular-slope condition.",
            "Uses passage through the origin.",
          ),
        ],
        [
          "Use the two intercepts for the first slope.",
          "A decreasing road has negative slope.",
          "A perpendicular line through the origin has zero intercept.",
        ],
        ["Using the same slope for perpendicular roads."],
      );
    } else {
      const c = 5 * a;
      B.mc(
        "Find the perpendicular distance of the origin from " +
          m("3x+4y=" + c) +
          ".",
        m(a),
        [
          [
            m(c),
            "The numerator must be divided by the length of the coefficient pair.",
          ],
          [
            m(f(c, 7)),
            "The denominator is the square root of 3 squared plus 4 squared, not 3+4.",
          ],
          [m(-a), "A distance cannot be negative."],
        ],
        [m("d=\\frac{|0+0-" + c + "|}{\\sqrt{3^2+4^2}}=" + a) + "."],
        [
          "Use the point-to-line distance formula.",
          "Take the absolute value in the numerator.",
          "Normalise by the coefficient length.",
        ],
      );
      B.mc(
        "Find the distance between the parallel lines " +
          m("3x+4y=" + 5 * a) +
          " and " +
          m("3x+4y=" + 5 * b) +
          ".",
        m(b - a),
        [
          [
            m(5 * (b - a)),
            "Divide the difference of constants by the coefficient norm.",
          ],
          [
            m(a + b),
            "The separation uses the difference, not the sum, of constants.",
          ],
          [
            m(f(b - a, 5)),
            "The difference of constants already contains the factor 5.",
          ],
        ],
        [
          "The coefficient pairs are identical, so the lines are parallel.",
          "Their separation is " +
            m("\\frac{|" + 5 * b + "-" + 5 * a + "|}{5}=" + (b - a)) +
            ".",
        ],
        [
          "Put both equations in the same coefficient scale.",
          "Subtract their constants.",
          "Divide by the common normal length.",
        ],
      );
      B.mc(
        "The distance from " + m("(" + a + "," + b + ")") + " to the x-axis is",
        m(b),
        [
          [m(a), "The x-coordinate gives distance to the y-axis."],
          [m(a + b), "Axis distance is not the sum of coordinates."],
          [
            m("\\sqrt{" + (a * a + b * b) + "}"),
            "This is distance to the origin, not to the x-axis.",
          ],
        ],
        [
          "The x-axis consists of points with y=0.",
          "The shortest vertical distance is the absolute y-coordinate, " +
            m(b) +
            ".",
        ],
        [
          "Identify which coordinate is zero on the axis.",
          "Move perpendicular to that axis.",
          "Take a nonnegative distance.",
        ],
      );
      B.mc(
        "The acute angle between " +
          m("y=" + a + "x") +
          " and " +
          m("y=" + f(a + 1, 1 - a) + "x") +
          " is",
        m("45^\\circ"),
        [
          [m("0^\\circ"), "The slopes are different."],
          [m("90^\\circ"), "Their product is not -1."],
          [
            m("30^\\circ"),
            "The tangent of the acute angle is 1, not 1/sqrt(3).",
          ],
        ],
        [
          m("\\tan\\theta=\\left|\\frac{m_2-m_1}{1+m_1m_2}\\right|") +
            " for the acute angle.",
          "Substituting the given slopes makes the absolute quotient 1, so theta=45 degrees.",
        ],
        [
          "Use the angle-between-lines formula.",
          "Keep the denominator 1 plus the slope product.",
          "Take the acute angle from the positive tangent.",
        ],
        3,
      );
      B.mc(
        "A line through " +
          m("(" + a + "," + b + ")") +
          " is parallel to " +
          m("3x+4y=1") +
          ". Its equation is",
        m("3x+4y=" + (3 * a + 4 * b)),
        [
          [
            m("3x+4y=1"),
            "The given point does not satisfy this unchanged constant.",
          ],
          [
            m("4x-3y=" + (4 * a - 3 * b)),
            "This line has perpendicular rather than parallel direction.",
          ],
          [
            m("3x+4y=" + (4 * a + 3 * b)),
            "The coefficients have been applied to the wrong coordinates.",
          ],
        ],
        [
          "A parallel line retains the normal coefficients 3 and 4.",
          "Substitution of the point fixes the right side as " +
            m(3 * a + "+" + 4 * b + "=" + (3 * a + 4 * b)) +
            ".",
        ],
        [
          "Keep the coefficient ratio for a parallel line.",
          "Allow its constant to change.",
          "Use the given point to determine that constant.",
        ],
      );
      B.frq(
        "vsaq",
        "Find the distance from " +
          m("(" + a + "," + b + ")") +
          " to " +
          m("y=" + (b + 4)) +
          ".",
        [
          part(
            "Calculate the perpendicular distance.",
            m(4) + ".",
            "The line is horizontal; subtract its y-coordinate from the point's y-coordinate and take absolute value.",
            "Uses vertical separation.",
            "Takes absolute value.",
          ),
        ],
        [
          "A horizontal line has a constant y-coordinate.",
          "The perpendicular segment is vertical.",
          "Compare the two y-values.",
        ],
        ["Using the x-coordinate in a horizontal-line distance."],
        2,
      );
      B.frq(
        "vsaq",
        "Does " +
          m("(" + a + "," + b + ")") +
          " lie on " +
          m("3x-2y=" + (3 * a - 2 * b)) +
          "?",
        [
          part(
            "Use substitution or distance to justify your answer.",
            "Yes; its distance from the line is zero.",
            "Substitution gives a zero residual: " +
              m(3 * a + "-" + 2 * b + "-(" + (3 * a - 2 * b) + ")=0") +
              ".",
            "Substitutes both coordinates.",
            "Concludes zero distance and membership.",
          ),
        ],
        [
          "Move the constant to the left side.",
          "Substitute the point.",
          "A zero numerator means zero distance.",
        ],
        ["Taking the constant alone as a distance."],
        2,
      );
      B.frq(
        "saq",
        "Find both real values of k for which the distance from the origin to " +
          m("3x+4y=k") +
          " is " +
          m(a) +
          ".",
        [
          part(
            "Determine k.",
            m("k=\\pm" + 5 * a) + ".",
            "The distance formula gives " +
              m("|k|/5=" + a) +
              ", so the absolute value equation has two solutions.",
            "Applies the distance formula.",
            "Forms the absolute-value equation.",
            "Keeps both signs.",
          ),
        ],
        [
          "Use the origin in the distance formula.",
          "Retain the absolute value.",
          "Solve both sign branches.",
        ],
        ["Keeping only the positive line constant."],
      );
      B.frq(
        "laq",
        "Find the line through " +
          m("(" + a + "," + b + ")") +
          " perpendicular to " +
          m("y=2x+1") +
          ".",
        [
          part(
            "Write its equation.",
            m("x+2y=" + (a + 2 * b)) + ".",
            "Its slope is -1/2. Use " +
              m("y-" + b + "=-\\frac12(x-" + a + ")") +
              " and simplify.",
            "Finds the perpendicular slope.",
            "Uses the point.",
          ),
          part(
            "Find the distance from the origin to this line and both axis intercepts.",
            m(f(a + 2 * b, 5) + "\\sqrt5") +
              "; intercepts " +
              m(a + 2 * b) +
              " and " +
              m(f(a + 2 * b, 2)) +
              ".",
            "The distance is " +
              m(a + 2 * b + "/\\sqrt5") +
              ". Set y=0 and x=0 respectively for intercepts.",
            "Normalises the distance by sqrt(5).",
            "Finds the x-intercept.",
            "Finds the y-intercept.",
          ),
        ],
        [
          "First obtain the perpendicular direction.",
          "Use point-slope form to set the line.",
          "Compute distance and intercepts as separate quantities.",
        ],
        ["Treating the line constant as its perpendicular distance."],
      );
      B.frq(
        "case",
        "A triangular plot has base on " +
          m("3x+4y=0") +
          ". The base length is 10 units, and the opposite vertex is " +
          m("(" + a + "," + b + ")") +
          ".",
        [
          part(
            "Find the perpendicular height.",
            m(f(3 * a + 4 * b, 5)) + ".",
            "Use the vertex-to-line distance, with denominator 5.",
            "Uses the correct base line.",
            "Calculates the normalised distance.",
          ),
          part(
            "Find the area of the triangle.",
            m(3 * a + 4 * b) + " square units.",
            "Area is one half times base 10 times the perpendicular height.",
            "Uses perpendicular height in the area formula.",
          ),
          part(
            "The opposite vertex moves along a line parallel to the base. Does the area change? Explain.",
            "No, provided it stays on that fixed parallel line.",
            "Every point on a fixed parallel line is at the same perpendicular distance from the base.",
            "Explains constant height and therefore constant area.",
          ),
        ],
        [
          "The required height is perpendicular to the base.",
          "The point-to-line distance supplies that height.",
          "Parallel lines have constant separation.",
        ],
        ["Using the vertex's distance from the origin as the height."],
      );
    }
  }
  return B.items;
}
