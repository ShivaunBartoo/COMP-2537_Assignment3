import { Sprite, Application, Assets, Container, Ticker, ColorMatrixFilter, AlphaFilter } from "pixi.js";
import Card from "./card.js";
import random from "random";
import "animate.css";

let app;
let tileset;
let pokemonNames;
let gameContainer;
let backgroundContainer;

const cardSize = 24;
const tileSize = 16;
const pokemonMax = 151;

let cards = [];
let remainingMatches;
let consecutiveMatches = 0;
let timer;

export const gameStates = {
    initializing: "initializing",
    readyToStart: "readyToStart",
    guessing: "guessing",
    revealing: "revealing",
};

export const gameState = {
    state: gameStates.initializing,
    flippedCard: null,
};

let pokeballTextures;
let currentPokeball = "pokeball";
export let getCurrentPokeball = () => pokeballTextures[currentPokeball];

let difficulties = {
    easy: {
        numCardsX: 3,
        numCardsY: 4,
        timeLimit: 30,
    },
    medium: {
        numCardsX: 4,
        numCardsY: 5,
        timeLimit: 60,
    },
    hard: {
        numCardsX: 5,
        numCardsY: 6,
        timeLimit: 90,
    },
};
let currentDifficulty = "easy";
let getCurrentDifficulty = () => difficulties[currentDifficulty];
let getPairCount = () => (getCurrentDifficulty().numCardsX * getCurrentDifficulty().numCardsY) / 2;

//#region Initialize
initializeGame();
async function initializeGame() {
    await initializePixiApp();
    pokemonNames = await loadPokemonNames(pokemonMax);
    pokeballTextures = await loadPokeballTextures();
    tileset = await loadTileset();
    await initializeGameContainer();
    await loadBackground();
    registerUIEventListeners();
    showPokeballSelector();
    showDialogue("ready-to-start-dialogue");
    gameState.state = gameStates.readyToStart;
}

async function initializePixiApp() {
    app = new Application();
    globalThis.__PIXI_APP__ = app;
    await app.init({ background: "#70c8a0", resizeTo: window });
    document.getElementById("pixi-container").appendChild(app.canvas);
}

async function loadPokemonNames(count) {
    let response = await fetch(`https://pokeapi.co/api/v2/pokemon?offset=0&limit=${count}`);
    let json = await response.json();
    return json.results.map((pokemon) => pokemon.name);
}

async function loadPokeballTextures() {
    const sheet = await Assets.load("/assets/pokeballs.json");

    for (let texture of Object.values(sheet.textures)) {
        texture.source.scaleMode = "nearest";
    }
    return {
        pokeball: sheet.animations.pokeball,
        greatball: sheet.animations.greatball,
        ultraball: sheet.animations.ultraball,
        masterball: sheet.animations.masterball,
    };
}

async function loadTileset() {
    const sheet = await Assets.load("/assets/tileset.json");
    for (let texture of Object.values(sheet.textures)) {
        texture.source.scaleMode = "nearest";
    }
    return sheet;
}

async function initializeGameContainer() {
    let { numCardsX, numCardsY } = getCurrentDifficulty();
    gameContainer = new Container();
    gameContainer.label = "Game Container";
    app.stage.addChild(gameContainer);
    await loadCards(numCardsX, numCardsY);
    app.renderer.on("resize", positionGameContainer);
}

function positionGameContainer() {
    const scaleFactor = 0.5;
    let { numCardsX, numCardsY } = getCurrentDifficulty();
    //this is some quirky Pixi.js magic.
    //I bashed my head against it until I figured out how to center the pivot.
    let x = (numCardsX * cardSize) / 2 - cardSize * 0.5;
    let y = (numCardsY * cardSize) / 2 - cardSize * 0.5;
    gameContainer.pivot.set(x, y);
    gameContainer.height = app.renderer.height * scaleFactor;
    gameContainer.scale.x = gameContainer.scale.y;
    gameContainer.position.set(app.renderer.width / 2, app.renderer.height / 2 + 140);
}

async function loadCards(width, height) {
    cards = [];
    if (gameContainer) {
        gameContainer.removeChildren();
    }
    if ((width * height) % 2 != 0) {
        throw new Error("The number of cards must be even.");
    }
    let grassTexture = tileset.animations.tallgrass;

    const spriteWidth = 24;
    const spriteHeight = 24;
    const container = new Container();
    container.label = "Card Container";

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const card = new Card(grassTexture);
            card.x = x * spriteWidth;
            card.y = y * spriteHeight;
            container.addChild(card.container);
            cards.push(card);
        }
    }
    gameContainer.addChild(container);
    positionGameContainer();

    // assignPokemonToCards();
}

function loadBackground() {
    backgroundContainer = new Container();
    backgroundContainer.label = "Background Container";
    app.stage.addChild(backgroundContainer);
    backgroundContainer.zIndex = -1;
    function setTile(object, x, y) {
        object.x = x * tileSize;
        object.y = y * tileSize;
    }
    let groundTiles = [
        tileset.textures.grass_1,
        tileset.textures.grass_2,
        tileset.textures.grass_3,
        tileset.textures.grass_4,
    ];
    random.use("grass-seed");
    for (let x = 0; x < 30; x++) {
        for (let y = 0; y < 24; y++) {
            let texture = groundTiles[random.int(0, 3)];
            const tile = new Sprite(texture);
            backgroundContainer.addChild(tile);
            setTile(tile, x, y);
        }
    }
    backgroundContainer.cacheAsTexture({ antialias: false, resolution: 4 });
    backgroundContainer.pivot.set(backgroundContainer.width / 2, backgroundContainer.height / 2);
    positionBackgroundContainer();
    app.renderer.on("resize", positionBackgroundContainer);
}

function positionBackgroundContainer() {
    backgroundContainer.position.set(app.screen.width / 2, app.screen.height / 2);
    backgroundContainer.scale.set(gameContainer.scale.x, gameContainer.scale.y);
}

function registerUIEventListeners() {
    document.addEventListener("click", (event) => {
        const executeOnMatch = (selector, callback) => {
            if (event.target.closest(selector)) {
                callback(event.target);
            }
        };

        executeOnMatch(".start-button", startGame);
        executeOnMatch(".difficulty-button", selectDifficulty);
    });
}

function showPokeballSelector() {
    if (!pokeballTextures) return;
    if (app.stage.getChildByName("PokeballSelector")) {
        app.stage.removeChild(app.stage.getChildByName("PokeballSelector"));
    }

    const selectorContainer = new Container();
    selectorContainer.label = "PokeballSelector";
    selectorContainer.zIndex = 1000;

    const pokeballKeys = Object.keys(pokeballTextures);
    const spacing = 16;
    const yOffset = 60;
    let selectedIndex = pokeballKeys.indexOf(currentPokeball);
    let spriteWidth;

    pokeballKeys.forEach((key, i) => {
        const sprite = new Sprite(pokeballTextures[key][0]);
        sprite.interactive = true;
        sprite.anchor.set(0.5, 0.5);
        sprite.x = i * spacing;
        sprite.y = 0;
        spriteWidth = sprite.width;
        let saturationFilter = new ColorMatrixFilter();
        let alphaFilter = new AlphaFilter();
        saturationFilter.saturate(-0.75);
        alphaFilter.alpha = 0.75;
        let filters = [saturationFilter, alphaFilter];
        if (i !== selectedIndex) {
            sprite.filters = filters;
        }

        sprite.on("pointerdown", () => {
            console.log("pokeball selected: " + key);
            currentPokeball = key;
            selectorContainer.children.forEach((child, idx) => {
                child.filters = idx === i ? [] : filters;
            });
        });
        selectorContainer.addChild(sprite);
    });

    selectorContainer.pivot.x = selectorContainer.width / 2 - spriteWidth / 2;
    selectorContainer.pivot.y = selectorContainer.height / 2 - spriteWidth / 2;

    setPokeballSelectorScale = () => {
        selectorContainer.scale.set(gameContainer.scale.x, gameContainer.scale.y);
        selectorContainer.x = app.renderer.width / 2;
        selectorContainer.y = app.renderer.height - yOffset;
    };
    setPokeballSelectorScale();
    app.stage.addChild(selectorContainer);

    app.renderer.on("resize", setPokeballSelectorScale);
}

let setPokeballSelectorScale;
// #endregion

async function startGame() {
    console.log("starting game");
    showDialogue("loading-dialogue");
    document.querySelector("#gameover-message").innerHTML = "";
    stopTimer();
    let { numCardsX, numCardsY } = getCurrentDifficulty();
    await loadCards(numCardsX, numCardsY);
    await assignPokemonToCards();
    showDialogue("gameplay-dialogue");
    startTimer(getCurrentDifficulty().timeLimit);
    remainingMatches = getPairCount();
    consecutiveMatches = 0;
    updateMatches();
    gameState.state = gameStates.guessing;
}

async function endGame(message) {
    gameState.state = gameStates.readyToStart;
    stopTimer();
    showDialogue("ready-to-start-dialogue");
    document.querySelector("#gameover-message").innerHTML = message;
}

async function assignPokemonToCards() {
    let pokemonTextures = await loadPokemonTextures(cards.length / 2);

    pokemonTextures = pokemonTextures.map((texture, id) => ({ texture, id }));
    pokemonTextures = [...pokemonTextures, ...pokemonTextures];
    for (let card of cards) {
        let randomIndex = Math.floor(Math.random() * pokemonTextures.length);
        let randomTexture = pokemonTextures[randomIndex];
        pokemonTextures.splice(randomIndex, 1);
        card.assignPokemonToCard(randomTexture);
    }
    console.log("pokemon loaded");
}

async function loadPokemonTextures(count) {
    let numbers = [];
    while (numbers.length < count) {
        const randInt = Math.floor(Math.random() * pokemonMax);
        if (!numbers.includes(randInt)) {
            numbers.push(randInt);
        }
    }
    let pokemonImages = await Promise.all(
        numbers.map((num) => fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonNames[num]}`))
    );

    pokemonImages = await Promise.all(pokemonImages.map((response) => response.json()));
    pokemonImages = pokemonImages.map(
        (pokemonData) => pokemonData.sprites.versions["generation-vii"].icons.front_default
    );

    // --- Fast Version ---
    // let pokemonTextures = await Promise.all(pokemonImages.map(image => Assets.load(image)));
    // pokemonTextures.forEach(texture => texture.source.scaleMode = 'nearest');
    // return pokemonTextures;
    return loadPokemonTexturesThrottled(pokemonImages);
}

//This code was querying the github endpoint too hard and causing it to reject my connections.
//I wrote loadPokemonTexturesThrottled to slow down the queries slightly.
async function loadPokemonTexturesThrottled(pokemonImages) {
    const pokemonTextures = [];
    for (const image of pokemonImages) {
        try {
            const texture = await Assets.load(image);
            texture.source.scaleMode = "nearest";
            pokemonTextures.push(texture);
            //add a small delay to be polite to the server
            await new Promise((res) => setTimeout(res, 100));
        } catch (e) {
            console.warn(`Failed to load image: ${image}`, e);
            showDialogue("error-dialogue");
        }
    }
    return pokemonTextures;
}

export function onWrongGuess() {
    consecutiveMatches = 0;
}

export function onMatch() {
    remainingMatches--;
    consecutiveMatches++;
    if (consecutiveMatches >= 2) {
      //powerup
        increaseTimer(5);
    }
    updateMatches();

    if (remainingMatches <= 0) {
        endGame("Victory!");
    }
}

function increaseTimer(seconds) {
    timer.elapsedSeconds = Math.max(0, timer.elapsedSeconds - seconds);
    timer.elapsedMS = timer.elapsedSeconds * 1000;

    let timerElement = document.querySelector("#timer");
    timerElement.innerHTML = timer.startValue - timer.elapsedSeconds;
    timerElement.classList.add("animate__animated", "animate__tada");
    timerElement.addEventListener(
        "animationend",
        () => timerElement.classList.remove("animate__animated", "animate__tada"),
        { once: true }
    );
}

function startTimer(seconds) {
    stopTimer();
    let timerElement = document.querySelector("#timer");
    timerElement.innerHTML = seconds;
    console.log("starting timer");
    timer = function () {
        timer.elapsedMS += Ticker.shared.elapsedMS;
        if (timer.elapsedMS / 1000 > timer.elapsedSeconds + 1) {
            timer.elapsedSeconds++;
            timerElement.innerHTML = seconds - timer.elapsedSeconds;
        }
        if (timer.elapsedSeconds >= seconds) {
            stopTimer();
            endGame("Game Over");
        }
    };
    timer.startValue = seconds;
    timer.elapsedMS = 0;
    timer.elapsedSeconds = 0;
    Ticker.shared.add(timer);
}

function stopTimer() {
    if (timer) {
        Ticker.shared.remove(timer);
    }
    timer = null;
}

export function incrementClicks() {
    let countElement = document.querySelector("#click-count");
    let currentClicks = Number(countElement.innerHTML);
    countElement.innerHTML = ++currentClicks;
}

function updateMatches() {
    let pairCount = getPairCount();
    console.log("pair count: " + pairCount);
    let currentMatchElement = document.querySelector("#current-matches");
    let remainingMatchElement = document.querySelector("#remaining-matches");
    currentMatchElement.innerHTML = pairCount - remainingMatches;
    remainingMatchElement.innerHTML = remainingMatches;
}

async function selectDifficulty(target) {
    target = target.closest(".difficulty-button");
    document.querySelectorAll(".difficulty-button").forEach((b) => b.classList.remove("selected"));
    target.classList.add("selected");
    currentDifficulty = target.dataset.name;
    let { numCardsX, numCardsY } = getCurrentDifficulty();
    await loadCards(numCardsX, numCardsY);
    positionBackgroundContainer();
    setPokeballSelectorScale();
}

function showDialogue(id){
  let dialogues = document.querySelectorAll(".dialogue");
  for(let dialogue of dialogues){
    if(!(dialogue.id == id)){
      dialogue.classList.add("hidden");
    }
    else{
      dialogue.classList.remove("hidden");
    }
  }
}