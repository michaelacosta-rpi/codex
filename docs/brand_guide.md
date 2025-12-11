# virtual mediation hosting — Brand Guide

## Brand essence
- **Design ethos:** Clean, clear, concise experiences that reduce friction and earn trust.
- **Personality:** Calm, confident, and empathetic; speaks plainly and avoids jargon.
- **Audience:** The **client** (mediator or mediator's staff) is the primary customer. The **party** is anyone who joins a session who is not the mediator. A **participant** includes everyone in a mediation. Terms **mediation**, **session**, and **meeting** are used interchangeably to refer to the live video experience.
- **Promise:** Reliable, private, and neutral spaces for online mediation.

## Naming and voice
- Always present the brand name in lowercase: `virtual mediation hosting`.
- Voice is concise and reassuring. Use short sentences and direct verbs ("start", "join", "share").
- Avoid legal jargon; favor approachable language. Address the **client** directly when configuring tools and the **participant** when in-session.
- Messaging pillars: ease of setup, confidence in privacy, and seamless participation across devices.

## Visual system
### Color palette (blue family)
- **Primary 01 – Deep Midnight:** `#0D1C2E`
- **Primary 02 – Horizon Blue:** `#1F6FEB`
- **Primary 03 – Glow Accent:** `#5FB3FF`
- **Neutrals:** Cloud `#F5F7FA`, Mist `#E4E9F0`, Graphite `#2B3038`
- **Usage:**
  - Surfaces: Mist and Cloud for backgrounds to keep layouts bright.
  - Primary 02 for key actions, highlights, and focus states.
  - Primary 01 for headers and important labels.
  - Primary 03 for subtle accents (icons, charts, secondary buttons).

### Typography
- Prefer a geometric, sans-serif family (e.g., SF Pro, Inter, or similar system default).
- Weight pairing: Regular for body, Medium for labels, Semibold for headlines.
- Line spacing: 1.4–1.6 for readability; avoid dense text blocks.

### Layout and components
- Use generous whitespace and consistent 8px spacing increments.
- Components should feel light and layered with soft translucency and smooth gradients to evoke a modern, glass-like surface. Apply gentle blurs and subtle shadows to distinguish layers without heavy borders.
- Corners: 12–16px radius on cards and dialogs; 8px on inputs and buttons.
- Dividers: 1px hairlines with 20–30% opacity of Primary 01.

### Iconography and illustration
- Simple line icons with rounded strokes; avoid overly detailed pictograms.
- Use the blue palette for icon strokes; reserve accents for stateful icons (success, info) while keeping error/warning in neutral red/amber if needed.
- Illustrations, if used, should be minimal, monochromatic, and align with the primary blues.

## Motion
- Motion is subtle and purposeful. Use short, easing transitions (150–200ms) on hover, focus, and state changes.
- Avoid distracting animations; prioritize clarity during mediation/session/meeting flows.

## Accessibility and contrast
- Maintain WCAG AA contrast for text and interactive elements. Primary 02 on Cloud or Mist should exceed 4.5:1.
- Provide clear focus states using the primary blue glow and a 2px outline.
- Ensure keyboard navigation works for all controls; never rely solely on color for meaning.

## Product experience guidelines
- **Onboarding:** Guide the **client** with concise checklists and inline tips. Offer defaults that enable secure sessions quickly.
- **Scheduling & invites:** Use direct language ("Send invites", "Share link"). Clarify roles so **parties** know how to join and what to expect.
- **In-session controls:** Keep primary actions (mute, share, end) persistent and high-contrast. Secondary actions live in a clean overflow panel.
- **Privacy and recording:** Sessions are always confidential. Do not offer or reference a recording option anywhere in the experience.
- **Notifications:** Quiet by default. Summarize the event and next step in one line; link to details when needed.
- **Empty states:** Offer a short explanation and one primary action. Avoid clutter.

## Content guidelines for new tools or features
1. Start with the user’s goal. Describe how the tool helps the **client** set up or the **participant** engage without friction.
2. Keep labels short (under 3 words) and buttons action-oriented ("Start session", "Send invite", "Upload file").
3. Use consistent terminology: **mediation/session/meeting**, **client**, **party**, **participant**.
4. For confirmations, summarize impact and provide a single, clear primary action. Avoid dense paragraphs.
5. When adding settings, group them by task ("Security", "Audio", "Scheduling") and provide inline helpers instead of long descriptions.

## Tone examples
- Setup prompt: "Invite parties and confirm your audio before starting the session."
- Status: "All participants are connected."
- Error: "We couldn't start the meeting. Check your connection and try again."

## Brand governance
- Document any new components or patterns in the design system with examples and do/don’t guidance.
- Run accessibility checks before release and capture screenshots of key states.
- Reuse the color palette, spacing scale, and terminology to maintain consistency across web and native experiences.
