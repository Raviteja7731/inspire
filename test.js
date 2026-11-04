const assert = require('assert');
const { EventEmitter } = require('events');
const { scanCollection, inferType, slugify } = require('./parser');
const { getDailyItem, getEnrichedItems, server } = require('./server');

console.log('🧪 Starting Daily Inspiration tests...\n');

// 1. Test Parser
const items = scanCollection(__dirname);
assert(items.length > 0, 'Parser should find items in the workspace');
console.log(`✓ Parser found ${items.length} items across all categories`);

// Verify required fields on each item
for (const item of items) {
  assert(item.id, `Item ${item.title} must have an id`);
  assert(item.title, `Item ${item.id} must have a title`);
  assert(item.text, `Item ${item.id} must have text`);
  assert(item.type, `Item ${item.id} must have a type`);
  assert(item.source, `Item ${item.id} must have a source`);
  assert(item.date, `Item ${item.id} must have a date`);
}
console.log('✓ All items have valid IDs, titles, text, types, sources, and dates');

// 2. Test Types Variety
const types = new Set(items.map((i) => i.type));
assert(types.has('quote'), 'Collection must include quotes');
assert(types.has('memory'), 'Collection must include memories/journal entries');
assert(types.has('goal'), 'Collection must include goals');
assert(types.has('idea'), 'Collection must include ideas');
console.log(`✓ Diverse categories detected: ${Array.from(types).join(', ')}`);

// 3. Test Deterministic Daily Selection
const dailyToday = getDailyItem(items, '2026-11-04');
const dailyTodayAgain = getDailyItem(items, '2026-11-04');
const dailyTomorrow = getDailyItem(items, '2026-11-05');

assert.strictEqual(dailyToday.id, dailyTodayAgain.id, 'Daily selection for same date must be deterministic');
assert(dailyToday.isDailyPick === true, 'Daily pick must have isDailyPick: true');
console.log(`✓ Deterministic daily selection verified: "${dailyToday.title}" (${dailyToday.type}) for 2026-11-04`);
console.log(`  Next day selection: "${dailyTomorrow.title}" (${dailyTomorrow.type})`);

// 4. Test Enriched Items & Favorites
const enriched = getEnrichedItems();
assert(enriched.length === items.length);
const favCount = enriched.filter((i) => i.isFavorite).length;
console.log(`✓ Enriched items verified (${favCount} initial favorites loaded from favorites.json)`);

// 5. Test Mock Request Handling
function mockRequest(method, urlPath, body = null) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = urlPath;
    req.headers = { host: 'localhost' };
    req.connection = {};

    let statusCode = 200;
    let headers = {};
    let responseData = '';

    const res = {
      writeHead(code, h) {
        statusCode = code;
        headers = h || {};
      },
      setHeader(k, v) {
        headers[k] = v;
      },
      end(data) {
        if (data) responseData += data;
        resolve({ statusCode, headers, body: responseData });
      },
    };

    // Invoke server's request listener
    const listeners = server.listeners('request');
    if (listeners.length > 0) {
      listeners[0](req, res);
    }

    if (body) {
      req.emit('data', JSON.stringify(body));
    }
    req.emit('end');
  });
}

(async () => {
  const dailyRes = await mockRequest('GET', '/api/daily?date=2026-11-04');
  assert.strictEqual(dailyRes.statusCode, 200);
  const dailyJson = JSON.parse(dailyRes.body);
  assert(dailyJson.success);
  assert(dailyJson.item);
  console.log(`✓ Mock GET /api/daily succeeded: "${dailyJson.item.title}"`);

  const quotesRes = await mockRequest('GET', '/api/items?type=quote');
  assert.strictEqual(quotesRes.statusCode, 200);
  const quotesJson = JSON.parse(quotesRes.body);
  assert(quotesJson.items.length > 0);
  assert(quotesJson.items.every((i) => i.type === 'quote'));
  console.log(`✓ Mock GET /api/items?type=quote succeeded (${quotesJson.items.length} items)`);

  const statsRes = await mockRequest('GET', '/api/stats');
  assert.strictEqual(statsRes.statusCode, 200);
  const statsJson = JSON.parse(statsRes.body);
  assert(statsJson.stats.total >= 30);
  console.log(`✓ Mock GET /api/stats succeeded (${JSON.stringify(statsJson.stats)})`);

  console.log('\n🎉 ALL 5 TEST SUITES PASSED SUCCESSFULLY!\n');
  process.exit(0);
})();
