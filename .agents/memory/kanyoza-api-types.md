---
name: Kanyoza API type contracts
description: Actual shapes of key api.ts types that differ from naive assumptions
---

## ConnectorInfo (`GET /system/connectors`)
```ts
{ supported_connectors: string[]; count: number }
```
NOT an array of objects. Map to display objects: `supported_connectors.map(name => ({ name, status: 'connected' }))`.

## MetricsPayload (`GET /metrics`)
```ts
{ metrics: Record<string, unknown>; as_of: string }
```
This is a single point-in-time snapshot object (`utils.metrics.get_snapshot()`), NOT time-series
arrays keyed by `cpu`/`memory`/`rps`/`error_rate`. Render whatever numeric counters are present
in `.metrics` dynamically rather than assuming fixed series names.

## PublicMetricsPayload (`GET /metrics/public`)
```ts
{ uptime_seconds: number; total_posts: number; total_messages: number; total_errors: number; as_of: string }
```
Distinct flat shape from `/metrics` — do not reuse `MetricsPayload` for this route.

## AIConfigPayload (`GET/PUT /ai/config`)
Real fields: `provider, model, chat_temperature, post_temperature, safety_level, available_models,
available_providers, system_prompt_override, persona_mood, tone_assertiveness, tone_humor,
tone_formality, available_moods`. There is NO flat `temperature` field — it's split into
`chat_temperature`/`post_temperature`. PUT strictly 400s on any key outside this set.

## RateLimitEntry list (`GET /rate-limits`)
Envelope key is `rate_limits` (a list, straight from Supabase `rate_limit_config` table) — not `limits`
and not a single object.

## GeneratedKey (`POST /keys/generate`)
```ts
{ key_id, token, prefix, label, created_at, note }
```
The raw secret field is `token`, not `key`/`api_key`. It's only ever returned once, at creation.

## ApiKeyEntry (`GET /keys`)
```ts
{ keys: ApiKeyEntry[]; count } // each entry has `revoked: boolean`, no `status` string
```

## AIProfile list (`GET .../ai-profiles`)
Envelope key is `ai_profiles` (GET) / `ai_profile` (POST/PUT singular) — not `profiles`/`profile`.

## KnowledgeDoc, brand-scoped (`GET/POST /brands/:id/knowledge`)
Envelope key is `knowledge_entries` (GET) / `knowledge_entry` (POST) — different from the
**global** `/knowledge` route, which uses `documents`/`document` instead. These two routes have
different envelope key names even though they look parallel — don't assume they match.

## ScanStatusPayload (`GET /scan`)
```ts
{ configured?: boolean; issues: GuardianIssue[]; last_scan_at?: string }
```
No historical scan log exists server-side — this is a live Guardian status snapshot, not
`{ scans: [...], last_scan }`.

## System health (`GET /system/health`)
```ts
{ status; connectors: Record<string, { ok: boolean; ... }>; as_of }
```
Health-per-service data is a `connectors` dict keyed by connector name, not a `services` array.

## Messages (`GET /messages`)
Returns a flat `{ messages: MessageEntry[], count }` list of raw message events — there is no
server-side grouping into conversations. If a UI needs a conversation list, derive it client-side
by grouping on `sender_id`.

## IntegrationEntry (`GET /integrations`)
```ts
{ id: string; name: string; category: string; connected: boolean; status: 'active'|'disconnected'; description: string }
```
Use `.connected` (not `.enabled`) and `.category` (not `.type`).

**Why:** These mismatches cause TypeScript errors and runtime rendering bugs if you assume a different shape.
