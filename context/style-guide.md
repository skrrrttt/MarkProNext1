# Industry Standard App Design Style Guide: Minimalist & Calm (2026)

This document defines the visual and structural standards for the application. Use these criteria when reviewing Playwright screenshots, component code, or DOM structures.

---

## 1. Interaction & Navigation Standards
* **Progressive Disclosure:** Do not overwhelm the user. Hide complex or rare actions behind "More" menus or contextual reveals. A "Calm" UI only shows what is needed for the *current* task.
* **Predictable Feedback:** Every interaction must have a response within 100ms. Use **Skeleton Screens** for loading states instead of "cartoony" spinning wheels.
* **Forgiving Design:** Every destructive action (Delete, Archive) must have a clear "Undo" toast or a confirmation modal to reduce user anxiety.
* **F-Pattern Hierarchy:** Place critical actions (Save, Primary CTA) where the eye naturally lands (top-right or bottom-right of content blocks).

## 2. Layout & Spacing (The 8pt Grid)
* **Strict Spacing:** Use an 8px-based grid system for all margins and padding (`8px`, `16px`, `24px`, `32px`, `48px`, `64px`).
* **Generous Whitespace:** If a screen feels "busy," increase the padding between sections rather than adding lines/borders.
* **Touch Targets:** Ensure interactive elements (buttons, links) have a minimum clickable area of `44x44px` to accommodate all motor abilities.

## 3. Typography & Content
* **Font Scale:** Use a maximum of two typefaces. Body text must be at least `16px`.
* **Line Height (Leading):** Set body text line-height to `1.5` or `1.6`. Tight text feels "aggressive"; loose text feels "calm."
* **Line Length:** Limit text containers to `60–75 characters` wide. Long lines of text are difficult to scan.
* **Microcopy:** Use "Human-First" language. Instead of "Error 404," use "We couldn't find that page. Let's get you back home."

## 4. Modern Visual Polish
* **Subtle Depth:** Use **Glassmorphism** (background-blur) or **Soft Shadows** (very high blur, 5-10% opacity) to create layers without using heavy borders.
* **Color as Information:** Use color only to signal status (Success/Green, Warning/Amber, Error/Red). For everything else, stay within the desaturated neutral