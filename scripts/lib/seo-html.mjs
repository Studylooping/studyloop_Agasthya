import { parse } from "parse5";

export function readSeo(html) {
  const end = html.indexOf("</head>");
  if (end < 0) throw new Error("Exported page has no head");
  const document = parse(html.slice(0, end + 7));
  const result = { canonical: [], meta: {}, title: "" };
  function visit(node) {
    const attrs = Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
    if (node.tagName === "link" && attrs.rel === "canonical") result.canonical.push(attrs.href);
    if (node.tagName === "meta") {
      const key = attrs.name ?? attrs.property;
      if (key) result.meta[key] = attrs.content;
    }
    if (node.tagName === "title") result.title = (node.childNodes ?? []).map(n => n.value ?? "").join("");
    for (const child of node.childNodes ?? []) visit(child);
  }
  visit(document);
  return result;
}
