

## Current State

You currently track **5 event types**: `view_node`, `expand_reasoning`, `expand_reasoning_bullet`, `click_related`, and `search`. These only cover the node detail page and search. Large parts of the app — the Diagnostic journey, navigation patterns, session behavior, and category browsing — are untracked.

## Recommended New Events

Here is what I would add, grouped by the insight they provide:

### 1. Navigation & Page Views
- **`page_view`** — fired on every route change. Metadata: `{ path, referrer }`. Lets you see which pages get traffic and common entry points.
- **`click_category`** — when a user selects a category filter on the home page. Metadata: `{ category }`.
- **`click_recently_viewed`** — when a user clicks a recently viewed node. Metadata: `{ target_node_id }`.

### 2. Diagnostic Journey
- **`diagnostic_start`** — user opens the Diagnostic page for the first time in a session.
- **`diagnostic_respond`** — user submits a response to a node. Metadata: `{ node_id, response, has_note }`. This is the most important diagnostic event — tells you agree/disagree/don't-know distribution per node.
- **`diagnostic_edit_response`** — user changes a previous response. Metadata: `{ node_id, old_response, new_response }`.
- **`diagnostic_complete`** — user reaches 100% progress.
- **`diagnostic_route_choice`** — when multiple nodes are available and user picks one. Metadata: `{ chosen_node_id, available_count }`.

### 3. Engagement Depth
- **`copy_share_link`** — user copies the share link on a node detail page. Metadata: `{ node_id }`.
- **`scroll_to_bottom`** — user scrolls to the bottom of a node's content. Metadata: `{ node_id, time_on_page_ms }`. Measures actual reading vs. bouncing.

### 4. Session-Level
- **`session_start`** — fired once when the session ID is first created. Metadata: `{ user_agent, viewport_width, viewport_height, is_mobile }`. Gives you device/browser distribution without cookies.

### 5. Auth Events
- **`sign_in`** / **`sign_up`** — tracks conversion from anonymous to authenticated. Metadata: `{ method }`.

## Implementation

No database changes needed — the `events` table schema (`event_type: text`, `metadata: jsonb`) already supports arbitrary event types. The work is purely in code:

1. **Expand the `EventType` union** in `src/lib/analytics.ts` to include all new event names.
2. **Add `trackEvent` calls** in each relevant component:
   - `src/pages/Index.tsx` — `page_view`, `click_category`, `click_recently_viewed`
   - `src/pages/Diagnostic.tsx` — all `diagnostic_*` events
   - `src/pages/NodeDetail.tsx` — `page_view`, `scroll_to_bottom`
   - `src/components/NodeDetailContent.tsx` — `copy_share_link`
   - `src/pages/Auth.tsx` — `sign_in`, `sign_up`
   - `src/components/RouteAnnouncer.tsx` or `App.tsx` — global `page_view` on route change
3. **Fire `session_start`** inside `getSessionId()` when a new ID is generated.

Total touch points: ~7 files, all additive changes (no refactoring required).

