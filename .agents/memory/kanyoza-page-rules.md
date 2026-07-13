---
name: Kanyoza page wiring rules
description: Non-negotiable conventions for every React page in this project
---

## Every useQuery must have
- `retry: 1`
- `staleTime` (60_000 minimum; 30_000 for fast-changing data like bot status)

## Every useMutation onError must
- Call `triggerNotification(...)` OR local `showToast(...)` — never silent, never empty

## Error visibility
- Show per-query error banners, not a combined flag gating on ALL queries failing simultaneously
- `anyError = q1.isError || q2.isError || ...` (OR, not AND)

## Icon-only buttons
- Must have `aria-label` or `title` attribute

## /persona vs /ai/persona
- `GET/PUT /persona` (direct route) and `GET/PUT /ai/persona` are separate backend endpoints
- Both should be fetched; direct `/persona` fills gaps; save to both on write
- Direct `/persona` save failure is not silent — show toast even if secondary

**Why:** Code review flagged all of these as rule violations; consistency across pages matters for maintainability.
