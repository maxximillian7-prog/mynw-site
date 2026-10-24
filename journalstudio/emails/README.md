# Journal Studio transactional email setup

These templates are ready for **Supabase Auth**, with the correct Go template
variable `{{ .ConfirmationURL }}`. They contain no tracking pixels or credentials.

## Sender (Supabase → Authentication → SMTP Settings)

- Custom SMTP: Enabled
- SMTP host: `mail.privateemail.com`
- Port: `465` (SSL) or `587` (STARTTLS), depending on the form's encryption settings
- Sender name: `Journal Studio · MyNow Apps`
- Sender email: `support@mynw.app`
- SMTP username: `support@mynw.app`
- SMTP password: **The mailbox's master/app password. Enter only in the Supabase dashboard secret field; do not commit it to Git.**

The mailbox provider is Namecheap Private Email.

## Authentication email templates (Supabase → Authentication → Email Templates)

| Type | Subject | File |
| --- | --- | --- |
| Invite user | You're Invited to Join Journal Studio | `invite.html` |
| Reset password | Reset Your Journal Studio Password | `recovery.html` |
| Confirm signup | Confirm Your Journal Studio Email | `confirmation.html` |

Copy the complete HTML of each file into the respective Supabase Auth template editor.
Hosted Supabase does **not** automatically read these files from GitHub.

## Redirects (Supabase → Authentication → URL Configuration)

Set Site URL and allowed Redirect URL to:
`https://mynw.app/journalstudio/cloud/`

The `studio-api` Edge Function sends invitations with this explicit redirect.
The site routes invite and recovery sessions to its author onboarding page.

## Deliverability & verification

1. Confirm SPF, DKIM and DMARC for the `mynw.app` mailbox domain in your DNS provider.
2. Do not enable email link-click tracking: it can modify or consume Auth links.
3. Send a test invite to a new non-team address.
4. Confirm displayed sender, delivery, one-click activation, author-only account access.
5. Check a password reset link; do not reuse a consumed invitation token.
6. If SMTP authentication fails, create a dedicated Namecheap app password for this mailbox.

Docs: https://supabase.com/docs/guides/auth/auth-smtp
https://supabase.com/docs/guides/auth/auth-email-templates
https://www.namecheap.com/support/knowledgebase/article.aspx/1179/2175/general-private-email-configuration-for-mail-clients-and-mobile-devices/
