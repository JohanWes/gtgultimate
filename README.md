# Guess the Game Ultimate

A screenshot-based video game trivia application. Players identify games from progressively revealing screenshots across two game modes: Standard (casual progression through all levels) and Endless (high-stakes roguelike with permadeath and scoring).

![Game Modes](https://img.shields.io/badge/Game%20Modes-Standard%20%7C%20Endless-blue) ![Games](https://img.shields.io/badge/Games-1662-green) ![Built With](https://img.shields.io/badge/Built%20With-React%20%2B%20TypeScript-61dafb)

---

## Game Modes

### Standard Mode
Casual progression through all 1662 levels at your own pace.

- 5 guesses per game with progressive clues (screenshots, release year, platform, genre, rating)
- Progress tracking with persistent state (won, lost, or unplayed)
- Skip button to reveal the next clue without penalty
- Full navigation freedom between levels

### Endless Mode
Roguelike challenge with scoring, permadeath, and strategic lifeline usage.

- **Permadeath**: 5 wrong guesses ends the run
- **Scoring**: 5/4/3/2/1 points per correct guess (based on attempt number)
- **Lifelines** (single-use, refillable in shop):
  - Skip Level: Proceed to next game for 0 points
  - Anagram: Scrambled game title with one extra character
  - Consultant: Multiple choice (1 correct + 3 wrong options)
  - Double Trouble: Overlays two games at 50% opacity; either answer wins
  - Zoom Out: Reduces current zoom level
  - Cover Art Peek: Shows the game's cover art
  - Greed: +10 points instantly (costs -10 points, cannot be refilled)
- **Shop**: Appears every 10 levels for lifeline refills and point purchases
- **Difficulty scaling**: Screenshots zoom in by +10% every 10 levels
- **Highscore tracking**: Local and global leaderboard

---

## Setup

### Docker Deployment (Recommended)

Suitable for servers (Unraid, etc.) or Docker environments.

**Prerequisites:**
- Docker and Docker Compose
- Admin key for protected features (optional)

**Steps:**

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd guessthegame
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` as needed:
   ```env
   VITE_PORT=5173
   ADMIN_KEY=your_admin_key_here
   ```

3. Build and run:
   ```bash
   docker-compose up -d
   ```

4. Access at `http://localhost:5173` (or `http://SERVER_IP:5173`)

**Docker Commands:**
- Update: `git pull && docker-compose up -d --build`
- Logs: `docker-compose logs -f`
- Stop: `docker-compose down`

---

### Local Development

**Prerequisites:**
- Node.js 20+
- npm or yarn

**Steps:**

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment (optional):
   ```bash
   cp .env.example .env
   # Edit .env with ADMIN_KEY if needed
   ```

3. Development server:
   ```bash
   npm run dev
   ```

4. Production build:
   ```bash
   npm run build
   npm run preview
   ```

---

## Key Features

- **1662 curated games** from IGDB (Internet Game Database)
- **Fuzzy search** via Fuse.js (handles typos and abbreviations)
- **Series detection**: Warns when guessing a game from the same series (e.g., "Portal" vs "Portal 2")
- **Progressive reveal**: 5 screenshots per game with metadata unlocking
- **Persistent state**: All progress stored in browser localStorage
- **Admin mode**: In-game editor for game name corrections (password-protected)
- **Sound effects**: Consultant lifeline includes "Who Wants to Be a Millionaire" audio
- **Dark mode UI**: Built with Tailwind CSS v3

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v3
- **Search**: Fuse.js
- **State**: React hooks + localStorage
- **Backend**: Express (production server for highscores and admin API)
- **Database**: Static JSON (`src/data/games_db.json`)
- **Container**: Docker (multi-stage build) + nginx

---

## Game Database

The game database (`games_db.json`) contains 1662 titles curated from IGDB with the following filters:

- `rating_count > 100` (popularity threshold)
- `aggregated_rating > 70` (quality threshold)
- Preferably released after 1990
- Main games only (no DLC/expansions/episodes)
- Minimum 5 high-resolution screenshots

The database is bundled with the application. No external API calls are made at runtime.

**Regenerating the database** (requires IGDB API credentials):
```bash
node scripts/fetch_igdb.js
```

---

## How to Play

1. Select a game mode (Standard or Endless)
2. Type your guess in the search box (fuzzy matching enabled)
3. Wrong guess reveals the next screenshot and additional metadata
4. Win or lose after 5 guesses
5. In Endless mode: manage lifelines and shop strategically to extend your run
