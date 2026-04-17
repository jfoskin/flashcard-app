const STORAGE_KEY = "hiphop-flashcards-state";
const STORAGE_VERSION = 2;
const KNOWLEDGE_STORAGE_KEY = "hiphop-flashcards-knowledge";

const SOURCE_DECKS = [
	{
		id: "legends",
		name: "Foundations & Legends",
		cards: [
			{ id: "legends-1", front: "Which Bronx DJ is widely credited with hosting one of hip hop's earliest parties in 1973?", back: "DJ Kool Herc." },
			{ id: "legends-2", front: "Which MC helped popularize socially conscious rap with songs like 'The Message'?", back: "Melle Mel of Grandmaster Flash and the Furious Five." },
			{ id: "legends-3", front: "Run-D.M.C. helped bridge hip hop and rock with which 1986 collaboration?", back: "'Walk This Way' with Aerosmith." },
			{ id: "legends-4", front: "Who is known as the 'Godfather of Rap' and formed the Furious Five?", back: "Grandmaster Flash." },
			{ id: "legends-5", front: "Which pioneering female MC released the battle classic 'Roxanne's Revenge'?", back: "Roxanne Shante." },
			{ id: "legends-6", front: "Public Enemy's Chuck D once described rap music as what kind of news outlet?", back: "'Black America's CNN.'" },
			{ id: "legends-7", front: "Which duo from Queens released the influential album 'Paid in Full' in 1987?", back: "Eric B. & Rakim." },
			{ id: "legends-8", front: "Who became the first solo rapper inducted into the Rock and Roll Hall of Fame in 2007?", back: "Grandmaster Flash." }
		]
	},
	{
		id: "golden-age",
		name: "Golden Age Essentials",
		cards: [
			{ id: "golden-1", front: "Which 1994 Nas album is frequently listed among the greatest hip hop albums ever?", back: "Illmatic." },
			{ id: "golden-2", front: "What is the title of The Notorious B.I.G.'s debut studio album?", back: "Ready to Die." },
			{ id: "golden-3", front: "Which Wu-Tang Clan album introduced the group to the world in 1993?", back: "Enter the Wu-Tang (36 Chambers)." },
			{ id: "golden-4", front: "A Tribe Called Quest blended jazz and rap prominently on which 1991 album?", back: "The Low End Theory." },
			{ id: "golden-5", front: "Which producer-led duo made sample-heavy classics under the name Gang Starr?", back: "DJ Premier and Guru." },
			{ id: "golden-6", front: "Which West Coast artist released the landmark album 'The Chronic' in 1992?", back: "Dr. Dre." },
			{ id: "golden-7", front: "Which duo was known for the high-speed style heard on tracks like 'Rebel Without a Pause'?", back: "Public Enemy's MC Chuck D with Flavor Flav backing, over the Bomb Squad's production style." },
			{ id: "golden-8", front: "What city is most associated with boom-bap production and many Golden Age acts?", back: "New York City." }
		]
	},
	{
		id: "modern-era",
		name: "Modern Era Highlights",
		cards: [
			{ id: "modern-1", front: "Which Kendrick Lamar album won the Pulitzer Prize for Music in 2018?", back: "DAMN." },
			{ id: "modern-2", front: "Who became the first rapper to win the Grammy for Best New Artist in 1999?", back: "Lauryn Hill." },
			{ id: "modern-3", front: "Which Atlanta trio is known for the phrase 'triplet flow' influence in modern rap?", back: "Migos." },
			{ id: "modern-4", front: "What 2016 Chance the Rapper mixtape helped spotlight independent streaming-era success?", back: "Coloring Book." },
			{ id: "modern-5", front: "Which artist's 2018 album 'Astroworld' became a major modern rap pop-culture moment?", back: "Travis Scott." },
			{ id: "modern-6", front: "Who released the 2019 chart-topping single 'Old Town Road'?", back: "Lil Nas X." },
			{ id: "modern-7", front: "Which rapper's album 'The Miseducation of Lauryn Hill' continues to influence lyric-focused artists today?", back: "Lauryn Hill." },
			{ id: "modern-8", front: "What rapper won the 2024 hip hop battle?", back: "Kendrick Lamar Duckworth." }
		]
	}
];

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
