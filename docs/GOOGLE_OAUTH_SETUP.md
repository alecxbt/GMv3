# Google Sign-In Setup

To enable "Sign in with Google" (Gmail):

1. **Google Cloud Console**
   - Go to [Google Cloud Console](https://console.cloud.google.com/) and create or select a project.
   - Open **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
   - If prompted, configure the OAuth consent screen (e.g. External, add your email as test user).
   - Application type: **Web application**.
   - **Authorized redirect URIs**: add your backend callback URL, e.g.:
     - Local: `http://localhost:5001/api/auth/google/callback`
     - Production: `https://your-api-domain.com/api/auth/google/callback`
   - Copy the **Client ID** and **Client secret**.

2. **Backend `.env`**
   Add (or create) in the repo root or `backend/`:

   ```env
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   FRONTEND_URL=http://localhost:3000
   BACKEND_URL=http://localhost:5001
   ```

   For production, set `FRONTEND_URL` and `BACKEND_URL` to your real frontend and backend URLs.

3. **Restart** the backend. The login and register pages will show "Sign in with Google" when these variables are set.

If `GOOGLE_CLIENT_ID` is missing, the button still appears but the backend returns 503 when clicked.
