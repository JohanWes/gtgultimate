# Guess the Game

**Test your gaming knowledge in this screenshot-based guessing game!** Identify video games from progressively revealing screenshots and metadata. Choose your challenge: play casually through 995 curated levels in **Standard Mode**, or test your skills in the high-stakes **Arcade Mode** roguelike with lifelines, permadeath, and a scoring system.

![Game Modes](https://img.shields.io/badge/Game%20Modes-Standard%20%7C%20Arcade-blue) ![Games](https://img.shields.io/badge/Games-995-green) ![Built With](https://img.shields.io/badge/Built%20With-React%20%2B%20TypeScript-61dafb)

---

## Game Modes

### Standard Mode
**Casual level-by-level progression** — Work through 995 games at your own pace with full freedom to jump between levels.

- **5 guesses per level** — Each wrong guess reveals more clues (screenshots, release year, platform, genre, rating)
- **Progress tracking** — Levels marked as Won (✓), Lost (✗), or Unplayed
- **Skip button** — No penalty, just moves to the next clue
- **No pressure** — Take your time, replay any level

### Arcade Mode (Roguelike)
**High-stakes challenge mode** — One run, one life, permadeath.

- **Permadeath** — 5 wrong guesses and it's game over
- **Scoring system** — Earn 5/3/2/1 points based on how many guesses you needed (5 points for first guess, 0 for wrong answer)
- **4 Lifelines** to help you survive:
  - **Skip Level** — Move to next game without penalty (0 points)
  - **Anagram** — Reveals scrambled game title
  - **Consultant** — "Who Wants to Be a Millionaire" style 4-option multiple choice with dramatic reveal
  - **Double Trouble** — Blend two game screenshots together; guess either one correctly to win
- **The Shop** — Every 10 levels, spend your points to refill lifelines or grab bonus points
- **Difficulty scaling** — Screenshots zoom in more every 10 levels (+10% zoom)
- **High score tracking** — Beat your best streak!

---

## Quick Start

### Option 1: Docker Deployment (Recommended for Unraid/Servers)

Perfect for running on an Unraid server or any Docker-compatible environment.

#### Prerequisites
- Docker and Docker Compose
- IGDB API credentials ([Get them here](https://api-docs.igdb.com/#getting-started))

#### Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd guessthegame
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file and add your IGDB API credentials:
   ```env
   VITE_IGDB_CLIENT_ID=your_client_id_here
   VITE_IGDB_CLIENT_SECRET=your_client_secret_here
   VITE_PORT=5173
   ```

3. **Build and run**:
   ```bash
   docker-compose up -d
   ```

4. **Access the game**:
   - Local: `http://localhost:5173`
   - Unraid: `http://YOUR_SERVER_IP:5173`

#### Docker Management

**Update to latest version:**
```bash
git pull
docker-compose up -d --build
```

**View logs:**
```bash
docker-compose logs -f
```

**Stop the application:**
```bash
docker-compose down
```

**Change port:** Modify `VITE_PORT` in `.env` and rebuild:
```bash
docker-compose up -d --build
```

#### Troubleshooting
- **Application not loading** — Check container status: `docker ps`
- **API errors** — Verify IGDB credentials in `.env`
- **Port conflicts** — Change `VITE_PORT` to an available port
- **Build failures** — Ensure sufficient disk space and memory allocated to Docker

---

### Option 2: Local Development

For development or local testing without Docker.

#### Prerequisites
- Node.js 20 or higher
- npm or yarn

#### Steps

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment** (optional, only needed if regenerating game data):
   ```bash
   cp .env.example .env
   # Edit .env with your IGDB credentials
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Preview production build**:
   ```bash
   npm run preview
   ```

---

## Features

- **995 curated games** from IGDB (Internet Game Database)
- **Smart search** with fuzzy matching — Type "wild hunt" to find "The Witcher 3: Wild Hunt", or "botw" for "Breath of the Wild"
- **Progressive reveal system** — 5 screenshots per game, unlocking metadata with each guess
- **Persistent progress** — All progress saved to browser localStorage
- **Same-series detection** — Warns when you guess "Portal" instead of "Portal 2"
- **Anti-repeat protection** — Prevents guessing previously won games
- **Sound effects** — Consultant lifeline features dramatic "Who Wants to Be a Millionaire" audio
- **Responsive design** — Dark mode UI built with Tailwind CSS

---

## Tech Stack

- **Frontend:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Search:** Fuse.js (fuzzy search)
- **State:** React hooks + localStorage
- **Deployment:** Docker + nginx (or any static hosting)

---

## Game Database

The game list is curated from IGDB with quality filters:
- **Popularity:** rating_count > 100
- **Quality:** aggregated_rating > 70
- **Recency:** Released after 1990
- **Category:** Main games only (no DLC/expansions)
- **Assets:** Minimum 5 high-resolution screenshots

The database is pre-built and bundled with the app — no runtime API calls needed!

---

## How to Play

1. **Choose your mode** — Standard for casual play, Arcade for challenge
2. **Guess the game** — Type in the search box (fuzzy search enabled!)
3. **Wrong guess?** — Another screenshot and clue unlock
4. **Win or lose after 5 guesses** — Move to the next level
5. **In Arcade:** Use lifelines strategically, spend points wisely in the shop!

---

## 📝 License

This project is for personal/family use. Game data and screenshots sourced from IGDB.

---
