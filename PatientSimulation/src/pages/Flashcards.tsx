import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCw, Plus } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface FlashCard {
  front: string;
  back: string;
}

interface Deck {
  name: string;
  cards: FlashCard[];
}

interface Decks {
  [key: string]: Deck;
}

const defaultDecks: Decks = {
  drugs: {
    name: "EMT Drug Cards",
    cards: [
      {
        front: "Epinephrine",
        back: "Indications: Cardiac arrest, anaphylaxis, severe asthma. Dosage: 1mg (1:10,000) IV/IO for cardiac arrest; 0.3-0.5mg (1:1,000) IM for anaphylaxis. Contraindications: None in cardiac arrest. Side effects: Tachycardia, hypertension, anxiety.",
      },
      {
        front: "Aspirin",
        back: "Indications: Suspected acute coronary syndrome (ACS), chest pain. Dosage: 324mg (4 x 81mg tablets) chewed. Contraindications: Active bleeding, known allergy. Side effects: GI upset, increased bleeding risk.",
      },
      {
        front: "Nitroglycerin",
        back: "Indications: Chest pain suggestive of cardiac ischemia. Dosage: 0.4mg sublingual, repeat every 3-5 minutes (max 3 doses). Contraindications: SBP <90mmHg, use of PDE-5 inhibitors (Viagra, Cialis), right ventricular infarct. Side effects: Headache, hypotension, dizziness.",
      },
      {
        front: "Albuterol",
        back: "Indications: Bronchospasm, asthma, COPD exacerbation. Dosage: 2.5-5mg via nebulizer or 2-4 puffs via MDI. Contraindications: Hypersensitivity. Side effects: Tachycardia, tremors, nervousness.",
      },
      {
        front: "Naloxone",
        back: "Indications: Opioid overdose, respiratory depression from opioids. Dosage: 0.4-2mg IV/IM/IN (start with 0.4mg). Contraindications: None in overdose. Side effects: Acute withdrawal, agitation, nausea.",
      },
      {
        front: "Dextrose 50%",
        back: "Indications: Hypoglycemia, altered mental status with suspected low blood sugar. Dosage: 25g (50ml of D50) IV. Contraindications: Known hypersensitivity. Side effects: Hyperglycemia if given incorrectly, phlebitis.",
      },
      {
        front: "Atropine",
        back: "Indications: Symptomatic bradycardia, organophosphate poisoning. Dosage: 0.5-1mg IV/IO (repeat every 3-5 minutes, max 3mg). Contraindications: None in symptomatic bradycardia. Side effects: Tachycardia, dry mouth, blurred vision.",
      },
      {
        front: "Diphenhydramine",
        back: "Indications: Allergic reactions, anaphylaxis (adjunct), dystonic reactions. Dosage: 25-50mg IV/IM. Contraindications: Glaucoma, urinary retention. Side effects: Drowsiness, dry mouth, blurred vision.",
      },
    ],
  },
  vitals: {
    name: "EMT Vital Signs",
    cards: [
      {
        front: "Adult Normal Vital Signs",
        back: "Heart Rate: 60-100 bpm. Respiratory Rate: 12-20 breaths/min. Blood Pressure: 120/80 mmHg (normal). Temperature: 98.6°F (37°C). Oxygen Saturation: 95-100%. Capillary Refill: <2 seconds.",
      },
      {
        front: "Pediatric Normal Vital Signs (Infant)",
        back: "Heart Rate: 100-160 bpm. Respiratory Rate: 30-60 breaths/min. Blood Pressure: 70-90/50-65 mmHg. Temperature: 98.6-99.5°F. Oxygen Saturation: 95-100%. Capillary Refill: <2 seconds.",
      },
      {
        front: "Pediatric Normal Vital Signs (Child 1-3 years)",
        back: "Heart Rate: 80-130 bpm. Respiratory Rate: 20-30 breaths/min. Blood Pressure: 90-105/55-70 mmHg. Temperature: 98.6-99.5°F. Oxygen Saturation: 95-100%. Capillary Refill: <2 seconds.",
      },
      {
        front: "Pediatric Normal Vital Signs (Child 4-12 years)",
        back: "Heart Rate: 70-110 bpm. Respiratory Rate: 15-25 breaths/min. Blood Pressure: 95-115/60-75 mmHg. Temperature: 98.6°F. Oxygen Saturation: 95-100%. Capillary Refill: <2 seconds.",
      },
      {
        front: "Glasgow Coma Scale (GCS)",
        back: "Eye Opening: 4=Spontaneous, 3=To voice, 2=To pain, 1=None. Verbal Response: 5=Oriented, 4=Confused, 3=Inappropriate words, 2=Incomprehensible sounds, 1=None. Motor Response: 6=Obeys commands, 5=Localizes pain, 4=Withdraws from pain, 3=Flexion to pain, 2=Extension to pain, 1=None. Total: 3-15 (15=Normal, <8=Severe).",
      },
      {
        front: "Blood Pressure Classifications",
        back: "Normal: <120/<80 mmHg. Elevated: 120-129/<80 mmHg. Stage 1 Hypertension: 130-139/80-89 mmHg. Stage 2 Hypertension: ≥140/≥90 mmHg. Hypertensive Crisis: >180/>120 mmHg. Hypotension: <90/<60 mmHg.",
      },
      {
        front: "Respiratory Rate Classifications",
        back: "Normal Adult: 12-20 breaths/min. Tachypnea: >20 breaths/min (adult), >60 (infant), >40 (child). Bradypnea: <12 breaths/min (adult), <30 (infant), <20 (child). Apnea: No breathing. Agonal: Slow, irregular, gasping breaths.",
      },
      {
        front: "Heart Rate Classifications",
        back: "Normal Adult: 60-100 bpm. Tachycardia: >100 bpm. Bradycardia: <60 bpm. Normal Infant: 100-160 bpm. Normal Child (1-3): 80-130 bpm. Normal Child (4-12): 70-110 bpm. Normal Adolescent: 60-100 bpm.",
      },
    ],
  },
};

const Flashcards = () => {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Decks>(() => {
    const saved = localStorage.getItem("customDecks");
    const customDeckNames = saved ? JSON.parse(saved) : {};
    const allDecks = { ...defaultDecks };
    Object.keys(customDeckNames).forEach((id) => {
      if (!allDecks[id]) {
        allDecks[id] = { name: customDeckNames[id], cards: [] };
      }
    });
    return allDecks;
  });

  const [currentDeck, setCurrentDeck] = useState<string>(() => {
    return localStorage.getItem("currentDeck") || "drugs";
  });

  const [flashcards, setFlashcards] = useState<FlashCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [frontInput, setFrontInput] = useState("");
  const [backInput, setBackInput] = useState("");
  const [showAddDeckModal, setShowAddDeckModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");

  // Load flashcards for current deck
  useEffect(() => {
    const saved = localStorage.getItem(`flashcards_${currentDeck}`);
    if (saved) {
      setFlashcards(JSON.parse(saved));
    } else {
      setFlashcards([...decks[currentDeck].cards]);
    }
  }, [currentDeck, decks]);

  // Save flashcards to localStorage
  const saveFlashcards = (cards: FlashCard[]) => {
    localStorage.setItem(`flashcards_${currentDeck}`, JSON.stringify(cards));
    setFlashcards(cards);
  };

  // Switch deck
  const switchDeck = (deckId: string) => {
    setCurrentDeck(deckId);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    localStorage.setItem("currentDeck", deckId);
  };

  // Format drug/vital info into sections
  const formatDrugInfo = (text: string) => {
    const sections: { [key: string]: string } = {};
    const parts = text.split(/\s*(?=Indications:|Dosage:|Contraindications:|Side effects:|Heart Rate:|Respiratory Rate:|Blood Pressure:|Temperature:|Oxygen Saturation:|Capillary Refill:|Eye Opening:|Verbal Response:|Motor Response:|Total:)/i);

    parts.forEach((part) => {
      part = part.trim();
      if (!part) return;

      if (part.match(/^indications:/i)) {
        sections["Indications"] = part.replace(/^indications:\s*/i, "").trim();
      } else if (part.match(/^dosage:/i)) {
        sections["Dosage"] = part.replace(/^dosage:\s*/i, "").trim();
      } else if (part.match(/^contraindications:/i)) {
        sections["Contraindications"] = part.replace(/^contraindications:\s*/i, "").trim();
      } else if (part.match(/^side effects:/i)) {
        sections["Side effects"] = part.replace(/^side effects:\s*/i, "").trim();
      } else if (part.match(/^heart rate:/i)) {
        sections["Heart Rate"] = part.replace(/^heart rate:\s*/i, "").trim();
      } else if (part.match(/^respiratory rate:/i)) {
        sections["Respiratory Rate"] = part.replace(/^respiratory rate:\s*/i, "").trim();
      } else if (part.match(/^blood pressure:/i)) {
        sections["Blood Pressure"] = part.replace(/^blood pressure:\s*/i, "").trim();
      } else if (part.match(/^temperature:/i)) {
        sections["Temperature"] = part.replace(/^temperature:\s*/i, "").trim();
      } else if (part.match(/^oxygen saturation:/i)) {
        sections["Oxygen Saturation"] = part.replace(/^oxygen saturation:\s*/i, "").trim();
      } else if (part.match(/^capillary refill:/i)) {
        sections["Capillary Refill"] = part.replace(/^capillary refill:\s*/i, "").trim();
      } else if (part.match(/^eye opening:/i)) {
        sections["Eye Opening"] = part.replace(/^eye opening:\s*/i, "").trim();
      } else if (part.match(/^verbal response:/i)) {
        sections["Verbal Response"] = part.replace(/^verbal response:\s*/i, "").trim();
      } else if (part.match(/^motor response:/i)) {
        sections["Motor Response"] = part.replace(/^motor response:\s*/i, "").trim();
      } else if (part.match(/^total:/i)) {
        sections["Total"] = part.replace(/^total:\s*/i, "").trim();
      }
    });

    return Object.entries(sections).map(([key, value]) => (
      <div key={key} className="mb-3">
        <div className="font-semibold text-sm uppercase tracking-wide border-b border-white/30 pb-1 mb-2">
          {key}
        </div>
        <div className="text-sm leading-relaxed">{value}</div>
      </div>
    ));
  };

  // Navigation functions
  const flipCard = useCallback(() => {
    if (flashcards.length === 0) return;
    setIsFlipped((prev) => !prev);
  }, [flashcards.length]);

  const prevCard = useCallback(() => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false);
    }
  }, [currentCardIndex]);

  const nextCard = useCallback(() => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    }
  }, [currentCardIndex, flashcards.length]);

  // Add new card
  const addCard = () => {
    if (!frontInput.trim() || !backInput.trim()) {
      alert("Please fill in both front and back of the card!");
      return;
    }

    const newCards = [...flashcards, { front: frontInput.trim(), back: backInput.trim() }];
    saveFlashcards(newCards);
    setFrontInput("");
    setBackInput("");
    setCurrentCardIndex(newCards.length - 1);
    setIsFlipped(false);
  };

  // Add new deck
  const addDeck = () => {
    if (!newDeckName.trim()) {
      alert("Please enter a deck name");
      return;
    }

    const slugify = (text: string) =>
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const id = slugify(newDeckName);
    if (decks[id]) {
      alert("A deck with that name already exists");
      return;
    }

    const newDecks = { ...decks, [id]: { name: newDeckName, cards: [] } };
    setDecks(newDecks);

    const saved = JSON.parse(localStorage.getItem("customDecks") || "{}");
    saved[id] = newDeckName;
    localStorage.setItem("customDecks", JSON.stringify(saved));

    setNewDeckName("");
    setShowAddDeckModal(false);
    switchDeck(id);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAddDeckModal || document.activeElement?.tagName === "INPUT") return;

      if (e.key === "ArrowLeft") {
        prevCard();
      } else if (e.key === "ArrowRight") {
        nextCard();
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        flipCard();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [flipCard, nextCard, prevCard, showAddDeckModal]);

  const currentCard = flashcards[currentCardIndex];

  return (
    <div className="h-screen bg-background transition-colors duration-500 relative overflow-hidden flex flex-col">
      
      {/* Header */}
      <header className="glass border-b border-border/50 z-50 flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shadow-lg">
                <span className="text-2xl">📚</span>
              </div>
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Flashcards
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/")}
                variant="outline"
                size="sm"
                className="hover:scale-105 transition-transform duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0 max-w-4xl">
        {/* Deck Selector */}
        <div className="flex justify-center gap-2 mb-3 flex-wrap flex-shrink-0">
          {Object.keys(decks).map((deckId) => (
            <Button
              key={deckId}
              onClick={() => switchDeck(deckId)}
              variant={currentDeck === deckId ? "default" : "outline"}
              size="sm"
              className={`transition-all duration-300 ${
                currentDeck === deckId
                  ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/50"
                  : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20 hover:text-white"
              }`}
            >
              {decks[deckId].name}
            </Button>
          ))}
        </div>

        {/* Card Counter */}
        <div className="text-center text-white/70 text-sm mb-3 font-light flex-shrink-0">
          {flashcards.length > 0 ? (
            <>
              {currentCardIndex + 1} / {flashcards.length}
            </>
          ) : (
            "No cards yet"
          )}
        </div>

        {/* Flashcard */}
        <div className="perspective-1000 mb-3 flex-1 min-h-0 flex items-center justify-center">
          <div
            className={`relative w-full h-full max-h-64 min-h-48 transition-transform duration-500 transform-style-3d cursor-pointer ${
              isFlipped ? "rotate-y-180" : ""
            }`}
            onClick={flipCard}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Front */}
            <Card
              className="absolute inset-0 backface-hidden rounded-3xl bg-gradient-to-br from-cyan-400 via-purple-400 to-pink-400 border-0 shadow-2xl shadow-cyan-500/20 p-6 flex items-center justify-center"
              style={{ backfaceVisibility: "hidden" }}
            >
              <div className="text-center text-white text-2xl md:text-3xl font-semibold drop-shadow-lg">
                {currentCard ? currentCard.front : "No cards yet. Add one below!"}
              </div>
            </Card>

            {/* Back */}
            <Card
              className="absolute inset-0 backface-hidden rounded-3xl bg-gradient-to-br from-pink-400 via-purple-400 to-cyan-400 border-0 shadow-2xl shadow-pink-500/20 p-6 overflow-y-auto rotate-y-180"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <div className="text-white text-left">
                {currentCard ? (
                  formatDrugInfo(currentCard.back).length > 0 ? (
                    formatDrugInfo(currentCard.back)
                  ) : (
                    <div className="text-sm leading-relaxed">{currentCard.back}</div>
                  )
                ) : (
                  "No cards yet. Add one below!"
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center gap-4 mb-3 flex-shrink-0">
          <Button
            onClick={prevCard}
            disabled={currentCardIndex === 0 || flashcards.length === 0}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg transition-all duration-300 hover:scale-105"
            size="lg"
          >
            <ChevronLeft className="w-5 h-5 mr-2" />
            Previous
          </Button>

          <Button
            onClick={flipCard}
            disabled={flashcards.length === 0}
            className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 shadow-lg transition-all duration-300 hover:scale-105"
            size="lg"
          >
            <RotateCw className="w-5 h-5 mr-2" />
            Flip
          </Button>

          <Button
            onClick={nextCard}
            disabled={currentCardIndex === flashcards.length - 1 || flashcards.length === 0}
            className="bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg transition-all duration-300 hover:scale-105"
            size="lg"
          >
            Next
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Add Card Section */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-4 shadow-xl flex-shrink-0">
          <h3 className="text-white text-lg font-medium mb-3">Add New Card</h3>
          <div className="space-y-2">
            <Input
              placeholder={currentDeck === "vitals" ? "Condition" : "Drug name"}
              value={frontInput}
              onChange={(e) => setFrontInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  document.getElementById("back-input")?.focus();
                }
              }}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-cyan-400 focus:ring-cyan-400/20"
            />
            <Input
              id="back-input"
              placeholder={
                currentDeck === "vitals"
                  ? "Vital signs"
                  : "Indications, dosage, contraindications, side effects"
              }
              value={backInput}
              onChange={(e) => setBackInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  addCard();
                }
              }}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-cyan-400 focus:ring-cyan-400/20"
            />
            <Button
              onClick={addCard}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-lg transition-all duration-300 hover:scale-105"
            >
              Add Card
            </Button>
          </div>
        </div>
      </main>

      {/* Floating Add Deck Button */}
      <Button
        onClick={() => setShowAddDeckModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white shadow-2xl shadow-cyan-500/50 transition-all duration-300 hover:scale-110 z-50"
        size="icon"
      >
        <Plus className="w-7 h-7" />
      </Button>

      {/* Add Deck Modal */}
      {showAddDeckModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddDeckModal(false)}
        >
          <Card
            className="bg-white/10 backdrop-blur-xl border-white/20 p-8 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-white text-2xl font-semibold mb-4">Add New Deck</h2>
            <Input
              placeholder="Deck name..."
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  addDeck();
                }
              }}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-cyan-400 focus:ring-cyan-400/20 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                onClick={() => setShowAddDeckModal(false)}
                variant="outline"
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={addDeck}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white"
              >
                Create Deck
              </Button>
            </div>
          </Card>
        </div>
      )}

      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default Flashcards;
