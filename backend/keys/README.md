# Keys — never commit real files here

This directory is git-ignored except for this README. It should contain:

- `qr_private.pem` / `qr_public.pem` — ES256 keypair for signing QR tokens (see `docs/SECURITY.md`)
- `fcm-service-account.json` — Firebase service account credentials

Generate the keypair once, share both files with your partner via password manager or Signal — never commit, never Slack/WhatsApp.

```bash
openssl ecparam -genkey -name prime256v1 -noout -out qr_private.pem
openssl ec -in qr_private.pem -pubout -out qr_public.pem
```
