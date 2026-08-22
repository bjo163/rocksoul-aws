import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = process.argv[2];
const args = process.argv.slice(3);
if (!entry) throw new Error('Usage: node scripts/transpile-exec.mjs <file.ts> [args...]');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mw-build-'));
fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ type: 'module' }));
// Windows directory symlinks require developer mode/elevation; junctions do not.
// Keep the certification runner usable from a normal non-elevated shell.
fs.symlinkSync(
  path.join(repo, 'node_modules'),
  path.join(tmp, 'node_modules'),
  process.platform === 'win32' ? 'junction' : 'dir'
);
function walk(dir) {
  const out=[]; for (const name of fs.readdirSync(dir)) { if (['node_modules','dist'].includes(name)) continue; const full=path.join(dir,name); const st=fs.statSync(full); if (st.isDirectory()) out.push(...walk(full)); else out.push(full); } return out;
}
for (const dir of ['src','packages','scripts','apps']) {
  for (const file of walk(path.join(repo,dir))) {
    const rel=path.relative(repo,file); const target=path.join(tmp,rel); fs.mkdirSync(path.dirname(target),{recursive:true});
    if (file.endsWith('.ts')) {
      const out=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText; fs.writeFileSync(target.replace(/\.ts$/,'.js'),out);
    } else fs.copyFileSync(file,target);
  }
}
for (const dir of ['data','schemas','config']) fs.cpSync(path.join(repo,dir),path.join(tmp,dir),{recursive:true});
const target=path.join(tmp,entry.replace(/\.ts$/,'.js'));
const result=spawnSync(process.execPath,[target,...args],{cwd:tmp,env:{...process.env,MW_REPO_ROOT:repo},stdio:'inherit'});
const exitCode=result.status ?? 1;
fs.rmSync(tmp,{recursive:true,force:true});
if (result.error) throw result.error;
process.exit(exitCode);
