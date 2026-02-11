

# Fix: Include Alt Phrasings in Search

## Problem
The `alt_phrasings` JSONB array is not included in the search query. Typing "Is there" drops "Does God exist?" even though "Is there a God?" is stored as an alt phrasing.

## Changes

### `src/hooks/use-node-search.ts`

**1. Add `alt_phrasings` to the selected columns and interface**
- Update `NodeSearchResult` interface to include `alt_phrasings: string[] | null`
- Update the `.select()` call to include `alt_phrasings`

**2. Add `alt_phrasings` to the database filter**
- Supabase's `ilike` doesn't work directly on JSONB arrays, but casting to text works: `alt_phrasings::text`
- Update the `.or()` filter to include `alt_phrasings::text.ilike.${term}`

**3. Add alt phrasing scoring to `scoreResult`**
- Add a +5 weight for alt phrasing matches (between title-starts-with and title-contains, since an exact alt phrasing match is a strong relevance signal)
- Cast the JSONB array to a joined string and check if it includes the search term

### Scoring Weights (updated)
```text
Exact title match        +10
Title starts with query   +6
Alt phrasing match        +5   <-- NEW
Title contains query      +4
Keyword match             +3
Layer-1 match             +1
```

### No other files change
- Database schema stays the same
- Search results page already displays results from the hook
- No migration needed -- `alt_phrasings` already exists in the `nodes` table
