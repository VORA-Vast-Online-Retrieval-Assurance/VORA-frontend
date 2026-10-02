# VORA design system — Wisteria research desk

This system applies to the landing page and signed-in workspace. Tokens live in `src/styles/tokens.css`; tactile surfaces and restrained underlines live in `src/index.css`. Product features, routes, and data contracts are unchanged.

## Palette

| Role | Hex | Use |
|---|---|---|
| Wisteria | `#C9A0DC` | Focused brand moments and selected states |
| Lavender | `#B8A9FA` | Secondary brand blocks |
| Soft lavender | `#E9E1F7` | Active navigation and recessed surfaces |
| Cream | `#FFFDF5` | Page and card backgrounds |
| Black | `#000000` | Text, 2–3 px borders, rules, and hard shadows |
| Muted ink | `#594967` | Supporting text, with 8.01:1 contrast on cream |
| CTA yellow | `#FFE45C` | Primary actions only |
| Destructive coral | `#FF736A` | Destructive actions only |

Violet and yellow are complementary on the traditional color wheel; the yellow attracts attention against the quieter Wisteria surfaces. Coral is a second, limited action cue for deletion. This follows Adobe's explanation of complementary color relationships: https://www.adobe.com/uk/creativecloud/design/discover/complementary-colors.html

Black text has calculated contrast ratios of 20.62:1 on cream, 9.55:1 on Wisteria, 16.50:1 on CTA yellow, and 7.91:1 on destructive coral. Supporting ink on cream is 8.01:1. W3C's minimum for normal text is 4.5:1: https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum

Method receipts keep distinct quiet tints and text labels: structured green, content blue, rendered peach, and AI lavender. They communicate source type; saturated yellow and coral remain reserved for actions. Charts use black for the main series and a tonal Wisteria ramp for ordered groups. No gradients are used.

## Space and structure

The landing page uses an editorial 12-column grid. A small left index introduces each section, the claim occupies the center, and explanations or actions sit on the opposite edge. The interactive research sample sits in a hard-shadowed frame offset from the headline. Cream backgrounds and generous spacing keep the reading path clear.

The workspace uses a quiet cream masthead, a left-hand archive rail, and a central research canvas. New chat places the brief on the left and the prompt and plan on the right. Results place a fixed-height, independently scrollable conversation beside live discovery; the dataset is section 03 beneath them. Dashboard controls have a clear hierarchy: heading and view tabs above, actions and filters below, charts on the canvas.

## Shape and motion

Key cards use 2 px black borders and a 5 px solid black offset shadow. Controls have compact square corners and 4 px offset shadows. Hover lifts by 2–3 px and increases the hard shadow; press moves the control toward the shadow. Headings are plain ink with enough line spacing to avoid collisions. Source values and hovered links use a thin underline below the text; the sign-in screen has no highlighted words. Entry panels slide in from the left, while state changes use short spring-like timing. Row arrivals and source traces are brisk; reduced-motion settings remove these movements.

The user-provided references informed the palette cards, hard-edged app frames, editorial chart spacing, and cream data layouts. No reference imagery or code was copied into the app.

## Files changed for this visual redesign

- Foundation: `src/styles/tokens.css`, `src/index.css`, `src/ui/Mark.tsx`, `src/ui/buttonClass.ts`, `src/ui/motion.ts`, `src/ui/micro/FuseButton.tsx`.
- Landing: `src/landing/LandingPage.tsx`, `src/landing/Nav.tsx`, `src/landing/Footer.tsx`, `src/landing/SectionHead.tsx`, `src/landing/hero/HeroRun.tsx`, `src/landing/dashboards/Tiles.tsx`, and `src/landing/sections/{Hero,HowItWorks,FinalCta,ApprovePlan,Dashboards,Receipts,PermittedSources,Faq}.tsx`.
- Workspace shell and chat: `src/app/workspace/{Layout,Sidebar,PageHeader}.tsx`, `src/app/{AuthFrame,LoginPage}.tsx`, and `src/app/chat/{NewChat,ChatView,LiveRun,Thread}.tsx`.
- Results and tools: `src/app/dashboard/{Dashboard,Tile}.tsx`, `src/app/manage/{parts,ChatTabs,GraphsTab}.tsx`, `src/app/ask/AskPage.tsx`, `src/app/report/ProjectsReport.tsx`, and `src/app/tools/ToolsPage.tsx`.
