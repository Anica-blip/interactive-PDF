/**
 * auth-guard.js — Interactive PDF Builder Auth Guard v1.0
 * ─────────────────────────────────────────────────────────────────────────────
 * Protects the builder (public/index.html). Same GitHub sign-in and same
 * Supabase project (Aurion 3C Mascot) as the other 3C tools: no new sign-in
 * system and no second password. Only the owner account gets in.
 *
 * HOW IT IS WIRED IN (public/index.html), already in place at the top of <head>:
 *
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
 *   <script src="./auth-guard.js"></script>
 *
 * It exposes its signed-in client as window.sbAuthClient so supabaseAPI.js
 * can send the owner's sign-in with every save (the pdf_projects table accepts
 * writes only from the owner).
 * ─────────────────────────────────────────────────────────────────────────────
 * Designed and Built with ❤️ by Claude (Anthropic) × Chef Anica
 * 3C Thread To Success™ Cooking Lab 🧪👨‍🍳
 */

// ─── CONFIG ───────────────────────────────────────────────────────────────
const AUTH_CONFIG = {
  supabaseUrl: 'https://cgxjqsbrditbteqhdyus.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNneGpxc2JyZGl0YnRlcWhkeXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExMTY1ODEsImV4cCI6MjA2NjY5MjU4MX0.xUDy5ic-r52kmRtocdcW8Np9-lczjMZ6YKPXc03rIG4',   // ← Supabase → Settings → API → anon public
  loginPage:   'https://builder.3c-public-library.org/login.html'
};
// ─────────────────────────────────────────────────────────────────────────────

// Immediately hide page to prevent flash of protected content
document.documentElement.style.visibility = 'hidden';

(async function guardPage() {
  try {
    const client = supabase.createClient(AUTH_CONFIG.supabaseUrl, AUTH_CONFIG.supabaseKey);
    window.sbAuthClient = client; // shared with supabaseAPI.js (one client, one session)
    const { data: { session } } = await client.auth.getSession();

    // No session — send to login
    if (!session) { redirectToLogin(); return; }

    // Signed in is not enough: it must be the owner's account.
    // is_owner() is a small database function (no email is kept in this file).
    const { data: isOwner, error: ownerError } = await client.rpc('is_owner');
    if (ownerError || isOwner !== true) {
      await client.auth.signOut({ scope: 'local' });
      redirectToLogin('not_owner');
      return;
    }

    // ✅ Owner session — reveal the page
    document.documentElement.style.visibility = 'visible';

  } catch (err) {
    console.error('[auth-guard] Error:', err);
    redirectToLogin();
  }

  function redirectToLogin(reason) {
    const next = encodeURIComponent(window.location.href);
    const sep  = AUTH_CONFIG.loginPage.includes('?') ? '&' : '?';
    window.location.replace(
      `${AUTH_CONFIG.loginPage}${sep}next=${next}${reason ? '&reason=' + reason : ''}`
    );
  }
})();
