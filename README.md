# Findymail for Cursor

Verified B2B emails, phone numbers and lead lists inside Cursor's agent, powered by [Findymail](https://www.findymail.com).

The plugin ships the Findymail MCP server connection plus three skills and a rule that teach the agent which tool to reach for, how the tools chain, and what each call costs. Install it, sign in once, and ask in plain language.

## Skills

| Skill | What it does |
|-------|-------------|
| [Email finder](./skills/email-finder/) | Verified work emails for one person, a CSV of people, or the roles you name at a company |
| [Lead list generation](./skills/lead-list-generation/) | Companies and decision-maker contacts from a plain-language ICP, or lookalikes of a seed company, with exclusion lists |
| [Email verification](./skills/email-verification/) | Deliverability checks on imported lists, and reverse lookup of who is behind an address |

## Install

### From the Cursor Marketplace

Open **Cursor Settings > Plugins**, search for **Findymail**, and install. Then start a new agent thread: Cursor loads a plugin's skills, rules and MCP servers at session start.

### As a team marketplace

In the Cursor dashboard, open **Plugins > Team Marketplaces > Add Marketplace > Import from Repo** and enter `Findymail/findymail-cursor-plugin`. The repo carries a `.cursor-plugin/marketplace.json`, so the plugin shows up for everyone on the team.

### From this repository, for local testing

Copy the plugin into Cursor's local plugin folder and restart Cursor. Cursor ignores symlinks that point outside that folder, so it has to be a real copy:

```bash
git clone https://github.com/Findymail/findymail-cursor-plugin.git
./findymail-cursor-plugin/scripts/install-local.sh
```

## Sign in

The first time the agent calls a Findymail tool, Cursor opens your browser on Findymail's sign-in page. Approve the connection and it is reused in every later session. There is no API key to paste.

If the tools stop responding with an authentication error, open **Cursor Settings > MCP**, find the `findymail` server, and reconnect.

### Using an API key instead

For a machine without a browser, or a scripted setup, point Cursor at the same server with your Findymail API token as a bearer header. Add this to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project); it takes precedence over the plugin's own connection:

```json
{
  "mcpServers": {
    "findymail": {
      "type": "http",
      "url": "https://mcp.findymail.com/mcp",
      "headers": {
        "Authorization": "Bearer ${env:FINDYMAIL_API_KEY}"
      }
    }
  }
}
```

Create a token at [app.findymail.com/user/api-tokens](https://app.findymail.com/user/api-tokens) and export it as `FINDYMAIL_API_KEY` before launching Cursor. Do not commit the key.

## Try it

- "Find the email of Jane Doe at stripe.com"
- "Here's leads.csv with names and companies. Add their work emails."
- "Build me a list of 100 mid-market logistics companies in the UK with their Head of Operations and emails"
- "Verify the emails in signups.csv before I add them to the sequence"
- "Who is behind m.rossi@brembo.com?"

## Tools and credits

The MCP server exposes 14 tools. Lookups that find nothing are free.

| Tool | Cost |
|------|------|
| `find_email` | 1 finder credit per email found |
| `find_employees` | 1 finder credit per contact returned |
| `find_phone` | 10 finder credits per number found |
| `verify_email` | 1 verifier credit per check (separate pool) |
| `reverse_email_lookup` | 1 finder credit, 2 with the full profile |
| `enrich_company` | 1 finder credit per company found |
| `generate_lead_list` | 1 credit per 10 companies (broad) or per company (targeted), plus 1 per contact, 1 per email, 10 per phone |
| `get_lead_list_results` | Free |
| `lookalike_search` | 1 finder credit per 10 results |
| `list_exclusion_lists`, `create_exclusion_list`, `list_exclusion_domains`, `add_exclusion_domains`, `remove_exclusion_domains` | Free |

The bundled rule makes the agent state the maximum cost and ask before any run that can spend more than 25 credits, and never call `find_phone` unless you asked for phone numbers.

## Structure

```
.cursor-plugin/plugin.json   plugin manifest
.cursor-plugin/marketplace.json  marketplace manifest (lets the repo be added as a marketplace)
mcp.json                     the Findymail MCP server connection
rules/                       tool selection, chaining and cost guardrails
skills/                      one folder per skill above
assets/                      logo
scripts/validate-plugin.mjs  manifest and frontmatter checks, run in CI
```

## Development

```bash
node scripts/validate-plugin.mjs
```

The same check runs on every push and pull request. To test a change in Cursor, run `scripts/install-local.sh` to copy the plugin into `~/.cursor/plugins/local/findymail`, then restart Cursor.

## Links

- [Findymail API docs](https://app.findymail.com/docs)
- [Cursor plugin docs](https://cursor.com/docs/plugins)

## License

MIT. See [LICENSE](./LICENSE).
