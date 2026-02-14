
# FaithExamined / Question Node -- Complete Technical Blueprint

This document captures every detail needed to rebuild the project from scratch: architecture, database schema, every file's purpose, data formats, styling system, and backend logic.

---

## 1. Project Identity

- **App name (branding):** FaithExamined
- **Internal/code name:** Question Node
- **Tagline:** "Examine yourselves as to whether you are in the faith. Test Yourselves." (2 Corinthians 13:5)
- **Purpose:** A content-first web application that organizes faith-related questions into an interconnected, node-based knowledge graph. Users search, browse by category, and explore layered depth on each topic.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build tool | Vite (with SWC plugin for React) |
| Routing | react-router-dom v6 |
| Styling | Tailwind CSS + tailwindcss-animate |
| UI components | shadcn/ui (Radix primitives) |
| Data fetching | TanStack React Query v5 |
| Backend | Lovable Cloud (Supabase under the hood) |
| Edge functions | Deno (Supabase Edge Functions) |
| Fonts | Newsreader (display/headings), Inter (body) -- loaded via Google Fonts |
| Icons | lucide-react |

---

## 3. Database Schema

### Table: `nodes`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | text | No | -- | Primary key. Human-readable slug (e.g. `what-is-gravity`). Lowercase letters, numbers, hyphens only. |
| `title` | text | No | -- | The question displayed to users |
| `alt_phrasings` | jsonb | Yes | `'[]'` | JSON array of alternative question phrasings |
| `category` | text | Yes | -- | e.g. "Theology", "Apologetics" |
| `keywords` | text | Yes | -- | Comma-separated keyword string |
| `layer1` | text | Yes | -- | Short 2-3 sentence summary answer |
| `layer2_json` | jsonb | Yes | `'{}'` | Structured reasoning (see format below) |
| `layer3_json` | jsonb | Yes | `'{}'` | Resources, sources, related questions (see format below) |
| `search_blob` | text | Yes | -- | Concatenated searchable text: title + layer1 + keywords + alt_phrasings |
| `published` | boolean | No | `false` | Draft vs published |
| `updated_at` | timestamptz | No | `now()` | Auto-updated by trigger |

**RLS policy:** `Anyone can read published nodes` -- SELECT only where `published = true`. No INSERT/UPDATE/DELETE via client.

**Database trigger:** `update_nodes_updated_at` -- sets `updated_at = now()` on every UPDATE.

#### `layer2_json` format

```json
{
  "reasoning": [
    {
      "id": "slug-string",
      "title": "Bullet Title",
      "summary": "1-2 sentence summary shown before expanding",
      "detail": "Full expanded explanation text"
    }
  ]
}
```

#### `layer3_json` format

```json
{
  "resources": [
    { "title": "Resource Name", "url": "https://...", "description": "Optional description" }
  ],
  "sources": [
    { "title": "Author, Work Title", "url": "https://...", "description": "Optional note" }
  ],
  "related_questions": ["node-id-1", "node-id-2"],
  "editorial_notes": { "key": "value" }
}
```

### Table: `events`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| `id` | uuid | No | `gen_random_uuid()` |
| `event_type` | text | No | -- |
| `node_id` | text | Yes | -- |
| `session_id` | text | No | -- |
| `metadata` | jsonb | Yes | `'{}'` |
| `created_at` | timestamptz | No | `now()` |

**RLS policy:** `Anyone can insert events` -- INSERT only. No SELECT/UPDATE/DELETE via client.

**Event types tracked:** `view_node`, `expand_reasoning`, `expand_reasoning_bullet`, `click_related`, `search`

---

## 4. Backend: Edge Functions

### `admin-nodes` (supabase/functions/admin-nodes/index.ts)

- **JWT verification:** disabled (`verify_jwt = false` in config.toml)
- **Auth:** Custom header `x-admin-password` checked against `ADMIN_PASSWORD` secret
- **Uses service role key** to bypass RLS
- **Endpoints:**
  - `GET /admin-nodes` -- list all nodes (including drafts), optional `?published=true|false`
  - `GET /admin-nodes/{id}` -- get single node
  - `POST /admin-nodes` -- create node (requires `id` and `title` in body)
  - `PUT /admin-nodes/{id}` -- update node (partial update, only sends changed fields)
  - `DELETE /admin-nodes/{id}` -- delete node
- **CORS headers** allow: `GET, POST, PUT, DELETE, OPTIONS` with custom headers including `x-admin-password` and Supabase client metadata headers

### Secrets configured

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Database/API URL |
| `SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS for admin operations |
| `SUPABASE_DB_URL` | Direct DB connection |
| `SUPABASE_PUBLISHABLE_KEY` | Same as anon key (Lovable convention) |
| `ADMIN_PASSWORD` | Password for admin gate |
| `LOVABLE_API_KEY` | Lovable platform key |

---

## 5. File-by-File Reference

### Pages (`src/pages/`)

| File | Route | Purpose |
|------|-------|---------|
| `Index.tsx` | `/` | Home page: hero with title/subtitle, search bar, category browse tiles, diagnostic link, feature cards, footer. Search results appear inline when typing. Hero collapses during active search (mobile optimization). Search input scrolls to top on focus (iOS keyboard fix). |
| `NodeDetail.tsx` | `/node/:id` | Displays a single published node with 3-layer progressive disclosure: Layer 1 (always visible summary), Layer 2 (collapsible "Reasoning" section with accordion bullets), Layer 3 ("Next Steps" with deeper resources, related question links, and collapsible sources). Tracks analytics events. |
| `SearchResults.tsx` | `/search` | Dedicated search results page. Syncs `?q=` and `?category=` URL params with search state. Shows numbered results with category filter pill. |
| `Admin.tsx` | `/admin` | Admin gate: shows login form or dashboard based on auth state. |
| `NotFound.tsx` | `*` | 404 page. |

### Components

| File | Purpose |
|------|---------|
| `layout/AppLayout.tsx` | Shell layout: header with "Q" logo, "Question Node" brand, nav links (Explore, Graph, Sign In), and `<main>` slot. |
| `NavLink.tsx` | Wrapper around react-router `NavLink` with `cn()` class merging and active/pending class support. |
| `admin/AdminLogin.tsx` | Password input form. Validates by making a test `adminFetch('')` call. |
| `admin/AdminDashboard.tsx` | Full admin panel: node list table with tabs (All/Published/Drafts), create/edit/delete actions, import buttons. |
| `admin/NodeForm.tsx` | Create/edit form for nodes. Fields: id (slug), title, category, keywords, alt_phrasings (JSON), layer1 (textarea), layer2_json (JSON textarea), layer3_json (JSON textarea), published toggle. Validates JSON fields and slug format. |
| `admin/ImportNodeDialog.tsx` | File upload dialog for `.md` files. Parses using `parseNodeMarkdown()`, shows preview of all fields, confirms to create. |
| `admin/ImportCsvDialog.tsx` | File upload dialog for `.csv` files. Parses using `parseCsvNodes()`, shows row-by-row validation report, imports all valid rows on confirm. |
| `features/questions/QuestionCard.tsx` | Card component for `QuestionNode` type (from legacy mock API -- not currently used in main flow). |

### Hooks (`src/hooks/`)

| File | Purpose |
|------|---------|
| `use-node-search.ts` | Primary search hook. Queries `nodes` table with `ilike` across title, keywords, layer1, search_blob. Applies client-side relevance scoring (exact title +10, title starts-with +6, title contains +4, alt_phrasings +5, keywords +3, search_blob +2, layer1 +1). Also fetches distinct categories. Tracks search events with 1s debounce. |
| `use-admin.ts` | Admin auth state (password in sessionStorage). Exports `adminFetch()` helper that calls edge function with password header. |
| `use-questions.ts` | TanStack Query hooks for the legacy mock API (`api.questions.list/getById`). |
| `use-toast.ts` | Re-export of shadcn toast hook. |
| `use-mobile.tsx` | Mobile breakpoint detection hook. |

### Libraries (`src/lib/`)

| File | Purpose |
|------|---------|
| `analytics.ts` | `trackEvent()` function: fire-and-forget insert to `events` table. Manages session ID in sessionStorage. |
| `parse-node-markdown.ts` | Parses structured `.md` files into `ParsedNode` objects. Expects sections `## 0) Node Metadata`, `## 1) Layer 1`, `## 2) Layer 2`, `## 3) Layer 3`, `## 4) Editorial Notes`. Extracts metadata fields, reasoning bullets (from `####` headings with `**Summary**`/`**Detail**` sub-sections), dig-deeper resources, sources, and related questions. |
| `parse-csv-nodes.ts` | RFC 4180-compliant CSV parser. Required columns: `id`, `title`. Optional: `category`, `keywords`, `alt_phrasings` (JSON array), `layer1`, `layer2_json`, `layer3_json`, `draft`. Validates each row and auto-generates `search_blob`. |
| `api.ts` | Abstract API client interface + mock implementation. Currently returns hardcoded `QuestionNode[]` data. Not used by the main node system (legacy scaffold). |
| `utils.ts` | `cn()` utility (clsx + tailwind-merge). |

### Types (`src/types/`)

| File | Purpose |
|------|---------|
| `question.ts` | Domain types: `QuestionNode`, `QuestionStatus`, `QuestionEdge`, `EdgeRelation`, `Author`, `PaginatedResponse`. These are the abstract domain model, decoupled from the database. |
| `index.ts` | Re-exports everything from `question.ts`. |

### Integrations (`src/integrations/supabase/`)

| File | Purpose |
|------|---------|
| `client.ts` | Auto-generated Supabase client. Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`. **Never edit manually.** |
| `types.ts` | Auto-generated TypeScript types matching the database schema. **Never edit manually.** |

---

## 6. Design System

### Color Palette (CSS custom properties in `src/index.css`)

**Light mode:**
- Background: warm off-white (`40 20% 98%`)
- Foreground: dark blue-gray (`220 25% 10%`)
- Accent: amber/gold (`38 92% 50%`)
- Muted foreground: medium gray (`220 10% 46%`)

**Dark mode:**
- Background: dark blue-gray (`220 25% 7%`)
- Foreground: warm light gray (`40 15% 90%`)
- Accent: same amber (`38 92% 50%`)

### Custom Utility Classes

| Class | Effect |
|-------|--------|
| `.font-display` | Newsreader serif font |
| `.font-body` | Inter sans-serif font |
| `.text-gradient-amber` | Amber-to-orange gradient text |
| `.surface-elevated` | White background with subtle shadow |
| `.surface-warm` | Warm-tinted background |
| `.glow-amber` | Amber box-shadow glow (used on hover) |
| `.bg-amber-subtle` | Light amber background for badges/icons |

### Custom Animations

| Animation | Effect |
|-----------|--------|
| `fade-up` | Fade in + slide up 16px over 0.6s |
| `fade-in` | Simple fade in over 0.5s |
| `accordion-down/up` | Radix accordion height transitions |

### Typography Convention

- Headings: `font-display` (Newsreader)
- Body text: `font-body` (Inter)
- Code/IDs: `font-mono`

---

## 7. Architecture Rules (from project memory)

1. **API boundary:** All search and future AI features must route through a unified `POST /api/answer` endpoint (planned, not yet implemented). No AI/prompt logic in UI components.
2. **Migration-safe architecture:** Logic decoupled from UI components.
3. **Feature-based directory structure:** Domain interfaces as pure types in `src/types/`, decoupled from ORM.
4. **Admin is manual content authoring only** -- no AI assistance in admin flow.
5. **Admin auth via password gate** -- edge functions bypass RLS using service role key.
6. **CORS:** Edge functions must include PUT, DELETE, OPTIONS in CORS headers with standard client metadata headers.

---

## 8. Routing Map

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/` | `Index` | No |
| `/search` | `SearchResults` | No |
| `/node/:id` | `NodeDetail` | No |
| `/admin` | `Admin` (login gate + dashboard) | Admin password |
| `*` | `NotFound` | No |

Note: `/explore`, `/graph`, `/diagnostic` are linked in the UI but not yet implemented (they will 404).

---

## 9. Markdown Import Template Format

The `.md` import expects this structure:

```text
## 0) Node Metadata
**Node ID:** `slug-id`
**Title (Question):** The question text?
**Alt Phrasings:**
- Alternative phrasing 1
- Alternative phrasing 2
**Category:** Category Name
**Keywords:**
- keyword1
- keyword2
**Status:** `published` or `draft`
**Related Questions:**
- `related-node-id`

## 1) Layer 1
The concise 2-3 sentence answer.

## 2) Layer 2
#### Reasoning Bullet Title
**Summary:**
Summary text here.
**Detail:**
Full detail text here.

#### Another Bullet
**Summary:**
...
**Detail:**
...

## 3) Layer 3
### Dig Deeper
- **Resource Title** -- type --
  Description text

### Sources
- Author, Work Title -- note

### Related Questions
- `related-node-id`

## 4) Editorial Notes (optional)
**Note Label:**
- Note content
```

---

## 10. CSV Import Format

Required columns: `id`, `title`

Optional columns: `category`, `keywords`, `alt_phrasings` (JSON array string), `layer1`, `layer2_json` (JSON string), `layer3_json` (JSON string), `draft` (true/false/yes/no/0/1)

The parser auto-generates `search_blob` from title + layer1 + keywords + alt_phrasings.

---

## 11. Analytics System

- **Client-side:** `trackEvent()` in `src/lib/analytics.ts` -- fire-and-forget INSERT to `events` table
- **Session tracking:** `crypto.randomUUID()` stored in `sessionStorage` under key `qn_session_id`
- **Events tracked:**
  - `view_node` -- when a node detail page loads (once per node per component mount)
  - `expand_reasoning` -- when the Layer 2 Reasoning collapsible is opened
  - `expand_reasoning_bullet` -- when an individual reasoning accordion item is expanded (metadata: `bullet_id`)
  - `click_related` -- when a related question link is clicked (metadata: `target_node_id`)
  - `search` -- debounced 1s after typing stops (metadata: `query`, `result_count`)

---

## 12. Configuration Files

| File | Purpose |
|------|---------|
| `supabase/config.toml` | Project ID (`vrofgmxsengdzdofdljx`), edge function configs with `verify_jwt = false` |
| `tailwind.config.ts` | Custom font families, color tokens, animations, container config |
| `vite.config.ts` | Dev server on port 8080, path alias `@` to `./src`, HMR overlay disabled |
| `components.json` | shadcn/ui configuration (default style, Slate base, CSS variables enabled) |
| `tsconfig.app.json` | TypeScript config with path aliases |
| `.env` | Auto-managed: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` |

---

## 13. Pending / Planned Features

- **POST /api/answer endpoint:** Centralized search API (approved plan, not yet implemented). Will replace direct Supabase queries in the search hook.
- **Explore page** (`/explore`): Linked but not built.
- **Graph page** (`/graph`): Linked but not built.
- **Diagnostic flow** (`/diagnostic`): Linked from home page but not built. Intended for guided question-answer pathways.
- **Sign In button:** Present in header but not functional (no user auth system yet).
- **Dark mode toggle:** CSS variables defined for dark mode but no toggle UI exists.
