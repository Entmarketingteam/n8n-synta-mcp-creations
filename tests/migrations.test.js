import { describe, it } from 'node:test';
import { execSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert';

const MIGRATIONS_DIR = join(import.meta.dirname, '..', 'data', 'migrations');

const databases = ['creators', 'campaigns', 'analytics', 'knowledge', 'logs'];

describe('SQL migrations', () => {
  for (const db of databases) {
    const dbDir = join(MIGRATIONS_DIR, db);
    const sqlFiles = existsSync(dbDir)
      ? readdirSync(dbDir).filter(f => f.endsWith('.sql')).sort()
      : [];

    it(`${db}/ directory exists`, () => {
      assert.ok(existsSync(dbDir), `Missing migrations directory: ${dbDir}`);
    });

    it(`${db}/ has at least one migration file`, () => {
      assert.ok(sqlFiles.length > 0, `No .sql files in ${dbDir}`);
    });

    it(`${db}/ migrations run sequentially without error`, () => {
      const readCmds = sqlFiles.map(f => `".read ${join(dbDir, f)}"`).join(' ');
      try {
        execSync(`sqlite3 ":memory:" ${readCmds} ".quit"`, {
          timeout: 5000,
          stdio: 'pipe',
        });
      } catch (err) {
        assert.fail(`Sequential migrations for ${db} failed: ${err.stderr?.toString() || err.message}`);
      }
    });
  }
});

describe('workspace structure', () => {
  const expectedDirs = [
    'workspace/memory',
    'workspace/agency/creators',
    'workspace/agency/brands',
    'workspace/agency/campaigns',
    'workspace/skills',
    'workspace/automation',
  ];

  for (const dir of expectedDirs) {
    it(`${dir}/ exists`, () => {
      const fullPath = join(import.meta.dirname, '..', dir);
      assert.ok(existsSync(fullPath), `Missing directory: ${fullPath}`);
    });
  }
});
