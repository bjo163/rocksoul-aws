import fs from 'node:fs';

const repo = JSON.parse(fs.readFileSync('ROCKSOUL-REPO.json', 'utf8'));
const todo = JSON.parse(fs.readFileSync('ROCKSOUL-TODO.json', 'utf8'));
const statuses = new Set(['NOT_STARTED', 'IN_PROGRESS', 'WAITING_REVIEW', 'VERIFIED', 'BLOCKED']);
const errors = [];
if (repo.schema !== 'rocksoul.repository.v1') errors.push('unsupported repository schema');
if (todo.schema !== 'rocksoul.todo.v1') errors.push('unsupported TODO schema');
if (!repo.repository_id || todo.repository_id !== repo.repository_id) errors.push('repository_id mismatch');
if (!repo.tracking || !repo.tracking.master_todo) errors.push('tracking.master_todo is required');
const ids = new Set();
for (const task of todo.tasks ?? []) {
  if (!task.id || !task.title || !statuses.has(task.status)) errors.push(`invalid task: ${task.id || '<missing>'}`);
  if (ids.has(task.id)) errors.push(`duplicate task id: ${task.id}`);
  ids.add(task.id);
  if (task.github_issue !== null && task.github_issue !== undefined && !task.github_issue.startsWith('https://github.com/')) errors.push(`invalid github_issue: ${task.id}`);
}
if (errors.length) { console.error(errors.map(error => `FAIL: ${error}`).join('\\n')); process.exit(1); }
console.log(`PASS: ${repo.repository_id} contract; tasks=${todo.tasks?.length ?? 0}`);
