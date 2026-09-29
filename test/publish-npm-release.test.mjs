// Copyright (c) GitHub, Inc. All rights reserved.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { compareVersions, publishRelease, validateRelease } from "../script/publish-npm-release.mjs";

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

function fixture(version = "1.2.3-4") {
  const root = mkdtempSync(join(tmpdir(), "copilot-npm-publish-test-"));
  const assets = [];
  const integrity = new Map();
  for (const platform of [...platforms, null]) {
    const [suffix, os, cpu, libc] = platform ?? [];
    const name = `@github/copilot${suffix ? `-${suffix}` : ""}`;
    const filename = `github-copilot-${version}${suffix ? `-${suffix}` : ""}.tgz`;
    const source = join(root, filename);
    const packageDir = join(root, "work", "package");
    mkdirSync(packageDir, { recursive: true });
    writeFileSync(join(packageDir, "package.json"), JSON.stringify({
      name, version,
      repository: { url: "git+https://github.com/github/copilot-cli.git" },
      ...(platform ? { os: [os], cpu: [cpu], ...(libc ? { libc: [libc] } : {}) } : {
        optionalDependencies: Object.fromEntries(platforms.map(([value]) => [`@github/copilot-${value}`, version])),
      }),
    }));
    execFileSync("tar", ["-czf", source, "-C", join(root, "work"), "package"]);
    const bytes = readFileSync(source);
    assets.push({
      name: filename, size: bytes.length, state: "uploaded",
      digest: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    });
    integrity.set(name, `sha512-${createHash("sha512").update(bytes).digest("base64")}`);
  }
  return {
    root, integrity,
    release: {
      id: 1234, tag_name: `v${version}`, prerelease: version.includes("-"),
      published_at: "2026-09-29T00:00:00Z", draft: false, assets,
    },
  };
}

async function exercise(options = {}) {
  const f = fixture(options.version);
  const published = [];
  const existing = typeof options.existing === "function" ? options.existing(f) : options.existing ?? new Map();
  const tags = options.tags ?? { latest: "1.2.2", prerelease: "1.2.3-3" };
  try {
    options.mutate?.(f);
    const run = (tool, args) => {
      if (tool === "gh" && args[0] === "api") return JSON.stringify(f.release);
      if (tool === "gh" && args[0] === "release") {
        for (const asset of f.release.assets) {
          const source = join(f.root, asset.name);
          cpSync(source, join(args.at(-1), asset.name));
        }
        return "";
      }
      if (tool === "tar") return execFileSync("tar", args, { encoding: "utf8" }).trim();
      if (tool === "npm" && args[0] === "view") return JSON.stringify(
        typeof tags === "function" ? tags(args[1]) : tags
      );
      if (tool === "npm" && args[0] === "publish") {
        published.push(args);
        assert.ok(args.includes("--ignore-scripts"));
        return "";
      }
      throw new Error(`Unexpected command ${tool} ${args.join(" ")}`);
    };
    const lookup = async (name) => existing.has(name) ? { dist: { integrity: existing.get(name) } } : null;
    const result = await publishRelease(f.release.tag_name, {
      run, lookup, eventId: options.eventId, eventPrerelease: options.eventPrerelease,
    });
    return { published, fixture: f, result };
  } catch (error) {
    error.published = published;
    throw error;
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
}

test("publishes all eight platforms before launcher with prerelease tag", async () => {
  const { published } = await exercise({ eventId: "1234", eventPrerelease: "true" });
  assert.equal(published.length, 9);
  assert.ok(published.every((args) => args[args.indexOf("--tag") + 1] === "prerelease"));
  assert.match(published.at(-1)[1], /github-copilot-1\.2\.3-4\.tgz$/);
});

test("a matching existing package is skipped on a partial rerun", async () => {
  const { published } = await exercise({
    existing: (f) => new Map([["@github/copilot-darwin-arm64", f.integrity.get("@github/copilot-darwin-arm64")]]),
    tags: (name) => ({ prerelease: name === "@github/copilot-darwin-arm64" ? "1.2.3-4" : "1.2.3-3" }),
  });
  assert.equal(published.length, 8);
});

test("older recovery never moves a newer channel tag backwards", async () => {
  const { published } = await exercise({ tags: { prerelease: "1.2.3-5" } });
  assert.equal(published.length, 9);
  assert.ok(published.every((args) => args[args.indexOf("--tag") + 1] === "release-1-2-3-4"));
});

test("stable release uses latest, and an older stable release uses a version tag", async () => {
  const current = await exercise({ version: "1.2.3", tags: { latest: "1.2.2" } });
  assert.ok(current.published.every((args) => args[args.indexOf("--tag") + 1] === "latest"));
  const old = await exercise({ version: "1.2.3", tags: { latest: "1.2.4" } });
  assert.ok(old.published.every((args) => args[args.indexOf("--tag") + 1] === "release-1-2-3"));
});

test("rejects a registry integrity mismatch before any publish", async () => {
  await assert.rejects(exercise({ existing: new Map([["@github/copilot-win32-x64", "sha512-wrong"]]) }), (error) => {
    assert.match(error.message, /different dist.integrity/);
    assert.deepEqual(error.published, []);
    return true;
  });
});

test("rejects invalid launcher dependencies and platform metadata before publishing", async () => {
  for (const filename of ["github-copilot-1.2.3-4.tgz", "github-copilot-1.2.3-4-linuxmusl-x64.tgz"]) {
    await assert.rejects(exercise({
      mutate: (f) => {
        const work = join(f.root, "work");
        execFileSync("tar", ["-xzf", join(f.root, filename), "-C", work]);
        const manifest = join(work, "package", "package.json");
        const metadata = JSON.parse(readFileSync(manifest, "utf8"));
        if (metadata.optionalDependencies) delete metadata.optionalDependencies["@github/copilot-win32-x64"];
        else metadata.libc = ["glibc"];
        writeFileSync(manifest, JSON.stringify(metadata));
        execFileSync("tar", ["-czf", join(f.root, filename), "-C", work, "package"]);
        const asset = f.release.assets.find((entry) => entry.name === filename);
        const bytes = readFileSync(join(f.root, filename));
        asset.size = bytes.length;
        asset.digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
      },
    }), (error) => {
      assert.match(error.message, /metadata mismatch|dependencies mismatch/);
      assert.deepEqual(error.published, []);
      return true;
    });
  }
});

test("a previously published version with a stale channel tag fails explicitly", async () => {
  await assert.rejects(exercise({
    existing: (f) => new Map([["@github/copilot-darwin-arm64", f.integrity.get("@github/copilot-darwin-arm64")]]),
  }), /Cannot repair .* dist-tag with OIDC/);
});

test("rejects incomplete assets and incorrect digests before any publish", async () => {
  for (const mutate of [
    (f) => { f.release.assets.pop(); },
    (f) => { f.release.assets[0].digest = `sha256:${"0".repeat(64)}`; },
    (f) => { f.release.assets[0].name = "unexpected.tgz"; },
  ]) {
    await assert.rejects(exercise({ mutate }), (error) => {
      assert.deepEqual(error.published, []);
      return true;
    });
  }
});

test("rejects mismatched event and release identity", async () => {
  await assert.rejects(exercise({ eventId: "5678" }), /differs from the triggering event/);
  await assert.rejects(exercise({ eventPrerelease: "false" }), /differs from the triggering event/);
});

test("release tag and prerelease flag are canonical", () => {
  const f = fixture();
  try {
    assert.throws(() => validateRelease(f.release, "v01.2.3-4"), /canonical tag/);
    f.release.prerelease = false;
    assert.throws(() => validateRelease(f.release, "v1.2.3-4"), /Prerelease flag/);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
  assert.equal(compareVersions("1.2.3", "1.2.3-4"), 1);
  assert.equal(compareVersions("1.2.3-10", "1.2.3-9"), 1);
});
