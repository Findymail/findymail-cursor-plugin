---
name: email-verification
description: Check whether email addresses are deliverable and identify the person behind an unknown address, using the Findymail tools verify_email, reverse_email_lookup and find_phone. Use when the user asks to verify, validate, clean or check emails or a list of emails before outreach, find out who owns an email address, or turn an inbound email into a name, LinkedIn profile or phone number.
---

# Email verification and reverse lookup

Two jobs, one skill:

1. **Verify**: tell whether addresses that came from elsewhere (a CRM export, a spreadsheet, a signup form) will deliver, without sending anything.
2. **Identify**: put a name, a LinkedIn profile and optionally a phone number on an address that arrived without context.

## Tools and cost

| Tool | Use it for | Cost |
|------|-----------|------|
| `verify_email` | Deliverability of one address | 1 verifier credit per check. Verifier credits are a separate pool from finder credits. |
| `reverse_email_lookup` | Who owns the address | 1 finder credit for the LinkedIn URL, 2 with `with_profile: true`, free if nobody matches |
| `find_phone` | Phone from a LinkedIn URL | 10 finder credits if found |

One address per call. There is no batch endpoint.

## Verify a list

### 1. Prepare the list, free

- Extract every address, lowercase it, and deduplicate.
- Drop anything that is not syntactically an email (no `@`, spaces, missing TLD). Mark it `malformed` without spending a credit.
- Flag role accounts (`info@`, `sales@`, `support@`, `noreply@`) in a `note` column. They can still be verified, but the user usually wants to know.
- Skip addresses that Findymail produced. Results from `find_email` and `generate_lead_list` are already verified.

### 2. Confirm the spend

Cost is 1 verifier credit per remaining address. For more than 25 addresses, state the count and wait for a go-ahead.

### 3. Verify

Call `verify_email` once per address. The response carries `verified` (true or false) and the mail `provider` (for example Google or Microsoft). Record:

- `valid` when `verified` is true
- `invalid` when `verified` is false
- `error` with the message when the call fails, and keep going

### 4. Deliver

- File input: write `<original-name>-verified.csv` next to the input with the original columns plus `email_status` (`valid`, `invalid`, `malformed`, `error`), `provider`, and `note`. Never overwrite the original.
- Inline input: a markdown table.
- Close with counts per status and the number of verifier credits used. Recommend removing `invalid` and `malformed` rows before any outreach sequence.

Write the file every 20 rows on long lists. On resume, skip rows that already have a final status and retry only `error`.

## Identify who is behind an address

1. Call `reverse_email_lookup` with the `email`.
   - `with_profile: false` (default) returns the LinkedIn URL for 1 credit.
   - `with_profile: true` also returns the profile (name, title, company) for 2 credits. Use it when the user needs more than the URL, since it saves a separate lookup.
2. A no-match is free. Personal addresses (gmail.com and similar) match less often than work addresses. Say so rather than guessing.
3. Reverse lookup says nothing about deliverability. If the goal is to reply or reach out, also run `verify_email`.
4. Phone: only when asked. Pass the returned `linkedin_url` to `find_phone` (10 credits per number found) after confirming the cost.

## Clean a CRM export end to end

When the user hands over an export and wants it "cleaned":

1. Prepare and verify every address as above.
2. For `valid` rows missing a name or company, offer to run `reverse_email_lookup` with `with_profile: true` (2 credits each) and confirm the spend.
3. Deliver one file with both sets of columns and a summary of what changed.

## Errors

- 402 "Not enough credits": stop, deliver partial results, point the user to https://app.findymail.com. Note that verifier and finder credits are bought separately.
- 429: pause and retry the same address.
- 401: ask the user to reconnect the Findymail MCP server in Cursor settings.

## Example prompts

- "Verify the emails in signups.csv before I add them to the sequence"
- "Is jane.doe@acme.com still valid?"
- "Who is behind m.rossi@brembo.com? I got a reply and don't know them"
- "Clean this HubSpot export: check every email and fill in the missing names"
