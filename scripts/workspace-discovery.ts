import fs from 'node:fs';
import path from 'node:path';

type RootManifest = { workspaces?: unknown };

function fail(code: string): never {
  throw new Error(code);
}

function workspacePatterns(manifest: RootManifest): string[] {
  if (!Array.isArray(manifest.workspaces) || manifest.workspaces.length === 0 || !manifest.workspaces.every((item) => typeof item === 'string')) {
    return fail('RELEASE_WORKSPACES_INVALID');
  }

  return [...manifest.workspaces].sort();
}

function packageFileForWorkspace(root: string, workspace: string): string {
  const normalized = workspace.replace(/\\/g, '/');
  if (path.isAbsolute(normalized) || normalized.startsWith('../') || normalized.includes('/../')) {
    return fail(`RELEASE_WORKSPACE_PATH_INVALID:${workspace}`);
  }

  return path.join(root, ...normalized.split('/'), 'package.json');
}

function expandWorkspacePattern(root: string, workspace: string): string[] {
  if (!workspace.endsWith('/*') || workspace.slice(0, -2).includes('*')) {
    return [packageFileForWorkspace(root, workspace)];
  }

  const directory = path.join(root, ...workspace.slice(0, -2).split('/'));
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return fail(`RELEASE_WORKSPACE_DIRECTORY_MISSING:${workspace}`);
  }

  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name, 'package.json'))
    .filter((file) => fs.existsSync(file))
    .sort();
}

/**
 * Resolves package manifests from the root workspace declaration, rather than
 * retaining a second, stale list of packages in release tooling.
 */
export function discoverWorkspacePackageFiles(root: string, manifest: RootManifest): string[] {
  const files = workspacePatterns(manifest).flatMap((workspace) => expandWorkspacePattern(root, workspace));
  const unique = [...new Set(files.map((file) => path.relative(root, file).replace(/\\/g, '/')))];
  if (unique.length === 0) return fail('RELEASE_WORKSPACE_PACKAGES_MISSING');
  return unique.sort();
}
