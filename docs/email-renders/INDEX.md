# Go Dottie email renders

Light PNGs are 700px wide, full page. Dark PNGs use Playwright `colorScheme: 'dark'` so `prefers-color-scheme: dark` applies. Screenshots load `public/email/go-dottie-mark.png` for the mark. Transactional HTML uses the configured site URL, which is `https://www.godottie.cloud/email/go-dottie-mark.png` outside Preview. Auth templates hardcode that same production URL.

Dummy data: Sam Taylor / Ava / Jordan Patel / INV-0042 £120.00. Subscription start date: 2 October 2026.

## welcomeEmail

- Subject: Welcome to Go Dottie, Sam
- Trigger: Childminder signs up (welcome)
- Files: `welcomeEmail.html`, `welcomeEmail.png`, `welcomeEmail-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass (not a parent email)

## paymentReminderEmail-reminder

- Subject: Reminder: invoice INV-0042 from Sam Taylor
- Trigger: Hourly generate-invoices cron → sendDueReminders, invoice status=sent, reminder next_send_at passed
- Files: `paymentReminderEmail-reminder.html`, `paymentReminderEmail-reminder.png`, `paymentReminderEmail-reminder-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass

## paymentReminderEmail-overdue

- Subject: Overdue: invoice INV-0042 from Sam Taylor
- Trigger: Hourly generate-invoices cron → sendDueReminders, invoice status=overdue
- Files: `paymentReminderEmail-overdue.html`, `paymentReminderEmail-overdue.png`, `paymentReminderEmail-overdue-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass

## paymentReceivedEmail

- Subject: Payment received for invoice INV-0042
- Trigger: Childminder marks invoice paid
- Files: `paymentReceivedEmail.html`, `paymentReceivedEmail.png`, `paymentReceivedEmail-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass

## escalationEmail

- Subject: Needs you: Jordan Patel (Ava)
- Trigger: Enquiry sync: Go Dottie not confident / safeguarding hold → email to childminder
- Files: `escalationEmail.html`, `escalationEmail.png`, `escalationEmail-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass (not a parent email)

## placeOfferEmail

- Subject: Place offered for Ava — complete signup
- Trigger: Childminder offers a place → parent signup form link
- Files: `placeOfferEmail.html`, `placeOfferEmail.png`, `placeOfferEmail-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass

## childOnboardedEmail

- Subject: Ava is onboarded
- Trigger: Parent completes signup form → email to childminder
- Files: `childOnboardedEmail.html`, `childOnboardedEmail.png`, `childOnboardedEmail-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass (not a parent email)

## subscriptionConfirmEmail

- Subject: Your Go Dottie plan is confirmed
- Trigger: Subscription confirmation template. No sender calls it on this branch.
- Files: `subscriptionConfirmEmail.html`, `subscriptionConfirmEmail.png`, `subscriptionConfirmEmail-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass (not a parent email)

## invoiceSend

- Subject: Invoice INV-0042 from Sam Taylor — £120.00
- Trigger: Childminder clicks Send on an invoice (POST /api/invoices/send) → parent
- Files: `invoiceSend.html`, `invoiceSend.png`, `invoiceSend-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass

## contactInboxNotice

- Subject: [Contact] Question about funded hours
- Trigger: Contact form POST /api/contact → support@godottie.cloud (from "Go Dottie contact form <hello@godottie.cloud>")
- Files: `contactInboxNotice.html`, `contactInboxNotice.png`, `contactInboxNotice-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass (not a parent email)

## contactAutoReply

- Subject: Got your message
- Trigger: Contact form POST /api/contact → auto-reply to the sender (from "Go Dottie <hello@godottie.cloud>"). Signed "The Go Dottie team". The form has no childminder or setting name, so the body is an acknowledgement and does not sell Go Dottie.
- Files: `contactAutoReply.html`, `contactAutoReply.png`, `contactAutoReply-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass

## weeklyDraftDigest

- Subject: 3 draft invoices generated — w/c 21 Sept – 27 Sept 2026
- Trigger: Hourly generate-invoices cron, on each childminder's invoice_day/invoice_hour (UTC) when at least 1 draft is created → childminder profile.email
- Files: `weeklyDraftDigest.html`, `weeklyDraftDigest.png`, `weeklyDraftDigest-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass (not a parent email)

## authConfirmSignup

- Subject: Confirm your Go Dottie email
- Trigger: Supabase Auth confirm signup. Paste supabase/templates/auth/confirmation.html into the dashboard.
- Files: `authConfirmSignup.html`, `authConfirmSignup.png`, `authConfirmSignup-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass (not a parent email)

## authMagicLink

- Subject: Your Go Dottie sign-in link
- Trigger: Supabase Auth magic link. Paste supabase/templates/auth/magic-link.html into the dashboard.
- Files: `authMagicLink.html`, `authMagicLink.png`, `authMagicLink-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass (not a parent email)

## authResetPassword

- Subject: Reset your Go Dottie password
- Trigger: Supabase Auth reset password. Paste supabase/templates/auth/recovery.html into the dashboard.
- Files: `authResetPassword.html`, `authResetPassword.png`, `authResetPassword-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass (not a parent email)

## authInviteUser

- Subject: You are invited to Go Dottie
- Trigger: Supabase Auth invite user. Paste supabase/templates/auth/invite.html into the dashboard.
- Files: `authInviteUser.html`, `authInviteUser.png`, `authInviteUser-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass (not a parent email)

## authChangeEmail

- Subject: Confirm your new Go Dottie email
- Trigger: Supabase Auth change email address. Paste supabase/templates/auth/email-change.html into the dashboard.
- Files: `authChangeEmail.html`, `authChangeEmail.png`, `authChangeEmail-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass (not a parent email)

## authReauthentication

- Subject: Your Go Dottie code
- Trigger: Supabase Auth reauthentication. Paste supabase/templates/auth/reauthentication.html into the dashboard.
- Files: `authReauthentication.html`, `authReauthentication.png`, `authReauthentication-dark.png`
- bare Dottie: pass
- #059669: pass
- emoji: pass
- no "trial": pass
- no "receipt": pass
- no "we'll remind you before renewal": pass
- prices only £160, £208 or £280 (no £244, no monthly): pass
- parent voice: pass (not a parent email)
