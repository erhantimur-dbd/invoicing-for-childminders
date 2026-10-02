# Supabase Auth email templates

Paste each file into **Authentication → Emails → Templates** in the Supabase dashboard. Platform pastes them only after #29 is promoted and `https://www.godottie.cloud/email/go-dottie-mark.png` returns 200 `image/png` (check with curl). Do not add them to `supabase/config.toml`. The mark URL in these files is hardcoded to that address. There is no storage bucket and no placeholder to replace.

Sender name for every template: **Go Dottie**

`{{ .ConfirmationURL }}` must stay exactly as it is. Do not replace it with a link you build from `{{ .SiteURL }}`, `{{ .TokenHash }}`, or `{{ .RedirectTo }}`. Do not change the redirect URLs.

| Dashboard template | Subject | File |
| --- | --- | --- |
| Confirm signup | Confirm your Go Dottie email | `confirmation.html` |
| Magic link | Your Go Dottie sign-in link | `magic-link.html` |
| Reset password | Reset your Go Dottie password | `recovery.html` |
| Invite user | You are invited to Go Dottie | `invite.html` |
| Change email address | Confirm your new Go Dottie email | `email-change.html` |
| Reauthentication | Your Go Dottie code | `reauthentication.html` |

Do not paste the older files in `supabase-email-templates/`. Those still use the green header.
