const fs = require('fs');
const path = require('path');

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function parseFrontmatter(content) {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = content.match(frontmatterRegex);
  if (!match) {
    return { metadata: {}, body: content };
  }

  const rawMeta = match[1];
  const body = content.slice(match[0].length);
  const metadata = {};

  for (const line of rawMeta.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      let val = line.slice(colonIdx + 1).trim();

      // Handle arrays like [a, b, c]
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean);
      } else {
        val = val.replace(/^['"]|['"]$/g, '');
      }
      metadata[key] = val;
    }
  }

  return { metadata, body };
}

function inferType(categoryOrFolder, text, title) {
  const norm = (categoryOrFolder || '').toLowerCase();
  if (norm.includes('quote')) return 'quote';
  if (norm.includes('journal') || norm.includes('memory')) return 'memory';
  if (norm.includes('goal')) return 'goal';
  if (norm.includes('idea')) return 'idea';
  if (norm.includes('note')) return 'note';

  const combined = (title + ' ' + text).toLowerCase();
  if (combined.includes('>') || combined.includes('— **') || combined.includes('quote')) return 'quote';
  if (combined.includes('goal') || combined.includes('target') || combined.includes('resolution')) return 'goal';
  if (combined.includes('idea') || combined.includes('concept') || combined.includes('what if')) return 'idea';
  if (combined.includes('journal') || combined.includes('woke up') || combined.includes('remember')) return 'memory';
  return 'note';
}

function parseMarkdownFile(filePath, rootDir) {
  const relativePath = path.relative(rootDir, filePath);
  const fileBasename = path.basename(filePath);
  const folderName = path.dirname(relativePath).split(path.sep)[0] || '';
  const rawContent = fs.readFileSync(filePath, 'utf-8');

  const { metadata, body } = parseFrontmatter(rawContent);

  // Check if filename has date like 2023-05-14
  const dateInFilenameMatch = fileBasename.match(/(\d{4}-\d{2}-\d{2})/);
  const fileDate = dateInFilenameMatch ? dateInFilenameMatch[1] : null;

  // Check if body has sub-entries separated by `### ` or `---`
  // We look for sections starting with `### `
  const subSectionRegex = /(?:^|\n)###\s+([^\n]+)\n([\s\S]*?)(?=(?:\n###\s+[^\n]+|$))/g;
  const sections = [];
  let secMatch;
  while ((secMatch = subSectionRegex.exec(body)) !== null) {
    sections.push({
      title: secMatch[1].trim(),
      rawBody: secMatch[2].trim(),
    });
  }

  const items = [];

  if (sections.length > 0) {
    for (const sec of sections) {
      const secText = sec.rawBody.replace(/^---+\s*$/gm, '').trim();

      // Extract quote text if present (> "...")
      let quoteText = '';
      const quoteMatch = secText.match(/>\s*([\s\S]*?)(?=\n[—\-]|\n\n|\n\*|$)/);
      if (quoteMatch) {
        quoteText = quoteMatch[1].trim().replace(/^["“]|["”]$/g, '');
      }

      // Extract author if present
      let author = metadata.author || '';
      const authorMatch = secText.match(/[—\-]\s*\*\*([^*]+)\*\*/);
      if (authorMatch) {
        author = authorMatch[1].trim();
      } else {
        const altAuthorMatch = secText.match(/[—\-]\s*([A-Za-z\s\.\,\&]+)(?:,|$)/);
        if (altAuthorMatch && !author) {
          author = altAuthorMatch[1].trim();
        }
      }

      // Extract source
      let source = metadata.source || '';
      const sourceMatch = secText.match(/\*Source:\s*([^*]+)\*/i);
      if (sourceMatch) {
        source = sourceMatch[1].trim();
      } else {
        const italicSource = secText.match(/\*([A-Z][^*]+)\*/);
        if (italicSource && !sourceMatch && !italicSource[1].startsWith('Saved') && !italicSource[1].startsWith('Date') && !italicSource[1].startsWith('Note')) {
          source = italicSource[1].trim();
        }
      }
      if (!source && author) {
        source = author;
      }
      if (!source) {
        source = metadata.title || fileBasename.replace(/\.[^/.]+$/, '');
      }

      // Extract date
      let date = metadata.date || fileDate || '';
      const dateMatch = secText.match(/\*(?:Saved|Date):\s*([^*]+)\*/i);
      if (dateMatch) {
        date = dateMatch[1].trim();
      }

      // Extract note to self / reflection
      let reflection = '';
      const noteMatch = secText.match(/\*(?:Note to self|Memory anchor|Takeaway|Why I want to remember this):\s*([\s\S]*?)\*/i);
      if (noteMatch) {
        reflection = noteMatch[1].trim();
      }

      const type = inferType(metadata.category || metadata.type || folderName, secText, sec.title);
      const id = slugify(sec.title || (fileBasename + '-' + items.length));

      // Cleaned body without the meta markers
      const cleanBody = secText
        .replace(/\*(?:Saved|Date|Source|Status):\s*[^*]+\*/gi, '')
        .trim();

      items.push({
        id,
        title: sec.title,
        text: cleanBody,
        quoteText: quoteText || (type === 'quote' ? cleanBody : ''),
        author,
        source,
        date: date || 'Undated reflection',
        type,
        tags: Array.isArray(metadata.tags) ? metadata.tags : (metadata.tags ? [metadata.tags] : []),
        reflection,
        filePath: relativePath,
        fileBasename,
      });
    }
  } else {
    // Single entry file
    const title = metadata.title || body.match(/^#\s+([^\n]+)/)?.[1] || fileBasename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const cleanBody = body.replace(/^#\s+[^\n]+\n/, '').trim();

    let reflection = '';
    const noteMatch = cleanBody.match(/\*(?:Note to self|Memory anchor|Takeaway|Why I want to remember this):\s*([\s\S]*?)\*/i);
    if (noteMatch) {
      reflection = noteMatch[1].trim();
    }

    let source = metadata.source || metadata.title || folderName || 'Personal Journal';
    let author = metadata.author || '';

    const type = inferType(metadata.category || metadata.type || folderName, cleanBody, title);
    const id = slugify(title || fileBasename);

    items.push({
      id,
      title,
      text: cleanBody,
      quoteText: type === 'quote' ? cleanBody : '',
      author,
      source,
      date: metadata.date || fileDate || 'Undated reflection',
      type,
      tags: Array.isArray(metadata.tags) ? metadata.tags : (metadata.tags ? [metadata.tags] : []),
      reflection,
      filePath: relativePath,
      fileBasename,
    });
  }

  return items;
}

function scanCollection(rootDir) {
  const items = [];
  const ignored = new Set(['node_modules', '.git', 'public', '.system_generated', 'scratch']);

  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (!ignored.has(entry.name)) {
          walk(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.md' || ext === '.txt') {
          if (entry.name !== 'README.md') {
            try {
              const parsed = parseMarkdownFile(fullPath, rootDir);
              items.push(...parsed);
            } catch (err) {
              console.error(`Error parsing ${fullPath}:`, err.message);
            }
          }
        }
      }
    }
  }

  walk(rootDir);
  return items;
}

module.exports = {
  scanCollection,
  parseMarkdownFile,
  inferType,
  slugify,
};

