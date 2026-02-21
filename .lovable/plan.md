

## Implement Admin Authentication with Role-Based Access

### Overview
Replace the shared-password admin gate with proper user authentication. Writers will sign in via the header "Sign In" button using email/password or Google. Only users with an `admin` role in the database can access the Node Admin page.

### Step 1: Database Migration

Create the following database objects:

- **`app_role` enum** with values `admin`, `user`
- **`user_roles` table** linking users to roles, with RLS so users can read their own roles
- **`has_role()` security definer function** to check roles without RLS recursion
- **`profiles` table** with auto-creation trigger on signup

### Step 2: Configure Google OAuth

Use the Lovable Cloud social login tool to enable Google sign-in. This auto-generates the required integration module.

### Step 3: New Frontend Files

| New File | Purpose |
|---|---|
| `src/hooks/use-auth.ts` | Hook managing session state via `onAuthStateChange` + `getSession`, exposes `user`, `session`, `loading`, `signOut` |
| `src/hooks/use-user-role.ts` | Hook that queries `user_roles` table to check if current user has a given role (e.g. `admin`) |
| `src/pages/Auth.tsx` | Auth page with tabs for Sign In / Sign Up, email+password fields, Google button, error handling, and redirect support |

### Step 4: Modified Frontend Files

| File | Change |
|---|---|
| `src/App.tsx` | Add `/auth` route |
| `src/components/layout/AppLayout.tsx` | Wire "Sign In" button to `/auth`; when logged in, show user email + sign out option |
| `src/pages/Admin.tsx` | Remove password gate. Redirect to `/auth` if not logged in. Show "access denied" if logged in but not admin. Render `AdminDashboard` if admin. |
| `src/hooks/use-admin.ts` | Remove password-based login/logout. Update `adminFetch` to accept a session token instead of password, send it as `Authorization: Bearer <token>` header |
| `src/components/admin/AdminDashboard.tsx` | Change props from `password`/`onLogout` to `session`; pass session token to `adminFetch` |
| `src/components/admin/AdminLogin.tsx` | Delete this file (no longer needed) |

### Step 5: Edge Function Update

Update `supabase/functions/admin-nodes/index.ts`:

- Remove `x-admin-password` validation
- Extract JWT from `Authorization` header
- Use `getClaims()` to verify the token and get the user ID
- Query `user_roles` with the service role client to confirm the user has the `admin` role
- Return 401 if no token, 403 if not admin

### Step 6: Update CORS headers

Remove `x-admin-password` from the allowed headers in the edge function (no longer needed).

### Onboarding Admin Writers

After implementation:
1. Have the writer sign up via the Sign In page
2. Find their user ID in the Lovable Cloud backend (Users section)
3. Insert a row into `user_roles`: `{ user_id: "their-id", role: "admin" }`

### What Does NOT Change
- Node data schema, search, public pages
- Writer Guide, Markdown rendering
- The Node Admin UI itself (form, table, import dialogs)

### Technical Details

**Auth hook pattern:**
```text
// use-auth.ts
- Set up onAuthStateChange listener BEFORE calling getSession()
- Return { user, session, loading, signOut }
```

**Edge function JWT validation:**
```text
const authHeader = req.headers.get('Authorization')
// Extract token, call getClaims(token)
// Check user_roles with service role client
```

**Google sign-in:**
```text
import { lovable } from "@/integrations/lovable/index";
await lovable.auth.signInWithOAuth("google", {
  redirect_uri: window.location.origin,
});
```

**adminFetch update:**
```text
// Old: sends x-admin-password header
// New: sends Authorization: Bearer <access_token> header
```

