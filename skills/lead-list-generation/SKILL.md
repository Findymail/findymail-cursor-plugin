---
name: lead-list-generation
description: Build a list of target companies and decision-maker contacts from a plain-language ideal customer profile, or find lookalikes of a seed company, using the Findymail tools generate_lead_list, get_lead_list_results, lookalike_search and the exclusion-list tools. Use when the user asks to generate leads, build a prospect or target-account list, find companies similar to one they name, or keep existing customers and competitors out of prospecting.
---

# Lead list generation

Findymail turns a description of your ideal customer into companies, then into named contacts with verified emails. The search is semantic: you describe the companies the way you would brief a colleague, not with filter syntax.

## Pick the entry point

| The user has | Start with |
|--------------|-----------|
| A description of the companies they want | `generate_lead_list` |
| One or more example companies ("companies like stripe.com") | `lookalike_search` |
| A list of companies and needs people at each | `find_employees` (see the email-finder skill) |

## Tools and cost

| Tool | Cost |
|------|------|
| `generate_lead_list` | `broad` mode: 1 credit per 10 companies. `targeted` mode: 1 credit per company. Plus 1 per contact found, 1 per email found, 10 per phone found. |
| `get_lead_list_results` | Free |
| `lookalike_search` | 1 credit per 10 results |
| `list_exclusion_lists`, `create_exclusion_list`, `list_exclusion_domains`, `add_exclusion_domains`, `remove_exclusion_domains` | Free |

## Workflow

### 1. Write the query

`generate_lead_list` takes a `query` of up to 1000 characters. Describe the company, not a filter set:

- Good: "B2B SaaS companies headquartered in France or Germany with 50 to 500 employees that sell HR or payroll software to mid-market companies."
- Good: "Series A to C fintech startups in the US that offer lending or credit products to small businesses."
- Weak: "industry=fintech AND country=US AND size>50". Boolean syntax is not understood.

Include whatever the user knows: industry and sub-industry, business model, geography, size, funding stage, technologies, and any signal such as "recently hired a VP of Sales". Ask for the missing piece when the brief is too thin to search on.

### 2. Validate before scaling

Run a small pass first:

- `limit`: 10 to 20
- `mode`: `targeted`
- `find_contact`: `false`

Show the user the companies. If they are off, refine the query and run again. Only scale up once the sample looks right. Never launch a second run for the same query while the first is still processing: each run is billed.

### 3. Choose mode and enrichment for the full run

- `broad`: fast export, 1 credit per 10 companies, matches loosely. Use for large exports the user will filter themselves.
- `targeted`: AI-qualified, 1 credit per company, matches strictly. Use when every row should fit the brief.
- `find_contact` + `target_job_titles`: one contact per company matching the titles (+1 credit per contact found). Default titles are `["CEO"]`. Set the titles the user actually sells to.
- `find_email`: +1 credit per email found. Requires `find_contact`.
- `find_phone`: +10 credits per phone found. Requires `find_contact`. Only when the user asked for phones.

State the maximum cost before running. Example for 200 companies, targeted, one contact with email each: 200 + 200 + 200 = 600 credits at most. Get the user's go-ahead for anything over 25 credits.

### 4. Apply exclusions

Before the full run, call `list_exclusion_lists` and ask whether existing customers, competitors or past prospects should be kept out.

- `exclusion_list_ids`: pass exactly `[0]` (every exclusion source the user can reach), exactly `[-1]` (no filtering), or real list ids from `list_exclusion_lists`. Never mix markers with real ids: `[0, 12]` silently ignores 12, `[-1, 12]` silently disables filtering.
- `add_to_exclusion_list_id`: the id of a list that every exported company domain is written to at the end of the run, so the next run never returns the same companies. Create one with `create_exclusion_list` (for example "Prospected 2026") when the user wants this. If the run fails, nothing is written.
- To exclude the user's own customer or competitor list: `add_exclusion_domains` with `domains` (up to 10,000) and an optional `list_id`. Subdomains and paths are stripped, so `careers.acme.com` excludes all of `acme.com`. The first 50 apply immediately, the rest are queued, so read the list back with `list_exclusion_domains` before a run that depends on it.
- `remove_exclusion_domains` is permanent and takes domain ids, not names. Call `list_exclusion_domains` with an explicit `list_id`, show the user what will be removed, and confirm first.

### 5. Run and poll

`generate_lead_list` returns a `hash` and nothing else. Quote the hash in your reply immediately, so the run is recoverable if the session is interrupted.

Then call `get_lead_list_results` with the hash. It waits up to 60 seconds. If the run is still processing it returns progress; call it again until it returns data. Never restart the run.

### 6. Lookalikes

`lookalike_search` takes a `seed` domain (URLs are resolved to the root domain), optional `same_country` and `same_size`, `limit` (default 100, up to 10,000), and `exclusion_list_ids` (real ids only, no `[0]` or `[-1]` markers). It returns companies only. For contacts, run `find_employees` and `find_email` per company through the email-finder skill, or feed the companies' shared traits into a `generate_lead_list` query.

### 7. Deliver

- Write `leads-<short-slug>-<YYYY-MM-DD>.csv` in the working directory with one row per company (name, domain, industry, size, location, and any other fields returned) and, when contacts were requested, the contact's name, title, LinkedIn URL, email and phone.
- Reply with a summary table of the first 10 rows, the total count, the run hash, and the maximum credits spent.
- If an `add_to_exclusion_list_id` was used, say which list now holds these domains.

## Errors

- 402 "Not enough credits": stop, keep the hash, and point the user to https://app.findymail.com to top up.
- 422 validation error: the query is over 1000 characters or the limit is out of range. Fix the input, do not retry blindly.
- 429: wait and retry the poll, never the run.

## Example prompts

- "Build me a list of 100 mid-market logistics companies in the UK with their Head of Operations and emails"
- "Find 50 companies similar to gorgias.com in the same country, excluding our customers list"
- "Generate a list of AI startups in Paris that raised a seed round, no contacts yet, I want to review the companies first"
- "Add every domain in customers.csv to our exclusion list and rerun last week's search"
