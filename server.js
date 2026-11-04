const http = require('http');
const fs = require('fs');
const path = require('path');
const { scanCollection, parseMarkdownFile, slugify, inferType } = require('./parser');

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const FAVORITES_FILE = path.join(ROOT_DIR, 'favorites.json');

// Helper to load favorites
function getFavorites() {
  try {
    if (fs.existsSync(FAVORITES_FILE)) {
      const data = fs.readFileSync(FAVORITES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (err) {
    console.error('Error reading favorites.json:', err.message);
  }
  return new Set();
}

function saveFavorites(favoritesSet) {
  try {
    fs.writeFileSync(FAVORITES_FILE, JSON.stringify(Array.from(favoritesSet), null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving favorites.json:', err.message);
  }
}

// Update public/data.js so offline mode is always in sync
function syncOfflineData() {
  try {
    const items = scanCollection(ROOT_DIR);
    const dataJsPath = path.join(PUBLIC_DIR, 'data.js');
    const content = `window.COLLECTION_ITEMS = ${JSON.stringify(items, null, 2)};\n`;
    fs.writeFileSync(dataJsPath, content, 'utf-8');
  } catch (err) {
    console.error('Error syncing offline data:', err.message);
  }
}

// Deterministic date hash for daily inspiration
function getDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function getEnrichedItems() {
  const items = scanCollection(ROOT_DIR);
  const favorites = getFavorites();
  return items.map((item) => ({
    ...item,
    isFavorite: favorites.has(item.id),
  }));
}

function getDailyItem(items, dateStr) {
  if (!items || items.length === 0) return null;
  const hash = hashString(dateStr || getDateString());
  const index = hash % items.length;
  return {
    ...items[index],
    isDailyPick: true,
    dailyDate: dateStr || getDateString(),
  };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res, pathname) {
  let safePath = pathname === '/' ? '/index.html' : pathname;
  safePath = path.normalize(safePath).replace(/^(\.\.[\/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const host = req.headers.host || 'localhost';
  const reqUrl = new URL(req.url, `http://${host}`);
  const pathname = reqUrl.pathname;
  const searchParams = reqUrl.searchParams;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    // API Routes
    if (pathname === '/api/daily' && req.method === 'GET') {
      const items = getEnrichedItems();
      const dateStr = searchParams.get('date') || getDateString();
      const daily = getDailyItem(items, dateStr);
      return sendJson(res, 200, { success: true, item: daily, totalCount: items.length });
    }

    if (pathname === '/api/items' && req.method === 'GET') {
      let items = getEnrichedItems();
      const typeParam = searchParams.get('type');
      const favParam = searchParams.get('favorite');
      const searchParam = searchParams.get('search');

      if (typeParam && typeParam !== 'all') {
        items = items.filter((item) => item.type === typeParam);
      }
      if (favParam === 'true') {
        items = items.filter((item) => item.isFavorite);
      }
      if (searchParam) {
        const q = searchParam.toLowerCase();
        items = items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.text.toLowerCase().includes(q) ||
            (item.source && item.source.toLowerCase().includes(q)) ||
            (item.author && item.author.toLowerCase().includes(q)) ||
            (item.tags && item.tags.some((t) => t.toLowerCase().includes(q)))
        );
      }
      return sendJson(res, 200, { success: true, count: items.length, items });
    }

    if (pathname === '/api/random' && req.method === 'GET') {
      let items = getEnrichedItems();
      const typeParam = searchParams.get('type');
      const favParam = searchParams.get('favorite');
      const excludeId = searchParams.get('excludeId');

      if (typeParam && typeParam !== 'all') {
        items = items.filter((item) => item.type === typeParam);
      }
      if (favParam === 'true') {
        items = items.filter((item) => item.isFavorite);
      }
      if (excludeId && items.length > 1) {
        items = items.filter((item) => item.id !== excludeId);
      }
      if (items.length === 0) {
        items = getEnrichedItems();
      }
      const randomItem = items[Math.floor(Math.random() * items.length)];
      return sendJson(res, 200, { success: true, item: randomItem });
    }

    if (pathname === '/api/favorites' && req.method === 'GET') {
      const favorites = Array.from(getFavorites());
      return sendJson(res, 200, { success: true, favorites });
    }

    if (pathname === '/api/favorites/toggle' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { id } = body;
      if (!id) {
        return sendJson(res, 400, { success: false, error: 'Missing item id' });
      }
      const favorites = getFavorites();
      let isFavorite = false;
      if (favorites.has(id)) {
        favorites.delete(id);
        isFavorite = false;
      } else {
        favorites.add(id);
        isFavorite = true;
      }
      saveFavorites(favorites);
      return sendJson(res, 200, { success: true, id, isFavorite, totalFavorites: favorites.size });
    }

    if (pathname === '/api/stats' && req.method === 'GET') {
      const items = getEnrichedItems();
      const favorites = getFavorites();
      const counts = {
        total: items.length,
        quote: 0,
        memory: 0,
        goal: 0,
        idea: 0,
        note: 0,
        favorite: favorites.size,
      };
      for (const item of items) {
        if (counts[item.type] !== undefined) {
          counts[item.type]++;
        }
      }
      return sendJson(res, 200, { success: true, stats: counts });
    }

    if (pathname === '/api/items' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { type = 'note', title, text, source, author, date, tags } = body;
      if (!text || !text.trim()) {
        return sendJson(res, 400, { success: false, error: 'Text content is required' });
      }

      const itemTitle = (title || text.slice(0, 40)).trim();
      const itemDate = date || getDateString();
      const itemType = inferType(type, text, itemTitle);
      const targetFolder = path.join(ROOT_DIR, itemType === 'memory' ? 'journal' : (itemType + 's'));

      if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder, { recursive: true });
      }

      const fileSlug = `${itemDate}-${slugify(itemTitle).slice(0, 30)}.md`;
      const filePath = path.join(targetFolder, fileSlug);

      const tagList = Array.isArray(tags) ? tags : (tags ? tags.split(',').map((t) => t.trim()) : []);
      const frontmatter = [
        '---',
        `title: ${JSON.stringify(itemTitle)}`,
        `date: ${itemDate}`,
        `category: ${itemType}`,
        `type: ${itemType}`,
        source ? `source: ${JSON.stringify(source)}` : null,
        author ? `author: ${JSON.stringify(author)}` : null,
        tagList.length > 0 ? `tags: [${tagList.map((t) => JSON.stringify(t)).join(', ')}]` : null,
        '---',
        '',
        text.trim(),
        '',
      ].filter(Boolean).join('\n');

      fs.writeFileSync(filePath, frontmatter, 'utf-8');

      // Sync offline cache
      syncOfflineData();

      const items = getEnrichedItems();
      const createdItem = items.find((i) => i.filePath.includes(fileSlug)) || items[items.length - 1];

      return sendJson(res, 201, { success: true, item: createdItem });
    }

    // Serve Static Files
    return serveStatic(req, res, pathname);
  } catch (err) {
    console.error('Server error handling request:', err);
    return sendJson(res, 500, { success: false, error: err.message });
  }
});

const DEFAULT_PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

function startServer(port = DEFAULT_PORT) {
  syncOfflineData();
  server.listen(port, '127.0.0.1', () => {
    console.log(`✨ Daily Inspiration App is running at http://127.0.0.1:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

if (require.main === module) {
  startServer(DEFAULT_PORT);
}

module.exports = { server, startServer, getEnrichedItems, getDailyItem, syncOfflineData };
