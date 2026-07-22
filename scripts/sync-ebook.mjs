import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const deployRoot = process.cwd();
const sourceRoot = path.resolve(deployRoot, "..");
const copyPlan = [
  ["index.html", "content/index.html"],
  ["scene-gallery.html", "content/scene-gallery.html"],
  ["scene-openers.html", "content/scene-openers.html"],
  ["scene-dialogues.html", "content/scene-dialogues.html"],
  ["app.js", "public/app.js"],
];

for (const [source, target] of copyPlan) {
  const sourcePath = path.join(sourceRoot, source);
  const targetPath = path.join(deployRoot, target);
  if (!fs.existsSync(sourcePath)) throw new Error(`Missing ebook source: ${source}`);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.copyFileSync(sourcePath, targetPath);
}

console.log(`Synced ${copyPlan.length} ebook files from the editorial workspace.`);
