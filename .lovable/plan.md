

# Fix: Add Missing CORS Method Header for PUT Requests

## Problem
Every PUT request from the browser fails with "Failed to fetch," even with tiny payloads like `{"published": true}`. The edge function works fine when called directly (server-side), confirming the logic is correct.

The root cause is a missing `Access-Control-Allow-Methods` header in the CORS configuration. PUT is not a "simple" HTTP method, so browsers send an OPTIONS preflight request first. The preflight response must include `Access-Control-Allow-Methods` listing PUT (and DELETE). Without it, the browser blocks the actual request.

## Solution
Add `Access-Control-Allow-Methods` to the CORS headers in the edge function.

## Changes

### `supabase/functions/admin-nodes/index.ts`
Add one line to the `corsHeaders` object:

```text
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",   // <-- ADD THIS
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-password, ..."
};
```

No other files need to change. The function will be redeployed automatically.

