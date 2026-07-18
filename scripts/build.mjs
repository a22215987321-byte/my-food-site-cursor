import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const dist = path.join(root, "dist");
const checkOnly = process.argv.includes("--check-only");

const copyPlan = [
  ["content/index.html", "index.html"],
  ["content/scene-gallery.html", "scene-gallery.html"],
  ["styles/ebook.css", "styles.css"],
  ["public/app.js", "app.js"],
  ["public/assets", "assets"],
  ["public/favicon.svg", "favicon.svg"],
  ["public/robots.txt", "robots.txt"],
  ["public/sitemap.xml", "sitemap.xml"],
];

const sourceFiles = copyPlan.map(([source]) => path.join(root, source));

for (const source of sourceFiles) {
  if (!fs.existsSync(source)) {
    throw new Error(`Missing build source: ${path.relative(root, source)}`);
  }
}

if (!checkOnly) {
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });

  for (const [source, target] of copyPlan) {
    fs.cpSync(path.join(root, source), path.join(dist, target), {
      recursive: true,
      force: true,
    });
  }
}

const auditRoot = checkOnly ? root : dist;
const auditFiles = checkOnly
  ? [
      "content/index.html",
      "content/scene-gallery.html",
      "styles/ebook.css",
      "public/app.js",
    ]
  : ["index.html", "scene-gallery.html", "styles.css", "app.js"];

const localPathPattern = /file:\/\/\/|\b[A-Za-z]:[\\/]|C:[\\/]Users[\\/]/i;
const referencePattern = /(?:src|href)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)/gi;

function allFiles(directory) {
  const result = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...allFiles(absolute));
    else result.push(absolute);
  }
  return result;
}

function normalizeRelative(value) {
  return value.split(path.sep).join("/").replace(/^\.\//, "");
}

if (!checkOnly) {
  const emittedFiles = allFiles(dist).map((file) => normalizeRelative(path.relative(dist, file)));
  const emittedSet = new Set(emittedFiles);
  const failures = [];

  for (const relativeFile of auditFiles) {
    const absoluteFile = path.join(auditRoot, relativeFile);
    const source = fs.readFileSync(absoluteFile, "utf8");

    if (localPathPattern.test(source)) {
      failures.push(`${relativeFile}: contains a local filesystem path`);
    }

    referencePattern.lastIndex = 0;
    for (const match of source.matchAll(referencePattern)) {
      const rawReference = (match[1] || match[2] || "").trim();
      if (
        !rawReference ||
        rawReference.startsWith("#") ||
        /^(?:https?:|data:|mailto:|tel:|javascript:)/i.test(rawReference)
      ) {
        continue;
      }

      const cleanReference = decodeURIComponent(rawReference.split(/[?#]/, 1)[0]);
      const fromDirectory = path.posix.dirname(normalizeRelative(relativeFile));
      const resolved = cleanReference.startsWith("/")
        ? cleanReference.slice(1)
        : path.posix.normalize(path.posix.join(fromDirectory, cleanReference));
      const candidates = [resolved, `${resolved}.html`, path.posix.join(resolved, "index.html")];

      if (!candidates.some((candidate) => emittedSet.has(candidate))) {
        failures.push(`${relativeFile}: missing or case-mismatched resource ${rawReference}`);
      }
    }
  }

  if (failures.length) {
    throw new Error(`Static audit failed:\n${failures.join("\n")}`);
  }

  console.log(`Built ${emittedFiles.length} files in dist/; all local references resolved with exact case.`);
} else {
  for (const relativeFile of auditFiles) {
    const source = fs.readFileSync(path.join(auditRoot, relativeFile), "utf8");
    if (localPathPattern.test(source)) {
      throw new Error(`${relativeFile}: contains a local filesystem path`);
    }
  }
  console.log("Source audit passed: no local filesystem paths found.");
}
