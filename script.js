// script.js
let decks = [];
let currentDeckId = null;
let currentCardIndex = 0;
let currentPreviewCards = [];

// API server URL
const API_URL = 'http://localhost:3001';

// Load from localStorage
function loadData() {
    const saved = localStorage.getItem('avie-flashcard-decks');
    if (saved) {
        decks = JSON.parse(saved);
    } else {
        decks = [];
    }
    renderDeckList();
    loadTheme();
    checkForImport();
}

// Save to localStorage
function saveData() {
    localStorage.setItem('avie-flashcard-decks', JSON.stringify(decks));
    renderDeckList();
}

// Render all decks
function renderDeckList() {
    const deckList = document.getElementById('deckList');
    if (!deckList) return;
    
    if (decks.length === 0) {
        deckList.innerHTML = '<p style="color: #aaa; text-align: center;">No decks yet. Upload a document or create a blank deck!</p>';
        return;
    }
    
    deckList.innerHTML = decks.map(deck => `
        <div class="deck-card" onclick="openDeck('${deck.id}')">
            <h3>📚 ${escapeHtml(deck.name)}</h3>
            <p>${deck.cards.length} cards</p>
            <small>${new Date(deck.createdAt).toLocaleDateString()}</small>
        </div>
    `).join('');
}

// Upload file - FIXED VERSION
async function uploadFile(file) {
    if (!file) {
        alert('Please select a file first!');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('count', document.getElementById('cardCount').value);
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/api/upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success && data.flashcards && data.flashcards.length > 0) {
            currentPreviewCards = data.flashcards;
            showPreview(currentPreviewCards);
        } else {
            alert('Could not generate flashcards. Try pasting text instead.');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error connecting to server. Make sure the backend is running!\n\nRun: node server.js');
    }
    
    showLoading(false);
}

// Generate from pasted text
async function generateFromText() {
    const text = document.getElementById('pasteText').value.trim();
    const count = document.getElementById('cardCount').value;
    
    if (!text) {
        alert('Please paste some notes or text first!');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${API_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, count })
        });
        
        const data = await response.json();
        
        if (data.success && data.flashcards && data.flashcards.length > 0) {
            currentPreviewCards = data.flashcards;
            showPreview(currentPreviewCards);
        } else {
            alert('Could not generate flashcards. Try different text.');
        }
    } catch (error) {
        console.error('Generate error:', error);
        alert('Error connecting to server. Make sure the backend is running!\n\nRun: node server.js');
    }
    
    showLoading(false);
}

// Show preview of generated flashcards
function showPreview(cards) {
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('previewSection').style.display = 'block';
    document.getElementById('deckSection').style.display = 'none';
    document.getElementById('studyView').style.display = 'none';
    
    const container = document.getElementById('flashcardPreview');
    container.innerHTML = cards.map((card, index) => `
        <div class="preview-card">
            <div class="preview-front">
                <strong>Front ${index + 1}:</strong> ${escapeHtml(card.front)}
            </div>
            <div class="preview-back">
                <strong>Back:</strong> ${escapeHtml(card.back)}
            </div>
            <button class="edit-card-btn" onclick="editPreviewCard(${index})">✏️ Edit</button>
        </div>
    `).join('');
}

// Edit a preview card
function editPreviewCard(index) {
    const card = currentPreviewCards[index];
    const newFront = prompt('Edit front (question/term):', card.front);
    const newBack = prompt('Edit back (answer/definition):', card.back);
    
    if (newFront !== null && newBack !== null) {
        currentPreviewCards[index] = { front: newFront, back: newBack };
        showPreview(currentPreviewCards);
    }
}

// Save preview as new deck
function saveAsDeck() {
    const deckName = prompt('Name your deck:', `Deck ${decks.length + 1}`);
    if (!deckName) return;
    
    decks.push({
        id: Date.now(),
        name: deckName,
        cards: currentPreviewCards.map(c => ({ 
            front: c.front, 
            back: c.back,
            reviewData: { ease: 2.5, interval: 1, nextReview: Date.now() }
        })),
        createdAt: Date.now()
    });
    
    saveData();
    
    currentPreviewCards = [];
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('deckSection').style.display = 'block';
    
    alert('✅ Deck saved successfully!');
}

// Cancel preview
function cancelPreview() {
    currentPreviewCards = [];
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('deckSection').style.display = 'block';
}

// Open deck to study
function openDeck(deckId) {
    currentDeckId = deckId;
    currentCardIndex = 0;
    const deck = decks.find(d => d.id == deckId);
    
    document.getElementById('deckSection').style.display = 'none';
    document.getElementById('previewSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('studyView').style.display = 'block';
    document.getElementById('currentDeckTitle').innerText = deck.name;
    document.getElementById('difficultyButtons').style.display = 'none';
    
    renderFlashcard();
}

// Render current flashcard
function renderFlashcard() {
    const deck = decks.find(d => d.id == currentDeckId);
    if (!deck || deck.cards.length === 0) {
        document.getElementById('flashcardFront').innerHTML = '<p>No cards yet!</p>';
        document.getElementById('flashcardBack').innerHTML = '<p>Click "Add Card" to create one</p>';
        document.getElementById('cardCounter').innerText = 'Card 0 / 0';
        return;
    }
    
    const card = deck.cards[currentCardIndex];
    document.getElementById('flashcardFront').innerHTML = `<p>${escapeHtml(card.front)}</p>`;
    document.getElementById('flashcardBack').innerHTML = `<p>${escapeHtml(card.back)}</p>`;
    document.getElementById('cardCounter').innerText = `Card ${currentCardIndex + 1} / ${deck.cards.length}`;
    
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.remove('flipped');
}

// Flip flashcard
function flipCard() {
    const flashcard = document.getElementById('flashcard');
    flashcard.classList.toggle('flipped');
    
    if (flashcard.classList.contains('flipped')) {
        document.getElementById('difficultyButtons').style.display = 'flex';
    } else {
        document.getElementById('difficultyButtons').style.display = 'none';
    }
}

// Record difficulty for spaced repetition
function recordCardDifficulty(difficulty) {
    const deck = decks.find(d => d.id == currentDeckId);
    const card = deck.cards[currentCardIndex];
    
    if (!card.reviewData) {
        card.reviewData = { ease: 2.5, interval: 1, nextReview: Date.now() };
    }
    
    switch(difficulty) {
        case 'easy':
            card.reviewData.ease += 0.15;
            card.reviewData.interval = Math.round(card.reviewData.interval * card.reviewData.ease);
            break;
        case 'medium':
            card.reviewData.interval = Math.round(card.reviewData.interval * 1.5);
            break;
        case 'hard':
            card.reviewData.ease = Math.max(1.3, card.reviewData.ease - 0.2);
            card.reviewData.interval = Math.max(1, Math.round(card.reviewData.interval * 1.2));
            break;
    }
    
    card.reviewData.nextReview = Date.now() + (card.reviewData.interval * 24 * 60 * 60 * 1000);
    card.reviewData.difficulty = difficulty;
    
    saveData();
    nextCard();
}

// Next/Previous cards
function nextCard() {
    const deck = decks.find(d => d.id == currentDeckId);
    if (!deck) return;
    if (currentCardIndex < deck.cards.length - 1) {
        currentCardIndex++;
        renderFlashcard();
    } else {
        alert('🎉 You\'ve completed all cards in this deck!');
    }
}

function prevCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        renderFlashcard();
    }
}

// Add/Edit card functions
function showAddCardModal() {
    document.getElementById('cardModalTitle').innerText = 'Add New Card';
    document.getElementById('cardFront').value = '';
    document.getElementById('cardBack').value = '';
    document.getElementById('cardModal').style.display = 'block';
}

function saveCard() {
    const front = document.getElementById('cardFront').value.trim();
    const back = document.getElementById('cardBack').value.trim();
    
    if (!front || !back) {
        alert('Please fill in both fields');
        return;
    }
    
    const deck = decks.find(d => d.id == currentDeckId);
    if (deck) {
        deck.cards.push({ 
            front, 
            back,
            reviewData: { ease: 2.5, interval: 1, nextReview: Date.now() }
        });
        saveData();
        renderFlashcard();
    }
    
    document.getElementById('cardModal').style.display = 'none';
}

function editDeck() {
    const deck = decks.find(d => d.id == currentDeckId);
    const newName = prompt('Enter new deck name:', deck.name);
    if (newName && newName.trim()) {
        deck.name = newName.trim();
        saveData();
        document.getElementById('currentDeckTitle').innerText = deck.name;
        renderDeckList();
    }
}

function deleteDeck() {
    if (confirm('Are you sure? All cards will be lost!')) {
        decks = decks.filter(d => d.id != currentDeckId);
        saveData();
        backToDecks();
    }
}

function backToDecks() {
    currentDeckId = null;
    currentCardIndex = 0;
    document.getElementById('studyView').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    document.getElementById('deckSection').style.display = 'block';
}

function createBlankDeck() {
    const deckName = prompt('Enter deck name:');
    if (deckName) {
        decks.push({
            id: Date.now(),
            name: deckName,
            cards: [],
            createdAt: Date.now()
        });
        saveData();
    }
}

// Export to CSV
function exportToCSV() {
    const deck = decks.find(d => d.id == currentDeckId);
    if (!deck || deck.cards.length === 0) {
        alert('No cards to export!');
        return;
    }
    
    let csv = '"Front","Back"\n';
    deck.cards.forEach(card => {
        csv += `"${escapeCsv(card.front)}","${escapeCsv(card.back)}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name.replace(/[^a-z0-9]/gi, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function escapeCsv(str) {
    return str.replace(/"/g, '""');
}

// Share deck
function shareDeck() {
    const deck = decks.find(d => d.id == currentDeckId);
    if (!deck) return;
    
    const shareData = {
        name: deck.name,
        cards: deck.cards.map(c => ({ front: c.front, back: c.back }))
    };
    
    const shareId = Date.now().toString();
    localStorage.setItem(`shared_${shareId}`, JSON.stringify(shareData));
    
    const shareUrl = `${window.location.origin}${window.location.pathname}?import=${shareId}`;
    document.getElementById('shareLink').value = shareUrl;
    document.getElementById('shareModal').style.display = 'block';
}

function copyShareLink() {
    const linkInput = document.getElementById('shareLink');
    linkInput.select();
    document.execCommand('copy');
    alert('Link copied to clipboard!');
}

function checkForImport() {
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('import');
    
    if (shareId) {
        const sharedData = localStorage.getItem(`shared_${shareId}`);
        if (sharedData) {
            const deck = JSON.parse(sharedData);
            decks.push({
                id: Date.now(),
                name: `${deck.name} (Imported)`,
                cards: deck.cards.map(c => ({ 
                    front: c.front, 
                    back: c.back,
                    reviewData: { ease: 2.5, interval: 1, nextReview: Date.now() }
                })),
                createdAt: Date.now()
            });
            saveData();
            alert('✅ Deck imported successfully!');
            window.history.pushState({}, '', window.location.pathname);
        }
    }
}

// Voice input
let currentVoiceTarget = null;

function startVoiceInput(target) {
    currentVoiceTarget = target;
    
    if (!('webkitSpeechRecognition' in window)) {
        alert('Voice input not supported in this browser. Try Chrome!');
        return;
    }
    
    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (currentVoiceTarget === 'front') {
            document.getElementById('cardFront').value = transcript;
        } else {
            document.getElementById('cardBack').value = transcript;
        }
    };
    
    recognition.onerror = () => alert('Could not recognize speech. Try again!');
    recognition.start();
}

// Dashboard
function showDashboard() {
    const totalCards = decks.reduce((sum, d) => sum + d.cards.length, 0);
    const totalDecks = decks.length;
    
    const mastered = decks.reduce((sum, deck) => {
        return sum + deck.cards.filter(c => {
            return c.reviewData?.difficulty === 'easy' && 
                   c.reviewData?.nextReview > Date.now();
        }).length;
    }, 0);
    
    const html = `
        <div class="stat-grid">
            <div class="stat">📚 Decks<div><strong>${totalDecks}</strong></div></div>
            <div class="stat">🃏 Cards<div><strong>${totalCards}</strong></div></div>
            <div class="stat">⭐ Mastered<div><strong>${mastered}</strong></div></div>
            <div class="stat">📅 Created<div><strong>${decks.length}</strong></div></div>
        </div>
        <div class="progress-container">
            <div class="progress-label">Mastery Progress</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${totalCards ? (mastered/totalCards)*100 : 0}%"></div>
            </div>
            <div class="progress-percent">${totalCards ? Math.round((mastered/totalCards)*100) : 0}% Complete</div>
        </div>
    `;
    
    document.getElementById('dashboardStats').innerHTML = html;
    document.getElementById('dashboardModal').style.display = 'block';
}

// Theme functions
function setTheme(theme) {
    const themes = {
        dark: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%)',
        light: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
        purple: 'linear-gradient(135deg, #1a0f2e 0%, #2e1a4e 100%)',
        green: 'linear-gradient(135deg, #0f2e1a 0%, #1a4e2e 100%)'
    };
    
    document.body.style.background = themes[theme];
    localStorage.setItem('avie-flashcard-theme', theme);
    document.getElementById('themeSelector').style.display = 'none';
}

function loadTheme() {
    const saved = localStorage.getItem('avie-flashcard-theme');
    if (saved) setTheme(saved);
}

function showLoading(show) {
    document.getElementById('loading').style.display = show ? 'flex' : 'none';
}

// Helper functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// File upload setup
function setupFileUpload() {
    const uploadBox = document.getElementById('uploadBox');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
        if (e.target.files && e.target.files[0]) {
            uploadFile(e.target.files[0]);
        }
    };
    
    uploadBox.ondragover = (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = '#5865F2';
    };
    uploadBox.ondragleave = () => {
        uploadBox.style.borderColor = 'rgba(255,255,255,0.2)';
    };
    uploadBox.ondrop = (e) => {
        e.preventDefault();
        uploadBox.style.borderColor = 'rgba(255,255,255,0.2)';
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupFileUpload();
    
    document.getElementById('generateBtn').onclick = generateFromText;
    document.getElementById('saveDeckBtn').onclick = saveAsDeck;
    document.getElementById('regenerateBtn').onclick = () => {
        const text = document.getElementById('pasteText').value;
        if (text) generateFromText();
        else alert('Paste some text first or upload a file');
    };
    document.getElementById('cancelPreviewBtn').onclick = cancelPreview;
    document.getElementById('createBlankDeckBtn').onclick = createBlankDeck;
    document.getElementById('backToDecksBtn').onclick = backToDecks;
    document.getElementById('flashcard').onclick = flipCard;
    document.getElementById('prevBtn').onclick = prevCard;
    document.getElementById('nextBtn').onclick = nextCard;
    document.getElementById('addCardBtn').onclick = showAddCardModal;
    document.getElementById('editDeckBtn').onclick = editDeck;
    document.getElementById('deleteDeckBtn').onclick = deleteDeck;
    document.getElementById('saveCardBtn').onclick = saveCard;
    document.getElementById('exportBtn').onclick = exportToCSV;
    document.getElementById('shareDeckBtn').onclick = shareDeck;
    document.getElementById('copyLinkBtn').onclick = copyShareLink;
    document.getElementById('dashboardBtn').onclick = showDashboard;
    document.getElementById('themeBtn').onclick = () => {
        const selector = document.getElementById('themeSelector');
        selector.style.display = selector.style.display === 'none' ? 'flex' : 'none';
    };
    document.getElementById('easyBtn').onclick = () => recordCardDifficulty('easy');
    document.getElementById('mediumBtn').onclick = () => recordCardDifficulty('medium');
    document.getElementById('hardBtn').onclick = () => recordCardDifficulty('hard');
    document.getElementById('voiceFrontBtn').onclick = () => startVoiceInput('front');
    document.getElementById('voiceBackBtn').onclick = () => startVoiceInput('back');
    
    document.querySelectorAll('.close').forEach(btn => {
        btn.onclick = () => {
            document.getElementById('cardModal').style.display = 'none';
            document.getElementById('shareModal').style.display = 'none';
            document.getElementById('dashboardModal').style.display = 'none';
        };
    });
    
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
    
    window.openDeck = openDeck;
    window.editPreviewCard = editPreviewCard;
    window.setTheme = setTheme;
});
