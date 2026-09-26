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
// Include recurring templates so future generated transactions keep their owner.
const query = '*[_type in ["transaction", "transfer", "settings", "recurringTransaction"] && (!defined(username) || username == "")]{_id, _rev, _type}';
const documents = await client.fetch(query);
console.log('Records missing usernames:', documents.reduce((counts, doc) => {
  counts[doc._type] = (counts[doc._type] || 0) + 1;
  return counts;
}, {}));
if (process.argv.includes('--apply')) {
  for (let i = 0; i < documents.length; i += 100) {
    const transaction = client.transaction();
    for (const doc of documents.slice(i, i + 100)) {
      transaction.patch(doc._id, patch => patch.ifRevisionId(doc._rev).set({ username: 'kanavgoyal898' }));
    }
    await transaction.commit();
  }
  const remaining = await client.fetch(query);
  console.log(`Updated ${documents.length} records; ${remaining.length} records still missing usernames.`);
  if (remaining.length) process.exitCode = 1;
} else {
  console.log('Dry run. Pass --apply to backfill these records.');
}
