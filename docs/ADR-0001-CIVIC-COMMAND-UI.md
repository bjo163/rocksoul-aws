# ADR-0001 — MoonWitness Civic Command UI

Status: **Accepted**  
Date: **2026-08-22**  
Version: **CIVIC_COMMAND_UI_V1**

## Decision

All MoonWitness human-facing applications use one restrained civic sci-fi enterprise system named **MoonWitness Civic Command**. It must remain credible for public, institutional, and government use. Retro, pixel, cartoon, spiritual-rank, and gamified-authority cues are excluded.

`@moonwitness/ui` owns semantic tokens, typography, focus behavior, Solar/Light and Lunar/Dark themes, Indonesian/English preference behavior, application shell, navigation grammar, RID presentation, Evidence Ledger, Human Review Gate, Witness Integrity, Audit Timeline, bounded World State, causal sequences, and simulation notices. Application code may compose these primitives differently but may not redefine their meaning.

## Application boundaries

- Public web explains the system without authentication or operational data.
- XRP is the authenticated public-user workspace for RID-scoped cases, evidence, projects, tasks, resources, and Flow access.
- CAB is the private operator/governance console.
- Flow is an independently deployed governed workflow editor and execution-history application.
- API has no visual identity and remains the shared contract/security boundary.

## Identity and authority

RID is the only canonical human identity label. Authority derives from explicit role, purpose, resource scope, and clearance. Achievement, reputation, Mizan score, spiritual claim, simulation progress, or an alternate identity cannot grant access.

World-state and governance simulations must display both `SIMULATION · NOT REALITY` and `HUMAN AUTHORITY · LIMITED`. Provisional, unknown, conflicted, review-required, and blocked states cannot be visually converted into resolved claims.

## Visual language

- Typography: sober humanist sans for reading; mono only for identifiers, state, and provenance.
- Color: neutral civic surfaces with semantic green, blue, amber, and red. Color is never the only status signal.
- Shape: precise panels, restrained orbital/sigil geometry, causal lanes, and spatial maps; no decorative game HUD overload.
- Motion: functional and subtle, with `prefers-reduced-motion` support.
- Density: responsive operational density on desktop and task-focused composition on mobile.

## Accessibility and localization

Every interactive control requires keyboard focus visibility and an accessible label. The shared shell provides skip navigation, semantic landmarks, responsive navigation, and reduced-motion handling. Indonesian and English ship together; English is the fallback for absent copy. Layouts must tolerate longer labels without removing status meaning.

## Consequences

XRP and Flow are separate applications but consume the same source package. CAB now consumes the canonical application shell and public web consumes the canonical public header; application-local presentation remains limited to feature-specific compositions for which no governed shared primitive exists. Visual-regression automation, complete assistive-technology audits, full CAB feature-copy localization, and production deployment certification remain required before a public release.
