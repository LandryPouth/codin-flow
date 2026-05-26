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
const commandArgs = args.slice(1);
const flags = new Set(args.slice(1));
const githubNpxCommand = "npx github:LandryPouth/codin-flow";

const flowScripts = {
  flow: githubNpxCommand,
  "flow:init": `${githubNpxCommand} init`,
  "flow:upgrade": `${githubNpxCommand} upgrade`,
  "flow:doctor": `${githubNpxCommand} doctor`,
  "flow:fix": `${githubNpxCommand} doctor --fix`,
  "flow:skills": `${githubNpxCommand} list-skills`,
  "flow:status": `${githubNpxCommand} status`,
  "flow:check": `${githubNpxCommand} doctor --strict`,
  "flow:harness": `${githubNpxCommand} harness check --quick`,
  "flow:commands": `${githubNpxCommand} commands`,
  "flow:uninstall": `${githubNpxCommand} uninstall`,
};

function getFlagValue(name, fallback = null) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));

  if (inline) {
    return inline.slice(name.length + 1);
  }

  const index = args.indexOf(name);

  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith("--")) {
    return args[index + 1];
  }

  return fallback;
}

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
    return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(`${filePath}.tmp`, `${JSON.stringify(value, null, 2)}\n`);
  fs.renameSync(`${filePath}.tmp`, filePath);
}

function removeFileIfExists(filePath, { dryRun = false } = {}) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  if (!dryRun) {
    fs.unlinkSync(filePath);
  }

  return true;
}

function removeEmptyDirsUpward(startDir, stopDir, { dryRun = false } = {}) {
  const removed = [];
  let current = startDir;
  const resolvedStop = path.resolve(stopDir);

  while (isPathInside(path.resolve(current), resolvedStop) && path.resolve(current) !== resolvedStop) {
    if (!fs.existsSync(current)) {
      current = path.dirname(current);
      continue;
    }

    const entries = fs.readdirSync(current);

    if (entries.length > 0) {
      break;
    }

    removed.push(normalizePortable(path.relative(cwd, current)));

    if (!dryRun) {
      fs.rmdirSync(current);
    }

    current = path.dirname(current);
  }

  return removed;
}

function isPathInside(candidate, root) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
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

function commandsPath() {
  return path.join(cwd, ".coding-flow", "COMMANDS.md");
}

function readManifest() {
  return readJson(manifestPath(), {
    version: null,
    installedAt: null,
    updatedAt: null,
    packageJsonCreated: false,
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
    packageJsonCreated: Boolean(previous && previous.packageJsonCreated),
    files,
  };
}

function writeManifest(previous = null) {
  writeJson(manifestPath(), buildManifestFromCurrentTargets(previous));
}

function markGeneratedPackageJson() {
  const manifest = readManifest();
  manifest.packageJsonCreated = true;
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath(), manifest);
}

function detectProjectPackageJson() {
  const packagePath = path.join(cwd, "package.json");

  if (!fs.existsSync(packagePath)) {
    return {
      exists: false,
      path: packagePath,
      packageJson: null,
    };
  }

  return {
    exists: true,
    path: packagePath,
    packageJson: readJson(packagePath, null),
  };
}

function harnessConfigPath() {
  return path.join(cwd, ".coding-flow", "harness.json");
}

function harnessRunsDir() {
  return path.join(cwd, ".coding-flow", "runs");
}

function defaultHarnessConfig() {
  return {
    version: 1,
    mode: "standard",
    blockedPaths: [
      ".env",
      ".env.*",
      ".ssh/**",
      "**/id_rsa",
      "**/id_ed25519",
      "**/*.pem",
      "**/*.key",
      "node_modules/**",
    ],
    sensitiveGlobs: [
      "**/.env*",
      "**/*secret*",
      "**/*credential*",
      "**/*private-key*",
      "**/*service-account*",
    ],
    requiredChecks: [
      "secrets",
      "sensitive-files",
      "story-evidence",
      "rollback",
    ],
    highRiskTerms: [
      "auth",
      "authorization",
      "permission",
      "role",
      "admin",
      "payment",
      "stripe",
      "secret",
      "token",
      "password",
      "upload",
      "migration",
      "database",
      "sensitive",
      "private data",
      "external api",
      "webhook",
    ],
  };
}

function readHarnessConfig() {
  const defaults = defaultHarnessConfig();
  const config = readJson(harnessConfigPath(), null);

  if (!config) {
    return { config: defaults, exists: false };
  }

  return {
    exists: true,
    config: {
      ...defaults,
      ...config,
      blockedPaths: Array.isArray(config.blockedPaths) ? config.blockedPaths : defaults.blockedPaths,
      sensitiveGlobs: Array.isArray(config.sensitiveGlobs) ? config.sensitiveGlobs : defaults.sensitiveGlobs,
      requiredChecks: Array.isArray(config.requiredChecks) ? config.requiredChecks : defaults.requiredChecks,
      highRiskTerms: Array.isArray(config.highRiskTerms) ? config.highRiskTerms : defaults.highRiskTerms,
    },
  };
}

function ensureHarnessConfig({ dryRun = false } = {}) {
  if (fs.existsSync(harnessConfigPath())) {
    return false;
  }

  if (!dryRun) {
    writeJson(harnessConfigPath(), defaultHarnessConfig());
    fs.mkdirSync(harnessRunsDir(), { recursive: true });
  }

  return true;
}

function buildCommandsMarkdown({ hasPackageJson = false } = {}) {
  const dailyCommands = hasPackageJson
    ? [
        "npm run flow:doctor   # check the installation",
        "npm run flow:check    # strict docs + harness quick check",
        "npm run flow:skills   # list available skills",
        "npm run flow:status   # show epics and stories",
        "npm run flow:harness  # quick security evidence check",
      ]
    : [
        `${githubNpxCommand} doctor`,
        `${githubNpxCommand} doctor --strict`,
        `${githubNpxCommand} list-skills`,
        `${githubNpxCommand} status`,
        `${githubNpxCommand} harness check --quick`,
      ];
  const setupCommands = hasPackageJson
    ? [
        `${githubNpxCommand} init`,
        "npm run flow:upgrade",
        "npm run flow:fix",
        "npm run flow:uninstall -- --dry-run",
        "npm run flow:uninstall",
      ]
    : [
        `${githubNpxCommand} init`,
        `${githubNpxCommand} upgrade`,
        `${githubNpxCommand} doctor --fix`,
        `${githubNpxCommand} uninstall --dry-run`,
        `${githubNpxCommand} uninstall`,
      ];

  return [
    "# Coding Flow Commands",
    "",
    "This file is generated by `ai-flow init` as a local command cheat sheet.",
    "",
    "## Daily Commands",
    "",
    "```bash",
    ...dailyCommands,
    "```",
    "",
    "## Setup And Updates",
    "",
    "```bash",
    ...setupCommands,
    "```",
    "",
    "## Direct GitHub Commands",
    "",
    "Use these when the project has no `package.json` scripts yet or when you want the explicit source:",
    "",
    "```bash",
    `${githubNpxCommand} init`,
    `${githubNpxCommand} doctor`,
    `${githubNpxCommand} list-skills`,
    `${githubNpxCommand} status`,
    `${githubNpxCommand} commands`,
    "```",
    "",
    "## Agent Workflow Prompts",
    "",
    "```txt",
    "Use $quick-story for a tiny isolated change.",
    "Use $run-story in STANDARD mode for story-01-01.",
    "Use $run-story-secure for auth, permissions, admin, secrets, payments, uploads, or sensitive data.",
    "```",
    "",
  ].join("\n");
}

function ensureCommandsFile({ dryRun = false, force = false, hasPackageJson = false } = {}) {
  const target = commandsPath();
  const content = buildCommandsMarkdown({ hasPackageJson });
  const exists = fs.existsSync(target);

  if (exists && !force) {
    return "skipped";
  }

  if (!dryRun) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }

  return exists ? "updated" : "created";
}

function ensurePackageScripts({ dryRun = false } = {}) {
  const detected = detectProjectPackageJson();
  const result = {
    packageJsonExists: detected.exists,
    packageJsonCreated: !detected.exists,
    added: [],
    existing: [],
    conflicts: [],
  };

  if (detected.exists && (!detected.packageJson || typeof detected.packageJson !== "object")) {
    result.conflicts.push({
      script: null,
      current: null,
      expected: null,
      reason: "package.json could not be parsed",
    });
    return result;
  }

  const packageJson = detected.exists ? detected.packageJson : { private: true };
  const scripts = packageJson.scripts && typeof packageJson.scripts === "object"
    ? packageJson.scripts
    : {};

  for (const [name, value] of Object.entries(flowScripts)) {
    if (!scripts[name]) {
      scripts[name] = value;
      result.added.push(name);
    } else if (scripts[name] === value) {
      result.existing.push(name);
    } else {
      result.conflicts.push({
        script: name,
        current: scripts[name],
        expected: value,
        reason: "existing script uses a different command",
      });
    }
  }

  if (result.added.length > 0 && !dryRun) {
    packageJson.scripts = scripts;
    writeJson(detected.path, packageJson);

    if (result.packageJsonCreated) {
      markGeneratedPackageJson();
    }
  }

  return result;
}

function removePackageScripts({ dryRun = false, removeGeneratedPackageJson = false } = {}) {
  const detected = detectProjectPackageJson();
  const result = {
    packageJsonExists: detected.exists,
    packageJsonRemoved: false,
    removed: [],
    skipped: [],
    conflicts: [],
  };

  if (!detected.exists) {
    return result;
  }

  if (!detected.packageJson || typeof detected.packageJson !== "object") {
    result.conflicts.push({
      script: null,
      reason: "package.json could not be parsed",
    });
    return result;
  }

  const packageJson = detected.packageJson;
  const scripts = packageJson.scripts && typeof packageJson.scripts === "object"
    ? packageJson.scripts
    : {};

  for (const [name, value] of Object.entries(flowScripts)) {
    if (!scripts[name]) {
      continue;
    }

    if (scripts[name] === value) {
      delete scripts[name];
      result.removed.push(name);
    } else {
      result.skipped.push(name);
    }
  }

  if (Object.keys(scripts).length > 0) {
    packageJson.scripts = scripts;
  } else {
    delete packageJson.scripts;
  }

  const shouldRemovePackageJson = removeGeneratedPackageJson && isGeneratedPackageJsonRemovable(packageJson);

  if (shouldRemovePackageJson) {
    result.packageJsonRemoved = true;

    if (!dryRun) {
      fs.unlinkSync(detected.path);
    }
  } else if (result.removed.length > 0 && !dryRun) {
    writeJson(detected.path, packageJson);
  }

  return result;
}

function isGeneratedPackageJsonRemovable(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);
  return keys.length === 1 && value.private === true;
}

function ensureConvenienceFiles({ dryRun = false, force = false } = {}) {
  const scripts = ensurePackageScripts({ dryRun });
  const commandsFile = ensureCommandsFile({
    dryRun,
    force,
    hasPackageJson: scripts.packageJsonExists || scripts.packageJsonCreated,
  });

  return {
    scripts,
    commandsFile,
  };
}

function printConvenienceSummary(convenience, { dryRun = false } = {}) {
  if (convenience.scripts.packageJsonCreated) {
    log(`Package.json: ${dryRun ? "would create" : "created"} at project root`);
  }

  if (convenience.scripts.packageJsonExists || convenience.scripts.packageJsonCreated) {
    if (convenience.scripts.added.length > 0) {
      log(`Package scripts: ${dryRun ? "would add" : "added"} ${convenience.scripts.added.join(", ")}`);
    } else {
      log("Package scripts: unchanged");
    }

    if (convenience.scripts.conflicts.length > 0) {
      log(`Package script conflicts: ${convenience.scripts.conflicts.length}`);
      for (const conflict of convenience.scripts.conflicts) {
        if (conflict.script) {
          log(`- ${conflict.script}: kept existing script`);
        } else {
          log(`- ${conflict.reason}`);
        }
      }
    }
  }

  if (convenience.commandsFile === "created") {
    log(dryRun ? "Commands cheat sheet: would create" : "Commands cheat sheet: created");
  } else if (convenience.commandsFile === "updated") {
    log(dryRun ? "Commands cheat sheet: would update" : "Commands cheat sheet: updated");
  } else {
    log("Commands cheat sheet: unchanged");
  }
}

function collectUninstallPlan({ force = false } = {}) {
  const manifest = readJson(manifestPath(), null);
  const files = [];
  const skippedModified = [];
  const skippedUnsafe = [];
  const missing = [];
  const protectedPaths = new Set(["epics", "epics/.gitkeep"]);

  const manifestFiles = manifest && manifest.files && typeof manifest.files === "object"
    ? Object.entries(manifest.files)
    : getTemplateSpecs().map((spec) => [
        spec.targetRel,
        {
          hash: hashFile(spec.source),
          kind: spec.kind,
        },
      ]);

  for (const [targetRel, entry] of manifestFiles) {
    const normalizedTarget = normalizePortable(targetRel);

    if (protectedPaths.has(normalizedTarget) || normalizedTarget.startsWith("epics/")) {
      continue;
    }

    const target = path.resolve(cwd, normalizedTarget);

    if (!isPathInside(target, cwd)) {
      skippedUnsafe.push(normalizedTarget);
      continue;
    }

    if (!fs.existsSync(target)) {
      missing.push(normalizedTarget);
      continue;
    }

    const expectedHash = entry && entry.hash;
    const currentHash = hashFile(target);

    if (force || !expectedHash || currentHash === expectedHash) {
      files.push(normalizedTarget);
    } else {
      skippedModified.push(normalizedTarget);
    }
  }

  for (const generated of [".coding-flow/COMMANDS.md", ".coding-flow/harness.json"]) {
    const target = path.join(cwd, generated);

    if (fs.existsSync(target) && !files.includes(generated)) {
      files.push(generated);
    }
  }

  return {
    manifestExists: Boolean(manifest),
    packageJsonCreated: Boolean(manifest && manifest.packageJsonCreated),
    files: [...new Set(files)].sort((a, b) => b.localeCompare(a)),
    skippedModified,
    skippedUnsafe,
    missing,
    preserves: ["epics/"],
  };
}

function uninstall({ dryRun = false, force = false, json = false } = {}) {
  const plan = collectUninstallPlan({ force });
  const removedFiles = [];
  const removedDirs = [];
  const blockingSkipped = plan.skippedModified.length > 0 && !force;
  const blockingUnsafe = plan.skippedUnsafe.length > 0;
  const blocked = blockingSkipped || blockingUnsafe;

  if (!blocked) {
    for (const targetRel of plan.files) {
      const target = path.resolve(cwd, targetRel);

      if (removeFileIfExists(target, { dryRun })) {
        removedFiles.push(targetRel);
        removedDirs.push(...removeEmptyDirsUpward(path.dirname(target), cwd, { dryRun }));
      }
    }

    if (fs.existsSync(harnessRunsDir())) {
      const runFiles = walkFiles(harnessRunsDir()).map((filePath) => normalizePortable(path.relative(cwd, filePath)));

      for (const runFile of runFiles) {
        const target = path.join(cwd, runFile);

        if (removeFileIfExists(target, { dryRun })) {
          removedFiles.push(runFile);
        }
      }

      removedDirs.push(...removeEmptyDirsUpward(harnessRunsDir(), cwd, { dryRun }));
    }

    const manifestRemoved = removeFileIfExists(manifestPath(), { dryRun });

    if (manifestRemoved) {
      removedFiles.push(".coding-flow/manifest.json");
    }

    removedDirs.push(...removeEmptyDirsUpward(path.join(cwd, ".coding-flow"), cwd, { dryRun }));
  }

  const scripts = blocked
    ? {
        packageJsonExists: detectProjectPackageJson().exists,
        packageJsonRemoved: false,
        removed: [],
        skipped: [],
        conflicts: [],
      }
    : removePackageScripts({ dryRun, removeGeneratedPackageJson: plan.packageJsonCreated });
  const result = {
    ok: !blocked && scripts.conflicts.length === 0,
    dryRun,
    force,
    removedFiles: [...new Set(removedFiles)].sort(),
    removedDirs: [...new Set(removedDirs)].sort(),
    skippedModified: plan.skippedModified,
    skippedUnsafe: plan.skippedUnsafe,
    packageJsonRemoved: scripts.packageJsonRemoved,
    removedScripts: scripts.removed,
    skippedScripts: scripts.skipped,
    scriptConflicts: scripts.conflicts,
    preserved: plan.preserves,
  };

  if (json) {
    log(JSON.stringify(result, null, 2));
  } else {
    if (blockingUnsafe) {
      log("Coding Flow uninstall blocked by unsafe manifest paths.");
    } else if (blockingSkipped) {
      log("Coding Flow uninstall blocked by modified installed files.");
    } else {
      log(dryRun ? "Coding Flow uninstall dry run." : "Coding Flow uninstalled.");
    }

    log(`Removed files: ${result.removedFiles.length}`);
    log(`Removed package scripts: ${result.removedScripts.length}`);
    if (result.packageJsonRemoved) {
      log(dryRun ? "Would remove generated package.json." : "Removed generated package.json.");
    }
    log("Preserved: epics/");

    if (result.skippedModified.length > 0) {
      log("");
      log("Skipped modified files:");
      for (const file of result.skippedModified) {
        log(`- ${file}`);
      }
      log("Use --force only if you intentionally want to remove modified Coding Flow files.");
    }

    if (result.skippedUnsafe.length > 0) {
      log("");
      log("Skipped unsafe manifest paths:");
      for (const file of result.skippedUnsafe) {
        log(`- ${file}`);
      }
    }

    if (result.skippedScripts.length > 0) {
      log("");
      log("Skipped package scripts with custom commands:");
      for (const script of result.skippedScripts) {
        log(`- ${script}`);
      }
    }
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

function normalizePortable(filePath) {
  return toPortable(filePath).replace(/^\.\//, "");
}

function globToRegExp(pattern) {
  let output = "^";

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];

    if (char === "*" && next === "*") {
      output += ".*";
      index += 1;
    } else if (char === "*") {
      output += "[^/]*";
    } else if (char === "?") {
      output += "[^/]";
    } else if ("\\^$+?.()|{}[]".includes(char)) {
      output += `\\${char}`;
    } else {
      output += char;
    }
  }

  output += "$";
  return new RegExp(output);
}

function matchesPattern(filePath, pattern) {
  const value = normalizePortable(filePath);
  const normalizedPattern = normalizePortable(pattern);

  if (normalizedPattern.startsWith("**/") && matchesPattern(value, normalizedPattern.slice(3))) {
    return true;
  }

  if (!normalizedPattern.includes("*") && !normalizedPattern.includes("?")) {
    return value === normalizedPattern || value.startsWith(`${normalizedPattern}/`);
  }

  return globToRegExp(normalizedPattern).test(value);
}

function isAllowedEnvExample(relativePath) {
  const name = path.basename(relativePath).toLowerCase();
  return [".env.example", ".env.sample", ".env.template"].includes(name);
}

function walkProjectFiles(dir, { quick = false, depth = 0 } = {}) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  if (quick && depth > 5) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = normalizePortable(path.relative(cwd, fullPath));

    if (entry.isDirectory()) {
      if ([".git", "node_modules", "dist", "build", "coverage", ".next", ".turbo"].includes(entry.name)) {
        continue;
      }

      if (relativePath === ".coding-flow/runs" || relativePath.startsWith(".coding-flow/runs/")) {
        continue;
      }

      files.push(...walkProjectFiles(fullPath, { quick, depth: depth + 1 }));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function isLikelyTextFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  return !sample.includes(0);
}

function readTextFileSafely(filePath) {
  const stat = fs.statSync(filePath);

  if (stat.size > 1024 * 1024 || !isLikelyTextFile(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, "utf8");
}

function addIssue(target, code, message, file = null, line = null) {
  target.push({
    code,
    message,
    ...(file ? { file } : {}),
    ...(line ? { line } : {}),
  });
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

  const harnessCreated = ensureHarnessConfig({ dryRun });

  return { copied, updated, skipped, harnessCreated };
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

  const convenience = ensureConvenienceFiles({ dryRun, force: false });

  const result = {
    copied,
    updated: [...updated, ...mirror.updated],
    skippedModified,
    unchanged,
    mirrorCopied: mirror.copied,
    convenience,
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
  printConvenienceSummary(result.convenience, { dryRun });

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

    const harnessReport = collectHarnessReport({ quick: true, strict: false });

    for (const issue of harnessReport.errors) {
      errors.push({
        code: `harness_${issue.code}`,
        file: issue.file || ".coding-flow/harness.json",
        message: issue.message,
      });
    }

    for (const issue of harnessReport.warnings) {
      warnings.push({
        code: `harness_${issue.code}`,
        file: issue.file || ".coding-flow/harness.json",
        message: issue.message,
      });
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
    ensureConvenienceFiles({ dryRun: false, force: false });
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

function getSecretPatterns() {
  return [
    { name: "Stripe live key", regex: /\bsk_live_[A-Za-z0-9_]{12,}\b/ },
    { name: "OpenAI-style API key", regex: /\bsk-[A-Za-z0-9_-]{32,}\b/ },
    { name: "GitHub token", regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
    { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: "Private key block", regex: /-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/ },
    {
      name: "Long assigned credential",
      regex: /\b(api[_-]?key|secret|token|password)\b\s*[:=]\s*["'][^"']{20,}["']/i,
    },
  ];
}

function checkSensitivePaths(files, config, report) {
  for (const filePath of files) {
    const relativePath = normalizePortable(path.relative(cwd, filePath));

    if (isAllowedEnvExample(relativePath)) {
      continue;
    }

    if (config.blockedPaths.some((pattern) => matchesPattern(relativePath, pattern))) {
      addIssue(
        report.errors,
        "blocked_path_present",
        `${relativePath} matches a blocked harness path`,
        relativePath,
      );
      continue;
    }

    if (config.sensitiveGlobs.some((pattern) => matchesPattern(relativePath, pattern))) {
      addIssue(
        report.warnings,
        "sensitive_path_present",
        `${relativePath} looks sensitive; keep it out of commits unless it is a safe example`,
        relativePath,
      );
    }
  }
}

function checkSecrets(files, report) {
  const patterns = getSecretPatterns();

  for (const filePath of files) {
    const relativePath = normalizePortable(path.relative(cwd, filePath));
    const content = readTextFileSafely(filePath);

    if (content === null) {
      continue;
    }

    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const match = patterns.find((pattern) => pattern.regex.test(line));

      if (match) {
        addIssue(
          report.errors,
          "secret_candidate",
          `Potential secret detected by pattern: ${match.name}`,
          relativePath,
          index + 1,
        );
      }
    }
  }
}

function checkEnvGitignore(report, { strict = false } = {}) {
  const gitignorePath = path.join(cwd, ".gitignore");

  if (!fs.existsSync(gitignorePath)) {
    addIssue(
      strict ? report.errors : report.warnings,
      "missing_gitignore",
      ".gitignore is missing; add .env and local secret files before committing real project code",
      ".gitignore",
    );
    return;
  }

  const content = fs.readFileSync(gitignorePath, "utf8");
  const ignoresEnv = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === ".env" || line === ".env*" || line === ".env.*");

  if (!ignoresEnv) {
    addIssue(
      strict ? report.errors : report.warnings,
      "env_not_ignored",
      ".gitignore does not explicitly ignore .env files",
      ".gitignore",
    );
  }
}

function resolveProjectPath(relativeOrAbsolutePath) {
  if (!relativeOrAbsolutePath) {
    return null;
  }

  const fullPath = path.resolve(cwd, relativeOrAbsolutePath);
  const relativePath = path.relative(cwd, fullPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return {
      fullPath,
      relativePath: normalizePortable(relativePath),
      insideRoot: false,
      exists: false,
    };
  }

  return {
    fullPath,
    relativePath: normalizePortable(relativePath),
    insideRoot: true,
    exists: fs.existsSync(fullPath),
  };
}

function readStoryBundle(storyFullPath) {
  const files = {};

  for (const name of ["story.md", "tasks.md", "tests.md", "decisions.md", "implementation-notes.md"]) {
    const filePath = path.join(storyFullPath, name);
    files[name] = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  }

  return files;
}

function scoreStoryRisk(storyText, config) {
  const lower = storyText.toLowerCase();
  const matchedTerms = config.highRiskTerms.filter((term) => lower.includes(term.toLowerCase()));
  const mediumTerms = ["api", "crud", "form", "persistence", "integration", "config", "settings"]
    .filter((term) => lower.includes(term));

  if (matchedTerms.length > 0) {
    return {
      level: "high",
      matchedTerms,
      reason: "Security-sensitive or trust-boundary terms were found.",
    };
  }

  if (mediumTerms.length > 0) {
    return {
      level: "medium",
      matchedTerms: mediumTerms,
      reason: "Integration or persistence terms were found.",
    };
  }

  return {
    level: "low",
    matchedTerms: [],
    reason: "No high-risk terms found.",
  };
}

function buildHarnessPreflight({ story = null } = {}) {
  const { config, exists } = readHarnessConfig();
  const resolvedStory = resolveProjectPath(story);
  let storyText = "";
  let storyFiles = [];

  if (resolvedStory && resolvedStory.insideRoot && resolvedStory.exists) {
    const stat = fs.statSync(resolvedStory.fullPath);
    const storyDir = stat.isDirectory() ? resolvedStory.fullPath : path.dirname(resolvedStory.fullPath);
    const bundle = readStoryBundle(storyDir);
    storyText = Object.values(bundle).join("\n");
    storyFiles = Object.entries(bundle)
      .filter(([, content]) => content.trim().length > 0)
      .map(([name]) => normalizePortable(path.relative(cwd, path.join(storyDir, name))));
  }

  const risk = scoreStoryRisk(storyText, config);
  const mode = risk.level === "high" ? "strict" : risk.level === "medium" ? "standard" : "fast";
  const requiredChecks = [...config.requiredChecks];

  if (risk.level === "high") {
    requiredChecks.push("security-check", "server-side-validation", "rollback-evidence");
  }

  return {
    generatedAt: new Date().toISOString(),
    root: cwd,
    configPath: normalizePortable(path.relative(cwd, harnessConfigPath())),
    configExists: exists,
    story: resolvedStory ? resolvedStory.relativePath : null,
    storyExists: resolvedStory ? resolvedStory.exists : null,
    risk,
    recommendedMode: mode,
    storyFiles,
    requiredChecks: [...new Set(requiredChecks)],
    stopConditions: [
      "Secrets or local env files are present in the diff.",
      "Security-sensitive behavior lacks server-side enforcement.",
      "Rollback notes are missing for risky changes.",
      "Validation commands cannot run or fail outside story scope.",
      "The implementation touches files outside the declared story scope without explanation.",
    ],
  };
}

function checkStoryEvidence(report, { story = null, strict = false } = {}) {
  if (!story) {
    return;
  }

  const resolvedStory = resolveProjectPath(story);

  if (!resolvedStory || !resolvedStory.insideRoot) {
    addIssue(report.errors, "story_outside_root", "Story path must stay inside the project root", story);
    return;
  }

  if (!resolvedStory.exists) {
    addIssue(report.errors, "story_missing", `${resolvedStory.relativePath} does not exist`, resolvedStory.relativePath);
    return;
  }

  const storyDir = fs.statSync(resolvedStory.fullPath).isDirectory()
    ? resolvedStory.fullPath
    : path.dirname(resolvedStory.fullPath);
  const bundle = readStoryBundle(storyDir);
  const risk = scoreStoryRisk(Object.values(bundle).join("\n"), report.config);
  const relativeStoryDir = normalizePortable(path.relative(cwd, storyDir));

  if (!bundle["story.md"].trim()) {
    addIssue(report.errors, "missing_story_file", "story.md is required for story-scoped harness checks", `${relativeStoryDir}/story.md`);
  }

  const notes = bundle["implementation-notes.md"];
  const notesPath = `${relativeStoryDir}/implementation-notes.md`;
  const highAssurance = strict || report.config.mode === "strict" || risk.level === "high";

  if (highAssurance && !notes.trim()) {
    addIssue(report.errors, "missing_implementation_notes", "High-assurance story checks require implementation-notes.md", notesPath);
    return;
  }

  if (notes.trim() && !/rollback/i.test(notes)) {
    addIssue(
      highAssurance ? report.errors : report.warnings,
      "missing_rollback_notes",
      "implementation-notes.md should include rollback notes",
      notesPath,
    );
  }

  if (risk.level === "high" && notes.trim() && !/(security|auth|permission|trust boundary|server-side)/i.test(notes)) {
    addIssue(
      report.warnings,
      "missing_security_evidence",
      "High-risk story notes should mention the security validation performed",
      notesPath,
    );
  }

  if (risk.level === "high" && !bundle["tests.md"].trim()) {
    addIssue(
      report.warnings,
      "missing_tests_plan",
      "High-risk stories should keep tests.md up to date",
      `${relativeStoryDir}/tests.md`,
    );
  }
}

function collectHarnessReport({ quick = false, strict = false, story = null } = {}) {
  const { config, exists } = readHarnessConfig();
  const report = {
    ok: false,
    generatedAt: new Date().toISOString(),
    root: cwd,
    configPath: normalizePortable(path.relative(cwd, harnessConfigPath())),
    configExists: exists,
    mode: config.mode,
    quick,
    strict,
    story: story || null,
    config,
    stats: {
      filesScanned: 0,
    },
    errors: [],
    warnings: [],
  };

  if (!exists) {
    addIssue(
      report.warnings,
      "missing_harness_config",
      "Harness config is not initialized; run `ai-flow harness init` to make the policy explicit",
      ".coding-flow/harness.json",
    );
  }

  const files = walkProjectFiles(cwd, { quick });
  report.stats.filesScanned = files.length;

  checkSensitivePaths(files, config, report);
  checkSecrets(files, report);
  checkEnvGitignore(report, { strict });
  checkStoryEvidence(report, { story, strict });

  report.ok = report.errors.length === 0;
  return report;
}

function runGitList(argsForGit) {
  try {
    const childProcess = require("child_process");
    return childProcess
      .execFileSync("git", argsForGit, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getChangedFiles() {
  return [...new Set([
    ...runGitList(["diff", "--name-only"]),
    ...runGitList(["diff", "--cached", "--name-only"]),
  ])].sort();
}

function extractSection(content, heading) {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading.toLowerCase()}`);

  if (start === -1) {
    return "";
  }

  const section = [];

  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ")) {
      break;
    }

    section.push(lines[index]);
  }

  return section.join("\n").trim();
}

function buildHarnessEvidence({ story = null } = {}) {
  const preflight = buildHarnessPreflight({ story });
  const report = collectHarnessReport({ story, strict: false });
  let rollbackNotes = "";

  if (story) {
    const resolvedStory = resolveProjectPath(story);

    if (resolvedStory && resolvedStory.insideRoot && resolvedStory.exists) {
      const storyDir = fs.statSync(resolvedStory.fullPath).isDirectory()
        ? resolvedStory.fullPath
        : path.dirname(resolvedStory.fullPath);
      const notesPath = path.join(storyDir, "implementation-notes.md");

      if (fs.existsSync(notesPath)) {
        rollbackNotes = extractSection(fs.readFileSync(notesPath, "utf8"), "Rollback Notes");
      }
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    root: cwd,
    story: preflight.story,
    risk: preflight.risk,
    recommendedMode: preflight.recommendedMode,
    filesChanged: getChangedFiles(),
    requiredChecks: preflight.requiredChecks,
    validation: {
      harnessCheck: report.ok ? "pass" : "fail",
      errors: report.errors,
      warnings: report.warnings,
    },
    rollbackNotes,
    remainingRisks: report.errors.map((issue) => issue.message),
  };
}

function harnessInit({ json = false, dryRun = false, force = false, mode = null } = {}) {
  const existing = readJson(harnessConfigPath(), null);
  const allowedModes = new Set(["fast", "standard", "strict"]);
  const config = {
    ...defaultHarnessConfig(),
    ...(existing || {}),
  };

  if (mode) {
    if (!allowedModes.has(mode)) {
      fail(`invalid harness mode "${mode}". Use fast, standard, or strict.`);
    }

    config.mode = mode;
  }

  if (json || dryRun) {
    log(JSON.stringify(config, null, 2));
  }

  if (dryRun) {
    return;
  }

  if (existing && !force) {
    if (!json) {
      log("Harness config already exists. Use --force to overwrite it.");
    }
    return;
  }

  writeJson(harnessConfigPath(), config);
  fs.mkdirSync(harnessRunsDir(), { recursive: true });

  if (!json) {
    log("Security evidence harness initialized.");
    log(`Config: ${normalizePortable(path.relative(cwd, harnessConfigPath()))}`);
    log(`Runs: ${normalizePortable(path.relative(cwd, harnessRunsDir()))}`);
  }
}

function printHarnessReport(report) {
  if (report.ok) {
    log("Harness check passed.");
  } else {
    log("Harness check failed.");
  }

  log(`Files scanned: ${report.stats.filesScanned}`);

  if (report.errors.length > 0) {
    log("");
    log("Errors:");
    for (const error of report.errors) {
      log(`- ${error.file ? `${error.file}: ` : ""}${error.message}${error.line ? ` (line ${error.line})` : ""}`);
    }
  }

  if (report.warnings.length > 0) {
    log("");
    log("Warnings:");
    for (const warning of report.warnings) {
      log(`- ${warning.file ? `${warning.file}: ` : ""}${warning.message}${warning.line ? ` (line ${warning.line})` : ""}`);
    }
  }
}

function harnessCheck({ json = false, quick = false, strict = false, story = null } = {}) {
  const report = collectHarnessReport({ quick, strict, story });

  if (json) {
    log(JSON.stringify(report, null, 2));
  } else {
    printHarnessReport(report);
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
}

function harnessPreflight({ json = false, story = null } = {}) {
  const contract = buildHarnessPreflight({ story });

  if (json) {
    log(JSON.stringify(contract, null, 2));
    return;
  }

  log("Harness preflight complete.");
  log(`Risk: ${contract.risk.level} (${contract.risk.reason})`);
  log(`Recommended mode: ${contract.recommendedMode.toUpperCase()}`);

  if (contract.story) {
    log(`Story: ${contract.story}${contract.storyExists ? "" : " (missing)"}`);
  }

  if (contract.risk.matchedTerms.length > 0) {
    log(`Matched terms: ${contract.risk.matchedTerms.join(", ")}`);
  }

  log("");
  log("Required checks:");
  for (const check of contract.requiredChecks) {
    log(`- ${check}`);
  }

  log("");
  log("Stop conditions:");
  for (const condition of contract.stopConditions) {
    log(`- ${condition}`);
  }
}

function harnessEvidence({ json = false, dryRun = false, story = null } = {}) {
  const evidence = buildHarnessEvidence({ story });
  const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}-evidence.json`;
  const outputPath = path.join(harnessRunsDir(), fileName);

  if (json || dryRun) {
    log(JSON.stringify(evidence, null, 2));
  }

  if (dryRun) {
    return;
  }

  fs.mkdirSync(harnessRunsDir(), { recursive: true });
  writeJson(outputPath, evidence);

  if (!json) {
    log(`Harness evidence written to ${normalizePortable(path.relative(cwd, outputPath))}`);
  }

  if (evidence.validation.harnessCheck === "fail") {
    process.exitCode = 1;
  }
}

function harnessCommand() {
  const subcommand = commandArgs[0] || "check";
  const story = getFlagValue("--story", null);

  if (subcommand === "init") {
    harnessInit({
      json: flags.has("--json"),
      dryRun: flags.has("--dry-run"),
      force: flags.has("--force"),
      mode: getFlagValue("--mode", null),
    });
  } else if (subcommand === "check") {
    harnessCheck({
      json: flags.has("--json"),
      quick: flags.has("--quick"),
      strict: flags.has("--strict"),
      story,
    });
  } else if (subcommand === "preflight") {
    harnessPreflight({
      json: flags.has("--json"),
      story,
    });
  } else if (subcommand === "evidence") {
    harnessEvidence({
      json: flags.has("--json"),
      dryRun: flags.has("--dry-run"),
      story,
    });
  } else {
    fail(`unknown harness command "${subcommand}". Use init, preflight, check, or evidence.`);
  }
}

function printCommands({ json = false } = {}) {
  const detected = detectProjectPackageJson();
  const commands = {
    daily: detected.exists
      ? {
          doctor: "npm run flow:doctor",
          check: "npm run flow:check",
          skills: "npm run flow:skills",
          status: "npm run flow:status",
          harness: "npm run flow:harness",
        }
      : {
          doctor: `${githubNpxCommand} doctor`,
          check: `${githubNpxCommand} doctor --strict`,
          skills: `${githubNpxCommand} list-skills`,
          status: `${githubNpxCommand} status`,
          harness: `${githubNpxCommand} harness check --quick`,
        },
    setup: {
      init: `${githubNpxCommand} init`,
      upgrade: detected.exists ? "npm run flow:upgrade" : `${githubNpxCommand} upgrade`,
      fix: detected.exists ? "npm run flow:fix" : `${githubNpxCommand} doctor --fix`,
      uninstall: detected.exists ? "npm run flow:uninstall" : `${githubNpxCommand} uninstall`,
    },
    cheatsheet: normalizePortable(path.relative(cwd, commandsPath())),
  };

  if (json) {
    log(JSON.stringify(commands, null, 2));
    return;
  }

  log("Coding Flow commands");
  log("");
  log("Daily:");
  for (const [name, value] of Object.entries(commands.daily)) {
    log(`  ${name.padEnd(8)} ${value}`);
  }

  log("");
  log("Setup / update:");
  for (const [name, value] of Object.entries(commands.setup)) {
    log(`  ${name.padEnd(8)} ${value}`);
  }

  log("");
  log(`Local cheat sheet: ${commands.cheatsheet}`);

  if (!detected.exists) {
    log("");
    log("No package.json detected, so npm run flow:* scripts are not available in this project.");
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
  ai-flow harness init|preflight|check|evidence [--story path] [--json]
  ai-flow commands [--json]
  ai-flow uninstall [--dry-run] [--force] [--json]
  ai-flow list-skills [--json]
  ai-flow help

Commands:
  init         Install workflow files and the default harness policy into the current project.
  upgrade      Update installed workflow files without overwriting local edits.
  doctor       Check installed files, skill frontmatter, manifest, and the .agents mirror.
  status       List epics, stories, and inferred story status.
  bootstrap    Scan a brownfield project and write docs/bootstrap-scan.md.
  harness      Run security evidence checks and write lightweight run evidence.
  commands     Show the easiest commands for this project.
  uninstall    Remove Coding Flow files and scripts while preserving epics/stories.
  list-skills  List available workflow skills.
  help         Show this help message.

Flags:
  --force    Overwrite local edits for init or upgrade.
  --dry-run  Show what would happen without writing files.
  --fix      Restore missing files and resync .agents/skills from .claude/skills.
  --strict   Enable stricter doctor checks for docs and manifest.
  --scan     Run brownfield bootstrap scan.
  --story    Scope harness preflight/check/evidence to one story directory.
  --quick    Limit harness check traversal depth.
  --json     Print machine-readable JSON where supported.
`);
}

if (command === "init") {
  const result = copyTemplates({
    force: flags.has("--force"),
    dryRun: flags.has("--dry-run"),
  });
  const convenience = ensureConvenienceFiles({
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

  if (result.harnessCreated) {
    log(flags.has("--dry-run") ? "Harness config: would create" : "Harness config: created");
  }

  printConvenienceSummary(convenience, { dryRun: flags.has("--dry-run") });

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
} else if (command === "harness") {
  harnessCommand();
} else if (command === "commands") {
  printCommands({
    json: flags.has("--json"),
  });
} else if (command === "uninstall") {
  uninstall({
    dryRun: flags.has("--dry-run"),
    force: flags.has("--force"),
    json: flags.has("--json"),
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
