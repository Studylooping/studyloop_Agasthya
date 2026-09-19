import type { VideoSelection } from "@/lib/video-lessons";

// Hindi/Hinglish mathematical supplements for AP Calculus AB. Most sources
// teach reusable CBSE/JEE or university calculus, not the AP course format.
export const CALCULUS_HINDI_VIDEOS: VideoSelection[] = [
  {
    videoId: "RVNfTqGeyjM",
    courseSlug: "calc-ab",
    unitSlug: "u1-limits",
    topicCodes: ["1.1", "1.8", "1.10", "1.11", "1.12", "1.13", "1.14", "1.15"],
    language: "hi",
    focus: "Limits, continuity and differentiability",
    format: "revision",
    coverage:
      "Hindi-medium JEE one-shot for limits, continuity and differentiability. Mapped only to reusable limit, discontinuity, continuity and asymptote mathematics; it is not mapped to AP graph/table estimation or multiple-representation topics.",
  },
  {
    videoId: "kBRP_oXwjxQ",
    courseSlug: "calc-ab",
    unitSlug: "u1-limits",
    topicCodes: ["1.8"],
    language: "hi",
    focus: "Squeeze theorem",
    format: "lesson",
    coverage:
      "Hindi/Urdu worked lesson on the squeeze, or sandwich, theorem for limits. This is reusable calculus teaching rather than AP-specific presentation.",
  },
  {
    videoId: "vFg20NZiq7M",
    courseSlug: "calc-ab",
    unitSlug: "u1-limits",
    topicCodes: ["1.16"],
    language: "hi",
    focus: "Intermediate value theorem",
    format: "lesson",
    coverage:
      "Hindi Class 12/JEE lesson dedicated to the intermediate value theorem. Apply the theorem to AP-style existence arguments in StudyLoop practice.",
  },
  {
    videoId: "PBg4P0XFtXo",
    courseSlug: "calc-ab",
    unitSlug: "u2-differentiation",
    topicCodes: ["2.4"],
    language: "hi",
    focus: "Derivative estimates, differentiability and continuity",
    format: "revision",
    coverage:
      "Hindi/Hinglish continuity-and-differentiability chapter revision supporting derivative existence and differentiability versus continuity. It is not mapped to AP numerical derivative estimation.",
  },
  {
    videoId: "PBg4P0XFtXo",
    courseSlug: "calc-ab",
    unitSlug: "u3-comp-implicit",
    topicCodes: ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"],
    language: "hi",
    focus: "Composite, implicit and inverse differentiation",
    format: "revision",
    coverage:
      "Full Hindi/Hinglish Class 12 continuity-and-differentiability revision, reused for chain-rule, implicit, inverse, inverse-trigonometric and higher-derivative procedures. It is NCERT/board-oriented rather than AP-specific.",
  },
  {
    videoId: "jOVcucQLv38",
    courseSlug: "calc-ab",
    unitSlug: "u4-contextual-app",
    topicCodes: ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"],
    language: "hi",
    focus: "Contextual applications of derivatives",
    format: "revision",
    coverage:
      "Hindi/Hinglish JEE applications-of-derivatives one-shot supporting rates, motion interpretation, related-rate setups and approximation. It is not mapped to L'Hospital's rule, and AP written contextual interpretation remains a StudyLoop practice task.",
  },
  {
    videoId: "jOVcucQLv38",
    courseSlug: "calc-ab",
    unitSlug: "u5-analytical-app",
    topicCodes: ["5.2", "5.3", "5.4", "5.5", "5.6", "5.7", "5.10", "5.11"],
    language: "hi",
    focus: "Analytical applications of derivatives",
    format: "revision",
    coverage:
      "Hindi/Hinglish JEE applications-of-derivatives lesson mapped to extrema, monotonicity, first- and second-derivative tests, concavity and optimization. It is not mapped to MVT, full function-derivative graph synthesis or implicit-relation behavior.",
  },
  {
    videoId: "_SfzOlpmxw4",
    courseSlug: "calc-ab",
    unitSlug: "u6-integration",
    topicCodes: ["6.2", "6.3", "6.4"],
    language: "hi",
    focus: "Riemann integrals and the fundamental theorem of calculus",
    format: "lesson",
    coverage:
      "Urdu/Hindi university lesson whose description explicitly reviews Riemann sums and integrals, states both parts of the fundamental theorem and connects differentiation with integration. It is not mapped to AP accumulation-function interpretation topics.",
  },
  {
    videoId: "drAYy4xUwwY",
    courseSlug: "calc-ab",
    unitSlug: "u6-integration",
    topicCodes: ["6.10"],
    language: "hi",
    focus: "Integration using polynomial long division",
    format: "lesson",
    coverage:
      "Hindi advanced-calculus lesson explicitly focused on integration after long division. Completing-the-square cases are not promised by this clip and should be learned from StudyLoop's worked problems.",
  },
  {
    videoId: "GGIrKkkbYbE",
    courseSlug: "calc-ab",
    unitSlug: "u7-diff-eqs",
    topicCodes: ["7.3", "7.4"],
    language: "hi",
    focus: "Direction fields for differential equations",
    format: "lesson",
    coverage:
      "B.Sc. differential-equations lesson dedicated to direction fields, reusable for sketching and qualitative reasoning. AP slope-field notation and exam prompts remain a separate practice layer.",
  },
  {
    videoId: "NlvWOKs8mjk",
    courseSlug: "calc-ab",
    unitSlug: "u8-app-integration",
    topicCodes: ["8.1"],
    language: "hi",
    focus: "Average value of a function",
    format: "lesson",
    coverage:
      "Class 12 definite-integration lesson explicitly covering average value of a function. It is mathematical preparation rather than AP-specific instruction.",
  },
  {
    videoId: "9Q3U2lw4loM",
    courseSlug: "calc-ab",
    unitSlug: "u8-app-integration",
    topicCodes: ["8.9", "8.10", "8.11", "8.12"],
    language: "hi",
    focus: "Disk and washer methods",
    format: "lesson",
    coverage:
      "Urdu/Hindi lesson explicitly covering volumes of solids of revolution with disk and washer methods. It supports rotation around standard and shifted axes but is not organized around AP unit labels.",
  },
];
