const { v4: uuidv4 } = require('uuid');

const createSlugBase = (value, maxLen = 48, fallback = 'smartlink') => {
  const base = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen);

  return base || fallback;
};

const createUniqueSlug = async ({
  client,
  table,
  column = 'slug',
  input,
  maxLen = 64,
  fallback = 'smartlink',
}) => {
  const base = createSlugBase(input, Math.min(48, maxLen), fallback);

  for (let i = 0; i < 8; i += 1) {
    const suffix = i === 0 ? '' : `-${Math.random().toString(36).slice(2, 8)}`;
    const candidate = `${base}${suffix}`.slice(0, maxLen);
    const exists = await client.query(
      `SELECT 1 FROM ${table} WHERE ${column} = $1 LIMIT 1`,
      [candidate]
    );
    if (exists.rows.length === 0) {
      return candidate;
    }
  }

  return `${base}-${uuidv4().slice(0, 8)}`.slice(0, maxLen);
};

module.exports = {
  createSlugBase,
  createUniqueSlug,
};
