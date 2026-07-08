# Azure Deployment Guide

## Step 1 — Push to GitHub (if not already done)

```bash
cd service-database
git init
git add .
git commit -m "Initial modular Vite build"
git remote add origin https://github.com/YOUR_ORG/service-database.git
git push -u origin main
```

---

## Step 2 — Create Azure Static Web App

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search **Static Web Apps** → **Create**
3. Settings:
   - **Subscription**: your subscription
   - **Resource Group**: create new → `rg-service-database`
   - **Name**: `service-database`
   - **Region**: East US 2 (or closest)
   - **Plan type**: Free
4. **Deployment**:
   - Source: **GitHub**
   - Authorize GitHub → select your repo and branch `main`
5. **Build Details**:
   - Build Preset: **Vite**
   - App location: `/`
   - Output location: `dist`
6. Click **Review + Create** → **Create**

Azure will automatically add a GitHub Actions workflow file to your repo.

---

## Step 3 — Add Microsoft Entra SSO (Built-in, No Code Required)

1. In your Static Web App → **Settings** → **Authentication**
2. Click **Add provider** → Select **Microsoft Entra ID**
3. Enter your **Tenant ID** (IT will provide this)
4. Set **Unauthenticated action**: Redirect to login page
5. Save

This locks the entire app behind Entra SSO — **no code changes needed**.

To restrict to specific users/groups, add a `staticwebapp.config.json` to your repo root:

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "userDetailsClaim": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  },
  "routes": [
    {
      "route": "/*",
      "allowedRoles": ["authenticated"]
    }
  ]
}
```

---

## Step 4 — Move Supabase API Keys to Azure Environment Variables

**Never hardcode secrets.** Move them to Azure App Settings:

1. In your Static Web App → **Settings** → **Environment variables**
2. Add:
   - `VITE_SUPABASE_URL` = `https://hebwpxzwptfzzzdxqfvg.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `your-anon-key`

3. Update `src/lib/supabase.js`:

```js
import { createClient } from '@supabase/supabase-js';

export const _supa = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

---

## Step 5 — Update Supabase Allowed URLs

In Supabase dashboard → **Authentication** → **URL Configuration**:

- **Site URL**: `https://your-app.azurestaticapps.net`
- **Redirect URLs**: add `https://your-app.azurestaticapps.net/**`

---

## CI/CD — Automatic Deploys

After setup, every `git push` to `main` automatically:
1. Triggers GitHub Actions
2. Builds with Vite (`npm run build`)
3. Deploys `dist/` to Azure Static Web Apps

Pull Requests get their own **preview URL** automatically.

---

## Phase 2 — Full Azure Backend (Optional)

If IT requires full Azure data residency (no Supabase):

| Supabase Feature | Azure Equivalent |
|---|---|
| PostgreSQL database | Azure Database for PostgreSQL Flexible Server |
| Auth | Microsoft Entra ID (already set up above) |
| Edge Functions | Azure Functions (Node.js) |
| Realtime | Azure SignalR Service |
| Storage | Azure Blob Storage |

This is a backend re-architecture effort — plan 2-4 weeks of dev time.
