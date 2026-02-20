

## Implement Admin Authentication with Role-Based Access

### Overview
Replace the current shared-password admin gate with real user accounts using Lovable Cloud authentication. Admin writers will sign in via the header "Sign In" button using email/password or Google. Only users with an `admin` role in the database can access the Node Admin page.

### How It Works

**For you (the project owner):**
- You create admin accounts by adding user IDs to a `user_roles` table via the backend dashboard
- Writers sign in normally -- the system checks their role and grants or denies access to `/admin`

**For writers:**
- Click "Sign In" in the header
- Sign in with email/password or Google
- If they have the admin role, they can access Node Admin
- If not, they see a message that they don't have access (future non-admin users will be routed to the Diagnostic Journey instead)

### Database Changes

1. **Create `app_role` enum** with values: `admin`, `user`
2. **Create `user_roles` table** with `user_id` (references `auth.users`), `role` (the enum), and a unique constraint
3. **Enable RLS** on `user_roles` -- authenticated users can read their own roles
4. **Create `has_role` function** (security definer) to safely check roles without RLS recursion
5. **Create `profiles` table** with basic info (id, email, created_at) and a trigger to auto-create on signup

### Frontend Changes

| File | Change |
|---|---|
| `src/pages/Auth.tsx` | New page with email/password login, signup, and Google sign-in |
| `src/hooks/use-auth.ts` | New hook for auth state (session, user, loading, signOut) |
| `src/hooks/use-user-role.ts` | New hook to check if current user has a given role |
| `src/components/layout/AppLayout.tsx` | Wire "Sign In" button to `/auth`, show user menu when logged in |
| `src/pages/Admin.tsx` | Replace password gate with role check -- redirect to `/auth` if not logged in, show "access denied" if not admin |
| `src/hooks/use-admin.ts` | Update `adminFetch` to use JWT auth token instead of password header |
| `supabase/functions/admin-nodes/index.ts` | Validate JWT + admin role instead of password header |
| `src/App.tsx` | Add `/auth` route |

### Edge Function Auth Change

Currently the edge function checks `x-admin-password`. It will instead:
1. Extract the JWT from the `Authorization` header
2. Verify the token and get the user ID
3. Query `user_roles` to confirm the user has the `admin` role
4. Proceed or return 403

### Onboarding Admin Writers

After implementation, to add a writer as admin:
1. Have them sign up via the Sign In page
2. Find their user ID in the backend dashboard (Users section)
3. Insert a row into `user_roles`: `{ user_id: "their-id", role: "admin" }`

### What Does NOT Change
- Node data schema, search logic, public-facing pages
- Writer Guide dialog, Markdown rendering
- The Node Admin UI itself (form, table, import dialogs)

### Technical Details

**New dependencies:** `@lovable.dev/cloud-auth-js` (auto-installed when configuring Google OAuth)

**Database migration SQL:**
```text
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can read their own roles
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Edge function update:** Replace password validation with JWT extraction using the Supabase client's `auth.getUser()` method, then check `has_role` via an RPC call or direct query with the service role client.

**Auth page:** Will include a tab/toggle between Sign In and Sign Up, email + password fields, Google button, and error handling. After successful auth, redirect to the page they came from (or `/admin` if they were heading there).
