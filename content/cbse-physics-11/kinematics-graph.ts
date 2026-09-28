import type { ItemFigure } from "@/lib/content/types";

export function kinematicsGraph(title: string, axis: string, points: readonly (readonly [number, number])[],
  times: readonly number[], values: readonly number[], horizontalAxis = "t (s)"): ItemFigure {
  const xMax = Math.max(...times), yMin = Math.min(...values), yMax = Math.max(...values);
  const x = (t: number) => 80 + 390 * t / xMax;
  const y = (v: number) => 250 - 200 * (v - yMin) / (yMax - yMin);
  if (points.some(([t, v]) => t < 0 || t > xMax || v < yMin || v > yMax)) throw new Error("Graph data outside axes");
  const escape = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return {
    type: "svg", title,
    description: `${title}. Horizontal axis: ${horizontalAxis}. Vertical axis: ${axis}. Straight segments join the data points ${points.map(([t, v]) => `(${t}, ${v})`).join(", ")}.`,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 320" role="img">
      <rect width="560" height="320" fill="white"/>
      <g font-family="Arial, sans-serif" font-size="18" fill="#172033">
      ${times.map(t => `<line x1="${x(t)}" x2="${x(t)}" y1="50" y2="250" stroke="#dce3ec"/><text x="${x(t)}" y="277" text-anchor="middle">${t}</text>`).join("")}
      ${values.map(v => `<line x1="80" x2="470" y1="${y(v)}" y2="${y(v)}" stroke="#dce3ec"/><text x="66" y="${y(v) + 6}" text-anchor="end">${v}</text>`).join("")}
      <line x1="80" x2="480" y1="${y(0)}" y2="${y(0)}" stroke="#334155" stroke-width="2"/>
      <line x1="80" x2="80" y1="40" y2="250" stroke="#334155" stroke-width="2"/>
      <text x="80" y="27">${escape(axis)}</text><text x="470" y="305" text-anchor="end">${escape(horizontalAxis)}</text>
      <polyline points="${points.map(([t, v]) => `${x(t)},${y(v)}`).join(" ")}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linejoin="round"/>
      ${points.map(([t, v]) => `<circle cx="${x(t)}" cy="${y(v)}" r="4" fill="#2563eb"/>`).join("")}
      </g></svg>`,
  };
}
