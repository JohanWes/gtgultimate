const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'highscores.json');

app.use(cors());
app.use(bodyParser.json());

// Initialize highscores file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Helper to read scores
const readScores = () => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading scores:', err);
        return [];
    }
};

// Helper to write scores
const writeScores = (scores) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(scores, null, 2));
    } catch (err) {
        console.error('Error writing scores:', err);
    }
};

// GET /api/highscores
app.get('/api/highscores', (req, res) => {
    const scores = readScores();
    // Return top 50
    res.json(scores.slice(0, 50));
});

// POST /api/highscores
app.post('/api/highscores', (req, res) => {
    const { name, score } = req.body;

    if (!name || typeof score !== 'number') {
        return res.status(400).json({ error: 'Invalid input' });
    }

    const newScore = {
        name: name.trim().substring(0, 20), // Limit name length
        score,
        date: new Date().toISOString()
    };

    let scores = readScores();
    scores.push(newScore);

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Keep top 100 to save space
    scores = scores.slice(0, 100);

    writeScores(scores);

    res.status(201).json(newScore);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
