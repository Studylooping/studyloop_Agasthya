import katex from "katex";
import { cn } from "@/lib/utils";

interface MathProps {
  /** LaTeX source, without $...$ delimiters. */
  tex: string;
  /** Display style (block, centered) vs inline. */
  display?: boolean;
  className?: string;
  /** ARIA label fallback if MathML rendering isn't available to the screen reader. */
  ariaLabel?: string;
}

/**
 * Server-side KaTeX renderer. Returns HTML + MathML so screen readers can
 * announce the expression even if KaTeX's HTML rendering is the visible
 * output. Per DESIGN_SPEC.md §3: "KaTeX configured with output: 'htmlAndMathml'
 * so screen readers receive MathML."
 *
 * Safe in Server Components because katex runs at build/render time, not in
 * the browser.
 */
export function Tex({ tex, display = false, className, ariaLabel }: MathProps) {
  let html: string;
  try {
    html = katex.renderToString(tex, {
      displayMode: display,
      throwOnError: false,
      output: "htmlAndMathml",
      strict: "ignore",
      trust: false,
    });
  } catch {
    // Fall back to plain text so a malformed expression doesn't kill the page.
    html = `<span class="text-destructive">[math error]</span>`;
  }

  const Tag = display ? "div" : "span";
  return (
    <Tag
      className={cn(display && "my-3 overflow-x-auto", className)}
      aria-label={ariaLabel}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Render a string that may contain inline math wrapped in $...$.
 * Splits on `$`, renders odd-indexed segments as inline math.
 *
 * Example: "If $f(x) = x^2$, what is $f(3)$?"
 */
export function MixedMath({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const textCommandSegments = splitLatexTextCommands(text);
  if (!hasInlineMathDelimiter(text) && textCommandSegments) {
    return (
      <span className={className}>
        {renderSegments(textCommandSegments)}
      </span>
    );
  }

  if (!hasInlineMathDelimiter(text) && looksLikeLatex(text)) {
    return <Tex tex={text} display={false} className={className} />;
  }

  const parts = splitInlineMath(text);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.kind === "text" ? (
          <span key={i}>{part.value.replace(/\\\$/g, "$")}</span>
        ) : (
          <Tex key={i} tex={part.value} display={false} />
        ),
      )}
    </span>
  );
}

export function QuestionStem({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (hasInlineMathDelimiter(text)) {
    return <MixedMath text={text} className={className} />;
  }

  if (hasLatexEnvironment(text)) {
    return <Tex tex={text} display className={className} />;
  }

  const textCommandSegments = splitLatexTextCommands(text);
  if (textCommandSegments) {
    return (
      <span className={cn("whitespace-normal break-words", className)}>
        {renderSegments(textCommandSegments)}
      </span>
    );
  }

  if (!looksLikeProseStem(text)) {
    return <Tex tex={text} display className={className} />;
  }

  const segments = splitHybridQuestion(text);

  return (
    <span className={cn("whitespace-normal break-words", className)}>
      {segments.map((part, index) =>
        part.kind === "math" ? (
          <Tex key={index} tex={part.value} display={false} />
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </span>
  );
}

type MathSegment = { kind: "text" | "math"; value: string };

function renderSegments(segments: MathSegment[]) {
  return segments.map((part, index) =>
    part.kind === "math" ? (
      <Tex key={index} tex={part.value} display={false} />
    ) : (
      <span key={index}>{part.value}</span>
    ),
  );
}

function hasInlineMathDelimiter(text: string) {
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "$" && text[i - 1] !== "\\") return true;
  }
  return false;
}

function hasLatexEnvironment(text: string) {
  return /\\begin\{(?:array|aligned|cases|matrix|pmatrix|bmatrix|vmatrix|Vmatrix)\}/.test(
    text,
  );
}

function looksLikeLatex(text: string) {
  return /\\(?:text|frac|dfrac|lim|begin|left|right|sqrt|infty|pi|to|sin|cos|tan|sec|csc|cot|ln|log|arcsin|arccos|arctan|cdot|quad|le|ge|ne|pm|int|sum|hline|array|displaystyle|Delta|delta|Rightarrow)/.test(
    text,
  );
}

function looksLikeProseStem(text: string) {
  return (
    /\s/.test(text) &&
    /\b(?:A|How|If|In|Let|On|For|Find|The|Then|Which|Suppose|Restricted|defined|define|number|sets?|functions?|relations?)\b/i.test(
      text,
    )
  );
}

function splitLatexTextCommands(text: string): MathSegment[] | null {
  if (!text.includes("\\text{")) return null;

  const segments: MathSegment[] = [];
  let mathBuffer = "";
  let i = 0;

  const append = (kind: "text" | "math", value: string) => {
    if (!value) return;
    const previous = segments[segments.length - 1];
    if (previous?.kind === kind) {
      previous.value += value;
    } else {
      segments.push({ kind, value });
    }
  };

  const push = (kind: "text" | "math", rawValue: string) => {
    if (kind === "text") {
      append("text", normalizeTextCommand(rawValue));
      return;
    }

    const value = normalizeMathCommand(rawValue);
    if (value.prefix) append("text", value.prefix);
    append("math", value.math);
    if (value.suffix) append("text", value.suffix);
  };

  while (i < text.length) {
    if (text.startsWith("\\text{", i)) {
      push("math", mathBuffer);
      mathBuffer = "";

      const body = readBalancedTextCommand(text, i + "\\text".length);
      if (!body) {
        mathBuffer += text[i];
        i += 1;
        continue;
      }

      push("text", body.value);
      i = body.endIndex;
      continue;
    }

    mathBuffer += text[i];
    i += 1;
  }

  push("math", mathBuffer);
  return segments.length > 0 ? segments : null;
}

function readBalancedTextCommand(
  text: string,
  braceIndex: number,
): { value: string; endIndex: number } | null {
  if (text[braceIndex] !== "{") return null;

  let depth = 0;
  let value = "";

  for (let i = braceIndex; i < text.length; i += 1) {
    const character = text[i];
    const escaped = text[i - 1] === "\\";

    if (character === "{" && !escaped) {
      depth += 1;
      if (depth > 1) value += character;
      continue;
    }

    if (character === "}" && !escaped) {
      depth -= 1;
      if (depth === 0) return { value, endIndex: i + 1 };
      value += character;
      continue;
    }

    value += character;
  }

  return null;
}

function normalizeTextCommand(text: string) {
  return text
    .replace(/\\(?: |,|;|:|quad|qquad)/g, " ")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\&/g, "&")
    .replace(/\\%/g, "%");
}

function normalizeMathCommand(text: string) {
  let value = text;
  let prefix = "";
  let suffix = "";

  if (/^\s*\\(?:\s|,|;|:|quad|qquad)/.test(value)) {
    prefix = " ";
    value = value.replace(/^(?:\s*\\(?:\s|,|;|:|quad|qquad))+/, "");
  }

  if (/\\(?:\s|,|;|:|quad|qquad)\s*$/.test(value)) {
    suffix = " ";
    value = value.replace(/(?:\\(?:\s|,|;|:|quad|qquad)\s*)+$/, "");
  }

  return { math: value.trim(), prefix, suffix };
}

function splitInlineMath(text: string) {
  const parts: MathSegment[] = [];
  let value = "";
  let inMath = false;

  for (let i = 0; i < text.length; i += 1) {
    const character = text[i];
    if (character === "$" && text[i - 1] !== "\\") {
      parts.push({ kind: inMath ? "math" : "text", value });
      value = "";
      inMath = !inMath;
    } else {
      value += character;
    }
  }

  parts.push({ kind: inMath ? "math" : "text", value });
  return parts;
}

function splitHybridQuestion(text: string) {
  const segments: MathSegment[] = [];
  let i = 0;

  const push = (kind: "text" | "math", value: string) => {
    if (!value) return;
    const previous = segments[segments.length - 1];
    if (previous?.kind === kind) {
      previous.value += value;
    } else {
      segments.push({ kind, value });
    }
  };

  while (i < text.length) {
    const rest = text.slice(i);
    if (rest.startsWith("\\ ") || rest.startsWith("\\,")) {
      push("text", " ");
      i += 2;
      continue;
    }

    const math = readMathChunk(rest);
    if (math) {
      push("math", math.value);
      i += math.length;
      continue;
    }

    push("text", text[i]);
    i += 1;
  }

  return segments;
}

function readMathChunk(text: string): { value: string; length: number } | null {
  const pipeMatch = text.match(/^\|[^|]+\|(?:\s*[=<>]\s*[-+]?\d+(?:\.\d+)?(?:\/\d+)?)?/);
  if (pipeMatch) return trimTrailingPunctuation(pipeMatch[0]);

  const setMatch = text.match(/^\\\{.*?\\\}/);
  if (setMatch) return trimTrailingPunctuation(setMatch[0]);

  const commandExpression = text.match(
    /^(?:[A-Za-z]\s*[:=])?\\(?:mathbb|dfrac|frac|sqrt|operatorname|underbrace)[^,.;?]*/,
  );
  if (commandExpression) return trimTrailingPunctuation(commandExpression[0]);

  const relationExpression = text.match(
    /^(?:[A-Za-z]\([^)]*\)|\([^)]+\)\(x\)|f\^\{?\d+\}?\(x\)|f\^\{-1\}\(x\)|[fg]\s*\\circ\s*[fg])\s*=\s*[^,.;?]*/,
  );
  if (relationExpression) return trimTrailingPunctuation(relationExpression[0]);

  const cardinalityExpression = text.match(
    /^[A-Z](?:,[A-Z]){1,},?|^[A-Z]\\(?:cup|cap|setminus|triangle)\s*[A-Z](?:\s*=\s*[A-Z])?/,
  );
  if (cardinalityExpression) return trimTrailingPunctuation(cardinalityExpression[0]);

  const compactMath = text.match(
    /^[A-Za-z]\^[^,\s.;?]+|^[A-Za-z]\([^)]*\)|^[a-z][A-Z][a-z]|^[A-Za-z]\\(?:to|circ|cup|cap|setminus|triangle|subseteq|subset|ne|le|ge|infty)[^,.;?]*/,
  );
  if (compactMath) return trimTrailingPunctuation(compactMath[0]);

  return null;
}

function trimTrailingPunctuation(value: string) {
  const trimmed = value.trimEnd();
  const trailingSpace = value.slice(trimmed.length);
  const punctuation = trimmed.match(/^(.+?)([,.;?])$/);
  if (!punctuation) return { value, length: value.length };
  return { value: punctuation[1], length: punctuation[1].length };
}
