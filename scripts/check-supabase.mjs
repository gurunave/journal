#!/usr/bin/env node
/**
 * Verifies a Supabase project is set up the way the app expects.
 *
 *   node scripts/check-supabase.mjs
 *   node scripts/check-supabase.mjs you@company.com yourpassword   # also checks auth + RLS
 *
 * Reads .env, then reports what is missing rather than failing on the first
 * problem, so one run tells you everything left to do.
 */
import { readFileSync, existsSync } from 'node:fs';

const REQUIRED_TABLES = {
  reportees: ['id', 'owner_id', 'name', 'role', 'archived'],
  categories: ['id', 'owner_id', 'label', 'sort_order'],
  incidents: [
    'id', 'owner_id', 'reportee_id', 'occurred_at', 'sentiment', 'severity',
    'themes', 'note', 'photo_path', 'group_id', 'discussed_at',
  ],
  one_on_ones: ['id', 'owner_id', 'reportee_id', 'held_at'],
};

const results = [];
const ok = (m) => results.push(['ok', m]);
const bad = (m, fix) => results.push(['fail', m, fix]);
const note = (m) => results.push(['info', m]);

function readEnv() {
  if (!existsSync('.env')) return {};
  const out = {};
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = { ...readEnv(), ...process.env };
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!existsSync('.env')) {
  bad('No .env file', 'cp .env.example .env, then fill in the two values');
}
if (!url || url.includes('YOUR-PROJECT-REF')) {
  bad('EXPO_PUBLIC_SUPABASE_URL is not set', 'Supabase dashboard -> Settings -> API -> Project URL');
} else if (!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url.replace(/\/$/, '') + '/')) {
  note(`URL looks unusual: ${url} (expected https://<ref>.supabase.co)`);
}
if (!key || key.includes('YOUR-ANON-KEY')) {
  bad('EXPO_PUBLIC_SUPABASE_ANON_KEY is not set', 'Settings -> API -> anon / public key');
} else if (key.length < 40) {
  bad('The anon key looks too short', 'Copy the whole anon key, not the project ref');
} else if (/service_role/.test(safeJwtPayload(key)) || key.startsWith('sb_secret_')) {
  bad('That is a secret (service_role) key, not the anon key', 'Never ship a secret key in a client. Use the anon or publishable key.');
}

function safeJwtPayload(jwt) {
  try {
    return Buffer.from(jwt.split('.')[1], 'base64').toString('utf8');
  } catch {
    return '';
  }
}

if (results.some(([kind]) => kind === 'fail')) {
  report();
  process.exit(1);
}

const base = url.replace(/\/$/, '');
const headers = { apikey: key, Authorization: `Bearer ${key}` };

// Ask PostgREST for zero rows of a specific column list. 200 means every
// column exists; 42703 names one that does not; PGRST205 means no such table.
// (The OpenAPI root at /rest/v1/ is not usable here — Supabase now restricts
// it to secret keys, and this check only ever holds the client-side key.)
async function probe(table, columns) {
  const select = columns.length ? columns.join(',') : 'id';
  const res = await fetch(
    `${base}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=0`,
    { headers },
  );
  const body = res.ok ? null : await res.json().catch(() => ({}));
  return { status: res.status, code: body?.code, message: body?.message };
}

// 1. Is the project reachable, and does the key belong to it?
try {
  const res = await fetch(`${base}/auth/v1/settings`, { headers });
  if (res.status === 401) {
    bad('The project rejected the key (401)', 'The anon key does not match this project URL');
    report();
    process.exit(1);
  }
  if (!res.ok) {
    bad(`The project answered ${res.status} ${res.statusText}`, 'Check the URL');
    report();
    process.exit(1);
  }
  ok('Project is reachable and the anon key is accepted');
} catch (err) {
  bad(`Could not reach ${base} — ${err.message}`, 'Check the URL and your network');
  report();
  process.exit(1);
}

// 2. Are the tables there, with the current columns?
let needsMigration = null;
for (const [table, columns] of Object.entries(REQUIRED_TABLES)) {
  const all = await probe(table, columns);

  if (all.status === 404 || all.code === 'PGRST205') {
    bad(`Table "${table}" is missing`, 'Run supabase/schema.sql in the SQL editor');
    continue;
  }
  if (all.status === 401 || all.status === 403) {
    bad(`Table "${table}" is not readable by the anon role`,
        'Re-run supabase/schema.sql — it grants the table and adds the RLS policies');
    continue;
  }
  if (all.status === 200) {
    ok(`Table "${table}" has every column the app reads`);
  } else {
    // Something in the column list does not exist; find out what.
    const missing = [];
    for (const col of columns) {
      const one = await probe(table, [col]);
      if (one.status !== 200) missing.push(col);
    }
    if (missing.length === 0) {
      note(`Table "${table}" answered ${all.status} — ${all.message ?? 'unknown error'}`);
    } else {
      bad(`Table "${table}" is missing: ${missing.join(', ')}`, migrationHint(missing));
      if (missing.includes('themes') || missing.includes('group_id')) needsMigration = true;
    }
  }

  if (table === 'incidents') {
    const legacy = await probe(table, ['category']);
    if (legacy.status === 200) {
      note('The old "category" column is still present — migration 001 has not been run');
    }
  }
}

function migrationHint(missing) {
  if (missing.includes('themes')) return 'Run supabase/migrations/001_multi_theme.sql';
  if (missing.includes('group_id')) return 'Run supabase/migrations/002_group_capture.sql';
  return 'Run supabase/schema.sql';
}
if (needsMigration) {
  note('Run the files in supabase/migrations/ in order, then re-run this check');
}

// 3. Optional: sign in and confirm auth + row level security actually work.
const [email, password] = process.argv.slice(2);
if (email && password) {
  const res = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    bad(`Could not sign in as ${email}: ${body.error_description ?? body.msg ?? res.statusText}`,
        'Confirm the address from your inbox, or turn off Authentication -> Providers -> Email -> Confirm email');
  } else {
    ok(`Signed in as ${email}`);
    const auth = { apikey: key, Authorization: `Bearer ${body.access_token}` };
    const seeded = await fetch(`${base}/rest/v1/categories?select=label`, { headers: auth });
    const rows = await seeded.json().catch(() => []);
    if (Array.isArray(rows) && rows.length > 0) {
      ok(`Row level security is returning your own data (${rows.length} themes seeded)`);
    } else if (Array.isArray(rows)) {
      note('Signed in, but no themes are seeded for this account. New accounts get them from a trigger; older ones may predate it.');
    }
  }
} else {
  note('Pass an email and password to also check sign-in and row level security');
}

report();
process.exit(results.some(([k]) => k === 'fail') ? 1 : 0);

function report() {
  const mark = { ok: '  ok  ', fail: ' FAIL ', info: '  --  ' };
  console.log('');
  for (const [kind, message, fix] of results) {
    console.log(`${mark[kind]} ${message}`);
    if (fix) console.log(`       -> ${fix}`);
  }
  const failed = results.filter(([k]) => k === 'fail').length;
  console.log('');
  console.log(failed === 0 ? 'Supabase looks ready.' : `${failed} thing${failed === 1 ? '' : 's'} left to fix.`);
  console.log('');
}
