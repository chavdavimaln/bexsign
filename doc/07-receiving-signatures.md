# 07 — Received Requests

What a signed-in user sees when somebody else asks them to sign. The external, no-account experience is
[08 — Signing](08-signing.md).

## Where they appear

- **Received → All Received** — every request where the user is a recipient.
- **Received → Needs Action** — the ones waiting on them right now.
- The **notification bell** raises a `signing` notification with a direct link when their turn begins.
- The invitation email links straight to the signing page.

## What the user can do

| Action | Notes |
|---|---|
| Open and sign | Only when it is their turn; in an ordered request an earlier step must finish first |
| Decline | With a reason; the request closes and the sender is told |
| Assign to someone else | Hands the turn over, recorded as delegated |
| Print and physically sign | Upload a scanned signed copy instead of signing on screen |
| Download | The document as it stands, and the signed copy once complete |

## Turn and visibility rules

- With **Send in order**, a recipient is emailed only after the previous step has signed.
- Recipients sharing a step number act at the same time.
- A recipient normally sees only their own fields; in the *"showing completed fields"* flow they also see, read-only,
  what earlier recipients filled in.

## Once everybody has signed

The request becomes Completed, and every party — signers and copy recipients — is emailed the signed documents and
the certificate of completion.
