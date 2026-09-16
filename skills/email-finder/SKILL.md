---
name: email-finder
description: Find verified work email addresses for one person, a list of people from a CSV or spreadsheet, or the people holding given job titles at a company, using the Findymail tools find_email, find_employees, enrich_company and find_phone. Use when the user asks to find, get or look up someone's email, enrich a contact list with emails, or reach specific roles at a company.
---

# Email finder

Turn a person (or a list of people) into verified work emails. Findymail verifies every address before returning it, so a result is either a deliverable email or "not found". There are no guesses to clean up afterwards.

## Inputs this skill accepts

- One person: a full name plus a company (domain or name), or a LinkedIn profile URL.
- A list: a CSV, spreadsheet, or inline list of people with any of those fields per row.
- A company plus roles: "the CTO and VP Engineering at acme.com".

## Tools and cost

| Tool | Use it for | Cost |
|------|-----------|------|
| `find_email` | One person -> verified email | 1 finder credit if found, free if not |
| `find_employees` | Company + job titles -> contacts (name, title, LinkedIn URL, no email) | 1 finder credit per contact returned |
| `enrich_company` | Company name -> domain (only when the domain is unknown) | 1 finder credit if found |
| `find_phone` | LinkedIn URL -> phone number, only on explicit request | 10 finder credits if found |

Every tool handles one record per call. There is no batch endpoint.

## Workflow

### 1. Parse and normalize the input

For each row, extract: `name`, `company` (domain or name), `linkedin_url`.

- Normalize domains: lowercase, strip the protocol, path and `www.` (`https://www.acme.com/about` -> `acme.com`).
- Free-mail domains (gmail.com, outlook.com, yahoo.com, hotmail.com, icloud.com) are not employers. Ask for the company instead.
- If a row has only a company name, resolve it to a domain once per company with `enrich_company` (1 credit) and cache the answer. When the name is ambiguous ("Apollo", "Mercury"), ask the user which company they mean before spending.
- Deduplicate on `linkedin_url`, then on the pair (`name`, `domain`).

### 2. Estimate and confirm

Maximum spend is 1 credit per row (plus 1 per company resolved by name). For more than 25 rows, tell the user the row count and the maximum credits before starting, and wait for a go-ahead.

### 3. Look up each person

Call `find_email` once per row:

- Prefer `linkedin_url` when the row has one. It is the most reliable identifier.
- Otherwise pass `name` and `domain`. Both are required together.
- Record the result as `found` (with the email), `not_found`, or `error` (with the message). Keep going after individual errors.
- Do not call `verify_email` on the result. Addresses from `find_email` are already verified.
- Never fill a gap with a pattern guess such as `first.last@domain.com`. Not found is the answer.

### 4. Company plus roles

When the user names a company and roles rather than people:

1. `find_employees` with `website` (the domain), `job_titles` (up to 10 titles, each under 50 characters), and `count` (1 to 5). Each contact returned costs 1 credit.
2. For each contact, `find_email` with the returned `linkedin_url`.
3. `count` caps at 5 per call. To reach more people, split the titles across calls, or run `generate_lead_list` through the lead-list-generation skill when the target is many companies.

### 5. Phone numbers

Only when the user asked for phones. `find_phone` takes a `linkedin_url` (from the input, from `find_employees`, or from `reverse_email_lookup`) and costs 10 credits per number found. State the maximum cost (10 x rows) and confirm before the first call.

### 6. Deliver

- File input: write `<original-name>-enriched.csv` next to the input, keeping every original column and adding `email`, `email_status` (`found`, `not_found`, `error`), and `phone` when requested. Never overwrite the original file.
- Inline input: reply with a markdown table.
- Finish with counts: rows processed, emails found, not found, errors, and the maximum credits spent.

### Long lists

Write the output file every 20 rows so an interrupted session loses nothing. On resume, skip rows whose `email_status` is already `found` or `not_found`, and retry only `error` rows.

## Errors

- 402 "Not enough credits": stop and tell the user to top up at https://app.findymail.com. Deliver the partial results.
- 429 "Too Many Attempts": pause briefly and retry the same row.
- 401: the Findymail sign-in expired. Ask the user to reconnect the MCP server in Cursor settings.

## Example prompts

- "Find the email of Jane Doe at stripe.com"
- "Here's leads.csv with names and companies. Add their work emails."
- "Get me the CTO and Head of Data at notion.so with their emails"
- "Find emails for these 3 LinkedIn profiles, and phone numbers if you can"
