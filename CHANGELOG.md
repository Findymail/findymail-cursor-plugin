# Changelog

All notable changes to the Findymail Cursor plugin are documented here.

## 1.1.0 - Unreleased

Requires the Findymail MCP server release that adds these tools (FIN-2915).

- Rule `findymail-tool-selection`: covers the 15 new tools (technologies, credits, contact lists, signals) and adds guardrails for monitors and irreversible deletions.
- Skill `lead-list-generation`: checks the credit balance before a paid run, checks technologies against the catalog, uses job title priority tiers, saves contacts to a list, and pages through results instead of loading the whole run.

## 1.0.0 - 2026-09-16

Initial release.

- Findymail MCP server connection (`https://mcp.findymail.com/mcp`) with browser sign-in.
- Rule `findymail-tool-selection`: which tool to reach for, how they chain, what each call costs.
- Skill `email-finder`: verified emails for one person, a list, or the people holding given titles at a company.
- Skill `lead-list-generation`: company and contact lists from an ICP description or a seed company, with exclusion-list hygiene.
- Skill `email-verification`: deliverability checks on imported lists and reverse lookup of unknown addresses.
