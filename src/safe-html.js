"use strict";
function decode(raw) {
  const t = document.createElement("textarea");
  t.innerHTML = raw || "";
  return t.value;
}
function safe(raw) {
  const t = document.createElement("template");
  let html = String(raw || "");
  if (/&lt;\/?(?:p|img|div|span|table|br|strong|ul|ol|h[1-6])\b/i.test(html))
    html = decode(html);
  t.innerHTML = html.replace(/''/g, '"');
  const allowed = new Set([
    "P",
    "BR",
    "DIV",
    "SPAN",
    "STRONG",
    "B",
    "I",
    "EM",
    "U",
    "S",
    "SMALL",
    "SUB",
    "SUP",
    "IMG",
    "TABLE",
    "THEAD",
    "TBODY",
    "TFOOT",
    "TR",
    "TD",
    "TH",
    "UL",
    "OL",
    "LI",
    "BLOCKQUOTE",
    "HR",
    "A",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
  ]);
  for (const el of [...t.content.querySelectorAll("*")]) {
    if (!allowed.has(el.tagName)) {
      if (
        [
          "SCRIPT",
          "STYLE",
          "IFRAME",
          "OBJECT",
          "EMBED",
          "FORM",
          "INPUT",
          "BUTTON",
          "LINK",
          "META",
          "SVG",
          "MATH",
        ].includes(el.tagName)
      )
        el.remove();
      else el.replaceWith(...el.childNodes);
      continue;
    }
    for (const a of [...el.attributes]) {
      if (
        ![
          "src",
          "href",
          "alt",
          "title",
          "colspan",
          "rowspan",
          "style",
        ].includes(a.name)
      )
        el.removeAttribute(a.name);
    }
    for (const a of ["src", "href"])
      if (el.hasAttribute(a)) {
        try {
          const u = new URL(el.getAttribute(a), "https://zenlishtoeic.vn/");
          if (!["https:", "http:"].includes(u.protocol)) el.removeAttribute(a);
          else el.setAttribute(a, u.href);
        } catch {
          el.removeAttribute(a);
        }
      }
    if (el.hasAttribute("style")) {
      const old = el.style;
      const keep = {};
      for (const k of [
        "color",
        "font-weight",
        "font-style",
        "text-align",
        "text-decoration",
      ])
        if (old[k]) keep[k] = old[k];
      el.removeAttribute("style");
      Object.assign(el.style, keep);
    }
    if (el.tagName === "A") {
      el.target = "_blank";
      el.rel = "noopener noreferrer";
    }
    if (el.tagName === "IMG") {
      el.loading = "lazy";
      el.addEventListener("error", () => {
        el.alt =
          "The source image could not be loaded. Check your connection or open the original test.";
      });
    }
  }
  return t.content;
}
