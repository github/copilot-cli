// Copyright (c) GitHub, Inc. All rights reserved.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const platforms = [
  ["darwin-arm64", "darwin", "arm64"],
  ["darwin-x64", "darwin", "x64"],
  ["linux-arm64", "linux", "arm64", "glibc"],
  ["linux-x64", "linux", "x64", "glibc"],
  ["linuxmusl-arm64", "linux", "arm64", "musl"],
  ["linuxmusl-x64", "linux", "x64", "musl"],
  ["win32-arm64", "win32", "arm64"],
  ["win32-x64", "win32", "x64"],
];
const repository = "github/copilot-cli";
const packageName = (platform) => `@github/copilot${platform ? `-${platform}` : ""}`;

export function validateRelease(release, tag, eventId, eventPrerelease) {
  const match = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9]|[1-9]\d*))?$/.exec(tag);
  if (!match || release.tag_name !== tag || release.draft || !release.published_at) {
    throw new Error(`Not a published Copilot CLI release with a canonical tag: ${tag}`);
  }
  const prerelease = match[4] !== undefined;
  if (release.prerelease !== prerelease) {
    throw new Error(`Prerelease flag does not match tag ${tag}`);
  }
  if (eventId && String(release.id) !== eventId) {
    throw new Error(`Release ID for ${tag} differs from the triggering event`);
  }
  if (eventPrerelease && String(release.prerelease) !== eventPrerelease) {
    throw new Error(`Prerelease flag for ${tag} differs from the triggering event`);
  }
  const version = tag.slice(1);
  const names = platforms.map(([platform]) => `github-copilot-${version}-${platform}.tgz`);
  names.push(`github-copilot-${version}.tgz`);
  const expected = new Set(names);
  const assets = release.assets.filter((asset) => asset.name.endsWith(".tgz"));
  if (assets.length !== expected.size || assets.some((asset) => !expected.has(asset.name)) ||
      new Set(assets.map((asset) => asset.name)).size !== expected.size) {
    throw new Error(`Release ${tag} must contain exactly the nine expected npm tarballs`);
  }
  for (const asset of assets) {
    if (asset.state !== "uploaded" || !Number.isSafeInteger(asset.size) || asset.size <= 0 ||
        !/^sha256:[a-f0-9]{64}$/.test(asset.digest ?? "")) {
      throw new Error(`Missing uploaded asset size or SHA-256 digest for ${asset.name}`);
    }
  }
  return { version, prerelease, assets };
}

export function compareVersions(left, right) {
  const parse = (version) => {
    const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9]|[1-9]\d*))?$/.exec(version);
    if (!match) throw new Error(`Unexpected npm dist-tag version: ${version}`);
    return match.slice(1).map((value) => value === undefined ? null : BigInt(value));
  };
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index++) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  if (a[3] === null || b[3] === null) return a[3] === b[3] ? 0 : a[3] === null ? 1 : -1;
  return a[3] === b[3] ? 0 : a[3] > b[3] ? 1 : -1;
}

export function validatePackage(metadata, platform, version) {
  const [suffix, os, cpu, libc] = platform ?? [];
  const name = packageName(suffix);
  if (metadata.name !== name || metadata.version !== version ||
      metadata.repository?.url !== "git+https://github.com/github/copilot-cli.git") {
    throw new Error(`Package identity or repository mismatch for ${name}@${version}`);
  }
  if (platform) {
    if (JSON.stringify(metadata.os) !== JSON.stringify([os]) ||
        JSON.stringify(metadata.cpu) !== JSON.stringify([cpu]) ||
        (libc ? JSON.stringify(metadata.libc) !== JSON.stringify([libc]) : metadata.libc !== undefined)) {
      throw new Error(`Platform metadata mismatch for ${name}@${version}`);
    }
  } else {
    const dependencies = Object.fromEntries(platforms.map(([suffix]) => [packageName(suffix), version]));
    if (JSON.stringify(Object.entries(metadata.optionalDependencies ?? {}).sort()) !==
        JSON.stringify(Object.entries(dependencies).sort()) ||
        metadata.os !== undefined || metadata.cpu !== undefined || metadata.libc !== undefined) {
      throw new Error(`Launcher platform dependencies mismatch for ${name}@${version}`);
    }
  }
}

function command(executable, args, options = {}) {
  return execFileSync(executable, args, { encoding: "utf8", ...options }).trim();
}

async function registryVersion(name, version) {
  const response = await fetch(`https://registry.npmjs.org/${name.replace("/", "%2f")}/${version}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`npm registry lookup failed for ${name}@${version}: HTTP ${response.status}`);
  return response.json();
}

export async function publishRelease(tag, {
  run = command,
  lookup = registryVersion,
  eventId = process.env.RELEASE_ID,
  eventPrerelease = process.env.RELEASE_PRERELEASE,
} = {}) {
  const release = JSON.parse(run("gh", ["api", `repos/${repository}/releases/tags/${tag}`]));
  const { version, prerelease, assets } = validateRelease(release, tag, eventId, eventPrerelease);
  const temp = mkdtempSync(join(tmpdir(), "copilot-npm-release-"));
  try {
    run("gh", ["release", "download", tag, "--repo", repository, "--pattern", "github-copilot-*.tgz", "--dir", temp]);
    const downloaded = readdirSync(temp);
    if (downloaded.length !== assets.length || assets.some((asset) => !downloaded.includes(asset.name))) {
      throw new Error(`Downloaded npm tarballs do not match release ${tag}`);
    }
    const packages = [];
    for (const platform of [...platforms, null]) {
      const suffix = platform?.[0];
      const name = packageName(suffix);
      const file = join(temp, `github-copilot-${version}${suffix ? `-${suffix}` : ""}.tgz`);
      const asset = assets.find((entry) => entry.name === `github-copilot-${version}${suffix ? `-${suffix}` : ""}.tgz`);
      const bytes = readFileSync(file);
      if (statSync(file).size !== asset.size ||
          `sha256:${createHash("sha256").update(bytes).digest("hex")}` !== asset.digest) {
        throw new Error(`Release asset checksum mismatch: ${asset.name}`);
      }
      const metadata = JSON.parse(run("tar", ["-xOzf", file, "package/package.json"]));
      validatePackage(metadata, platform, version);
      const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
      packages.push({ name, file, integrity });
    }

    // Complete all nine archive and registry checks before the first irreversible publish.
    const channel = prerelease ? "prerelease" : "latest";
    for (const item of packages) {
      const existing = await lookup(item.name, version);
      if (existing && existing.dist?.integrity !== item.integrity) {
        throw new Error(`Existing npm ${item.name}@${version} has different dist.integrity`);
      }
      const tags = JSON.parse(run("npm", ["view", item.name, "dist-tags", "--json", "--registry", "https://registry.npmjs.org"]));
      const current = tags[channel];
      if (current && compareVersions(current, version) > 0) {
        item.tag = `release-${version.replaceAll(".", "-")}`;
      } else {
        item.tag = channel;
      }
      if (existing && item.tag === channel && current !== version) {
        throw new Error(`Cannot repair ${item.name} ${channel} dist-tag with OIDC; it points to ${current ?? "(none)"}`);
      }
      item.existing = !!existing;
    }

    for (const item of packages) {
      if (item.existing) {
        console.log(`Already published ${item.name}@${version} (integrity matches)`);
        continue;
      }
      // Re-check immediately before publishing; a concurrent external publisher must not move a newer tag back.
      const existing = await lookup(item.name, version);
      if (existing) {
        if (existing.dist?.integrity !== item.integrity) {
          throw new Error(`Existing npm ${item.name}@${version} changed dist.integrity`);
        }
        console.log(`Already published ${item.name}@${version} (integrity matches)`);
        continue;
      }
      const tags = JSON.parse(run("npm", ["view", item.name, "dist-tags", "--json", "--registry", "https://registry.npmjs.org"]));
      if (item.tag === channel && tags[channel] && compareVersions(tags[channel], version) > 0) {
        item.tag = `release-${version.replaceAll(".", "-")}`;
      }
      run("npm", ["publish", item.file, "--ignore-scripts", "--access", "public", "--tag", item.tag, "--registry", "https://registry.npmjs.org"]);
      console.log(`Published ${item.name}@${version} with ${item.tag} tag`);
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  publishRelease(process.argv[2]).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
