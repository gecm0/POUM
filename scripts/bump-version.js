#!/usr/bin/env node

/**
 * Version bump script for POUM
 * Synchronizes version across package.json, Cargo.toml, and tauri.conf.json
 *
 * Usage:
 *   node scripts/bump-version.js <version>
 *   node scripts/bump-version.js patch|minor|major
 *
 * Examples:
 *   node scripts/bump-version.js 1.0.0
 *   node scripts/bump-version.js patch  # 0.1.0 -> 0.1.1
 *   node scripts/bump-version.js minor  # 0.1.0 -> 0.2.0
 *   node scripts/bump-version.js major  # 0.1.0 -> 1.0.0
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

const FILES = {
  packageJson: join(rootDir, "package.json"),
  cargoToml: join(rootDir, "src-tauri", "Cargo.toml"),
  tauriConf: join(rootDir, "src-tauri", "tauri.conf.json"),
};

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  };
}

function bumpVersion(current, type) {
  const v = parseVersion(current);
  if (!v) throw new Error(`Invalid current version: ${current}`);

  switch (type) {
    case "major":
      return `${v.major + 1}.0.0`;
    case "minor":
      return `${v.major}.${v.minor + 1}.0`;
    case "patch":
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    default:
      throw new Error(`Unknown bump type: ${type}`);
  }
}

function getCurrentVersion() {
  const pkg = JSON.parse(readFileSync(FILES.packageJson, "utf8"));
  return pkg.version;
}

function updatePackageJson(version) {
  const content = JSON.parse(readFileSync(FILES.packageJson, "utf8"));
  content.version = version;
  writeFileSync(FILES.packageJson, JSON.stringify(content, null, 2) + "\n");
  console.log(`  ✓ package.json -> ${version}`);
}

function updateCargoToml(version) {
  let content = readFileSync(FILES.cargoToml, "utf8");
  content = content.replace(
    /^version = "[\d.]+"$/m,
    `version = "${version}"`
  );
  writeFileSync(FILES.cargoToml, content);
  console.log(`  ✓ Cargo.toml -> ${version}`);
}

function updateTauriConf(version) {
  const content = JSON.parse(readFileSync(FILES.tauriConf, "utf8"));
  content.version = version;
  writeFileSync(FILES.tauriConf, JSON.stringify(content, null, 2) + "\n");
  console.log(`  ✓ tauri.conf.json -> ${version}`);
}

function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.error("Usage: node scripts/bump-version.js <version|patch|minor|major>");
    process.exit(1);
  }

  const currentVersion = getCurrentVersion();
  let newVersion;

  if (["patch", "minor", "major"].includes(arg)) {
    newVersion = bumpVersion(currentVersion, arg);
  } else if (parseVersion(arg)) {
    newVersion = arg;
  } else {
    console.error(`Invalid version or bump type: ${arg}`);
    process.exit(1);
  }

  console.log(`\nBumping version: ${currentVersion} -> ${newVersion}\n`);

  updatePackageJson(newVersion);
  updateCargoToml(newVersion);
  updateTauriConf(newVersion);

  console.log(`\n✅ Version updated to ${newVersion}\n`);
  console.log("Next steps:");
  console.log(`  git add -A && git commit -m "chore: bump version to ${newVersion}"`);
  console.log(`  git tag v${newVersion}`);
  console.log(`  git push && git push --tags`);
}

main();
