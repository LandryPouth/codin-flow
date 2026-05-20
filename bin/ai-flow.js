#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const templatesRoot = path.join(packageRoot, "templates");
const cwd = process.cwd();

const args = process.argv.slice(2);
const command = args[0] || "help";
const flags = new Set(args.slice(1));

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

function ensureTemplatesExist() {
  if (!fs.existsSync(templatesRoot)) {
    fail(`templates directory not found: ${templatesRoot}`);
  }
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function copyTemplates({ force = false, dryRun = false } = {}) {
  ensureTemplatesExist();

  const files = walkFiles(templatesRoot);
  const copied = [];
  const skipped = [];

  for (const source of files) {
    const relativePath = path.relative(templatesRoot, source);
    const target = path.join(cwd, relativePath);
    const targetExists = fs.existsSync(target);

    if (targetExists && !force) {
      skipped.push(relativePath);
      continue;
    }

    copied.push(relativePath);

    if (!dryRun) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
    }
  }

  const skillsRoot = path.join(templatesRoot, ".claude", "skills");
  if (fs.existsSync(skillsRoot)) {
    for (const source of walkFiles(skillsRoot)) {
      const relativeSkillPath = path.relative(skillsRoot, source);
      const relativePath = path.join(".agents", "skills", relativeSkillPath);
      const target = path.join(cwd, relativePath);
      const targetExists = fs.existsSync(target);

      if (targetExists && !force) {
        skipped.push(relativePath);
        continue;
      }

      copied.push(relativePath);

      if (!dryRun) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(source, target);
      }
    }
  }

  return { copied, skipped };
}

function doctor() {
  const skillNames = [
    "agent-orchestrator",
    "agent-context-scout",
    "agent-planner",
    "agent-worker-fullstack",
    "agent-worker-tests",
    "agent-validator-architecture",
    "agent-validator-tests",
    "agent-validator-security",
    "plan-epic",
    "quick-story",
    "run-story",
    "run-story-secure",
    "grill-me",
    "write-story",
    "implement-slice",
    "review-codebase",
    "architecture-check",
    "tdd",
    "e2e-check",
    "tests-check",
    "security-check",
    "blueprint-epic-index",
    "blueprint-story",
    "blueprint-tasks",
    "blueprint-decisions",
    "blueprint-tests",
    "blueprint-implementation-notes"
  ];

  const required = [
    "PROJECT_RULES.md",
    "AGENT_RULES.md",
    "docs/project-context.md",
    "docs/architecture.md",
    "docs/conventions.md",
    "docs/roadmap.md",
    "CLAUDE.md",
    ...skillNames.flatMap((name) => [
      `.claude/skills/${name}/SKILL.md`,
      `.agents/skills/${name}/SKILL.md`
    ])
  ];

  const missing = required.filter((file) => !fs.existsSync(path.join(cwd, file)));

  if (missing.length === 0) {
    log("Coding Flow is installed correctly.");
    return;
  }

  log("Coding Flow is missing required files:");
  for (const file of missing) {
    log(`- ${file}`);
  }

  process.exitCode = 1;
}

function printHelp() {
  log(`Coding Flow

Usage:
  coding-flow init [--force] [--dry-run]
  coding-flow doctor
  coding-flow help

Commands:
  init      Install Claude/Codex workflow files into the current project.
  doctor    Check whether the workflow files are installed.
  help      Show this help message.

Flags:
  --force    Overwrite existing files.
  --dry-run  Show what would be copied without writing files.
`);
}

if (command === "init") {
  const result = copyTemplates({
    force: flags.has("--force"),
    dryRun: flags.has("--dry-run")
  });

  if (flags.has("--dry-run")) {
    log("Dry run complete.");
  } else {
    log("Coding Flow installed.");
  }

  log(`Copied: ${result.copied.length}`);

  if (result.skipped.length > 0) {
    log(`Skipped existing files: ${result.skipped.length}`);
    log("Use --force to overwrite them.");
  }
} else if (command === "doctor") {
  doctor();
} else if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
} else {
  fail(`unknown command "${command}". Run "coding-flow help".`);
}
