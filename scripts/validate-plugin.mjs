#!/usr/bin/env node
// Validates this single-plugin repository against the Cursor plugin conventions:
// manifest fields, referenced paths, mcp.json shape, and frontmatter on rules/skills/agents/commands.
// Adapted from https://github.com/cursor/plugin-template/blob/main/scripts/validate-template.mjs

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const errors = [];
const warnings = [];
const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

const exists = (p) => fs.access(p).then(() => true, () => false);

async function readJson(file, label) {
  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    errors.push(`${label} is missing: ${path.relative(root, file)}`);
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    errors.push(`${label} is not valid JSON: ${e.message}`);
    return null;
  }
}

function parseFrontmatter(content) {
  const text = content.replace(/\r\n/g, "\n");
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return null;
  const fields = {};
  for (const line of text.slice(4, end).split("\n")) {
    const i = line.indexOf(":");
    if (i === -1 || line.trim().startsWith("#")) continue;
    fields[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return fields;
}

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

async function checkFrontmatter(dir, label, requiredKeys, filter) {
  if (!(await exists(dir))) return;
  for (const file of await walk(dir)) {
    if (!filter(file)) continue;
    const rel = path.relative(root, file);
    const fm = parseFrontmatter(await fs.readFile(file, "utf8"));
    if (!fm) {
      errors.push(`${label} missing YAML frontmatter: ${rel}`);
      continue;
    }
    for (const key of requiredKeys) {
      if (!fm[key]) errors.push(`${label} missing "${key}" in frontmatter: ${rel}`);
    }
    if (label === "skill" && fm.name && fm.name !== path.basename(path.dirname(file))) {
      errors.push(`skill "name" (${fm.name}) does not match its folder name: ${rel}`);
    }
  }
}

const manifest = await readJson(path.join(root, ".cursor-plugin", "plugin.json"), "Plugin manifest");
if (manifest) {
  if (typeof manifest.name !== "string" || !pluginNamePattern.test(manifest.name)) {
    errors.push('plugin.json "name" must be lowercase kebab-case.');
  }
  for (const field of ["displayName", "version", "description", "license", "author"]) {
    if (!manifest[field]) warnings.push(`plugin.json has no "${field}".`);
  }
  if (manifest.version && !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    errors.push(`plugin.json "version" must be semver (got "${manifest.version}").`);
  }
  for (const field of ["logo", "rules", "skills", "agents", "commands", "hooks", "mcpServers"]) {
    const value = manifest[field];
    if (typeof value !== "string") continue;
    if (path.isAbsolute(value) || value.split(/[\\/]/).includes("..")) {
      errors.push(`plugin.json "${field}" must be a relative path inside the plugin (got "${value}").`);
    } else if (!(await exists(path.join(root, value)))) {
      errors.push(`plugin.json "${field}" references a missing path: ${value}`);
    }
  }
}

const mcp = await readJson(path.join(root, "mcp.json"), "mcp.json");
if (mcp) {
  const servers = mcp.mcpServers;
  if (!servers || typeof servers !== "object" || Object.keys(servers).length === 0) {
    errors.push('mcp.json must contain a non-empty "mcpServers" object.');
  } else {
    for (const [name, server] of Object.entries(servers)) {
      if (!server.url && !server.command) errors.push(`mcp.json server "${name}" needs a "url" or a "command".`);
      if (server.url && !/^https:\/\//.test(server.url)) errors.push(`mcp.json server "${name}" url must use https.`);
    }
  }
}

const md = (f) => /\.(md|mdc|markdown)$/i.test(f);
await checkFrontmatter(path.join(root, "rules"), "rule", ["description"], md);
await checkFrontmatter(path.join(root, "skills"), "skill", ["name", "description"], (f) => path.basename(f) === "SKILL.md");
await checkFrontmatter(path.join(root, "agents"), "agent", ["name", "description"], md);
await checkFrontmatter(path.join(root, "commands"), "command", ["name", "description"], (f) => md(f) || f.endsWith(".txt"));

for (const w of warnings) console.log(`warning: ${w}`);
if (errors.length) {
  console.error("Validation failed:");
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}
console.log("Validation passed.");
