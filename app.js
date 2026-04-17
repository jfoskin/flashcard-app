import { SOURCE_DECKS } from "./seedData.js";

const STORAGE_KEY = "hiphop-flashcards-state";
const STORAGE_VERSION = 2;
const KNOWLEDGE_STORAGE_KEY = "hiphop-flashcards-knowledge";

// Build initial state that matches the requested AppState model.
function createInitialAppState() {
	const createdAt = Date.now();
	const decks = SOURCE_DECKS.map((deck) => ({
		id: deck.id,
		name: deck.name,
		createdAt
	}));

	const cardsByDeckId = {};
	for (const deck of SOURCE_DECKS) {
		cardsByDeckId[deck.id] = deck.cards.map((card) => ({
			id: card.id,
			front: card.front,
			back: card.back,
			updatedAt: createdAt
		}));
	}

	return {
		decks,
		cardsByDeckId,
		activeDeckId: decks[0]?.id ?? null,
		ui: {
			isModalOpen: false,
			activeCardIndex: 0
		}
	};
}

class FlashcardApp {
	constructor() {
		this.state = this.loadState();
		this.isFlipped = false;
		this.knowledgeByCardId = this.loadKnowledgeState();
		this.elements = this.getElements();
		this.bindEvents();
		this.render();
	}

	getElements() {
		return {
			decksList: document.getElementById("decks-list"),
			deckName: document.getElementById("deck-name"),
			cardPosition: document.getElementById("card-position"),
			knownCount: document.getElementById("known-count"),
			flashcard: document.getElementById("flashcard"),
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

	loadState() {
		const fallback = createInitialAppState();
		const raw = window.localStorage.getItem(STORAGE_KEY);
		if (!raw) {
			return fallback;
		}

		try {
			const payload = JSON.parse(raw);
			const state = payload?.version === STORAGE_VERSION ? payload.appState : payload;
			if (!this.isValidState(state)) {
				return fallback;
			}
			return state;
		} catch (_error) {
			return fallback;
		}
	}

	isValidState(value) {
		if (!value || typeof value !== "object") {
			return false;
		}

		if (!Array.isArray(value.decks) || typeof value.cardsByDeckId !== "object") {
			return false;
		}

		if (!(value.activeDeckId === null || typeof value.activeDeckId === "string")) {
			return false;
		}

		if (!value.ui || typeof value.ui !== "object") {
			return false;
		}

		if (typeof value.ui.isModalOpen !== "boolean" || typeof value.ui.activeCardIndex !== "number") {
			return false;
		}

		for (const deck of value.decks) {
			if (
				typeof deck?.id !== "string" ||
				typeof deck?.name !== "string" ||
				typeof deck?.createdAt !== "number"
			) {
				return false;
			}

			const cards = value.cardsByDeckId[deck.id];
			if (!Array.isArray(cards)) {
				return false;
			}

			for (const card of cards) {
				if (
					typeof card?.id !== "string" ||
					typeof card?.front !== "string" ||
					typeof card?.back !== "string" ||
					typeof card?.updatedAt !== "number"
				) {
					return false;
				}
			}
		}

		if (value.activeDeckId && !value.decks.some((deck) => deck.id === value.activeDeckId)) {
			return false;
		}

		return value.ui.activeCardIndex >= 0;
	}

	saveState() {
		const payload = {
			version: STORAGE_VERSION,
			appState: this.state
		};
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
	}

	loadKnowledgeState() {
		const raw = window.localStorage.getItem(KNOWLEDGE_STORAGE_KEY);
		if (!raw) {
			return {};
		}
		try {
			const parsed = JSON.parse(raw);
			return parsed && typeof parsed === "object" ? parsed : {};
		} catch (_error) {
			return {};
		}
	}

	saveKnowledgeState() {
		window.localStorage.setItem(KNOWLEDGE_STORAGE_KEY, JSON.stringify(this.knowledgeByCardId));
	}

	getSelectedDeck() {
		if (!this.state.activeDeckId) {
			return null;
		}
		return this.state.decks.find((deck) => deck.id === this.state.activeDeckId) || null;
	}

	getCardsForActiveDeck() {
		const deck = this.getSelectedDeck();
		if (!deck) {
			return [];
		}
		return this.state.cardsByDeckId[deck.id] || [];
	}

	getCurrentCard() {
		const cards = this.getCardsForActiveDeck();
		if (cards.length === 0) {
			return null;
		}
		const maxIndex = cards.length - 1;
		const safeIndex = Math.min(this.state.ui.activeCardIndex, maxIndex);
		return cards[safeIndex];
	}

	selectDeck(deckId) {
		const exists = this.state.decks.some((deck) => deck.id === deckId);
		if (!exists || this.state.activeDeckId === deckId) {
			return;
		}

		this.state.activeDeckId = deckId;
		this.state.ui.activeCardIndex = 0;
		this.isFlipped = false;
		this.saveState();
		this.render();

		const deck = this.getSelectedDeck();
		if (deck) {
			this.announce(`Switched to ${deck.name}.`);
		}
	}

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

	previousCard() {
		if (this.state.ui.activeCardIndex === 0) {
			return;
		}

		this.state.ui.activeCardIndex -= 1;
		this.isFlipped = false;
		this.saveState();
		this.render();

		const total = this.getCardsForActiveDeck().length;
		this.announce(`Card ${this.state.ui.activeCardIndex + 1} of ${total}.`);
	}

	nextCard() {
		const cards = this.getCardsForActiveDeck();
		if (this.state.ui.activeCardIndex >= cards.length - 1) {
			return;
		}

		this.state.ui.activeCardIndex += 1;
		this.isFlipped = false;
		this.saveState();
		this.render();
		this.announce(`Card ${this.state.ui.activeCardIndex + 1} of ${cards.length}.`);
	}

	shuffleDeck() {
		const deck = this.getSelectedDeck();
		if (!deck) {
			return;
		}

		const cards = [...(this.state.cardsByDeckId[deck.id] || [])];
		for (let i = cards.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[cards[i], cards[j]] = [cards[j], cards[i]];
		}

		this.state.cardsByDeckId[deck.id] = cards;
		this.state.ui.activeCardIndex = 0;
		this.isFlipped = false;
		this.saveState();
		this.render();
		this.announce(`${deck.name} shuffled.`);
	}

	markCard(status) {
		const card = this.getCurrentCard();
		if (!card) {
			return;
		}

		this.knowledgeByCardId[card.id] = status;
		this.saveKnowledgeState();
		this.renderKnowledgeButtons();
		this.renderStatus();
		this.announce(status === "known" ? "Card marked as known." : "Card marked as unknown.");
	}

	renderDecks() {
		const selectedId = this.state.activeDeckId;
		this.elements.decksList.innerHTML = this.state.decks
			.map((deck) => {
				const isActive = deck.id === selectedId;
				const cardCount = (this.state.cardsByDeckId[deck.id] || []).length;
				return `
					<li>
						<button
							type="button"
							class="deck-btn${isActive ? " is-active" : ""}"
							data-deck-id="${deck.id}"
							aria-current="${isActive ? "true" : "false"}"
						>
							<span class="deck-title">${deck.name}</span>
							<span class="deck-sub">${cardCount} cards</span>
						</button>
					</li>
				`;
			})
			.join("");
	}

	renderCard() {
		const card = this.getCurrentCard();
		const cards = this.getCardsForActiveDeck();
		if (!card) {
			this.elements.cardFrontText.textContent = "No cards available.";
			this.elements.cardBackText.textContent = "Add cards to begin.";
			this.elements.prevBtn.disabled = true;
			this.elements.nextBtn.disabled = true;
			return;
		}

		this.elements.cardFrontText.textContent = card.front;
		this.elements.cardBackText.textContent = card.back;
		this.elements.flashcard.classList.toggle("is-flipped", this.isFlipped);
		this.elements.flipBtn.textContent = this.isFlipped ? "Show Question" : "Show Answer";
		this.elements.flipBtn.setAttribute(
			"aria-label",
			this.isFlipped ? "Show question side" : "Show answer side"
		);

		const index = Math.min(this.state.ui.activeCardIndex, cards.length - 1);
		this.elements.prevBtn.disabled = index === 0;
		this.elements.nextBtn.disabled = index === cards.length - 1;
	}

	renderStatus() {
		const deck = this.getSelectedDeck();
		const cards = this.getCardsForActiveDeck();
		const total = cards.length;
		const index = total === 0 ? 0 : Math.min(this.state.ui.activeCardIndex, total - 1) + 1;
		const knownCount = cards.filter((card) => this.knowledgeByCardId[card.id] === "known").length;

		this.elements.deckName.textContent = deck ? deck.name : "-";
		this.elements.cardPosition.textContent = `${index} / ${total}`;
		this.elements.knownCount.textContent = `${knownCount} / ${total}`;
	}

	renderKnowledgeButtons() {
		const card = this.getCurrentCard();
		if (!card) {
			this.elements.knownBtn.classList.remove("is-selected");
			this.elements.unknownBtn.classList.remove("is-selected");
			return;
		}

		const status = this.knowledgeByCardId[card.id];
		this.elements.knownBtn.classList.toggle("is-selected", status === "known");
		this.elements.unknownBtn.classList.toggle("is-selected", status === "unknown");
	}

	announce(message) {
		this.elements.liveAnnouncer.textContent = "";
		window.requestAnimationFrame(() => {
			this.elements.liveAnnouncer.textContent = message;
		});
	}

	render() {
		const cards = this.getCardsForActiveDeck();
		if (cards.length > 0 && this.state.ui.activeCardIndex >= cards.length) {
			this.state.ui.activeCardIndex = cards.length - 1;
		}

		this.renderDecks();
		this.renderCard();
		this.renderStatus();
		this.renderKnowledgeButtons();
	}
}

window.addEventListener("DOMContentLoaded", () => {
	new FlashcardApp();
});
