"""Generate the FitMe architecture diagrams (SVG) in this folder.

Usage (from repo root):  python docs/diagrams/build_diagrams.py

Logos live in ./icons: mono 24×24 marks from Simple Icons (CC0, https://simpleicons.org),
full-colour marks from Devicon (MIT, https://devicon.dev: java, python, postgresql,
junit, vitest, playwright, pytest, swagger), plus the official payOS
(payos.vn/branding/logo.svg), FASHN (fashn.ai/icon.svg) and JWT (jwt.io) marks.
"""
from __future__ import annotations

import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ICONS = HERE / "icons"
FONT = "Segoe UI, Helvetica, Arial, sans-serif"

INK = "#14121c"
MUTED = "#6b6578"
FAINT = "#9a94a6"
VIOLET = "#7c3aed"
PAPER = "#faf8f5"

# Simple Icons brand colours (https://github.com/simple-icons/simple-icons).
BRAND = {
    "nextdotjs": "#000000", "react": "#61DAFB", "typescript": "#3178C6",
    "tailwindcss": "#06B6D4",
    "vercel": "#000000", "springboot": "#6DB33F", "springsecurity": "#6DB33F",
    "fastapi": "#009688", "neon": "#34D59A", "cloudflare": "#F38020",
    "resend": "#000000", "shopee": "#EE4D2D", "docker": "#2496ED",
    "githubactions": "#2088FF", "render": "#000000", "flyway": "#CC0200",
}

DEFS = """  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="#14121c"/>
    </marker>
    <linearGradient id="gemini" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4285F4"/>
      <stop offset="0.55" stop-color="#9B72CB"/>
      <stop offset="1" stop-color="#D96570"/>
    </linearGradient>
  </defs>"""


def _paths(slug: str) -> list[str]:
    return re.findall(r'\sd="([^"]+)"', (ICONS / f"{slug}.svg").read_text(encoding="utf-8"))


def logo(slug: str, x: float, y: float, s: float, color: str | None = None) -> str:
    """Brand logo scaled into an s×s box at (x, y)."""
    if slug == "payos":
        mark = "".join(f'<path d="{d}"/>' for d in _paths("payos")[5:])
        return (f'<svg x="{x}" y="{y}" width="{s}" height="{s}" viewBox="54 14 168 180">'
                f'<g fill="{color or "#00A85E"}">{mark}</g></svg>')
    source = (ICONS / f"{slug}.svg").read_text(encoding="utf-8")
    view_box = re.search(r'viewBox="([^"]+)"', source).group(1)
    if view_box != "0 0 24 24":
        inner = source[source.index(">", source.index("<svg")) + 1: source.rindex("</svg>")].strip()
        return f'<svg x="{x}" y="{y}" width="{s}" height="{s}" viewBox="{view_box}">{inner}</svg>'
    d = _paths(slug)[0]
    if slug == "tiktok" and color is None:
        body = (f'<path transform="translate(-0.7,-0.5)" fill="#25F4EE" d="{d}"/>'
                f'<path transform="translate(0.7,0.5)" fill="#FE2C55" d="{d}"/>'
                f'<path fill="#000000" d="{d}"/>')
    else:
        fill = color or ("url(#gemini)" if slug == "googlegemini" else BRAND.get(slug, INK))
        body = f'<path fill="{fill}" d="{d}"/>'
    return f'<svg x="{x}" y="{y}" width="{s}" height="{s}" viewBox="0 0 24 24">{body}</svg>'


def tile(slug: str, x: float, y: float, s: float = 40, bg: str = "#f3f1f6") -> str:
    if slug == "fashn":
        return logo("fashn", x, y, s)
    pad = s * 0.18
    return (f'<rect x="{x}" y="{y}" width="{s}" height="{s}" rx="{s * 0.22:.0f}" fill="{bg}"/>'
            + logo(slug, x + pad, y + pad, s - 2 * pad))


def svg(width: int, height: int, body: str, bg: str = "#ffffff") -> str:
    return (f'<?xml version="1.0" encoding="UTF-8"?>\n'
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
            f'width="{width}" height="{height}" font-family="{FONT}">\n{DEFS}\n'
            f'  <rect width="{width}" height="{height}" fill="{bg}"/>\n{body}</svg>\n')


# --------------------------------------------------------------------------- #
# 1. Core tech stack
# --------------------------------------------------------------------------- #
def stick_figure(cx: int, cy: int) -> str:
    return (f'<g stroke="{INK}" stroke-width="2" fill="none">'
            f'<circle cx="{cx}" cy="{cy}" r="12"/>'
            f'<line x1="{cx}" y1="{cy + 12}" x2="{cx}" y2="{cy + 46}"/>'
            f'<line x1="{cx - 20}" y1="{cy + 26}" x2="{cx + 20}" y2="{cy + 26}"/>'
            f'<line x1="{cx}" y1="{cy + 46}" x2="{cx - 14}" y2="{cy + 72}"/>'
            f'<line x1="{cx}" y1="{cy + 46}" x2="{cx + 14}" y2="{cy + 72}"/></g>\n')


def hexagon(cx: float, cy: float, w: float, h: float, **attrs: str) -> str:
    pts = [(cx, cy - h), (cx + w, cy - h / 2), (cx + w, cy + h / 2),
           (cx, cy + h), (cx - w, cy + h / 2), (cx - w, cy - h / 2)]
    a = " ".join(f'{k.replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<polygon points="{" ".join(f"{px:.0f},{py:.0f}" for px, py in pts)}" {a}/>\n'


try:
    from PIL import ImageFont
    _SEMIBOLD = ImageFont.truetype("seguisb.ttf", 120)
except (ImportError, OSError):
    _SEMIBOLD = None


def text_width(text: str, size: float) -> float:
    if _SEMIBOLD is None:
        return len(text) * size * 0.56
    return _SEMIBOLD.getlength(text) * size / 120


TECH_X, TECH_ICON, TECH_FONT = 664, 15, 11.5


def tech_row(label: str, y: int, lines: list[list[tuple[str | None, str]]]) -> str:
    """Label, then one or more lines of (logo, name) pairs, each logo right before its name."""
    out = f'<text x="{TECH_X}" y="{y}" font-size="11" fill="{MUTED}">{label}</text>\n'
    for i, items in enumerate(lines):
        base = y + 20 + i * 20
        x = TECH_X
        for slug, name in items:
            if slug:
                out += logo(slug, x, base - 11.5, TECH_ICON) + "\n"
                x += TECH_ICON + 4
            out += (f'<text x="{x}" y="{base}" font-size="{TECH_FONT}" font-weight="600" '
                    f'fill="{INK}">{name}</text>\n')
            x += text_width(name, TECH_FONT) + 10
    return out


def platform_chip(x: int, w: int, slug: str, title: str, sub: str, dark: bool = False,
                  stroke: str = INK) -> str:
    fg, sub_fg = ("#ffffff", "#cfcadb") if dark else (INK, MUTED)
    bg = INK if dark else "#ffffff"
    return (f'<rect x="{x}" y="572" width="{w}" height="48" rx="8" fill="{bg}" stroke="{stroke}"/>'
            + logo(slug, x + 10, 587, 18, "#ffffff" if dark else None)
            + f'<text x="{x + 36}" y="592" font-size="12.5" font-weight="700" fill="{fg}">{title}</text>'
            + f'<text x="{x + 36}" y="608" font-size="10" fill="{sub_fg}">{sub}</text>\n')


def vendor_card(x: int, y: int, slug: str, title: str, detail: str) -> str:
    return (f'<rect x="{x}" y="{y}" width="212" height="76" rx="6" fill="#ffffff" stroke="{INK}"/>'
            + tile(slug, x + 14, y + 18)
            + f'<text x="{x + 66}" y="{y + 34}" font-size="14" font-weight="700" fill="{INK}">{title}</text>'
            + f'<text x="{x + 66}" y="{y + 54}" font-size="12" fill="{MUTED}">{detail}</text>\n')


def build_tech_stack() -> str:
    b = []
    b.append(f'<text x="600" y="58" text-anchor="middle" font-size="40" fill="{INK}">FitMe AI — Core tech stack</text>\n')
    b.append(f'<text x="600" y="88" text-anchor="middle" font-size="14" fill="{MUTED}">'
             'Modular monolith · Vercel + Render + Neon + Cloudflare R2</text>\n')
    for x, name in ((140, "Clients"), (585, "Apps"), (1045, "Data")):
        b.append(f'<text x="{x}" y="140" text-anchor="middle" font-size="24" font-weight="700" fill="{INK}">{name}</text>\n')

    clients = [("Gen Z user", "Mobile web · /ai · /try-on"),
               ("Brand partner", "Brand portal · /brand"),
               ("Admin", "Admin portal · /admin")]
    for i, (name, sub) in enumerate(clients):
        cy = 190 + i * 160
        b.append(stick_figure(150, cy))
        b.append(f'<text x="150" y="{cy + 96}" text-anchor="middle" font-size="14" font-weight="600" fill="{INK}">{name}</text>\n')
        b.append(f'<text x="150" y="{cy + 114}" text-anchor="middle" font-size="12" fill="{MUTED}">{sub}</text>\n')
        b.append(f'<rect x="22" y="{cy + 15}" width="78" height="22" rx="11" fill="{INK}"/>'
                 + logo("nextdotjs", 29, cy + 18, 16, "#ffffff")
                 + f'<text x="50" y="{cy + 30}" font-size="11" font-weight="600" fill="#ffffff">Next.js</text>\n')
        b.append(f'<line x1="186" y1="{cy + 28}" x2="288" y2="{270 + i * 50}" stroke="{INK}" '
                 'stroke-width="1.6" marker-end="url(#arrow)"/>\n')

    # Apps box
    b.append(f'<rect x="290" y="160" width="590" height="480" rx="6" fill="#ffffff" stroke="{INK}" stroke-width="1.4"/>\n')
    b.append(f'<text x="385" y="190" text-anchor="middle" font-size="14" fill="{INK}">Frontend</text>\n')
    b.append('<rect x="310" y="204" width="150" height="226" rx="10" fill="#faf8f5" stroke="#d9d3cb"/>\n')
    b.append(logo("vercel", 371, 216, 28) + "\n")
    b.append(f'<text x="385" y="264" text-anchor="middle" font-size="15" font-weight="700" fill="{INK}">Vercel</text>\n')
    for i, slug in enumerate(["nextdotjs", "react", "typescript", "tailwindcss"]):
        b.append(logo(slug, 334 + i * 28, 276, 18) + "\n")
    for i, (txt, size, color) in enumerate([
            ("Next.js 16.2 · React 19.2", 12.5, INK), ("TypeScript 5 · Tailwind 4", 12, INK),
            ("Radix UI · React Query", 12, MUTED), ("Zustand · Zod · Axios", 12, MUTED)]):
        b.append(f'<text x="385" y="{320 + i * 18}" text-anchor="middle" font-size="{size}" fill="{color}">{txt}</text>\n')
    b.append(f'<text x="385" y="398" text-anchor="middle" font-size="11" fill="{VIOLET}">rewrite /api/v1 · /uploads</text>\n')
    b.append(f'<text x="385" y="414" text-anchor="middle" font-size="11" fill="{VIOLET}">→ BACKEND_INTERNAL_URL</text>\n')
    b.append(f'<line x1="460" y1="300" x2="508" y2="300" stroke="{INK}" stroke-width="1.6" marker-end="url(#arrow)"/>\n')

    b.append(f'<text x="578" y="190" text-anchor="middle" font-size="14" fill="{INK}">Services</text>\n')
    b.append(hexagon(578, 300, 66, 76, fill="#f3eefe", stroke=VIOLET, stroke_width="2"))
    b.append(logo("springboot", 566, 238, 24) + "\n")
    for txt, y, size, weight, color in [
            ("Spring Boot 3.3.5", 284, 14, 700, INK), ("Java 21 · JPA · REST", 303, 12, 400, INK),
            ("21 module · 312 file", 321, 11.5, 400, MUTED), ("Docker · Temurin 21", 339, 11, 400, MUTED)]:
        b.append(f'<text x="578" y="{y}" text-anchor="middle" font-size="{size}" font-weight="{weight}" fill="{color}">{txt}</text>\n')

    b.append(hexagon(578, 456, 44, 48, fill="#ffffff", stroke=INK, stroke_width="1.4"))
    b.append(logo("fastapi", 570, 418, 16) + "\n")
    b.append(f'<text x="578" y="456" text-anchor="middle" font-size="13" font-weight="700" fill="{INK}">ai-vton</text>\n')
    b.append(f'<text x="578" y="472" text-anchor="middle" font-size="10.5" fill="{MUTED}">FastAPI · Render</text>\n')
    b.append(f'<line x1="578" y1="376" x2="578" y2="406" stroke="{INK}" stroke-width="1.4" marker-end="url(#arrow)"/>\n')
    b.append(f'<text x="586" y="395" font-size="10.5" fill="{MUTED}">HTTP</text>\n')

    b.append(tech_row("Language", 190, [[("java", "Java 21"), ("typescript", "TS 5"), ("python", "Python 3.11")]]))
    b.append(tech_row("API", 238, [[(None, "REST /api/v1"), ("swagger", "Swagger UI (dev)")]]))
    b.append(tech_row("Security", 286, [[("springsecurity", "Spring Security"), ("jwt", "JJWT 0.12")]]))
    b.append(tech_row("DB migration", 334, [[("flyway", "Flyway V1–V16"), (None, "JPA validate")]]))
    b.append(tech_row("Testing", 382, [[("junit", "JUnit 5"), (None, "Testcontainers")],
                                       [("vitest", "Vitest"), ("playwright", "Playwright"), ("pytest", "pytest")]]))
    b.append(tech_row("Monitoring", 454, [[("springboot", "Actuator /actuator/health")]]))
    b.append(tech_row("Session", 502, [[("jwt", "JWT + X-Anonymous-Session")]]))

    b.append('<line x1="306" y1="558" x2="864" y2="558" stroke="#e6e1da"/>\n')
    b.append(platform_chip(306, 100, "vercel", "Vercel", "frontend", dark=True))
    b.append(platform_chip(414, 146, "render", "Render", "backend + ai-vton"))
    b.append(platform_chip(568, 146, "docker", "Docker", "image deploy", stroke="#2496ED"))
    b.append(platform_chip(722, 142, "githubactions", "GitHub Actions", "CI · test + E2E", stroke="#2088FF"))

    # Data cylinder
    b.append(f'<line x1="882" y1="340" x2="918" y2="340" stroke="{INK}" stroke-width="1.6" marker-end="url(#arrow)"/>\n')
    b.append(f'<text x="900" y="332" text-anchor="middle" font-size="10.5" fill="{MUTED}">JDBC</text>\n')
    b.append(f'<line x1="918" y1="500" x2="882" y2="500" stroke="{INK}" stroke-width="1.6" '
             'marker-end="url(#arrow)" marker-start="url(#arrow)"/>\n')
    b.append(f'<text x="900" y="492" text-anchor="middle" font-size="10.5" fill="{MUTED}">S3 API</text>\n')
    b.append(f'<path d="M920,180 L920,610 A125,26 0 0 0 1170,610 L1170,180" fill="#ffffff" stroke="{INK}" stroke-width="1.4"/>\n')
    b.append(f'<ellipse cx="1045" cy="180" rx="125" ry="26" fill="#ffffff" stroke="{INK}" stroke-width="1.4"/>\n')
    b.append(f'<path d="M920,200 A125,26 0 0 0 1170,200" fill="none" stroke="{INK}" stroke-width="1.2"/>\n')
    b.append(f'<path d="M920,220 A125,26 0 0 0 1170,220" fill="none" stroke="{INK}" stroke-width="1.2"/>\n')

    b.append(f'<text x="1045" y="292" text-anchor="middle" font-size="18" font-weight="700" fill="{INK}">Metadata</text>\n')
    b.append('<rect x="946" y="306" width="198" height="88" rx="10" fill="#eef2fc" stroke="#4169E1"/>\n')
    b.append(logo("postgresql", 956, 318, 26) + logo("neon", 959, 356, 20) + "\n")
    for txt, y, size, weight, color in [
            ("PostgreSQL", 326, 14, 700, INK), ("Neon · Singapore", 344, 11.5, 400, MUTED),
            ("Flyway V1–V16", 360, 11.5, 400, MUTED), ("dev / test: PG 16", 376, 11.5, 400, FAINT)]:
        b.append(f'<text x="994" y="{y}" font-size="{size}" font-weight="{weight}" fill="{color}">{txt}</text>\n')

    b.append(f'<text x="1045" y="436" text-anchor="middle" font-size="18" font-weight="700" fill="{INK}">Media</text>\n')
    b.append('<rect x="946" y="450" width="198" height="64" rx="10" fill="#fff4ea" stroke="#F38020"/>\n')
    b.append(logo("cloudflare", 954, 467, 30) + "\n")
    for txt, y, size, weight, color in [
            ("Cloudflare R2", 478, 14, 700, INK), ("S3 API · AWS SDK v2", 496, 11, 400, MUTED)]:
        b.append(f'<text x="992" y="{y}" font-size="{size}" font-weight="{weight}" fill="{color}">{txt}</text>\n')
    # 3rd party
    b.append(f'<text x="30" y="730" font-size="26" font-weight="700" fill="{INK}">3rd Party Apps</text>\n')
    cards = [
        ("googlegemini", "Google Gemini", "AI stylist"),
        ("fashn", "FASHN API", "Virtual try-on"),
        ("payos", "payOS", "Brand plan payments"),
        ("resend", "Resend", "Verification email"),
    ]
    for i, card in enumerate(cards):
        b.append(vendor_card(290 + i * 220, 684, *card))
    return svg(1200, 800, "".join(b))


# --------------------------------------------------------------------------- #
# 2. The MVP wheel
# --------------------------------------------------------------------------- #
def build_mvp() -> str:
    b = []
    b.append(f'<rect x="40" y="24" width="1120" height="64" rx="18" fill="{VIOLET}"/>\n')
    b.append('<text x="600" y="66" text-anchor="middle" font-size="28" font-weight="700" fill="#ffffff">The MVP — FitMe AI</text>\n')

    b.append('<path d="M330,690 A270,270 0 0 1 60,420 L220,420 A110,110 0 0 0 330,530 Z" fill="#d6d2dc" stroke="#ffffff" stroke-width="4"/>\n')
    b.append('<path d="M60,420 A270,270 0 0 1 330,150 L330,310 A110,110 0 0 0 220,420 Z" fill="#e4e1e8" stroke="#ffffff" stroke-width="4"/>\n')
    for txt, y, size, weight in [("Phase B", 548, 14, 700), ("Paid Plus · trial", 567, 12.5, 400),
                                 ("Phase C", 280, 14, 700), ("B2B insights · capsule", 299, 12.5, 400)]:
        b.append(f'<text x="196" y="{y}" text-anchor="middle" font-size="{size}" font-weight="{weight}" fill="{MUTED}">{txt}</text>\n')

    b.append('<g stroke="#ffffff" stroke-width="4">\n'
             '<path d="M330,170 A250,250 0 0 1 506.78,243.22 L407.78,342.22 A110,110 0 0 0 330,310 Z" fill="#8b5cf6"/>\n'
             '<path d="M506.78,243.22 A250,250 0 0 1 580,420 L440,420 A110,110 0 0 0 407.78,342.22 Z" fill="#7c3aed"/>\n'
             '<path d="M580,420 A250,250 0 0 1 506.78,596.78 L407.78,497.78 A110,110 0 0 0 440,420 Z" fill="#8b5cf6"/>\n'
             '<path d="M506.78,596.78 A250,250 0 0 1 330,670 L330,530 A110,110 0 0 0 407.78,497.78 Z" fill="#7c3aed"/>\n'
             '</g>\n')
    for x, y, line1, line2 in [(399, 248, "Profile", "&amp; vibe"), (496, 346, "AI stylist", "&amp; size"),
                               (496, 484, "AI", "try-on"), (399, 582, "Buy &amp;", "feedback")]:
        b.append(f'<text x="{x}" y="{y}" text-anchor="middle" font-size="14" font-weight="700" fill="#ffffff">{line1}</text>'
                 f'<text x="{x}" y="{y + 18}" text-anchor="middle" font-size="14" font-weight="700" fill="#ffffff">{line2}</text>\n')
    b.append(f'<path d="M330,150 A270,270 0 0 1 330,690 L330,670 A250,250 0 0 0 330,170 Z" fill="{INK}"/>\n')
    b.append('<circle cx="330" cy="420" r="108" fill="#f472b6"/><circle cx="330" cy="420" r="80" fill="#ffffff"/>\n')
    b.append('<text x="330" y="332" text-anchor="middle" font-size="13" font-weight="700" fill="#ffffff" letter-spacing="1.5">DATA</text>\n')
    for i, txt in enumerate(["Body profile", "Catalog brand", "Feedback"]):
        b.append(f'<text x="330" y="{402 + i * 22}" text-anchor="middle" font-size="13.5" font-weight="600" fill="{INK}">{txt}</text>\n')

    b.append(f'<text x="640" y="152" font-size="21" fill="{VIOLET}">Body profile + Vibe quiz</text>\n')
    b.append(f'<line x1="640" y1="178" x2="1160" y2="178" stroke="{INK}" stroke-width="1.4"/>\n')
    b.append(f'<text x="900" y="172" text-anchor="middle" font-size="12" font-weight="700" fill="{INK}" letter-spacing="0.6">CHANNEL &amp; ONBOARDING VALIDATION</text>\n')
    b.append(f'<g stroke="{INK}" stroke-width="1.8" fill="none">'
             '<rect x="727" y="196" width="26" height="42" rx="5"/><line x1="736" y1="232" x2="744" y2="232"/>'
             '<rect x="826" y="200" width="48" height="32" rx="3"/><line x1="826" y1="210" x2="874" y2="210"/>'
             '<line x1="842" y1="238" x2="858" y2="238"/><line x1="850" y1="232" x2="850" y2="238"/>'
             '<path d="M960,198 L980,205 L980,219 C980,230 971,236 960,240 C949,236 940,230 940,219 L940,205 Z"/>'
             '<path d="M952,219 L958,225 L969,212"/></g>\n')
    b.append(tile("resend", 1050, 198, 40) + "\n")
    for x, name, sub in [(740, "Mobile web", "Gen Z users"), (850, "Brand portal", "catalog · billing"),
                         (960, "Admin portal", "moderation"), (1070, "Email verify", "code · Resend")]:
        b.append(f'<text x="{x}" y="258" text-anchor="middle" font-size="12" font-weight="600" fill="{INK}">{name}</text>'
                 f'<text x="{x}" y="273" text-anchor="middle" font-size="10.5" fill="{MUTED}">{sub}</text>\n')

    b.append(logo("googlegemini", 640, 322, 22) + "\n")
    b.append(f'<text x="670" y="340" font-size="21" fill="{VIOLET}">AI Stylist · Gemini + rule fallback</text>\n')
    b.append(f'<text x="640" y="388" font-size="21" fill="{VIOLET}">Size from body measurements &amp; size chart</text>\n')
    b.append(logo("fashn", 640, 418, 22) + "\n")
    b.append(f'<text x="670" y="436" font-size="21" fill="{VIOLET}">AI try-on · FASHN API</text>\n')
    b.append(f'<text x="640" y="484" font-size="21" fill="{VIOLET}">Buy redirect · wardrobe · spending · likes</text>\n')

    b.append(f'<line x1="640" y1="548" x2="1160" y2="548" stroke="{INK}" stroke-width="1.4"/>\n')
    b.append(f'<text x="900" y="542" text-anchor="middle" font-size="12" font-weight="700" fill="{INK}" letter-spacing="0.6">RECOMMENDATION VALUE VALIDATION</text>\n')
    b.append(f'<text x="640" y="584" font-size="21" fill="{VIOLET}">FitMe Free vs FitMe Plus</text>\n')
    b.append(f'<text x="640" y="606" font-size="13.5" fill="{MUTED}">Free: mix brands to explore · Plus: prefer same brand / partner brands</text>\n')
    for x, w, title, sub in [(640, 160, "CTR +10%", "vs rule-only baseline"),
                             (812, 160, "VTON &gt; 85%", "try-on success rate"),
                             (984, 176, "Fallback &lt; 5%", "Gemini falling back to rules")]:
        b.append(f'<rect x="{x}" y="630" width="{w}" height="50" rx="10" fill="#ffffff" stroke="#d9d3cb"/>'
                 f'<text x="{x + 16}" y="651" font-size="12.5" font-weight="700" fill="{INK}">{title}</text>'
                 f'<text x="{x + 16}" y="668" font-size="11" fill="{MUTED}">{sub}</text>\n')

    b.append(f'<g font-size="12.5" fill="{INK}">'
             '<rect x="80" y="722" width="16" height="16" rx="3" fill="#7c3aed"/><text x="104" y="735">In MVP</text>'
             '<rect x="220" y="722" width="16" height="16" rx="3" fill="#d6d2dc"/><text x="244" y="735">Later phases</text>'
             '<rect x="370" y="722" width="16" height="16" rx="8" fill="#f472b6"/><text x="394" y="735">Shared data layer</text>'
             '</g>\n')
    b.append('<rect x="40" y="776" width="1120" height="8" rx="4" fill="#f472b6"/>\n')
    return svg(1200, 800, "".join(b), bg=PAPER)


# --------------------------------------------------------------------------- #
# 3. Product / technology roadmap
# --------------------------------------------------------------------------- #
def two_line(x: int, y: int, a: str, c: str, size: float = 12.5, fill: str = "#ffffff") -> str:
    return (f'<text x="{x}" y="{y}" text-anchor="middle" font-size="{size}" fill="{fill}">{a}</text>'
            f'<text x="{x}" y="{y + 16}" text-anchor="middle" font-size="{size}" fill="{fill}">{c}</text>\n')


def monitor(x: int) -> str:
    return (f'<rect x="{x}" y="132" width="84" height="56" rx="4" fill="{INK}"/>'
            f'<rect x="{x + 6}" y="138" width="72" height="44" rx="2" fill="#2a2638"/>'
            f'<rect x="{x + 34}" y="188" width="16" height="10" fill="{INK}"/>'
            f'<rect x="{x + 22}" y="198" width="40" height="4" rx="2" fill="{INK}"/>'
            f'<rect x="{x + 70}" y="160" width="22" height="38" rx="4" fill="#ffffff" stroke="{INK}" stroke-width="2"/>\n')


def build_roadmap() -> str:
    b = []
    b.append(f'<rect x="40" y="24" width="1120" height="64" rx="18" fill="{VIOLET}"/>\n')
    b.append('<text x="80" y="66" font-size="28" font-weight="700" fill="#ffffff">Product / Technology Road Map</text>\n')
    b.append('<text x="1120" y="66" text-anchor="end" font-size="22" fill="#ede4fd">Data-driven · Asset light</text>\n')

    b.append('<rect x="80" y="126" width="300" height="46" rx="23" fill="#ede4fd" stroke="#c4b5fd"/>\n')
    for x, txt in [(130, "Body profile"), (230, "Catalog brand"), (330, "Feedback")]:
        b.append(f'<text x="{x}" y="154" text-anchor="middle" font-size="12.5" font-weight="600" fill="#5b21b6">{txt}</text>'
                 f'<line x1="{x}" y1="172" x2="{x}" y2="190" stroke="{FAINT}"/>\n')
    b.append('<line x1="180" y1="136" x2="180" y2="162" stroke="#c4b5fd"/><line x1="280" y1="136" x2="280" y2="162" stroke="#c4b5fd"/>\n')
    b.append(f'<rect x="100" y="190" width="260" height="36" rx="18" fill="{FAINT}"/>\n')
    b.append('<text x="230" y="214" text-anchor="middle" font-size="14" font-weight="600" fill="#ffffff">REST API /api/v1</text>\n')
    b.append(f'<line x1="230" y1="226" x2="230" y2="290" stroke="{FAINT}"/>\n')

    for x, label in [(520, "Web MVP"), (760, "FitMe Plus v1"), (1000, "Brand insights v2")]:
        b.append(f'<text x="{x}" y="120" text-anchor="middle" font-size="13" font-weight="700" fill="{INK}">{label}</text>\n')
        b.append(monitor(x - 42))
    b.append(f'<line x1="570" y1="162" x2="718" y2="162" stroke="{INK}" stroke-width="1.2"/>'
             f'<line x1="810" y1="162" x2="958" y2="162" stroke="{INK}" stroke-width="1.2"/>\n')
    b.append(f'<text x="1062" y="152" font-size="13" fill="{INK}">Customer App</text>'
             f'<text x="1062" y="170" font-size="13" fill="{INK}">Road Map</text>\n')
    b.append(f'<line x1="520" y1="202" x2="520" y2="290" stroke="{MUTED}" stroke-width="1.2"/>\n')

    for y, txt, size, weight in [(392, "FitMe", 20, 400), (416, "Intelligence", 20, 700),
                                 (440, "Cloud", 20, 700)]:
        b.append(f'<text x="235" y="{y}" text-anchor="end" font-size="{size}" font-weight="{weight}" fill="{VIOLET}">{txt}</text>\n')
    b.append(f'<text x="235" y="464" text-anchor="end" font-size="11.5" fill="{MUTED}">Recommend · Stylist · Try-on</text>\n')

    b.append('<clipPath id="band"><rect x="250" y="290" width="900" height="250" rx="80"/></clipPath>\n')
    b.append('<g clip-path="url(#band)"><rect x="250" y="290" width="300" height="250" fill="#6d28d9"/>'
             '<rect x="550" y="290" width="300" height="250" fill="#8b5cf6"/>'
             '<rect x="850" y="290" width="300" height="250" fill="#7c3aed"/></g>\n')
    for x, title in [(400, "Phase A · MVP+"), (700, "Phase B · v1 pilot"), (1000, "Phase C · v2 scale")]:
        b.append(f'<text x="{x}" y="326" text-anchor="middle" font-size="20" font-weight="700" fill="#ffffff">{title}</text>\n')
    b.append('<rect x="348" y="336" width="104" height="20" rx="10" fill="#f472b6"/>'
             '<text x="400" y="350" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff">CURRENT</text>\n')
    b.append('<rect x="658" y="336" width="84" height="20" rx="10" fill="none" stroke="#ede4fd"/>'
             '<text x="700" y="350" text-anchor="middle" font-size="11" font-weight="700" fill="#ede4fd">PLANNED</text>\n')
    b.append('<rect x="958" y="336" width="84" height="20" rx="10" fill="none" stroke="#ede4fd"/>'
             '<text x="1000" y="350" text-anchor="middle" font-size="11" font-weight="700" fill="#ede4fd">PLANNED</text>\n')

    phase_items = {
        (330, 470): [("Rule engine", "+ Gemini stylist"), ("Single-item VTON", "+ full outfit"),
                     ("Free / Plus", "brand coherence"), ("Preference", "learning"),
                     ("Wardrobe", "+ spending"), ("Brand billing", "payOS")],
        (630, 770): [("payOS Plus", "+ 7-day trial"), ("Preference-based", "upsell"),
                     ("Partnership", "edit / delete"), ("Embeddings", "in recommendations"),
                     ("Vibe share", "progressive profile"), ("Wardrobe AI", "size confidence")],
        (930, 1070): [("Full B2B demand", "dashboard"), ("Capsule /", "collab drop"),
                      ("Calibrate", "preference"), ("Partner", "graph")],
    }
    for (left, right), items in phase_items.items():
        for i, (a, c) in enumerate(items):
            b.append(two_line(left if i % 2 == 0 else right, 384 + (i // 2) * 48, a, c))
    b.append('<text x="400" y="524" text-anchor="middle" font-size="12.5" fill="#ffffff">Email verification · Resend</text>\n')

    b.append(f'<text x="235" y="595" text-anchor="end" font-size="14" font-weight="600" fill="{INK}">Vendor APIs</text>\n')
    vendors = [("googlegemini", "Google Gemini"), ("fashn", "FASHN API"), ("payos", "payOS"), ("resend", "Resend")]
    b.append(f'<g stroke="{FAINT}" stroke-width="1.2"><line x1="400" y1="540" x2="400" y2="556"/>'
             '<line x1="400" y1="556" x2="1000" y2="556"/>'
             + "".join(f'<line x1="{400 + i * 200}" y1="556" x2="{400 + i * 200}" y2="572"/>' for i in range(4))
             + '</g>\n')
    for i, (slug, name) in enumerate(vendors):
        x = 310 + i * 200
        b.append(f'<rect x="{x}" y="572" width="180" height="36" rx="18" fill="#ffffff" stroke="#d9d3cb"/>'
                 + tile(slug, x + 8, 578, 24, bg="#f3f1f6")
                 + f'<text x="{x + 42}" y="595" font-size="13" font-weight="600" fill="{INK}">{name}</text>\n')

    b.append(f'<text x="235" y="682" text-anchor="end" font-size="20" font-weight="700" fill="{VIOLET}">Partners</text>\n')
    b.append(f'<text x="235" y="706" text-anchor="end" font-size="16" fill="{VIOLET}">Brands &amp; channels</text>\n')
    b.append('<rect x="280" y="640" width="840" height="104" rx="52" fill="#8b5cf6"/>\n')
    for x, title in [(400, "Catalog brand"), (700, "Shopee · TikTok Shop"), (1000, "Website brand")]:
        b.append(f'<text x="{x}" y="668" text-anchor="middle" font-size="14" font-weight="700" fill="#ffffff">{title}</text>\n')
    b.append('<g stroke="#ffffff" stroke-width="1.8" fill="none">'
             '<path d="M388,678 L404,678 L414,688 L404,704 L388,704 Z"/><circle cx="395" cy="686" r="2.5"/>'
             '<circle cx="1000" cy="692" r="13"/><ellipse cx="1000" cy="692" rx="6" ry="13"/>'
             '<line x1="987" y1="692" x2="1013" y2="692"/></g>\n')
    b.append(tile("shopee", 670, 678, 28, bg="#ffffff") + tile("tiktok", 704, 678, 28, bg="#ffffff") + "\n")
    for x, txt in [(400, "Brand portal · admin approval"), (700, "FitMe redirect + buy-click tracking"),
                   (1000, "original product link")]:
        b.append(f'<text x="{x}" y="728" text-anchor="middle" font-size="11" fill="#ede4fd">{txt}</text>\n')
    b.append('<rect x="40" y="768" width="1120" height="8" rx="4" fill="#f472b6"/>\n')
    return svg(1200, 800, "".join(b), bg=PAPER)


def main() -> None:
    for name, build in [("fitme-core-tech-stack.svg", build_tech_stack),
                        ("fitme-mvp.svg", build_mvp),
                        ("fitme-product-roadmap.svg", build_roadmap)]:
        (HERE / name).write_text(build(), encoding="utf-8", newline="\n")
        print("wrote", name)


if __name__ == "__main__":
    main()
