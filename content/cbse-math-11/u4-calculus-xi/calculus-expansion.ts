import { builder } from "../expansion-builder";
import { math as m, part } from "../practice-authoring";

export function calculusExpansion(topic: string) {
  const B = builder({ unit: "u4-calculus-xi", topic, chapter: 12 });
  if (topic === "4.1") {
    B.mc(
      "Evaluate " + m("\\lim_{x\\to3}\\frac{x^2-9}{x-3}") + ".",
      m(6),
      [
        [m(0), "A zero numerator alone does not determine a 0/0 limit."],
        [m(3), "After factoring, the surviving factor is x+3."],
        [
          "The limit does not exist.",
          "The expression is undefined at 3, but its nearby values have a limit.",
        ],
      ],
      [
        "For x not equal to 3, factor and cancel to obtain x+3.",
        "The limit of x+3 as x approaches 3 is 6.",
      ],
      [
        "Factor the numerator.",
        "Cancel only for nearby x different from 3.",
        "Evaluate the simplified expression.",
      ],
      3,
    );
    B.mc(
      "Evaluate " + m("\\lim_{x\\to4}\\frac{\\sqrt{x+5}-3}{x-4}") + ".",
      m("1/6"),
      [
        [
          m(6),
          "Rationalisation gives a reciprocal, not the denominator itself.",
        ],
        [
          m("1/3"),
          "Both square-root terms remain in the rationalised denominator.",
        ],
        [m(0), "The original form is 0/0, not zero."],
      ],
      [
        "Multiply numerator and denominator by " + m("\\sqrt{x+5}+3") + ".",
        "Cancel x-4 to get " + m("1/(\\sqrt{x+5}+3)") + ", whose limit is 1/6.",
      ],
      [
        "Use the conjugate numerator.",
        "Apply the difference of squares.",
        "Evaluate after cancelling the vanishing factor.",
      ],
      3,
    );
    B.mc(
      "If " +
        m("f(x)=\\begin{cases}x+1,&x<2\\\\5-x,&x>2\\end{cases}") +
        ", then " +
        m("\\lim_{x\\to2}f(x)") +
        " is",
      m(3),
      [
        [m(2), "Use the branch values, not the input itself."],
        [m(5), "Neither branch approaches 5."],
        [
          "Undefined because f(2) is missing.",
          "A limit depends on nearby values, not on the value at the point.",
        ],
      ],
      [
        "The left branch approaches 2+1=3.",
        "The right branch approaches 5-2=3. Matching one-sided limits give 3.",
      ],
      [
        "Approach using the correct branch on each side.",
        "Compute both one-sided values.",
        "Compare them.",
      ],
      3,
    );
    B.mc(
      "Evaluate " + m("\\lim_{x\\to-2}(x^3+2x^2-5)") + ".",
      m(-5),
      [
        [m(11), "The cube of -2 is -8, not +8."],
        [m(3), "The cubic and quadratic contributions cancel."],
        [m(0), "The constant term remains after cancellation."],
      ],
      [
        "A polynomial limit is found by substitution.",
        "The value is " + m("-8+8-5=-5") + ".",
      ],
      [
        "A polynomial is continuous at every real input.",
        "Use parentheses for the negative input.",
        "Evaluate powers before adding.",
      ],
    );
    B.frq(
      "vsaq",
      "Evaluate " + m("\\lim_{x\\to2}\\frac{x^2+1}{x+3}") + ".",
      [
        part(
          "Find the limit.",
          m(1) + ".",
          "The denominator approaches 5, not zero, so direct substitution gives 5/5.",
          "Checks the denominator.",
          "Substitutes correctly.",
        ),
      ],
      [
        "Check the denominator at 2.",
        "Direct substitution is valid here.",
        "Reduce the resulting fraction.",
      ],
      ["Treating every rational limit as 0/0."],
      2,
    );
    B.frq(
      "saq",
      "Evaluate " + m("\\lim_{x\\to2}\\frac{x^3-8}{x^2-4}") + ".",
      [
        part(
          "Show the simplification and answer.",
          m(3) + ".",
          "Factor numerator as (x-2)(x squared+2x+4) and denominator as (x-2)(x+2). The remaining quotient approaches 12/4=3.",
          "Factors both polynomials.",
          "Cancels on a punctured neighbourhood.",
          "Evaluates the remaining quotient.",
        ),
      ],
      [
        "Use difference of cubes and difference of squares.",
        "Cancel their common linear factor.",
        "Substitute only after simplification.",
      ],
      ["Cancelling individual terms rather than factors."],
    );
    B.frq(
      "laq",
      "Let " +
        m("g(x)=\\begin{cases}2x+1,&x<1\\\\k,&x=1\\\\4-x,&x>1\\end{cases}") +
        ".",
      [
        part(
          "Find both one-sided limits at 1 and the two-sided limit.",
          "All three limits are 3.",
          "The left branch approaches 2(1)+1=3; the right branch approaches 4-1=3.",
          "Evaluates the left limit.",
          "Evaluates the right limit.",
          "Concludes the common limit.",
        ),
        part(
          "For which value of k does g(1) equal that limit? Does another k change the limit?",
          m("k=3") + ". Another value changes g(1) but not the limit.",
          "The branch values near 1 do not depend on k.",
          "Sets the point value equal to the limit.",
          "Explains why changing one point leaves the limit unchanged.",
        ),
      ],
      [
        "Use only the branches for nearby points.",
        "Compare the two approaches.",
        "Separate the value at the point from the limit.",
      ],
      ["Using k to evaluate all nearby points."],
    );
    B.frq(
      "case",
      "A student substitutes x=5 into " +
        m("(x^2-25)/(x-5)") +
        " and claims the limit is 0.",
      [
        part(
          "Identify the substitution form.",
          m("0/0") + ", which is indeterminate.",
          "Both the numerator and denominator vanish.",
          "Recognises the indeterminate form.",
        ),
        part(
          "Find the limit as x approaches 5.",
          m(10) + ".",
          "For x not equal to 5, factor and cancel to obtain x+5.",
          "Factors correctly.",
          "Evaluates the simplified limit.",
        ),
        part(
          "Can the original quotient be evaluated at x=5?",
          "No.",
          "The original denominator is zero there, even though the limit exists.",
          "Distinguishes value from limit.",
        ),
      ],
      [
        "Evaluate numerator and denominator separately.",
        "Factor the difference of squares.",
        "Keep track of the originally excluded input.",
      ],
      ["Confusing existence of a limit with being defined at its input."],
    );
  } else if (topic === "4.2") {
    B.mc(
      "Angles are in radians. Evaluate " +
        m("\\lim_{x\\to0}\\frac{\\sin5x}{\\sin2x}") +
        ".",
      m("5/2"),
      [
        [
          m("2/5"),
          "The numerator and denominator scale factors have been reversed.",
        ],
        [m(1), "Different angle multipliers do not cancel to one."],
        [m(0), "Both sine terms vanish, so direct division is not valid."],
      ],
      [
        "Write the quotient as " +
          m("\\frac{\\sin5x}{5x}\\frac{2x}{\\sin2x}\\frac52") +
          ".",
        "The two standard-limit factors approach 1.",
      ],
      [
        "Introduce each sine's own argument in a denominator.",
        "Use sin t/t approaching 1.",
        "Retain the ratio of the scale factors.",
      ],
      3,
    );
    B.mc(
      "Evaluate " +
        m("\\lim_{x\\to0}\\frac{1-\\cos x}{x^2}") +
        " for radian x.",
      m("1/2"),
      [
        [m(1), "The half-angle substitution leaves a factor 1/2."],
        [m(2), "The half-angle scale has been inverted."],
        [m(0), "Numerator and denominator both vanish; their rates matter."],
      ],
      [
        "Use " + m("1-\\cos x=2\\sin^2(x/2)") + ".",
        "The expression becomes " +
          m("\\frac12\\left(\\frac{\\sin(x/2)}{x/2}\\right)^2") +
          ".",
      ],
      [
        "Use a half-angle identity.",
        "Form the standard sine limit.",
        "Keep the constant factor.",
      ],
      3,
    );
    B.mc(
      "Evaluate " + m("\\lim_{x\\to0}\\frac{e^{3x}-1}{x}") + ".",
      m(3),
      [
        [m(1), "The inner argument is 3x rather than x."],
        [m("1/3"), "Changing variables introduces a multiplying factor 3."],
        [m(0), "The 0/0 form requires a standard limit."],
      ],
      [
        "Put t=3x.",
        "The expression is " +
          m("3(e^t-1)/t") +
          ", and " +
          m("\\lim_{t\\to0}(e^t-1)/t=1") +
          ".",
      ],
      [
        "Use the standard exponential limit.",
        "Replace 3x by a single variable.",
        "Retain the scale factor outside.",
      ],
      3,
    );
    B.mc(
      "Evaluate " + m("\\lim_{x\\to0}\\frac{\\ln(1+4x)}{x}") + ".",
      m(4),
      [
        [m(1), "The logarithm's increment is 4x."],
        [m("1/4"), "The factor from rescaling the denominator is 4."],
        [m("\\ln 4"), "This is a logarithmic increment near 1, not ln(4x)."],
      ],
      [
        "Set t=4x and rewrite as " + m("4\\ln(1+t)/t") + ".",
        "Use the standard natural-logarithm limit, equal to 1.",
      ],
      [
        "Identify the increment above 1.",
        "Use the natural-logarithm standard limit.",
        "Keep the increment-to-x ratio.",
      ],
      3,
    );
    B.frq(
      "vsaq",
      "Evaluate " + m("\\lim_{x\\to0}\\frac{\\sin7x}{7x}") + " in radians.",
      [
        part(
          "State the limit.",
          m(1) + ".",
          "The numerator's angle is exactly the denominator variable in the standard sine limit.",
          "Identifies the matching argument.",
          "Applies the standard limit.",
        ),
      ],
      ["Put t=7x.", "Then t also tends to zero.", "Use sin t/t."],
      ["Multiplying by 7 when numerator and denominator already match."],
      2,
    );
    B.frq(
      "saq",
      "Evaluate " +
        m("\\lim_{x\\to0}\\frac{\\tan3x}{\\sin4x}") +
        " in radians.",
      [
        part(
          "Show the factors and answer.",
          m("3/4") + ".",
          "Write tangent as sine/cosine, then use " +
            m("\\frac{\\sin3x}{3x}\\frac{4x}{\\sin4x}\\frac{3}{4\\cos3x}") +
            ". Each trigonometric limit factor tends to 1.",
          "Rewrites tangent.",
          "Forms matching standard limits.",
          "Retains the 3/4 scale.",
        ),
      ],
      [
        "Replace tangent by sine over cosine.",
        "Separate the two standard sine limits.",
        "Cosine tends to one.",
      ],
      ["Dropping the ratio of argument multipliers."],
    );
    B.frq(
      "laq",
      "Evaluate " +
        m("\\lim_{x\\to0}\\frac{1-\\cos6x}{1-\\cos2x}") +
        " in radians.",
      [
        part(
          "Rewrite using half-angle identities.",
          m("\\frac{\\sin^23x}{\\sin^2x}") + ".",
          "Both numerator and denominator have a factor 2 which cancels.",
          "Applies both half-angle identities.",
          "Cancels the common constant.",
        ),
        part(
          "Find the limit and explain why it is not the ratio 6/2.",
          m(9) + ".",
          "The remaining expression is the square of sin(3x)/sin x; its limit is the square of 3. The original cosine differences vanish quadratically.",
          "Evaluates the sine quotient limit.",
          "Squares the limit.",
          "Explains the quadratic scale.",
        ),
      ],
      [
        "Use 1-cos t = 2 sin squared(t/2).",
        "Factor the result as a squared quotient.",
        "Take the square after evaluating its limit.",
      ],
      ["Using the linear angle ratio for a squared expression."],
    );
    B.frq(
      "case",
      "Near x=0, consider " + m("H(x)=\\frac{\\ln(1+2x)}{e^{5x}-1}") + ".",
      [
        part(
          "Find " + m("\\lim_{x\\to0}\\ln(1+2x)/x") + ".",
          m(2) + ".",
          "Use the standard logarithm limit with increment 2x.",
          "Includes the logarithm scale.",
        ),
        part(
          "Find " + m("\\lim_{x\\to0}(e^{5x}-1)/x") + ".",
          m(5) + ".",
          "Use the standard exponential limit with argument 5x.",
          "Includes the exponential scale.",
        ),
        part(
          "Hence find the limit of H and state why the quotient law applies to these transformed factors.",
          m("2/5") + ".",
          "Divide both original numerator and denominator by x for x not zero. The transformed denominator tends to nonzero 5.",
          "Rewrites as a quotient of the two factors.",
          "Uses a nonzero limiting denominator.",
        ),
      ],
      [
        "Divide numerator and denominator by x.",
        "Use each standard limit separately.",
        "Check the denominator's limiting value is nonzero.",
      ],
      ["Applying the quotient law directly to two zero limits."],
    );
  } else if (topic === "4.3") {
    B.mc(
      "For " +
        m("f(x)=x^2+3x") +
        ", the quotient " +
        m("[f(2+h)-f(2)]/h") +
        ", h not zero, equals",
      m("7+h"),
      [
        [
          m("7"),
          "This is the limiting derivative after h tends to zero, not the finite quotient.",
        ],
        [m("4+h"), "The linear term contributes an additional 3."],
        [m("h"), "The constant-in-h slope contributions do not cancel."],
      ],
      ["Expand f(2+h)-f(2)=7h+h squared.", "Divide by h to obtain 7+h."],
      [
        "Expand the shifted polynomial.",
        "Subtract the entire original value.",
        "Cancel the common h factor.",
      ],
      3,
    );
    B.mc(
      "The derivative of a constant function " + m("f(x)=11") + " is",
      m(0),
      [
        [m(11), "The constant value is not its rate of change."],
        [m(1), "Only the identity function has derivative 1."],
        [
          "Undefined",
          "The constant difference quotient is identically zero for nonzero h.",
        ],
      ],
      [
        "The numerator f(x+h)-f(x) is 11-11=0.",
        "Its quotient by nonzero h is zero, so the limit is zero.",
      ],
      [
        "Compare the function at two inputs.",
        "Its value does not change.",
        "Take the limit of the resulting zero quotient.",
      ],
    );
    B.mc(
      "For " + m("f(x)=1/x") + ", the derivative at " + m("x=2") + " is",
      m("-1/4"),
      [
        [m("1/4"), "The reciprocal function is decreasing at positive inputs."],
        [m("-1/2"), "The denominator is squared in the derivative."],
        [m(2), "The input is not the derivative."],
      ],
      [
        "The difference quotient simplifies to " + m("-1/[x(x+h)]") + ".",
        "Its limit is -1/x squared, giving -1/4 at x=2.",
      ],
      [
        "Subtract the two fractions.",
        "Factor and cancel h.",
        "Evaluate after taking the limit.",
      ],
      3,
    );
    B.mc(
      "For " + m("f(x)=|x|") + ", the derivative at 0",
      "does not exist",
      [
        [
          m("0"),
          "The graph's symmetry does not make the two one-sided slopes equal.",
        ],
        [m("1"), "This is only the right-hand derivative."],
        [m("-1"), "This is only the left-hand derivative."],
      ],
      [
        "The quotient at zero is " + m("|h|/h") + ".",
        "It equals 1 for positive h and -1 for negative h, so no common limit exists.",
      ],
      [
        "Use the derivative definition at zero.",
        "Consider positive and negative h separately.",
        "Compare the two limits.",
      ],
      3,
    );
    B.frq(
      "vsaq",
      "Let " + m("f(x)=4x-7") + ".",
      [
        part(
          "Find the derivative from the difference quotient.",
          m("f'(x)=4") + ".",
          "The numerator is 4h, and division by h gives 4 for every nonzero h.",
          "Forms the increment.",
          "Takes its quotient and limit.",
        ),
      ],
      ["Compute f(x+h).", "Subtract f(x).", "Only a multiple of h remains."],
      ["Differentiating the constant into a nonzero term."],
      2,
    );
    B.frq(
      "saq",
      "Derive the derivative of " + m("f(x)=x^3") + " from first principles.",
      [
        part(
          "Show the limit calculation.",
          m("f'(x)=3x^2") + ".",
          "Expand (x+h) cubed - x cubed =3x squared h+3xh squared+h cubed. Divide by h and let h tend to zero.",
          "Expands the cubic increment.",
          "Cancels h.",
          "Takes the limit of the remaining polynomial.",
        ),
      ],
      [
        "Use the cubic expansion.",
        "Every remaining term contains h.",
        "Cancel before letting h tend to zero.",
      ],
      ["Substituting h=0 before cancelling the common factor."],
    );
    B.frq(
      "laq",
      "For " + m("f(x)=2x^2-x+3") + ", use first principles.",
      [
        part(
          "Derive f'(x).",
          m("4x-1") + ".",
          "The increment is (4x-1)h+2h squared. Dividing by h gives 4x-1+2h, whose limit is 4x-1.",
          "Computes f(x+h).",
          "Subtracts f(x) and factors h.",
          "Takes the correct limit.",
        ),
        part(
          "Find the derivative at x=-1 and the point where the tangent slope is zero.",
          m("f'(-1)=-5") + "; zero slope at " + m("x=1/4") + ".",
          "Substitute -1 in the derivative; solve 4x-1=0 for the horizontal tangent input.",
          "Evaluates the derivative.",
          "Solves the zero-slope condition.",
        ),
      ],
      [
        "Keep all terms when substituting x+h.",
        "Collect terms by powers of h.",
        "Use the derivative expression for both follow-up parts.",
      ],
      ["Solving f(x)=0 instead of f'(x)=0 for a horizontal tangent."],
    );
    B.frq(
      "case",
      "A student says the derivative of " +
        m("f(x)=x^2") +
        " at x=3 is " +
        m("(f(4)-f(3))/(4-3)=7") +
        ".",
      [
        part(
          "What does the student's value represent?",
          "The secant slope between inputs 3 and 4.",
          "The input increment is fixed at 1 instead of tending to zero.",
          "Identifies an average rather than instantaneous slope.",
        ),
        part(
          "Find the slope for a general nonzero increment h.",
          m("6+h") + ".",
          "Expand " + m("((3+h)^2-9)/h") + " and cancel h.",
          "Expands the increment.",
          "Simplifies the quotient.",
        ),
        part(
          "Find the derivative at 3.",
          m(6) + ".",
          "Let h tend to zero in 6+h.",
          "Takes the limiting slope.",
        ),
      ],
      [
        "A derivative uses shrinking input increments.",
        "Replace the fixed increment by h.",
        "Take the limit only after simplifying.",
      ],
      ["Equating a single secant slope with the tangent slope."],
    );
  } else if (topic === "4.4") {
    B.mc(
      "The tangent slope of " + m("y=x^2-4x+1") + " at x=3 is",
      m(2),
      [
        [m(-2), "This is the curve's y-value at x=3, not the slope."],
        [m(6), "The derivative of -4x must also be included."],
        [m(3), "The input value is not the slope."],
      ],
      ["Differentiate to obtain dy/dx=2x-4.", "At x=3 this equals 2."],
      [
        "Slope comes from the derivative.",
        "Differentiate every variable term.",
        "Then substitute the point's input.",
      ],
    );
    B.mc(
      "A particle's position is " +
        m("s(t)=t^2+3t") +
        " metres. Its instantaneous velocity at t=4 seconds is",
      m("11\\,\\text{m s}^{-1}"),
      [
        [
          m("28\\,\\text{m s}^{-1}"),
          "This is the numerical position, with the wrong units for velocity.",
        ],
        [
          m("7\\,\\text{m s}^{-1}"),
          "This is average velocity from 0 to 4, not instantaneous velocity.",
        ],
        [m("8\\,\\text{m s}^{-1}"), "The derivative of 3t has been omitted."],
      ],
      ["Velocity is s'(t)=2t+3.", "At t=4 it is 11 metres per second."],
      [
        "Velocity is the rate of change of position.",
        "Differentiate with respect to time.",
        "Evaluate at the specified time.",
      ],
    );
    B.mc(
      "At which input does " + m("y=x^2-6x+5") + " have a horizontal tangent?",
      m(3),
      [
        [m(1), "This is a zero of the function, not its derivative."],
        [m(5), "This is the other zero of the function."],
        [m(6), "Solve 2x-6=0, not x-6=0."],
      ],
      [
        "A horizontal tangent has slope zero.",
        "The derivative is 2x-6, which vanishes at x=3.",
      ],
      [
        "Write the derivative.",
        "Set the slope, not the y-value, equal to zero.",
        "Solve for x.",
      ],
      3,
    );
    B.mc(
      "The tangent to " + m("y=x^3") + " at x=-1 has slope",
      m(3),
      [
        [
          m(-3),
          "The derivative involves x squared, so the slope is positive here.",
        ],
        [m(-1), "This is the function value."],
        [m(1), "The coefficient 3 in the power rule is missing."],
      ],
      [
        "The derivative is 3x squared.",
        "At -1, the square equals 1 and the slope equals 3.",
      ],
      [
        "Differentiate the cubic.",
        "Square the negative input.",
        "Multiply by 3.",
      ],
    );
    B.frq(
      "vsaq",
      "For " + m("y=5x+2") + ", find the slope at x=100.",
      [
        part(
          "State the slope.",
          m(5) + ".",
          "A straight line has constant derivative equal to its x-coefficient.",
          "Recognises a constant slope.",
          "Gives the coefficient 5.",
        ),
      ],
      [
        "The graph is a straight line.",
        "Its slope does not depend on the input.",
        "Read the coefficient of x.",
      ],
      ["Substituting the input into the original function to find slope."],
      2,
    );
    B.frq(
      "saq",
      "Find the equation of the tangent to " + m("y=x^2+1") + " at x=2.",
      [
        part(
          "Determine the tangent line.",
          m("y=4x-3") + ".",
          "The point is (2,5), and the derivative there is 4. Thus y-5=4(x-2).",
          "Finds the point on the curve.",
          "Finds the tangent slope.",
          "Uses point-slope form correctly.",
        ),
      ],
      [
        "Find both the slope and the point.",
        "Use the derivative for the slope.",
        "Use the original function for the point's y-coordinate.",
      ],
      ["Using the derivative value as the point's y-coordinate."],
    );
    B.frq(
      "laq",
      "A displacement is modelled by " +
        m("s(t)=t^2-4t+6") +
        " metres for t at least zero.",
      [
        part(
          "Find average velocity from t=1 to t=3.",
          m("0\\,\\text{m s}^{-1}") + ".",
          "Both endpoint positions equal 3 metres, so their difference divided by 2 seconds is zero.",
          "Evaluates both endpoint positions.",
          "Computes the average velocity.",
        ),
        part(
          "Find instantaneous velocities at t=1 and t=3, and the time when the velocity is zero.",
          m("-2,\\ 2") +
            " metres per second; zero at " +
            m("t=2\\,\\text{s}") +
            ".",
          "Differentiate to get v(t)=2t-4. Evaluate and solve v=0.",
          "Finds the derivative.",
          "Evaluates both signed velocities.",
          "Finds the zero-velocity time.",
        ),
      ],
      [
        "Average velocity uses two positions.",
        "Instantaneous velocity uses the derivative.",
        "A zero average does not imply zero velocity throughout.",
      ],
      ["Confusing zero net displacement with no motion."],
    );
    B.frq(
      "case",
      "Consider " + m("y=x^2") + " and the straight line " + m("y=6x-8") + ".",
      [
        part(
          "Find the input where the curve's tangent is parallel to the line.",
          m("x=3") + ".",
          "The curve slope is 2x; set it equal to the line slope 6.",
          "Equates the slopes.",
        ),
        part(
          "Find the tangent's contact point.",
          m("(3,9)") + ".",
          "Use y=x squared at x=3.",
          "Evaluates the curve, not the given line.",
        ),
        part(
          "Find the tangent equation and decide whether it is the given line.",
          m("y=6x-9") + ". It is distinct but parallel.",
          "Point-slope form gives y-9=6(x-3). Its intercept differs from -8.",
          "Finds the tangent equation.",
          "Compares intercepts as well as slopes.",
        ),
      ],
      [
        "Parallel lines have the same slope.",
        "Find the point using the curve equation.",
        "Equal slopes alone do not mean equal lines.",
      ],
      ["Assuming the supplied parallel line is itself the tangent."],
    );
  } else if (topic === "4.5") {
    B.mc(
      "Differentiate " + m("x^2\\sin x") + ".",
      m("2x\\sin x+x^2\\cos x"),
      [
        [
          m("2x\\cos x"),
          "The derivative of a product is not the product of the derivatives.",
        ],
        [m("x^2\\cos x"), "This omits differentiation of x squared."],
        [
          m("2x\\sin x-x^2\\cos x"),
          "The derivative of sine is positive cosine.",
        ],
      ],
      [
        "Use the product rule u'v+uv'.",
        "Differentiate x squared and sine separately.",
      ],
      [
        "There are two factors depending on x.",
        "Differentiate one factor at a time.",
        "Add the two contributions.",
      ],
      3,
    );
    B.mc(
      "For x not equal to zero, differentiate " + m("\\frac{x^2+1}{x}") + ".",
      m("1-1/x^2"),
      [
        [m("1+1/x^2"), "The derivative of 1/x is negative."],
        [m(2), "The quotient rule does not divide the derivatives."],
        [m("2x-1"), "This does not account for the denominator."],
      ],
      ["Rewrite as x+1/x.", "Differentiate to obtain 1-1/x squared."],
      [
        "Simplify the quotient first.",
        "Differentiate the two summands.",
        "Retain the excluded input x=0.",
      ],
    );
    B.mc(
      "Differentiate " + m("3\\sin x-2\\cos x") + ".",
      m("3\\cos x+2\\sin x"),
      [
        [
          m("3\\cos x-2\\sin x"),
          "The derivative of negative cosine is positive sine.",
        ],
        [m("-3\\cos x+2\\sin x"), "The derivative of sine is positive cosine."],
        [
          m("3\\sin x+2\\cos x"),
          "The function types must change under differentiation.",
        ],
      ],
      [
        "Apply linearity.",
        "Use derivative(sin x)=cos x and derivative(cos x)=-sin x.",
      ],
      [
        "Differentiate each term separately.",
        "Keep the outside coefficients.",
        "Multiply the two minus signs in the cosine term.",
      ],
    );
    B.mc(
      "Using the quotient rule, the derivative of " + m("\\tan x") + " is",
      m("\\sec^2x"),
      [
        [m("\\csc^2x"), "This is not the reciprocal cosine squared."],
        [m("-\\sec^2x"), "Tangent's derivative is positive where defined."],
        [m(1), "The denominator cosine squared remains after simplification."],
      ],
      [
        "Write tan x=sin x/cos x.",
        "The quotient rule gives " +
          m("(\\cos^2x+\\sin^2x)/\\cos^2x=\\sec^2x") +
          ".",
      ],
      [
        "Express tangent as sine divided by cosine.",
        "Use the quotient rule with its minus sign.",
        "Simplify the numerator with the Pythagorean identity.",
      ],
      3,
    );
    B.frq(
      "vsaq",
      "Differentiate " + m("4x^3-5x^2+7") + ".",
      [
        part(
          "Find the derivative.",
          m("12x^2-10x") + ".",
          "Apply the power rule to each variable term; the constant has derivative zero.",
          "Differentiates both powers.",
          "Drops only the constant term.",
        ),
      ],
      [
        "Apply the power rule term by term.",
        "Reduce each exponent by one.",
        "The derivative of a constant is zero.",
      ],
      ["Keeping the constant 7 in the derivative."],
      2,
    );
    B.frq(
      "saq",
      "Differentiate " + m("(x+1)(x^2-2x+3)") + " in two ways.",
      [
        part(
          "Show agreement between expansion and the product rule.",
          m("3x^2-2x+1") + ".",
          "Expansion gives x cubed-x squared+x+3. Alternatively, the product rule gives (x squared-2x+3)+(x+1)(2x-2); both simplify to the stated result.",
          "Differentiates the expanded polynomial.",
          "Applies the product rule correctly.",
          "Simplifies both to the same expression.",
        ),
      ],
      [
        "Expand once as a check.",
        "Use one differentiated factor per product-rule term.",
        "Compare after collecting like powers.",
      ],
      ["Omitting one product-rule term."],
    );
    B.frq(
      "laq",
      "Let " + m("f(x)=\\frac{x^2+1}{x-1}") + ", for x not equal to 1.",
      [
        part(
          "Find f'(x).",
          m("\\frac{x^2-2x-1}{(x-1)^2}") + ".",
          "The quotient-rule numerator is 2x(x-1)-(x squared+1), and the denominator is (x-1) squared.",
          "Uses the quotient rule in the correct order.",
          "Squares the denominator.",
          "Simplifies the numerator.",
        ),
        part(
          "Find the tangent slope at x=2 and the tangent equation.",
          m("-1") + " and " + m("y=-x+7") + ".",
          "At x=2, f=5 and f'=-1. Use y-5=-(x-2).",
          "Finds the point and slope.",
          "Writes the tangent equation.",
        ),
      ],
      [
        "Use denominator times derivative of numerator minus numerator times derivative of denominator.",
        "Do not cancel across sums.",
        "Evaluate the function and derivative separately.",
      ],
      ["Reversing the quotient-rule numerator."],
      3,
    );
    B.frq(
      "case",
      "A student differentiates " +
        m("f(x)=x\\cos x") +
        " as " +
        m("-\\sin x") +
        ".",
      [
        part(
          "Identify the error.",
          "The student multiplied the two derivatives instead of using the product rule.",
          "Both x and cosine vary with x, so two terms are needed.",
          "Names the incorrect operation.",
        ),
        part(
          "Find the correct derivative.",
          m("\\cos x-x\\sin x") + ".",
          "Apply " + m("(uv)'=u'v+uv'") + ".",
          "Includes the derivative-of-x term.",
          "Includes the derivative-of-cosine term.",
        ),
        part(
          "Find f'(0).",
          m(1) + ".",
          "Substitute cosine(0)=1 and sine(0)=0.",
          "Evaluates the corrected derivative.",
        ),
      ],
      [
        "Both factors depend on x.",
        "The product rule is a sum of two terms.",
        "Check at a standard angle.",
      ],
      ["Multiplying derivatives of factors."],
    );
  } else throw new Error("Unknown calculus topic " + topic);
  return B.items;
}
