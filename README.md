Entry page for https://kuttenc.github.io/.

GitHub Pages serves the static HTML, CSS, and JavaScript only. Account registration, WhatsApp code verification, sessions, created links, click records, and payout requests use the existing Supabase Edge Function and database. The public homepage forwards to the canonical Urtador interface at `/urtador/`; both addresses share the same browser origin and authentication session. Unknown root paths also forward to `/urtador/<slug>`, so existing and root-form short links use one redirect implementation.

Short links continue to resolve through the existing /urtador/ deployment. Unauthenticated visitors can draft a destination on this page; the browser temporarily preserves it while the person signs in, and the link is saved to Supabase only after successful authentication.
