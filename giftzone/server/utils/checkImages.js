// Usage: npm run check-images  -> HEAD-requests every seeded image URL and lists any that fail.
const { pools, url } = require('./seedImages');

(async () => {
  const ids = [...new Set(Object.values(pools).flat())];
  let bad = 0;
  for (const id of ids) {
    try {
      const res = await fetch(url(id, 200), { method: 'HEAD' });
      if (!res.ok) { bad += 1; console.log(`BROKEN (${res.status}): ${id}`); }
    } catch (e) { bad += 1; console.log(`ERROR: ${id} - ${e.message}`); }
  }
  console.log(bad ? `${bad} of ${ids.length} image ids need replacing in utils/seedImages.js` : `All ${ids.length} image ids OK`);
  process.exit(bad ? 1 : 0);
})();
