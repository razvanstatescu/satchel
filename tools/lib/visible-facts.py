#!/usr/bin/env python3
"""Check that facts appear in an HTML page's VISIBLE text (what an AI fetch tool or a no-JS reader sees).

Usage: curl -s <url> | python3 tools/lib/visible-facts.py <fact> [<fact> ...]
A fact is a case-insensitive substring. Text inside elements with the `hidden` attribute, aria-hidden="true",
style display:none, or in <template>/<script>/<style>/<noscript> counts as hidden (spec §8.1, §12.5).
Text is joined the way a browser's textContent joins it: adjacent inline elements run together (an address or hash
rendered in groups, <span>tb1q</span><span>tf95</span>…, reads as one string), and block elements and <br> separate.
Prints one line per fact (visible / HIDDEN / MISSING) and exits 1 unless every fact is visible.
"""
import re
import sys
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
HIDING_TAGS = {"template", "script", "style", "noscript"}
BLOCK = {"address", "article", "aside", "blockquote", "br", "dd", "details", "div", "dl", "dt", "fieldset", "figcaption",
         "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "li", "main", "nav", "ol", "p",
         "pre", "section", "summary", "table", "td", "th", "tr", "ul", "button", "option", "label"}


class Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.visible, self.hidden = [], [], []

    def _sep(self, tag):
        if tag in BLOCK:
            self.visible.append(" ")
            self.hidden.append(" ")

    def handle_starttag(self, tag, attrs):
        self._sep(tag)
        a = dict(attrs)
        style = (a.get("style") or "").replace(" ", "").lower()
        hides = "hidden" in a or a.get("aria-hidden") == "true" or "display:none" in style or tag in HIDING_TAGS
        if tag not in VOID:
            self.stack.append(hides)

    def handle_startendtag(self, tag, attrs):
        self._sep(tag)

    def handle_endtag(self, tag):
        self._sep(tag)
        if tag not in VOID and self.stack:
            self.stack.pop()

    def handle_data(self, data):
        (self.hidden if any(self.stack) else self.visible).append(data)


def check(html, facts):
    p = Text()
    p.feed(html)
    vis = re.sub(r"\s+", " ", "".join(p.visible)).lower()
    hid = re.sub(r"\s+", " ", "".join(p.hidden)).lower()
    out = []
    for f in facts:
        k = f.lower()
        out.append(("visible" if k in vis else "HIDDEN" if k in hid else "MISSING", f))
    return out


if __name__ == "__main__":
    rows = check(sys.stdin.read(), sys.argv[1:])
    for status, fact in rows:
        print(f"    {status:<8} {fact}")
    sys.exit(0 if rows and all(s == "visible" for s, _ in rows) else 1)
