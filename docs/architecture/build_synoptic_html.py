#!/usr/bin/env python3
"""
Génère synoptic-components.html à partir de synoptic-components.md.

Usage :
    python build_synoptic_html.py

Le HTML embarque les diagrammes Mermaid (rendus via CDN jsDelivr).
À relancer après toute modification du .md.
"""

from __future__ import annotations

import html
import re
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE / "synoptic-components.md"
DST = HERE / "synoptic-components.html"


def inline(text: str) -> str:
    """Échappe le HTML puis applique les formats inline Markdown."""
    out = html.escape(text, quote=False)
    out = re.sub(r"`([^`]+)`", r"<code>\1</code>", out)
    out = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", out)
    out = re.sub(
        r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', out
    )
    return out


def table(rows: list[str]) -> str:
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    header, body = cells[0], cells[2:]
    th = "".join(f"<th>{inline(c)}</th>" for c in header)
    trs = "".join(
        "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in row) + "</tr>"
        for row in body
    )
    return f"<table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table>"


def convert(md: str) -> str:
    lines = md.splitlines()
    out: list[str] = []
    i = 0
    paragraph: list[str] = []
    list_items: list[str] = []

    def flush_paragraph() -> None:
        if paragraph:
            out.append("<p>" + inline(" ".join(paragraph)) + "</p>")
            paragraph.clear()

    def flush_list() -> None:
        if list_items:
            out.append("<ul>" + "".join(list_items) + "</ul>")
            list_items.clear()

    def flush_all() -> None:
        flush_paragraph()
        flush_list()

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if stripped.startswith("```"):
            flush_all()
            lang = stripped[3:].strip()
            i += 1
            block: list[str] = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                block.append(lines[i])
                i += 1
            content = "\n".join(block)
            if lang == "mermaid":
                out.append(
                    '<pre class="mermaid">' + html.escape(content) + "</pre>"
                )
            else:
                out.append(
                    "<pre><code>" + html.escape(content) + "</code></pre>"
                )
            i += 1
            continue

        if stripped.startswith("|"):
            flush_paragraph()
            flush_list()
            block = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                block.append(lines[i])
                i += 1
            out.append(table(block))
            continue

        if stripped.startswith("#"):
            flush_all()
            level = len(stripped) - len(stripped.lstrip("#"))
            text = stripped[level:].strip()
            out.append(f"<h{level}>{inline(text)}</h{level}>")
        elif stripped.startswith(">"):
            flush_all()
            quote = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                quote.append(lines[i].strip().lstrip(">").strip())
                i += 1
            out.append(
                "<blockquote><p>" + inline(" ".join(quote)) + "</p></blockquote>"
            )
            continue
        elif stripped.startswith(("- ", "* ")):
            flush_paragraph()
            list_items.append(f"<li>{inline(stripped[2:])}</li>")
        elif stripped in ("---", "***"):
            flush_all()
            out.append("<hr>")
        elif stripped == "":
            flush_all()
        else:
            flush_list()
            paragraph.append(stripped)

        i += 1

    flush_all()
    return "\n".join(out)


HTML_TEMPLATE = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Schéma synoptique — Oeuvres Sociales</title>
<style>
  :root {{
    --fg: #1f2430; --muted: #5b6472; --bg: #ffffff; --card: #f6f8fb;
    --line: #dfe4ec; --accent: #1f6feb;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; padding: 32px 24px 80px; background: var(--bg); color: var(--fg);
    font: 15px/1.65 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  }}
  main {{ max-width: 1080px; margin: 0 auto; }}
  h1 {{ font-size: 26px; margin: 0 0 6px; }}
  h2 {{ font-size: 20px; margin: 42px 0 12px; padding-bottom: 6px;
        border-bottom: 2px solid var(--line); }}
  h3 {{ font-size: 16px; margin: 26px 0 8px; }}
  p, li {{ color: var(--fg); }}
  .lead {{ color: var(--muted); margin-top: 0; }}
  code {{ background: var(--card); border: 1px solid var(--line); border-radius: 4px;
          padding: 1px 5px; font-size: 13px; }}
  blockquote {{ margin: 14px 0; padding: 10px 16px; background: var(--card);
                border-left: 4px solid var(--accent); color: var(--muted); }}
  table {{ border-collapse: collapse; width: 100%; margin: 14px 0; font-size: 14px; }}
  th, td {{ border: 1px solid var(--line); padding: 7px 10px; text-align: left;
            vertical-align: top; }}
  th {{ background: var(--card); }}
  pre.mermaid {{
    background: #fbfcfe; border: 1px solid var(--line); border-radius: 10px;
    padding: 18px; margin: 18px 0; overflow-x: auto; text-align: center;
  }}
  pre.mermaid svg {{ max-width: 100%; height: auto; }}
  .error {{ color: #b3261e; font-family: monospace; white-space: pre-wrap; }}
  hr {{ border: 0; border-top: 1px solid var(--line); margin: 34px 0; }}
  a {{ color: var(--accent); }}
  footer {{ margin-top: 50px; color: var(--muted); font-size: 13px; }}
</style>
</head>
<body>
<main>
{body}
<footer>Généré depuis <code>synoptic-components.md</code> par
<code>build_synoptic_html.py</code> — relancez le script après édition du Markdown.</footer>
</main>
<script type="module">
  import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
  mermaid.initialize({{
    startOnLoad: true,
    securityLevel: "loose",
    theme: "neutral",
    flowchart: {{ useMaxWidth: true, htmlLabels: true, curve: "basis" }},
    sequence: {{ useMaxWidth: true }},
    state: {{ useMaxWidth: true }}
  }});
</script>
</body>
</html>
"""


def main() -> None:
    md = SRC.read_text(encoding="utf-8")
    body = convert(md)
    DST.write_text(HTML_TEMPLATE.format(body=body), encoding="utf-8")
    print(f"OK -> {DST}")


if __name__ == "__main__":
    main()
