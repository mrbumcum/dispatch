// Deck definitions
const decks = {
    drugs: {
        name: "EMT Drug Cards",
        cards: [
            { 
                front: "Epinephrine", 
                back: "Indications: Cardiac arrest, anaphylaxis, severe asthma. Dosage: 1mg (1:10,000) IV/IO for cardiac arrest; 0.3-0.5mg (1:1,000) IM for anaphylaxis. Contraindications: None in cardiac arrest. Side effects: Tachycardia, hypertension, anxiety." 
            },
            { 
                front: "Aspirin", 
                back: "Indications: Suspected acute coronary syndrome (ACS), chest pain. Dosage: 324mg (4 x 81mg tablets) chewed. Contraindications: Active bleeding, known allergy. Side effects: GI upset, increased bleeding risk." 
            },
            { 
                front: "Nitroglycerin", 
                back: "Indications: Chest pain suggestive of cardiac ischemia. Dosage: 0.4mg sublingual, repeat every 3-5 minutes (max 3 doses). Contraindications: SBP <90mmHg, use of PDE-5 inhibitors (Viagra, Cialis), right ventricular infarct. Side effects: Headache, hypotension, dizziness." 
            },
            { 
                front: "Albuterol", 
                back: "Indications: Bronchospasm, asthma, COPD exacerbation. Dosage: 2.5-5mg via nebulizer or 2-4 puffs via MDI. Contraindications: Hypersensitivity. Side effects: Tachycardia, tremors, nervousness." 
            },
            { 
                front: "Naloxone", 
                back: "Indications: Opioid overdose, respiratory depression from opioids. Dosage: 0.4-2mg IV/IM/IN (start with 0.4mg). Contraindications: None in overdose. Side effects: Acute withdrawal, agitation, nausea." 
            },
            { 
                front: "Dextrose 50%", 
                back: "Indications: Hypoglycemia, altered mental status with suspected low blood sugar. Dosage: 25g (50ml of D50) IV. Contraindications: Known hypersensitivity. Side effects: Hyperglycemia if given incorrectly, phlebitis." 
            },
            { 
                front: "Atropine", 
                back: "Indications: Symptomatic bradycardia, organophosphate poisoning. Dosage: 0.5-1mg IV/IO (repeat every 3-5 minutes, max 3mg). Contraindications: None in symptomatic bradycardia. Side effects: Tachycardia, dry mouth, blurred vision." 
            },
            { 
                front: "Diphenhydramine", 
                back: "Indications: Allergic reactions, anaphylaxis (adjunct), dystonic reactions. Dosage: 25-50mg IV/IM. Contraindications: Glaucoma, urinary retention. Side effects: Drowsiness, dry mouth, blurred vision." 
            }
        ]
    },
    vitals: {
        name: "EMT Vital Signs",
        cards: [
            { 
                front: "Adult Normal Vital Signs", 
                back: "Heart Rate: 60-100 bpm. Respiratory Rate: 12-20 breaths/min. Blood Pressure: 120/80 mmHg (normal). Temperature: 98.6°F (37°C). Oxygen Saturation: 95-100%. Capillary Refill: <2 seconds." 
            },
            { 
                front: "Pediatric Normal Vital Signs (Infant)", 
                back: "Heart Rate: 100-160 bpm. Respiratory Rate: 30-60 breaths/min. Blood Pressure: 70-90/50-65 mmHg. Temperature: 98.6-99.5°F. Oxygen Saturation: 95-100%. Capillary Refill: <2 seconds." 
            },
            { 
                front: "Pediatric Normal Vital Signs (Child 1-3 years)", 
                back: "Heart Rate: 80-130 bpm. Respiratory Rate: 20-30 breaths/min. Blood Pressure: 90-105/55-70 mmHg. Temperature: 98.6-99.5°F. Oxygen Saturation: 95-100%. Capillary Refill: <2 seconds." 
            },
            { 
                front: "Pediatric Normal Vital Signs (Child 4-12 years)", 
                back: "Heart Rate: 70-110 bpm. Respiratory Rate: 15-25 breaths/min. Blood Pressure: 95-115/60-75 mmHg. Temperature: 98.6°F. Oxygen Saturation: 95-100%. Capillary Refill: <2 seconds." 
            },
            { 
                front: "Glasgow Coma Scale (GCS)", 
                back: "Eye Opening: 4=Spontaneous, 3=To voice, 2=To pain, 1=None. Verbal Response: 5=Oriented, 4=Confused, 3=Inappropriate words, 2=Incomprehensible sounds, 1=None. Motor Response: 6=Obeys commands, 5=Localizes pain, 4=Withdraws from pain, 3=Flexion to pain, 2=Extension to pain, 1=None. Total: 3-15 (15=Normal, <8=Severe)." 
            },
            { 
                front: "Blood Pressure Classifications", 
                back: "Normal: <120/<80 mmHg. Elevated: 120-129/<80 mmHg. Stage 1 Hypertension: 130-139/80-89 mmHg. Stage 2 Hypertension: ≥140/≥90 mmHg. Hypertensive Crisis: >180/>120 mmHg. Hypotension: <90/<60 mmHg." 
            },
            { 
                front: "Respiratory Rate Classifications", 
                back: "Normal Adult: 12-20 breaths/min. Tachypnea: >20 breaths/min (adult), >60 (infant), >40 (child). Bradypnea: <12 breaths/min (adult), <30 (infant), <20 (child). Apnea: No breathing. Agonal: Slow, irregular, gasping breaths." 
            },
            { 
                front: "Heart Rate Classifications", 
                back: "Normal Adult: 60-100 bpm. Tachycardia: >100 bpm. Bradycardia: <60 bpm. Normal Infant: 100-160 bpm. Normal Child (1-3): 80-130 bpm. Normal Child (4-12): 70-110 bpm. Normal Adolescent: 60-100 bpm." 
            }
        ]
    }
};

let currentDeck = 'drugs';
let flashcards = [];
let currentCardIndex = 0;
let isFlipped = false;

// DOM Elements
const flashcard = document.getElementById('flashcard');
const frontContent = document.getElementById('frontContent');
const backContent = document.getElementById('backContent');
const currentCardSpan = document.getElementById('currentCard');
const totalCardsSpan = document.getElementById('totalCards');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const flipBtn = document.getElementById('flipBtn');
const frontInput = document.getElementById('frontInput');
const backInput = document.getElementById('backInput');
const addCardBtn = document.getElementById('addCardBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle ? themeToggle.querySelector('.theme-icon') : null;
const deckTitle = document.getElementById('deckTitle');
const deckButtons = document.querySelectorAll('.deck-btn');

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if (themeIcon) themeIcon.textContent = '☀️';
    } else {
        document.body.classList.remove('light-mode');
        if (themeIcon) themeIcon.textContent = '🌙';
    }
}

function toggleTheme() {
    const isLightMode = document.body.classList.contains('light-mode');
    if (isLightMode) {
        document.body.classList.remove('light-mode');
        if (themeIcon) themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.add('light-mode');
        if (themeIcon) themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'light');
    }
}

// Deck Management
function switchDeck(deckId) {
    currentDeck = deckId;
    currentCardIndex = 0;
    isFlipped = false;
    
    // Update rendered deck buttons active state
    document.querySelectorAll('.deck-btn').forEach(btn => {
        if (btn.dataset.deck === deckId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Update title
    deckTitle.textContent = decks[deckId].name;
    // Update add-card input placeholders for this deck
    if (frontInput) frontInput.placeholder = deckId === 'vitals' ? 'Condition' : 'Drug name...';
    if (backInput) backInput.placeholder = deckId === 'vitals' ? 'Vital signs' : 'Indications, dosage, contraindications, side effects...';
    // Add a body class so CSS can adapt card styles for the vitals deck
    document.body.classList.toggle('vitals-deck', deckId === 'vitals');
    
    // Load deck cards
    loadFlashcards();
    updateCard();
    updateButtons();
    
    // Save current deck preference
    localStorage.setItem('currentDeck', deckId);
}

// Render deck selector buttons based on `decks` object


function loadFlashcards() {
    // Try to load custom cards from localStorage first
    const saved = localStorage.getItem(`flashcards_${currentDeck}`);
    if (saved) {
        flashcards = JSON.parse(saved);
    } else {
        // Use default deck cards
        flashcards = [...decks[currentDeck].cards];
    }
    totalCardsSpan.textContent = flashcards.length;
}

function saveFlashcards() {
    localStorage.setItem(`flashcards_${currentDeck}`, JSON.stringify(flashcards));
    totalCardsSpan.textContent = flashcards.length;
}

// Format drug information into organized sections
function formatDrugInfo(text) {
    const sections = {};
    
    // Split by section headers (case insensitive)
    const parts = text.split(/\s*(?=Indications:|Dosage:|Contraindications:|Side effects:|Heart Rate:|Respiratory Rate:|Blood Pressure:|Temperature:|Oxygen Saturation:|Capillary Refill:|Eye Opening:|Verbal Response:|Motor Response:|Total:|Normal:|Tachycardia:|Bradycardia:|Tachypnea:|Bradypnea:|Apnea:|Agonal:)/i);
    
    parts.forEach(part => {
        part = part.trim();
        if (!part) return;
        
        // Drug card sections
        if (part.match(/^indications:/i)) {
            sections['Indications'] = part.replace(/^indications:\s*/i, '').trim();
        } else if (part.match(/^dosage:/i)) {
            sections['Dosage'] = part.replace(/^dosage:\s*/i, '').trim();
        } else if (part.match(/^contraindications:/i)) {
            sections['Contraindications'] = part.replace(/^contraindications:\s*/i, '').trim();
        } else if (part.match(/^side effects:/i)) {
            sections['Side effects'] = part.replace(/^side effects:\s*/i, '').trim();
        }
        // Vital signs sections
        else if (part.match(/^heart rate:/i)) {
            sections['Heart Rate'] = part.replace(/^heart rate:\s*/i, '').trim();
        } else if (part.match(/^respiratory rate:/i)) {
            sections['Respiratory Rate'] = part.replace(/^respiratory rate:\s*/i, '').trim();
        } else if (part.match(/^blood pressure:/i)) {
            sections['Blood Pressure'] = part.replace(/^blood pressure:\s*/i, '').trim();
        } else if (part.match(/^temperature:/i)) {
            sections['Temperature'] = part.replace(/^temperature:\s*/i, '').trim();
        } else if (part.match(/^oxygen saturation:/i)) {
            sections['Oxygen Saturation'] = part.replace(/^oxygen saturation:\s*/i, '').trim();
        } else if (part.match(/^capillary refill:/i)) {
            sections['Capillary Refill'] = part.replace(/^capillary refill:\s*/i, '').trim();
        } else if (part.match(/^eye opening:/i)) {
            sections['Eye Opening'] = part.replace(/^eye opening:\s*/i, '').trim();
        } else if (part.match(/^verbal response:/i)) {
            sections['Verbal Response'] = part.replace(/^verbal response:\s*/i, '').trim();
        } else if (part.match(/^motor response:/i)) {
            sections['Motor Response'] = part.replace(/^motor response:\s*/i, '').trim();
        } else if (part.match(/^total:/i)) {
            sections['Total'] = part.replace(/^total:\s*/i, '').trim();
        }
    });
    
    // Build HTML structure
    let html = '';
    const sectionOrder = Object.keys(sections);

    // Fallback: if Respiratory Rate wasn't parsed but the text contains a breaths/min value,
    // extract it and add a Respiratory Rate section so the heading appears.
    if (!sections['Respiratory Rate']) {
        const respMatch = text.match(/(?:Respiratory Rate[:\s]*)([^.\n]+\bbreaths\/min\.?)/i) || text.match(/\b(\d{1,3}(?:-\d{1,3})?\s*breaths\/min\.?)/i);
        if (respMatch) {
            // respMatch[1] if first regex, or respMatch[0] for second
            const value = respMatch[1] || respMatch[0];
            sections['Respiratory Rate'] = value.replace(/Respiratory Rate[:\s]*/i, '').trim();
            // ensure it's included in the rendering order (append at logical position)
            sectionOrder.push('Respiratory Rate');
        }
    }
    
    sectionOrder.forEach(key => {
        if (sections[key] && sections[key].trim()) {
            html += `<div class="section">
                <div class="section-title">${key}</div>
                <div class="section-content">${sections[key].trim()}</div>
            </div>`;
        }
    });
    
    return html || `<div class="section-content">${text}</div>`;
}

// Update card display
function updateCard() {
    if (flashcards.length === 0) {
        frontContent.textContent = "No cards yet. Add one below!";
        backContent.textContent = "No cards yet. Add one below!";
        return;
    }
    
    const card = flashcards[currentCardIndex];
    frontContent.textContent = card.front;
    backContent.innerHTML = formatDrugInfo(card.back);
    currentCardSpan.textContent = currentCardIndex + 1;
    
    // Reset flip state
    if (isFlipped) {
        flashcard.classList.remove('flipped');
        isFlipped = false;
    }
}

// Update navigation buttons
function updateButtons() {
    prevBtn.disabled = currentCardIndex === 0;
    nextBtn.disabled = currentCardIndex === flashcards.length - 1 || flashcards.length === 0;
}

// Flip card
function flipCard() {
    if (flashcards.length === 0) return;
    isFlipped = !isFlipped;
    flashcard.classList.toggle('flipped');
}

// Previous card
function prevCard() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        updateCard();
        updateButtons();
    }
}

// Next card
function nextCard() {
    if (currentCardIndex < flashcards.length - 1) {
        currentCardIndex++;
        updateCard();
        updateButtons();
    }
}

// Add new card
function addCard() {
    const front = frontInput.value.trim();
    const back = backInput.value.trim();
    
    if (!front || !back) {
        alert('Please fill in both front and back of the card!');
        return;
    }
    
    flashcards.push({ front, back });
    saveFlashcards();
    
    // Clear inputs
    frontInput.value = '';
    backInput.value = '';
    
    // Go to new card
    currentCardIndex = flashcards.length - 1;
    updateCard();
    updateButtons();
    
    // Show success message
    const btn = addCardBtn;
    const originalText = btn.textContent;
    btn.textContent = '✓ Added!';
    btn.style.background = '#4caf50';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 1500);
}

// Initialize
function init() {
    initTheme();
    
    // Load saved deck preference or default to drugs
    const savedDeck = localStorage.getItem('currentDeck') || 'drugs';
    switchDeck(savedDeck);

    // Deck selector event listeners
    deckButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            switchDeck(btn.dataset.deck);
        });
    });
}


// Theme toggle event listener
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}

// Event listeners
flashcard.addEventListener('click', flipCard);
flipBtn.addEventListener('click', flipCard);
prevBtn.addEventListener('click', prevCard);
nextBtn.addEventListener('click', nextCard);
addCardBtn.addEventListener('click', addCard);

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        prevCard();
    } else if (e.key === 'ArrowRight') {
        nextCard();
    } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        flipCard();
    }
});

// Allow Enter key to add card
frontInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        backInput.focus();
    }
});

backInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addCard();
    }
});

// Initialize on load
init();
