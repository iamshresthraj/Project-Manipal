# Shresth Raj (SR) Blogs — Design Theme & Style System (`SRTheme.md`)

This document serves as the comprehensive style guide, visual identity reference, color palette specification, typography scale, and component design token documentation for **Shresth Raj (SR) Blogs**.

---

## 🎨 1. Brand Identity & Visual Aesthetic

SR Blogs follows a **high-end dark editorial aesthetic** combining:
- **High-contrast dark mode** anchored by deep blacks and slate surfaces.
- **Vibrant signature red accents** (`#C10303`) with subtle crimson ambient glows.
- **Monospace typography layout** powered by `Cascadia Code` for a technical, crisp editorial layout.
- **Newspaper column grid guides** and subtle noise overlay textures.

---

## 🔴 2. Color Palette & Design Tokens

### Core Brand Colors

| Token Name | Hex / Value | Usage & Application |
| :--- | :--- | :--- |
| **Primary Brand Red** | `#C10303` | Core accent color, active tabs, CTA buttons, custom scrollbar thumb, list markers, underline highlights. |
| **Crimson Dark Glow** | `#8a0202` | Ambient radial backdrops, button hover states, gradient shadows, subtle card borders. |
| **Red Tint Alpha (Low)** | `rgba(193, 3, 3, 0.12)` | Code block headers, prompt template boxes, active badge backgrounds. |
| **Red Border Alpha (Mid)**| `rgba(193, 3, 3, 0.30)` | Card borders, container dividers, subtle structural highlights. |
| **Red Glow Alpha (High)**| `rgba(193, 3, 3, 0.65)` | Scrollbar thumb glow, active button box shadows, glowing focus rings. |

---

### Surface & Layering Spectrum

| Surface Token | Hex Value | Section / Layer Application |
| :--- | :--- | :--- |
| **`--color-black`** | `#000000` | Absolute base background, Navbar (`--bg-nav`), Footer (`--bg-footer`). |
| **`--bg-hero`** | `#050505` | Core page background, hero section, scrollbar track background. |
| **`--bg-featured`** | `#060606` | Featured post hero container backdrop. |
| **`--bg-grid`** | `#070707` | Grid section layout backdrop. |
| **`--bg-tabs`** | `#080808` | Feed category tab navigation bar. |
| **`--bg-categories`** | `#0a0a0a` | Tag selection & category filter cards. |
| **`--color-stone`** | `#121212` | Post cards, modal surfaces, editor containers. |
| **Quote Surface** | `#060607` | Floating magazine-style blockquote backdrop. |

---

### Text & Contrast Palette

| Text Token | Color Value | Usage |
| :--- | :--- | :--- |
| **Text Primary / Paper** | `#ffffff` / `#f5f5f5` | High-contrast main titles, article headings, primary navigation. |
| **Body Editorial** | `rgba(255, 255, 255, 0.7)` / `#cccccc` | Main article body text, paragraph content, quote text. |
| **Muted Meta Text** | `rgba(255, 255, 255, 0.5)` / `0.6` | Dates, post category tags, reading time, author subtitles. |

---

### Specialty Badges & Gradients

- **Personal Feed Accent:** Purple highlight badge (`#8b5cf6` / `rgba(139, 92, 246, 0.15)`).
- **Secondary Amber Token:** `--color-amber` (`#ff5500`).
- **Hero Ambient Backdrop Glow:**
  ```css
  background: radial-gradient(circle at 50% 30%, rgba(193, 3, 3, 0.15) 0%, transparent 70%), #050505;
  ```
- **Grid Lines & Dots:**
  ```css
  --grid-line: rgba(255, 255, 255, 0.045);
  --grid-line-strong: rgba(255, 255, 255, 0.07);
  --grid-dot: rgba(255, 255, 255, 0.06);
  --grid-dot-spacing: 24px;
  ```

---

## 🔤 3. Typography & Font System

### Font Families

1. **Primary Monospace & Editorial Font:** `Cascadia Code` (Loaded via local `@font-face` across weights 200–700 in Regular and Italic).
2. **Display & Headings:** `Google Sans`, `Syne` / `Cascadia Code`.
3. **Serif Accent (Pull Quotes):** `Georgia`, `Playfair Display` (Used for magazine pull-quotes and large decorative quote marks).

---

### Typography Scale (CSS Classes)

| Class Name | Font Family | Size / Clamp | Weight | Transform / Spacing |
| :--- | :--- | :--- | :--- | :--- |
| `.display-massive` | `Cascadia Code` | `clamp(3rem, 14vw, 14rem)` | 700 | Uppercase, `-0.03em` tracking |
| `.display-lg` | `Cascadia Code` | `clamp(2rem, 6vw, 5rem)` | 700 | Uppercase, `-0.02em` tracking |
| `.display-md` | `Cascadia Code` | `clamp(1.25rem, 3vw, 2.5rem)`| 600 | Uppercase, `-0.01em` tracking |
| `.heading-sans` | `Cascadia Code` | `clamp(0.6875rem, 1vw, 0.8125rem)`| 600 | Uppercase, `0.1em` tracking |
| `.body-editorial` | `Cascadia Code` | `clamp(0.8rem, 1vw, 0.95rem)` | 300 | Normal, Line Height `1.75` |
| `.body-sm` | `Cascadia Code` | `clamp(0.75rem)` | 300 | Normal, Line Height `1.6` |
| `.label-sans` | `Cascadia Code` | `0.5625rem` | 500 | Uppercase, `0.15em` tracking |

---

## 🛠️ 4. Custom Styling & Editorial Utilities

### Text Highlight System
- **Red Underline:** `<u>` tags rendered with `text-decoration-color: #C10303`.
- **Red Marker Pill:** `<mark>` tags rendered with `#C10303` background and `#ffffff` text.

### Red Bullet & Numbered List System
- **Disc Bullets (`ul.red-bullets-disc`):** Red glowing circles (`#C10303`, `box-shadow: 0 0 8px rgba(193, 3, 3, 0.7)`).
- **Square Bullets (`ul.red-bullets-square`):** Red glowing squares (`#C10303`).
- **Arrow Bullets (`ul.red-bullets-arrow`):** Red direction marker `▸`.
- **Star Bullets (`ul.red-bullets-star`):** Red star sparkle `✦`.
- **Dash Bullets (`ul.red-bullets-dash`):** Red em-dash `—`.
- **Numbered List (`ol.red-numbered-list`):** Red bold numbers `1.`, `2.`, `3.` in `Cascadia Code`.

### Custom Theme Scrollbar
- **Track:** `#050505` with subtle border.
- **Thumb:** Crimson glow `rgba(193, 3, 3, 0.65)` transitioning to `#C10303` on hover with dynamic box shadow glow.

---

## ⚡ 5. Component Architecture & Micro-Animations

- **`StarBorder` Component:** Animated glowing border surrounding primary CTA buttons using `#C10303`.
- **`TrueFocus` Component:** Interactive focus effect on active feed tab headers.
- **`SpotlightCard` & `BorderGlow`:** Interactive mouse cursor light tracking and border reflections.
- **`GradualBlur`:** Smooth top and bottom gradient blur masks.
- **Motion Transitions:** Controlled via Framer Motion & CSS custom easing curves (`--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)`).
- **Site Security:** Built-in protection against image downloads (`user-drag: none`, `user-select: none`).
