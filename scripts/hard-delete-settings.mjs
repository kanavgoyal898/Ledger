import { createClient } from '@sanity/client';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());
if (!process.env.SANITY_API_TOKEN) throw new Error('SANITY_API_TOKEN is required');
const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  perspective: 'raw',
});

// Remove only legacy tombstones and their flags; preserve all other stored fields.
function clean(items, subField) {
  return items.filter(item => item.deleted !== true).map(item => {
    const result = { ...item };
    delete result.deleted;
    if (subField && Array.isArray(result[subField])) {
      result[subField] = clean(result[subField]);
    }
    return result;
  });
}

async function changes() {
  const documents = await client.fetch('*[_type == "settings"]{_id, _rev, categories, accounts}');
  return documents.flatMap(doc => {
    const fields = {};
    for (const [field, subField] of [['categories', 'subCategories'], ['accounts', 'subAccounts']]) {
      if (Array.isArray(doc[field])) {
        const cleaned = clean(doc[field], subField);
        if (JSON.stringify(cleaned) !== JSON.stringify(doc[field])) fields[field] = cleaned;
      }
    }
    return Object.keys(fields).length ? [{ doc, fields }] : [];
  });
}

const pending = await changes();
console.log(`Settings documents requiring cleanup: ${pending.length}`);
if (process.argv.includes('--apply')) {
  for (const { doc, fields } of pending) {
    await client.patch(doc._id).ifRevisionId(doc._rev).set(fields).commit();
  }
  const remaining = await changes();
  console.log(`Cleaned ${pending.length} documents; ${remaining.length} still require cleanup.`);
  if (remaining.length) process.exitCode = 1;
} else {
  console.log('Dry run. Pass --apply to permanently remove existing soft-deleted items and legacy flags.');
}
