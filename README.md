# ✨ Daily Inspiration App

A personal sanctuary that curates and surfaces meaningful reflections from your own collection of notes, saved quotes, journal entries, goals, and forgotten ideas each day.

---

## 🌟 Highlights & Features

- **✦ Deterministic "Today's Daily Pick"**:
  - Uses a stable date-hashed algorithm (`YYYY-MM-DD`) so every morning you wake up to one specially chosen inspiration from your collection.
  - Consistent throughout the day, and automatically advances tomorrow.
- **🎲 "Show Me Another" with Navigation History**:
  - Click the prominent **Show Me Another** button (or tap **`Spacebar`**) to discover another quote, memory, or spark of curiosity.
  - Use the **`←`** and **`→`** arrows to revisit any item you've viewed in your browsing session.
- **❤️ Favorites & Personal Curation**:
  - Tap the heart button (or press **`F`**) to favorite any inspiration.
  - Favorites are persisted to `favorites.json` and local storage.
  - Filter anytime to view only your favorited reflections.
- **📖 Rich Multi-Category Collection**:
  - **💬 Quotes**: Resonating wisdom with author, source text, and personal annotations.
  - **📖 Memories & Journal**: Meaningful journal entries, milestones, and personal moments.
  - **🎯 Goals & Intentions**: Long-term visions, creative milestones, and non-negotiable habits.
  - **💡 Ideas**: Forgotten notebook sketches, tiny experiments, and creative concepts.
  - **📝 Notes & Marginalia**: Field notes, diner conversations, and fleeting insights.
- **📁 Works Directly with Your Local Files**:
  - Scans `.md`, `.txt`, and `.json` files in the folder (e.g. in `quotes/`, `journal/`, `goals/`, `ideas/`, `notes/`).
  - Automatically parses frontmatter, tags, dates, authors, and source attributions.
  - Add your own markdown files anytime, or use the in-app **"+ Add Entry"** button to create new files on disk.
- **🎨 5 Atmospheric Color Themes**:
  - 📜 **Warm Parchment**: Classic editorial aesthetic, sepia ink, soft warmth.
  - 🌌 **Midnight Library**: Deep navy slate, starlight text, warm amber glow.
  - 🌿 **Cedar & Moss**: Forest botanicals, calm sage green, earthy stone.
  - 🌅 **Dawn Horizon**: Rose and lavender morning light, soft pastels.
  - ⚪ **Clean Studio**: Minimalist monochrome typography.
- **🎧 Ambient Soundscapes (Web Audio API)**:
  - Pure, offline synthesized soundscapes: **Gentle Rain on Window**, **Warm Cabin Fireplace**, and **Temple Wind Chimes**.
  - Zero external MP3 files or network dependencies required.
- **⌨️ Keyboard Shortcuts**:
  - `Space`: Show me another inspiration
  - `F`: Toggle favorite
  - `←` / `→`: Browse history back and forward
  - `T`: Cycle through visual themes
  - `Esc`: Close modals / drawer

---

## 🚀 Quick Start

### 1. Launch the Server
```bash
npm start
```
*Or:*
```bash
node server.js
```
The app will launch at [http://127.0.0.1:3000](http://127.0.0.1:3000).

### 2. Run Standalone (Offline)
You can also directly open `index.html` in Safari, Chrome, or any browser:
```bash
open index.html
```

### 3. Run Verification Tests
```bash
npm test
```

---

## 🗂️ Folder Structure

```
inspire/
├── package.json          # Node.js project manifest & scripts
├── server.js             # HTTP server with REST APIs & file serving
├── parser.js             # Markdown frontmatter & entry extractor
├── test.js               # Comprehensive unit test suite
├── favorites.json        # Persistent favorites storage
├── index.html            # Standalone launcher
├── public/               # Web application assets
│   ├── index.html        # App interface
│   ├── style.css         # Responsive styling & themes
│   ├── app.js            # Core interactive application logic
│   └── data.js           # Offline data bundle
├── quotes/               # Saved quotes and literature annotations
├── journal/              # Personal journal entries & memories
├── goals/                # Long-term visions & habits
├── ideas/                # Creative sparks & forgotten project concepts
└── notes/                # Marginalia, reflections & mentor advice
```

---

## ✍️ Adding Your Own Notes

You can add notes in two ways:

1. **Inside the App**:
   - Click the **"+ Add Entry"** button in the header.
   - Choose a category (Quote, Memory, Goal, Idea, Note), enter your text and source, and click Save. The app creates a real `.md` file in the folder!

2. **In Your Favorite Text Editor**:
   - Create a new `.md` file anywhere in `quotes/`, `journal/`, `goals/`, `ideas/`, or `notes/`.
   - Format with optional YAML frontmatter:
     ```markdown
     ---
     title: "My Sunrise Walk"
     date: 2026-11-04
     category: memory
     source: "Autumn Journal"
     tags: [gratitude, morning]
     ---

     Your thoughts or quote here...

     *Note to self: Don't forget why this mattered.*
     ```

