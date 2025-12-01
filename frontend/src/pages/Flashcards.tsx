import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/supabase-client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCw, Plus, Trash2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogoutButton } from "@/components/LogoutButton";

interface FlashCard {
  id: string;
  front: string;
  back: string;
}

interface Deck {
  id: string;
  name: string;
}

// Component now loads decks & cards from Supabase; removed hardcoded/localStorage seeded defaults.

const Flashcards = () => {
  const navigate = useNavigate();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(() => localStorage.getItem("currentDeckId"));
  const [flashcards, setFlashcards] = useState<FlashCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [frontInput, setFrontInput] = useState("");
  const [backInput, setBackInput] = useState("");
  const [showAddDeckModal, setShowAddDeckModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadCards = async () => {
      if (!currentDeckId) {
        setFlashcards([]);
        return;
      }
      setLoadingCards(true);
      setErrorMessage(null);
      const { data, error } = await supabase
        .from("flashcards")
        .select("id,front,back")
        .eq("deck_id", currentDeckId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error(error);
        setErrorMessage("Failed to load cards");
        setFlashcards([]);
      } else {
        setFlashcards(data || []);
        setCurrentCardIndex(0);
        setIsFlipped(false);
      }
      setLoadingCards(false);
    };
  const loadDecks = async () => {
    setLoadingDecks(true);
    setErrorMessage(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id || null;
    setUserId(uid);
    if (!uid) {
      setDecks([]);
      setLoadingDecks(false);
      return;
    }
    const { data, error } = await supabase
      .from("decks")
      .select("id,name")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      setErrorMessage("Failed to load decks");
      setDecks([]);
    } else {
      setDecks(data || []);
      if (!currentDeckId && data && data.length > 0) {
        setCurrentDeckId(data[0].id);
        localStorage.setItem("currentDeckId", data[0].id);
      }
    }
    setLoadingDecks(false);
  };

  // Fetch decks for current user (runs on mount only).
  // No dependency on currentDeckId to avoid redundant refetch whenever deck selection changes.
  useEffect(() => {
      loadDecks();
  }, []);

  // Fetch cards when deck changes
  useEffect(() => {  
    loadCards();
  }, [currentDeckId]);

  const switchDeck = (deckId: string) => {
    setCurrentDeckId(deckId);
    localStorage.setItem("currentDeckId", deckId);
  };

  const createDeck = async () => {
    if (!newDeckName.trim()) {
      alert("Please enter a deck name");
      return;
    }
    if (!userId) {
      alert("User not authenticated");
      return;
    }
    const { data, error } = await supabase
      .from("decks")
      .insert({ name: newDeckName.trim(), user_id: userId })
      .select();
    if (error) {
      console.error(error);
      alert("Error creating deck");
      return;
    }
    const newDeck = data![0];
    setDecks((prev) => [...prev, newDeck]);
    setCurrentDeckId(newDeck.id);
    localStorage.setItem("currentDeckId", newDeck.id);
    setShowAddDeckModal(false);
    setNewDeckName("");
  };

  const addCard = async () => {
    if (!currentDeckId) {
      alert("Select or create a deck first");
      return;
    }
    if (!frontInput.trim() || !backInput.trim()) {
      alert("Please fill in both front and back of the card!");
      return;
    }
    const { data, error } = await supabase
      .from("flashcards")
      .insert({ deck_id: currentDeckId, front: frontInput.trim(), back: backInput.trim() })
      .select();
    if (error) {
      console.error(error);
      alert("Error adding card");
      return;
    }
    const inserted = data![0];
    setFlashcards((prev) => [...prev, inserted]);
    setFrontInput("");
    setBackInput("");
    setCurrentCardIndex(flashcards.length); // new last index
    setIsFlipped(false);
  };

  const deleteCard = async () => {
    if (!currentCard) return;
    
    const confirmed = window.confirm(`Delete card: "${currentCard.front}"?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("flashcards")
      .delete()
      .eq("id", currentCard.id);
    
    if (error) {
      console.error(error);
      alert("Error deleting card");
      return;
    }

    // Remove from state
    const newCards = flashcards.filter((card) => card.id !== currentCard.id);
    setFlashcards(newCards);
    
    // Adjust index after deletion
    if (newCards.length === 0) {
      setCurrentCardIndex(0);
    } else if (currentCardIndex >= newCards.length) {
      setCurrentCardIndex(newCards.length - 1);
    }
    setIsFlipped(false);
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

  // Keyboard navigation retained

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
  const currentDeck = decks.find((d) => d.id === currentDeckId) || null;

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
              <LogoutButton/>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0 max-w-4xl">
        {/* Deck Selector */}
        <div className="flex justify-center gap-2 mb-3 flex-wrap flex-shrink-0">
          {loadingDecks && <div className="text-white/60 text-sm">Loading decks...</div>}
          {!loadingDecks && decks.length === 0 && (
            <div className="text-white/60 text-sm">No decks yet. Create one.</div>
          )}
          {!loadingDecks && decks.map((deck) => (
            <Button
              key={deck.id}
              onClick={() => switchDeck(deck.id)}
              variant={currentDeckId === deck.id ? "default" : "outline"}
              size="sm"
              className={`transition-all duration-300 ${
                currentDeckId === deck.id
                  ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/50"
                  : "bg-white/10 border-white/20 text-white/70 hover:bg-white/20 hover:text-white"
              }`}
            >
              {deck.name}
            </Button>
          ))}
        </div>

        {/* Card Counter */}
        <div className="text-center text-white/70 text-sm mb-3 font-light flex-shrink-0">
          {loadingCards ? (
            <>Loading cards...</>
          ) : flashcards.length > 0 ? (
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
                {currentCard ? currentCard.front : loadingCards ? "Loading..." : "No cards yet. Add one below!"}
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
                  loadingCards ? "Loading..." : "No cards yet. Add one below!"
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
            onClick={deleteCard}
            disabled={flashcards.length === 0}
            className="bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg transition-all duration-300 hover:scale-105"
            size="lg"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            Delete
          </Button>

          <Button
            onClick={nextCard}
            disabled={currentCardIndex === flashcards.length - 1 || flashcards.length === 0}
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg transition-all duration-300 hover:scale-105"
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
              placeholder={currentDeck?.name?.includes("Vital") ? "Condition" : "Front"}
              value={frontInput}
              onChange={(e) => setFrontInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  document.getElementById("back-input")?.focus();
                }
              }}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-cyan-400 focus:ring-cyan-400/20"
              disabled={!currentDeckId}
            />
            <Input
              id="back-input"
              placeholder={currentDeck?.name?.includes("Vital") ? "Details" : "Back"}
              value={backInput}
              onChange={(e) => setBackInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  addCard();
                }
              }}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-cyan-400 focus:ring-cyan-400/20"
              disabled={!currentDeckId}
            />
            <Button
              onClick={addCard}
              className="w-full bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-lg transition-all duration-300 hover:scale-105"
              disabled={!currentDeckId}
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
                  createDeck();
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
                onClick={createDeck}
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
