const STORAGE_KEY = "hiphop-flashcards-state";
const STORAGE_VERSION = 1;

// Static seed data for all decks/cards. Runtime state tracks order/progress separately.
const DECKS = [
	{
		id: "legends",
		title: "Foundations & Legends",
		subtitle: "Origins and game changers",
		cards: [
			{ id: "legends-1", question: "Which Bronx DJ is widely credited with hosting one of hip hop's earliest parties in 1973?", answer: "DJ Kool Herc." },
			{ id: "legends-2", question: "Which MC helped popularize socially conscious rap with songs like 'The Message'?", answer: "Melle Mel of Grandmaster Flash and the Furious Five." },
			{ id: "legends-3", question: "Run-D.M.C. helped bridge hip hop and rock with which 1986 collaboration?", answer: "'Walk This Way' with Aerosmith." },
			{ id: "legends-4", question: "Who is known as the 'Godfather of Rap' and formed the Furious Five?", answer: "Grandmaster Flash." },
			{ id: "legends-5", question: "Which pioneering female MC released the battle classic 'Roxanne's Revenge'?", answer: "Roxanne Shante." },
			{ id: "legends-6", question: "Public Enemy's Chuck D once described rap music as what kind of news outlet?", answer: "'Black America's CNN.'" },
			{ id: "legends-7", question: "Which duo from Queens released the influential album 'Paid in Full' in 1987?", answer: "Eric B. & Rakim." },
			{ id: "legends-8", question: "Who became the first solo rapper inducted into the Rock and Roll Hall of Fame in 2007?", answer: "Grandmaster Flash." }
		]
	},
	{
		id: "golden-age",
		title: "Golden Age Essentials",
		subtitle: "Late 80s to mid 90s classics",
		cards: [
			{ id: "golden-1", question: "Which 1994 Nas album is frequently listed among the greatest hip hop albums ever?", answer: "Illmatic." },
			{ id: "golden-2", question: "What is the title of The Notorious B.I.G.'s debut studio album?", answer: "Ready to Die." },
			{ id: "golden-3", question: "Which Wu-Tang Clan album introduced the group to the world in 1993?", answer: "Enter the Wu-Tang (36 Chambers)." },
			{ id: "golden-4", question: "A Tribe Called Quest blended jazz and rap prominently on which 1991 album?", answer: "The Low End Theory." },
			{ id: "golden-5", question: "Which producer-led duo made sample-heavy classics under the name Gang Starr?", answer: "DJ Premier and Guru." },
			{ id: "golden-6", question: "Which West Coast artist released the landmark album 'The Chronic' in 1992?", answer: "Dr. Dre." },
			{ id: "golden-7", question: "Which duo was known for the high-speed style heard on tracks like 'Rebel Without a Pause'?", answer: "Public Enemy's MC Chuck D with Flavor Flav backing, over the Bomb Squad's production style." },
			{ id: "golden-8", question: "What city is most associated with boom-bap production and many Golden Age acts?", answer: "New York City." }
		]
	},
	{
		id: "modern-era",
		title: "Modern Era Highlights",
		subtitle: "2000s to present milestones",
		cards: [
			{ id: "modern-1", question: "Which Kendrick Lamar album won the Pulitzer Prize for Music in 2018?", answer: "DAMN." },
			{ id: "modern-2", question: "Who became the first rapper to win the Grammy for Best New Artist in 1999?", answer: "Lauryn Hill." },
			{ id: "modern-3", question: "Which Atlanta trio is known for the phrase 'triplet flow' influence in modern rap?", answer: "Migos." },
			{ id: "modern-4", question: "What 2016 Chance the Rapper mixtape helped spotlight independent streaming-era success?", answer: "Coloring Book." },
			{ id: "modern-5", question: "Which artist's 2018 album 'Astroworld' became a major modern rap pop-culture moment?", answer: "Travis Scott." },
			{ id: "modern-6", question: "Who released the 2019 chart-topping single 'Old Town Road'?", answer: "Lil Nas X." },
			{ id: "modern-7", question: "Which rapper's album 'The Miseducation of Lauryn Hill' continues to influence lyric-focused artists today?", answer: "Lauryn Hill." },
			{ id: "modern-8", question: "What rapper won the 2024 hip hop battle?", answer: "Kendrick Lamar Duckworth" }
		]
	}
];

const deckById = new Map(DECKS.map((deck) => [deck.id, deck]));

// Main application class encapsulates all state and behavior for the flashcard app.


class FlashcardApp {
	constructor() {
        // Load persisted state or fall back to a safe default. Then cache DOM nodes and kick off the first render.
		this.state = this.loadState();
		this.isFlipped = false;
		this.elements = this.getElements();
        //
		this.bindEvents();
		this.render();
	}

	// Cache all DOM nodes used by render and event handlers.
	getElements() {
		return {
			decksList: document.getElementById("decks-list"),
			deckName: document.getElementById("deck-name"),
			cardPosition: document.getElementById("card-position"),
			knownCount: document.getElementById("known-count"),
			flashcard: document.getElementById("flashcard"),
			flashcardInner: document.getElementById("flashcard-inner"),
			cardFrontText: document.getElementById("card-front-text"),
			cardBackText: document.getElementById("card-back-text"),
			prevBtn: document.getElementById("prev-btn"),
			flipBtn: document.getElementById("flip-btn"),
			nextBtn: document.getElementById("next-btn"),
			shuffleBtn: document.getElementById("shuffle-btn"),
			knownBtn: document.getElementById("known-btn"),
			unknownBtn: document.getElementById("unknown-btn"),
			liveAnnouncer: document.getElementById("live-announcer")
		};
	}

	bindEvents() {
		// Event delegation keeps deck button wiring stable even after re-rendered list HTML.
		this.elements.decksList.addEventListener("click", (event) => {
			const button = event.target.closest("button[data-deck-id]");
			if (!button) {
				return;
			}
			this.selectDeck(button.dataset.deckId);
		});

		this.elements.flashcard.addEventListener("click", () => this.flipCard());
		this.elements.flipBtn.addEventListener("click", () => this.flipCard());
		this.elements.prevBtn.addEventListener("click", () => this.previousCard());
		this.elements.nextBtn.addEventListener("click", () => this.nextCard());
		this.elements.shuffleBtn.addEventListener("click", () => this.shuffleDeck());
		this.elements.knownBtn.addEventListener("click", () => this.markCard("known"));
		this.elements.unknownBtn.addEventListener("click", () => this.markCard("unknown"));
	}

    // Generate a default state object based on the static DECKS data structure.
	getDefaultState() {
		const deckOrders = {};
		const deckIndexes = {};
		for (const deck of DECKS) {
			// Keep a mutable per-deck card order so shuffle does not mutate source deck data.
			deckOrders[deck.id] = deck.cards.map((card) => card.id);
			deckIndexes[deck.id] = 0;
		}
		return {
			version: STORAGE_VERSION,
			selectedDeckId: DECKS[0].id,
			deckOrders,
			deckIndexes,
			knownMap: {}
		};
	}

	loadState() {
		// Use persisted progress when valid; otherwise recover with a safe default state.
		const fallback = this.getDefaultState();
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return fallback;
		}

		try {
			const parsed = JSON.parse(raw);
			if (!this.isValidState(parsed)) {
				return fallback;
			}
			return parsed;
		} catch (_error) {
			return fallback;
		}
	}

	isValidState(value) {
		// Validate shape + version to avoid crashes from stale/corrupted localStorage payloads.
		if (!value || typeof value !== "object") {
			return false;
		}
		if (value.version !== STORAGE_VERSION) {
			return false;
		}
		if (!deckById.has(value.selectedDeckId)) {
			return false;
		}
		if (!value.deckOrders || !value.deckIndexes || !value.knownMap) {
			return false;
		}

		return DECKS.every((deck) => {
			const order = value.deckOrders[deck.id];
			const index = value.deckIndexes[deck.id];
			if (!Array.isArray(order) || typeof index !== "number") {
				return false;
			}
			const expectedIds = new Set(deck.cards.map((card) => card.id));
			if (order.length !== expectedIds.size) {
				return false;
			}
			for (const id of order) {
				if (!expectedIds.has(id)) {
					return false;
				}
			}
			return index >= 0 && index < order.length;
		});
	}

	// Persist current runtime state so progress survives page reloads.
	saveState() {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
	}

	// Return the active deck object from the selected deck id.
	getSelectedDeck() {
		return deckById.get(this.state.selectedDeckId);
	}

	getCurrentCard() {
		const deck = this.getSelectedDeck();
		const order = this.state.deckOrders[deck.id];
		const index = this.state.deckIndexes[deck.id];
		const cardId = order[index];
		// Fallback guards against an unexpected missing id while preserving app usability.
		return deck.cards.find((card) => card.id === cardId) || deck.cards[0];
	}

	// Switch active deck, reset flip state, then re-render and announce the change.
	selectDeck(deckId) {
		if (!deckById.has(deckId) || this.state.selectedDeckId === deckId) {
			return;
		}
		this.state.selectedDeckId = deckId;
		this.isFlipped = false;
		this.saveState();
		this.render();

		const deck = deckById.get(deckId);
		this.announce(`Switched to ${deck.title}.`);
	}

	// Toggle question/answer face and sync the flip button label for accessibility.
	flipCard() {
		this.isFlipped = !this.isFlipped;
		this.elements.flashcard.classList.toggle("is-flipped", this.isFlipped);
		this.elements.flipBtn.textContent = this.isFlipped ? "Show Question" : "Show Answer";
		this.elements.flipBtn.setAttribute(
			"aria-label",
			this.isFlipped ? "Show question side" : "Show answer side"
		);
		this.announce(this.isFlipped ? "Showing answer." : "Showing question.");
	}

	// Move to the previous card when possible and reset to question side.
	previousCard() {
		const deck = this.getSelectedDeck();
		const index = this.state.deckIndexes[deck.id];
		if (index === 0) {
			return;
		}
		this.state.deckIndexes[deck.id] -= 1;
		this.isFlipped = false;
		this.saveState();
		this.render();
		this.announce(`Card ${this.state.deckIndexes[deck.id] + 1} of ${deck.cards.length}.`);
	}

	// Move to the next card when possible and reset to question side.
	nextCard() {
		const deck = this.getSelectedDeck();
		const index = this.state.deckIndexes[deck.id];
		if (index >= deck.cards.length - 1) {
			return;
		}
		this.state.deckIndexes[deck.id] += 1;
		this.isFlipped = false;
		this.saveState();
		this.render();
		this.announce(`Card ${this.state.deckIndexes[deck.id] + 1} of ${deck.cards.length}.`);
	}

	shuffleDeck() {
		const deck = this.getSelectedDeck();
		const order = [...this.state.deckOrders[deck.id]];
		// Fisher-Yates shuffle for unbiased in-place randomization.
		for (let i = order.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[order[i], order[j]] = [order[j], order[i]];
		}
		this.state.deckOrders[deck.id] = order;
		this.state.deckIndexes[deck.id] = 0;
		this.isFlipped = false;
		this.saveState();
		this.render();
		this.announce(`${deck.title} shuffled.`);
	}

	// Record known/unknown status for the current card and refresh progress UI.
	markCard(status) {
		const card = this.getCurrentCard();
		this.state.knownMap[card.id] = status;
		this.saveState();
		this.renderKnowledgeButtons();
		this.renderStatus();
		this.announce(status === "known" ? "Card marked as known." : "Card marked as unknown.");
	}

	renderDecks() {
		const selectedId = this.state.selectedDeckId;
		// Rebuild list from source decks so active state always matches current app state.
		this.elements.decksList.innerHTML = DECKS.map((deck) => {
			const isActive = deck.id === selectedId;
			return `
				<li>
					<button
						type="button"
						class="deck-btn${isActive ? " is-active" : ""}"
						data-deck-id="${deck.id}"
						aria-current="${isActive ? "true" : "false"}"
					>
						<span class="deck-title">${deck.title}</span>
						<span class="deck-sub">${deck.subtitle}</span>
					</button>
				</li>
			`;
		}).join("");
	}

	renderCard() {
		const deck = this.getSelectedDeck();
		const card = this.getCurrentCard();
		this.elements.cardFrontText.textContent = card.question;
		this.elements.cardBackText.textContent = card.answer;

		this.elements.flashcard.classList.toggle("is-flipped", this.isFlipped);
		this.elements.flipBtn.textContent = this.isFlipped ? "Show Question" : "Show Answer";
		this.elements.flipBtn.setAttribute(
			"aria-label",
			this.isFlipped ? "Show question side" : "Show answer side"
		);

		// Guardrails: prevent navigation past first/last card in current deck order.
		const index = this.state.deckIndexes[deck.id];
		this.elements.prevBtn.disabled = index === 0;
		this.elements.nextBtn.disabled = index === deck.cards.length - 1;
	}

	// Update deck title, card index, and known counter summary text.
	renderStatus() {
		const deck = this.getSelectedDeck();
		const index = this.state.deckIndexes[deck.id];
		const total = deck.cards.length;
		const knownCount = this.state.deckOrders[deck.id].filter(
			(cardId) => this.state.knownMap[cardId] === "known"
		).length;

		this.elements.deckName.textContent = deck.title;
		this.elements.cardPosition.textContent = `${index + 1} / ${total}`;
		this.elements.knownCount.textContent = `${knownCount} / ${total}`;
	}

	// Highlight the known/unknown action matching the current card's saved status.
	renderKnowledgeButtons() {
		const card = this.getCurrentCard();
		const status = this.state.knownMap[card.id];
		this.elements.knownBtn.classList.toggle("is-selected", status === "known");
		this.elements.unknownBtn.classList.toggle("is-selected", status === "unknown");
	}

	announce(message) {
		// Clear then set on next frame so assistive tech reliably announces repeated updates.
		this.elements.liveAnnouncer.textContent = "";
		window.requestAnimationFrame(() => {
			this.elements.liveAnnouncer.textContent = message;
		});
	}

	render() {
		// Single render entry point keeps UI updates predictable after any state change.
		this.renderDecks();
		this.renderCard();
		this.renderStatus();
		this.renderKnowledgeButtons();
	}
}

// Wait for the document to be ready before querying nodes and starting the app.
window.addEventListener("DOMContentLoaded", () => {
	new FlashcardApp();
});
