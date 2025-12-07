# Guess the Game Ultimate

A screenshot-based video game trivia application. Players identify games from progressively revealing screenshots across two game modes: Standard (casual progression through all levels) and Endless (roguelike with permadeath and scoring).

![Game Modes](https://img.shields.io/badge/Game%20Modes-Standard%20%7C%20Endless-blue) ![Games](https://img.shields.io/badge/Games-2615-green) ![Built With](https://img.shields.io/badge/Built%20With-React%20%2B%20TypeScript-61dafb)

---

## Game Modes

### Standard Mode
Casual progression through all 2615 levels at your own pace.

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
  - Anagram: Scrambled game title with one revealed character
  - Consultant: Multiple choice (1 correct + 3 wrong options)
  - Double Trouble: Overlays two games at 50% opacity; either answer wins
  - Zoom Out: Reduces current zoom level
  - Cover Peek: Shows the game's cover art
  - Synopsis: Shows a redacted game description
  - Greed: +10 points instantly (costs -10 points, cannot be refilled)
- **Shop**: Appears every 5 levels for lifeline refills and point purchases
- **Difficulty scaling**: Screenshots zoom in by +10% every 5 levels
- **Stats Dashboard**: Tracks win rate, guess distribution, and genre/decade breakdowns
- **Highscore tracking**: Local and global leaderboard

---

### Deployment Options

The application supports **"Dual Mode"** deployment:

#### 1. Vercel + MongoDB (Recommended for Public Hosting)
Serverless architecture with cloud persistence.
- **Frontend/API:** Hosted on Vercel
- **Database:** MongoDB Atlas (Required for highscores/admin)

**Setup:**
1. Fork repo to GitHub.
2. Import project in Vercel.
3. Set Environment Variables in Vercel:
   - `MONGODB_URI`: Your MongoDB Atlas SRV connection string
   - `ADMIN_KEY`: Password for admin panel
   - `VITE_IGDB_...`: IGDB credentials
4. Deploy!

#### 2. Docker / Local
Self-contained setup using local filesystem for storage.
- **Persistence:** Local JSON files (`storage/highscores.json`, `data/games_db.json`)
- **No external DB required.**

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
   Edit `.env` as needed (`ADMIN_KEY`, `PORT`).
3. Build and run:
   ```bash
   docker-compose up -d
   ```
4. Access at `http://localhost:5173`

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

- **2615 curated games** from IGDB (Internet Game Database)
- **Fuzzy search** via Fuse.js (handles typos and abbreviations)
- **Series detection**: Warns when guessing a game from the same series (e.g., "Portal" vs "Portal 2")
- **Progressive reveal**: 5 screenshots per game with metadata unlocking
- **Persistent state**: All progress stored in browser localStorage
- **Admin mode**: In-game editor for game name corrections (password-protected)
- **Sound effects**: Consultant lifeline includes "Who Wants to Be a Millionaire" audio
- **Dark mode UI**: Built with Tailwind CSS v3

---

## Tech Stack
The game database (`data/games_db.json`) contains 2615 titles curated from IGDB with the following filters:

- `rating_count > 100` (popularity threshold)
- `aggregated_rating > 70` (quality threshold)
- Preferably released after 1990
- Main games only (no DLC/expansions/episodes)
- Minimum 5 high-resolution screenshots

The database is bundled with the application. No external API calls are made at runtime.

**Regenerating the database** (requires IGDB API credentials):
```bash
npx tsx scripts/fetch_games.ts
```

---

## How to Play

1. Select a game mode (Standard or Endless)
2. Type your guess in the search box (fuzzy matching enabled)
3. Wrong guess reveals the next screenshot and additional metadata
4. Win or lose after 5 guesses
5. In Endless mode: manage lifelines and shop strategically to extend your run
