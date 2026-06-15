// server.js
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.static('.'));

// AI API endpoint (using Groq - free)
const GROQ_API_KEY = process.env.GROQ_API_KEY;// Extract text from uploaded file

async function extractText(filePath, mimeType) {
    const fileBuffer = fs.readFileSync(filePath);
    
    if (mimeType === 'application/pdf') {
        const data = await pdfParse(fileBuffer);
        return data.text;
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        return result.value;
    } else if (mimeType === 'text/plain') {
        return fileBuffer.toString('utf8');
    }
    return '';
}

// Generate flashcards using AI
async function generateFlashcards(text, count = 10) {
    const prompt = `You are a flashcard generator. Extract ${count} key terms and their definitions from the text below.

Text:
${text.substring(0, 3000)}

Return ONLY valid JSON array in this format:
[
    {"front": "term or question", "back": "definition or answer"},
    {"front": "another term", "back": "its definition"}
]

Make each flashcard focused on one key concept.`;

    try {
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        const content = response.data.choices[0].message.content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (error) {
        console.error('AI Error:', error.message);
        return [];
    }
}

// Upload and process file
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const cardCount = parseInt(req.body.count) || 10;
        
        const text = await extractText(file.path, file.mimetype);
        
        if (!text || text.length < 100) {
            return res.json({ success: false, error: 'Could not extract enough text from file' });
        }
        
        const flashcards = await generateFlashcards(text, cardCount);
        
        // Clean up uploaded file
        fs.unlinkSync(file.path);
        
        res.json({ success: true, flashcards });
    } catch (error) {
        console.error('Upload error:', error);
        res.json({ success: false, error: error.message });
    }
});

// Generate from text directly
app.post('/api/generate', async (req, res) => {
    const { text, count } = req.body;
    const flashcards = await generateFlashcards(text, count);
    res.json({ success: true, flashcards });
});

app.listen(3001, () => console.log('✅ Flashcard AI server running on port 3001'));