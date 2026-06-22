# cambrils-calendar-dev

Dev repo for the Cambrils calendar PWA.

## Headroom setup (simple steps)

Headroom saves tokens when you use Cursor on this project. Do this once on your computer.

### Step 1 — Install Python (if you don't have it)

1. Go to https://www.python.org/downloads/
2. Download and install Python (pick version 3.10 or newer).
3. On Windows: during install, tick **"Add Python to PATH"**.

### Step 2 — Install Headroom

1. Open **Terminal** (Mac) or **Command Prompt** (Windows).
2. Copy and paste this line, then press Enter:

```
pip install "headroom-ai[proxy,mcp]"
```

3. Wait until it finishes (no errors at the end).

### Step 3 — Open this project in Cursor

1. Open **Cursor**.
2. Open this folder: `cambrils-calendar-dev` (File → Open Folder).

### Step 4 — Start Headroom

1. In Cursor, open the built-in terminal (menu: **Terminal → New Terminal**).
2. Copy and paste this line, then press Enter:

```
headroom wrap cursor
```

3. **Leave this terminal window open.** Headroom is running while that window stays open.
4. The command will print some URLs. Keep that terminal visible — you need those URLs in the next step.

### Step 5 — Tell Cursor to use Headroom

1. In Cursor, click the **gear icon** (Settings).
2. Go to **Models** (or search for "Models" in settings).
3. Find **OpenAI** settings:
   - Turn on **Override OpenAI Base URL** (or similar wording).
   - Paste this as the base URL:

```
http://127.0.0.1:8787/p/cambrils-calendar-dev/v1
```

4. If you use **Claude / Anthropic** models in Cursor, find Anthropic settings and paste:

```
http://127.0.0.1:8787/p/cambrils-calendar-dev
```

5. Keep your normal API keys as they are. Do not change those.

### Step 6 — Restart Cursor

1. Quit Cursor completely.
2. Open Cursor again and open this project.
3. In the terminal, run `headroom wrap cursor` again (Step 4) whenever you start a coding session.

### You're done

Cursor will now send requests through Headroom, which shrinks big tool outputs before the AI reads them. You should use fewer tokens.

### Every time you code on this project

1. Open the project in Cursor.
2. Open a terminal in Cursor.
3. Run: `headroom wrap cursor`
4. Leave that terminal open while you work.

### Optional — see how much you saved

With Headroom still running, open a browser and go to:

```
http://127.0.0.1:8787/stats
```

### If something goes wrong

- **"pip not found"** — Python is not installed or not on your PATH. Redo Step 1.
- **"headroom not found"** — Redo Step 2, then close and reopen your terminal.
- **Cursor still feels the same** — Make sure Step 4 is running, Step 5 URLs are pasted correctly, and you restarted Cursor (Step 6).

More help: https://headroom-docs.vercel.app/docs/quickstart
