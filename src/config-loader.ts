import fs from 'node:fs';
import path from 'node:path';

export interface DatabaseConfig {
  version: number;
  storage?: {
    driver?: 'postgres' | 'memory' | 'file';
    file_dir?: string;
    postgres?: Record<string, unknown>;
  };
  seed?: {
    manifest?: string;
    mode?: string;
  };
}

type Loose = Record<string, any>;

/**
 * Minimal configuration parser for the repository's deliberately small YAML subset:
 * indentation-based mappings plus scalar/inline-array/empty-object values.
 * It is not a general YAML implementation and rejects tabs/invalid indentation.
 */
export function parseOperationalYaml(text: string): Loose {
  if (/\t/.test(text)) throw new Error('YAML_TABS_NOT_ALLOWED');
  const root: Loose = {};
  const stack: Array<{ indent: number; value: Loose }> = [{ indent: -1, value: root }];

  const parseScalar = (raw: string): any => {
    const v = raw.trim();
    if (v === '{}') return {};
    if (v === '[]') return [];
    if (/^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
    if (/^null$/i.test(v)) return null;
    if (/^-?\d+(?:\.\d+)?$/.test(v)) return Number(v);
    if (v.startsWith('[') && v.endsWith(']')) {
      const body = v.slice(1, -1).trim();
      if (!body) return [];
      return body.split(',').map(x => parseScalar(x));
    }
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) return v.slice(1, -1);
    return v;
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const withoutComment = rawLine.replace(/\s+#.*$/, '');
    if (!withoutComment.trim() || withoutComment.trimStart().startsWith('#')) continue;
    const indent = withoutComment.length - withoutComment.trimStart().length;
    if (indent % 2 !== 0) throw new Error(`YAML_INDENT_MUST_BE_EVEN:${rawLine}`);
    const line = withoutComment.trim();
    const m = /^([^:]+):(?:\s*(.*))?$/.exec(line);
    if (!m) throw new Error(`YAML_UNSUPPORTED_LINE:${line}`);
    const key = m[1].trim();
    const rawValue = m[2] ?? '';

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].value;
    if (rawValue.trim() === '') {
      const child: Loose = {};
      parent[key] = child;
      stack.push({ indent, value: child });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }
  return root;
}

export function loadDatabaseConfig(cwd: string = process.cwd()): DatabaseConfig {
  const configPath = path.resolve(cwd, 'config', 'database.yaml');
  try {
    const text = fs.readFileSync(configPath, 'utf8');
    const parsed = parseOperationalYaml(text) as DatabaseConfig;
    const pg = { ...(parsed.storage?.postgres ?? {}) };
    if (process.env.DATABASE_URL) pg.connectionString = process.env.DATABASE_URL;
    else if (process.env.POSTGRES_URL) pg.connectionString = process.env.POSTGRES_URL;
    if (process.env.PGHOST) pg.host = process.env.PGHOST;
    if (process.env.PGPORT) pg.port = Number(process.env.PGPORT);
    if (process.env.PGDATABASE) pg.database = process.env.PGDATABASE;
    if (process.env.PGUSER) pg.user = process.env.PGUSER;
    if (process.env.PGPASSWORD) pg.password = process.env.PGPASSWORD;
    return { ...parsed, storage: { ...(parsed.storage ?? {}), postgres: pg } };
  } catch (error) {
    console.warn(`[ConfigLoader] Could not load or parse config/database.yaml, using defaults. (${(error as Error).message})`);
    return { version: 1 };
  }
}