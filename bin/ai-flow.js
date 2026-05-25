#!/usr/bin/env node

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const templatesRoot = path.join(packageRoot, "templates");
const cwd = process.cwd();
const packageJson = require(path.join(packageRoot, "package.json"));

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

function toPortable(filePath) {
  return filePath.split(path.sep).join("/");
}

function walkFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

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

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function hashFile(filePath) {
  return hashBuffer(fs.readFileSync(filePath));
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);

  if (!match) {
    return null;
  }

  const data = {};

  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    data[key] = value;
  }

  return data;
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(`${filePath}.tmp`, filePath);
}

function listTemplateSkillNames() {
  const skillsRoot = path.join(templatesRoot, ".claude", "skills");

  if (!fs.existsSync(skillsRoot)) {
    return [];
  }

  return fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function getTemplateSpecs() {
  ensureTemplatesExist();

  const specs = [];

  for (const source of walkFiles(templatesRoot)) {
    const relativePath = toPortable(path.relative(templatesRoot, source));
    specs.push({
      source,
      sourceRel: relativePath,
      targetRel: relativePath,
      kind: "template",
    });
  }

  const skillsRoot = path.join(templatesRoot, ".claude", "skills");

  for (const source of walkFiles(skillsRoot)) {
    const relativeSkillPath = toPortable(path.relative(skillsRoot, source));
    specs.push({
      source,
      sourceRel: `.claude/skills/${relativeSkillPath}`,
      targetRel: `.agents/skills/${relativeSkillPath}`,
      kind: "mirror",
    });
  }

  return specs.sort((a, b) => a.targetRel.localeCompare(b.targetRel));
}

function manifestPath() {
  return path.join(cwd, ".coding-flow", "manifest.json");
}

function readManifest() {
  return readJson(manifestPath(), {
    version: null,
    installedAt: null,
    updatedAt: null,
    files: {},
  });
}

function buildManifestFromCurrentTargets(previous = null) {
  const files = {};

  for (const spec of getTemplateSpecs()) {
    const target = path.join(cwd, spec.targetRel);
    const sourceHash = hashFile(spec.source);

    if (fs.existsSync(target) && hashFile(target) === sourceHash) {
      files[spec.targetRel] = {
        source: spec.sourceRel,
        hash: sourceHash,
        kind: spec.kind,
      };
    } else if (previous && previous.files && previous.files[spec.targetRel]) {
      files[spec.targetRel] = previous.files[spec.targetRel];
    }
  }

  return {
    package: packageJson.name,
    version: packageJson.version,
    installedAt: previous && previous.installedAt ? previous.installedAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    files,
  };
}

function writeManifest(previous = null) {
  writeJson(manifestPath(), buildManifestFromCurrentTargets(previous));
}

function copyFileToTarget(source, targetRel, { force = false, dryRun = false } = {}) {
  const target = path.join(cwd, targetRel);
  const targetExists = fs.existsSync(target);

  if (targetExists && !force) {
    return "skipped";
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }

  return targetExists ? "updated" : "copied";
}

function copyTemplates({ force = false, dryRun = false } = {}) {
  ensureTemplatesExist();

  const copied = [];
  const updated = [];
  const skipped = [];

  for (const spec of getTemplateSpecs()) {
    const result = copyFileToTarget(spec.source, spec.targetRel, { force, dryRun });

    if (result === "copied") {
      copied.push(spec.targetRel);
    } else if (result === "updated") {
      updated.push(spec.targetRel);
    } else {
      skipped.push(spec.targetRel);
    }
  }

  if (!dryRun) {
    writeManifest(force ? null : readManifest());
  }

  return { copied, updated, skipped };
}

function syncAgentsMirror({ dryRun = false } = {}) {
  const copied = [];
  const updated = [];
  const sourceRoot = path.join(cwd, ".claude", "skills");

  if (!fs.existsSync(sourceRoot)) {
    return { copied, updated };
  }

  for (const source of walkFiles(sourceRoot)) {
    const relativeSkillPath = toPortable(path.relative(sourceRoot, source));
    const targetRel = `.agents/skills/${relativeSkillPath}`;
    const target = path.join(cwd, targetRel);
    const targetExists = fs.existsSync(target);

    if (!targetExists || hashFile(source) !== hashFile(target)) {
      if (targetExists) {
        updated.push(targetRel);
      } else {
        copied.push(targetRel);
      }

      if (!dryRun) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(source, target);
      }
    }
  }

  return { copied, updated };
}

function upgrade({ force = false, dryRun = false, json = false } = {}) {
  const previous = readManifest();
  const copied = [];
  const updated = [];
  const skippedModified = [];
  const unchanged = [];

  for (const spec of getTemplateSpecs().filter((item) => item.kind === "template")) {
    const target = path.join(cwd, spec.targetRel);
    const sourceHash = hashFile(spec.source);
    const manifestEntry = previous.files ? previous.files[spec.targetRel] : null;

    if (!fs.existsSync(target)) {
      copied.push(spec.targetRel);

      if (!dryRun) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(spec.source, target);
      }

      continue;
    }

    const currentHash = hashFile(target);

    if (currentHash === sourceHash) {
      unchanged.push(spec.targetRel);
      continue;
    }

    const safeToOverwrite = force || (manifestEntry && manifestEntry.hash === currentHash);

    if (safeToOverwrite) {
      updated.push(spec.targetRel);

      if (!dryRun) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(spec.source, target);
      }
    } else {
      skippedModified.push(spec.targetRel);
    }
  }

  const mirror = dryRun
    ? { copied: [], updated: [] }
    : syncAgentsMirror({ dryRun: false });

  if (!dryRun) {
    writeManifest(previous);
  }

  const result = {
    copied,
    updated: [...updated, ...mirror.updated],
    skippedModified,
    unchanged,
    mirrorCopied: mirror.copied,
  };

  if (json) {
    log(JSON.stringify(result, null, 2));
    return;
  }

  if (dryRun) {
    log("Upgrade dry run complete.");
  } else {
    log("Coding Flow upgraded.");
  }

  log(`Copied: ${result.copied.length}`);
  log(`Updated: ${result.updated.length}`);
  log(`Unchanged: ${result.unchanged.length}`);

  if (result.skippedModified.length > 0) {
    log(`Skipped modified files: ${result.skippedModified.length}`);
    log("Use --force only if you intentionally want to overwrite local edits.");
    for (const file of result.skippedModified) {
      log(`- ${file}`);
    }
  }
}

function collectDoctorReport({ strict = false } = {}) {
  ensureTemplatesExist();

  const skillNames = listTemplateSkillNames();
  const required = [
    "PROJECT_RULES.md",
    "AGENT_RULES.md",
    "AGENTS.md",
    ".agents/README.md",
    "docs/project-context.md",
    "docs/architecture.md",
    "docs/conventions.md",
    "docs/roadmap.md",
    "CLAUDE.md",
  ];

  const errors = [];
  const warnings = [];

  for (const spec of getTemplateSpecs()) {
    required.push(spec.targetRel);
  }

  for (const file of [...new Set(required)]) {
    if (!fs.existsSync(path.join(cwd, file))) {
      errors.push({
        code: "missing_file",
        file,
        message: `${file} is missing`,
      });
    }
  }

  for (const name of skillNames) {
    const claudeSkill = path.join(cwd, ".claude", "skills", name, "SKILL.md");
    const agentsSkill = path.join(cwd, ".agents", "skills", name, "SKILL.md");

    if (!fs.existsSync(claudeSkill)) {
      continue;
    }

    const content = fs.readFileSync(claudeSkill, "utf8");
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter) {
      errors.push({
        code: "invalid_frontmatter",
        file: toPortable(path.relative(cwd, claudeSkill)),
        message: `${toPortable(path.relative(cwd, claudeSkill))} has no valid frontmatter block`,
      });
      continue;
    }

    if (!frontmatter.name) {
      errors.push({
        code: "missing_skill_name",
        file: toPortable(path.relative(cwd, claudeSkill)),
        message: `${toPortable(path.relative(cwd, claudeSkill))} frontmatter is missing name`,
      });
    } else if (frontmatter.name !== name) {
      errors.push({
        code: "skill_name_mismatch",
        file: toPortable(path.relative(cwd, claudeSkill)),
        message: `${toPortable(path.relative(cwd, claudeSkill))} name "${frontmatter.name}" does not match folder "${name}"`,
      });
    }

    if (!frontmatter.description) {
      errors.push({
        code: "missing_skill_description",
        file: toPortable(path.relative(cwd, claudeSkill)),
        message: `${toPortable(path.relative(cwd, claudeSkill))} frontmatter is missing description`,
      });
    }

    if (content.trim().length < 120) {
      warnings.push({
        code: "small_skill_file",
        file: toPortable(path.relative(cwd, claudeSkill)),
        message: `${toPortable(path.relative(cwd, claudeSkill))} looks unusually small`,
      });
    }

    if (fs.existsSync(agentsSkill) && hashFile(claudeSkill) !== hashFile(agentsSkill)) {
      errors.push({
        code: "mirror_mismatch",
        file: toPortable(path.relative(cwd, agentsSkill)),
        message: `${toPortable(path.relative(cwd, agentsSkill))} does not match ${toPortable(path.relative(cwd, claudeSkill))}`,
      });
    }
  }

  const agentsRoot = path.join(cwd, ".agents", "skills");

  if (fs.existsSync(agentsRoot)) {
    for (const entry of fs.readdirSync(agentsRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && !skillNames.includes(entry.name)) {
        warnings.push({
          code: "extra_mirror_skill",
          file: `.agents/skills/${entry.name}`,
          message: `.agents/skills/${entry.name} is not part of the installed template skill set`,
        });
      }
    }
  }

  if (strict) {
    const manifest = readJson(manifestPath(), null);

    if (!manifest) {
      errors.push({
        code: "missing_manifest",
        file: ".coding-flow/manifest.json",
        message: ".coding-flow/manifest.json is missing",
      });
    }

    for (const file of ["docs/project-context.md", "docs/architecture.md", "docs/conventions.md", "docs/roadmap.md"]) {
      const fullPath = path.join(cwd, file);

      if (fs.existsSync(fullPath) && fs.readFileSync(fullPath, "utf8").trim().length < 200) {
        warnings.push({
          code: "thin_doc",
          file,
          message: `${file} looks too thin for strict mode`,
        });
      }
    }
  }

  return {
    ok: errors.length === 0,
    root: cwd,
    version: packageJson.version,
    strict,
    skills: skillNames,
    errors,
    warnings,
  };
}

function doctor({ fix = false, json = false, strict = false } = {}) {
  if (fix) {
    copyTemplates({ force: false, dryRun: false });
    syncAgentsMirror({ dryRun: false });
    writeManifest(readManifest());
  }

  const report = collectDoctorReport({ strict });

  if (json) {
    log(JSON.stringify(report, null, 2));
  } else if (report.ok) {
    log("Coding Flow is installed correctly.");

    if (report.warnings.length > 0) {
      log("");
      log("Warnings:");
      for (const warning of report.warnings) {
        log(`- ${warning.message}`);
      }
    }
  } else {
    log("Coding Flow has installation issues:");
    for (const error of report.errors) {
      log(`- ${error.message}`);
    }

    if (report.warnings.length > 0) {
      log("");
      log("Warnings:");
      for (const warning of report.warnings) {
        log(`- ${warning.message}`);
      }
    }

    log("");
    log("Run `ai-flow doctor --fix` to restore missing files and resync the .agents mirror.");
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
}

function readTemplateSkillInfo(name) {
  const file = path.join(templatesRoot, ".claude", "skills", name, "SKILL.md");
  const content = fs.readFileSync(file, "utf8");
  const frontmatter = parseFrontmatter(content) || {};

  return {
    name,
    description: frontmatter.description || "",
  };
}

function skillGroup(name) {
  if (["quick-story", "plan-epic", "run-story", "run-story-secure"].includes(name)) {
    return "Macro";
  }

  if (name.startsWith("blueprint-") || ["agent-planner", "bootstrap-brownfield", "grill-me", "write-story"].includes(name)) {
    return "Planning";
  }

  if (name.includes("validator") || name.endsWith("-check") || name === "review-codebase") {
    return "Validation";
  }

  if (name.startsWith("agent-worker") || ["agent-context-scout", "implement-slice", "tdd"].includes(name)) {
    return "Implementation";
  }

  return "Other";
}

function listSkills({ json = false } = {}) {
  ensureTemplatesExist();

  const skills = listTemplateSkillNames().map(readTemplateSkillInfo);

  if (json) {
    log(JSON.stringify(skills, null, 2));
    return;
  }

  const groups = new Map();

  for (const skill of skills) {
    const group = skillGroup(skill.name);

    if (!groups.has(group)) {
      groups.set(group, []);
    }

    groups.get(group).push(skill);
  }

  for (const group of ["Macro", "Planning", "Implementation", "Validation", "Other"]) {
    const items = groups.get(group) || [];

    if (items.length === 0) {
      continue;
    }

    log(`${group}:`);
    for (const skill of items) {
      log(`- ${skill.name}: ${skill.description}`);
    }
    log("");
  }
}

function findDirectories(dir, predicate, maxDepth = 3, depth = 0) {
  if (!fs.existsSync(dir) || depth > maxDepth) {
    return [];
  }

  const matches = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (predicate(fullPath, entry.name)) {
        matches.push(fullPath);
      }

      matches.push(...findDirectories(fullPath, predicate, maxDepth, depth + 1));
    }
  }

  return matches;
}

function inferStoryStatus(storyDir) {
  const notesPath = path.join(storyDir, "implementation-notes.md");

  if (!fs.existsSync(notesPath)) {
    return "planned";
  }

  const content = fs.readFileSync(notesPath, "utf8");
  const statusMatch = content.match(/## Status\s+([a-zA-Z -]+)/i);

  if (statusMatch) {
    return statusMatch[1].trim().toLowerCase().replace(/\s+/g, "-");
  }

  const lower = content.toLowerCase();

  if (lower.includes("blocked") || lower.includes("stop condition")) {
    return "blocked";
  }

  if (lower.includes("pass") && lower.includes("validation")) {
    return "done";
  }

  if (content.trim().length > 160) {
    return "in-progress";
  }

  return "planned";
}

function storyTitle(storyDir) {
  const storyPath = path.join(storyDir, "story.md");

  if (!fs.existsSync(storyPath)) {
    return path.basename(storyDir);
  }

  const heading = fs.readFileSync(storyPath, "utf8").split(/\r?\n/).find((line) => line.startsWith("# "));
  return heading ? heading.replace(/^#\s+/, "").trim() : path.basename(storyDir);
}

function status({ json = false } = {}) {
  const epicsRoot = path.join(cwd, "epics");
  const epics = [];

  if (fs.existsSync(epicsRoot)) {
    for (const epicEntry of fs.readdirSync(epicsRoot, { withFileTypes: true })) {
      if (!epicEntry.isDirectory()) {
        continue;
      }

      const epicDir = path.join(epicsRoot, epicEntry.name);
      const stories = [];

      for (const storyEntry of fs.readdirSync(epicDir, { withFileTypes: true })) {
        if (storyEntry.isDirectory() && storyEntry.name.startsWith("story-")) {
          const storyDir = path.join(epicDir, storyEntry.name);
          stories.push({
            name: storyEntry.name,
            title: storyTitle(storyDir),
            status: inferStoryStatus(storyDir),
            path: toPortable(path.relative(cwd, storyDir)),
          });
        }
      }

      epics.push({
        name: epicEntry.name,
        path: toPortable(path.relative(cwd, epicDir)),
        stories,
      });
    }
  }

  if (json) {
    log(JSON.stringify({ epics }, null, 2));
    return;
  }

  if (epics.length === 0) {
    log("No epics found.");
    return;
  }

  for (const epic of epics) {
    log(epic.name);

    if (epic.stories.length === 0) {
      log("- no stories");
      log("");
      continue;
    }

    for (const story of epic.stories) {
      log(`- ${story.name.padEnd(42)} ${story.status}`);
    }
    log("");
  }
}

function detectPackageJson() {
  const packagePath = path.join(cwd, "package.json");

  if (!fs.existsSync(packagePath)) {
    return null;
  }

  return readJson(packagePath, {});
}

function bootstrapScan({ json = false, dryRun = false } = {}) {
  const pkg = detectPackageJson();
  const rootFiles = fs.readdirSync(cwd, { withFileTypes: true });
  const topDirectories = rootFiles
    .filter((entry) => entry.isDirectory() && ![".git", "node_modules"].includes(entry.name))
    .map((entry) => entry.name)
    .sort();

  const configFiles = rootFiles
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /(^\.env|config|tsconfig|vite|next|nuxt|svelte|tailwind|eslint|prettier|docker|render|vercel|package\.json|pnpm-lock|yarn\.lock|package-lock)/i.test(name))
    .sort();

  const testDirs = findDirectories(cwd, (_fullPath, name) => /^(test|tests|__tests__|e2e|specs?)$/i.test(name), 3)
    .map((dir) => toPortable(path.relative(cwd, dir)));

  const deps = pkg ? Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) }).sort() : [];
  const scripts = pkg && pkg.scripts ? pkg.scripts : {};
  const frameworks = [];

  for (const [name, pattern] of [
    ["Next.js", /^next$/],
    ["React", /^react$/],
    ["Vue", /^vue$/],
    ["Svelte", /^svelte$/],
    ["Express", /^express$/],
    ["Prisma", /^prisma$|^@prisma\/client$/],
    ["Tailwind", /^tailwindcss$/],
    ["Vitest", /^vitest$/],
    ["Jest", /^jest$/],
    ["Playwright", /^@playwright\/test$|^playwright$/],
  ]) {
    if (deps.some((dep) => pattern.test(dep))) {
      frameworks.push(name);
    }
  }

  const scan = {
    generatedAt: new Date().toISOString(),
    root: cwd,
    packageName: pkg ? pkg.name || null : null,
    detectedFrameworks: frameworks,
    scripts,
    topDirectories,
    configFiles,
    testDirectories: testDirs,
    recommendedNextPrompt:
      "Use $bootstrap-brownfield with docs/bootstrap-scan.md to fill project context, architecture, conventions, and roadmap. Do not modify application code.",
  };

  if (json) {
    log(JSON.stringify(scan, null, 2));
  }

  const output = [
    "# Bootstrap Scan",
    "",
    `Generated: ${scan.generatedAt}`,
    "",
    "## Package",
    "",
    `- Name: ${scan.packageName || "unknown"}`,
    `- Detected frameworks: ${scan.detectedFrameworks.length ? scan.detectedFrameworks.join(", ") : "unknown"}`,
    "",
    "## Scripts",
    "",
    ...Object.entries(scripts).map(([name, value]) => `- ${name}: \`${value}\``),
    ...(Object.keys(scripts).length === 0 ? ["- none detected"] : []),
    "",
    "## Top Directories",
    "",
    ...topDirectories.map((name) => `- ${name}/`),
    "",
    "## Config Files",
    "",
    ...configFiles.map((name) => `- ${name}`),
    ...(configFiles.length === 0 ? ["- none detected"] : []),
    "",
    "## Test Directories",
    "",
    ...testDirs.map((name) => `- ${name}/`),
    ...(testDirs.length === 0 ? ["- none detected"] : []),
    "",
    "## Recommended Next Prompt",
    "",
    "```txt",
    scan.recommendedNextPrompt,
    "```",
    "",
  ].join("\n");

  const outputPath = path.join(cwd, "docs", "bootstrap-scan.md");

  if (!dryRun) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, output);
  }

  if (!json) {
    if (dryRun) {
      log(output);
    } else {
      log("Bootstrap scan written to docs/bootstrap-scan.md");
      log("");
      log(scan.recommendedNextPrompt);
    }
  }
}

function printHelp() {
  log(`Coding Flow

Usage:
  ai-flow init [--force] [--dry-run]
  ai-flow upgrade [--force] [--dry-run] [--json]
  ai-flow doctor [--fix] [--strict] [--json]
  ai-flow status [--json]
  ai-flow bootstrap --scan [--dry-run] [--json]
  ai-flow list-skills [--json]
  ai-flow help

Commands:
  init         Install Claude/Codex workflow files into the current project.
  upgrade      Update installed workflow files without overwriting local edits.
  doctor       Check installed files, skill frontmatter, manifest, and the .agents mirror.
  status       List epics, stories, and inferred story status.
  bootstrap    Scan a brownfield project and write docs/bootstrap-scan.md.
  list-skills  List available workflow skills.
  help         Show this help message.

Flags:
  --force    Overwrite local edits for init or upgrade.
  --dry-run  Show what would happen without writing files.
  --fix      Restore missing files and resync .agents/skills from .claude/skills.
  --strict   Enable stricter doctor checks for docs and manifest.
  --scan     Run brownfield bootstrap scan.
  --json     Print machine-readable JSON where supported.
`);
}

if (command === "init") {
  const result = copyTemplates({
    force: flags.has("--force"),
    dryRun: flags.has("--dry-run"),
  });

  if (flags.has("--dry-run")) {
    log("Dry run complete.");
  } else {
    log("Coding Flow installed.");
  }

  log(`Copied: ${result.copied.length}`);
  log(`Updated: ${result.updated.length}`);

  if (result.skipped.length > 0) {
    log(`Skipped existing files: ${result.skipped.length}`);
    log("Use --force to overwrite them.");
  }
} else if (command === "upgrade") {
  upgrade({
    force: flags.has("--force"),
    dryRun: flags.has("--dry-run"),
    json: flags.has("--json"),
  });
} else if (command === "doctor") {
  doctor({
    fix: flags.has("--fix"),
    json: flags.has("--json"),
    strict: flags.has("--strict"),
  });
} else if (command === "status") {
  status({
    json: flags.has("--json"),
  });
} else if (command === "bootstrap") {
  if (!flags.has("--scan")) {
    fail("bootstrap currently requires --scan");
  }

  bootstrapScan({
    json: flags.has("--json"),
    dryRun: flags.has("--dry-run"),
  });
} else if (command === "list-skills") {
  listSkills({
    json: flags.has("--json"),
  });
} else if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
} else {
  fail(`unknown command "${command}". Run "ai-flow help".`);
}
