User site for https://kuttenc.github.io/.

GitHub Pages serves the static HTML, CSS, and JavaScript only. Account registration, WhatsApp code verification, sessions, created links, click records, and payout requests use the existing Supabase Edge Function and database. The public homepage and the /urtador/ panel share the same browser origin and authentication session.

Short links continue to resolve through the existing /urtador/ deployment. Unauthenticated visitors can draft a destination on this page; the browser temporarily preserves it while the person signs in, and the link is saved to Supabase only after successful authentication.
