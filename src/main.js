import { Sprite, Application, Assets, Container } from "pixi.js";
import Card from "./card.js";
import random from "random";

let app;
let tileset;
let pokemonNames;
let pokeballTextures;
let gameContainer;

const cardSize = 24;
const tileSize = 16;
let cardsXWidth = 3;
let cardsYWidth = 4;
const pokemonMax = 151;

let cards = [];

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

let currentPokeball = "pokeball";
export let getCurrentPokeball = () => {
    switch (currentPokeball) {
        case "pokeball":
            return pokeballTextures.pokeball;
        case "greatball":
            return pokeballTextures.greatball;
        case "ultraball":
            return pokeballTextures.ultraball;
        case "masterball":
            return pokeballTextures.masterball;
    }
};

//#region Initialize
initializeGame();
async function initializeGame() {
    await initializePixiApp();
    pokemonNames = await loadPokemonNames(pokemonMax);
    pokeballTextures = await loadPokeballTextures();
    tileset = await loadTileset();
    gameContainer = await initializeGameContainer();
    loadBackground();
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
    const container = new Container();
    container.label = "Game Container";
    app.stage.addChild(container);
    await loadCards(container, cardsXWidth, cardsYWidth);
    const scaleFactor = 0.5;
    //this is some quirky Pixi.js magic.
    //I bashed my head against it until I figured out how to center the pivot.
    let x = (cardsXWidth * cardSize) / 2 - cardSize * 0.5;
    let y = (cardsYWidth * cardSize) / 2 - cardSize * 0.5;
    container.pivot.set(x, y);
    container.position.set(app.renderer.width / 2, app.renderer.height / 2);
    const scale = () => {
        container.height = app.renderer.height * scaleFactor;
        container.scale.x = container.scale.y;
        container.position.set(app.renderer.width / 2, app.renderer.height / 2);
    };
    app.renderer.on("resize", scale);
    scale();
    return container;
}

async function loadCards(gameContainer, width, height) {
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
    // assignPokemonToCards();
}

function loadBackground() {
    const container = new Container();
    container.label = "Background Container";
    app.stage.addChild(container);
    container.zIndex = -1;
    //draw background
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
            container.addChild(tile);
            setTile(tile, x, y);
        }
    }
    container.cacheAsTexture({ antialias: false, resolution: 4 });
    //position background
    container.pivot.set(container.width / 2, container.height / 2);
    function useGameScale() {
        container.position.set(app.screen.width / 2, app.screen.height / 2);
        container.scale.set(gameContainer.scale.x, gameContainer.scale.y);
    }
    useGameScale();
    app.renderer.on("resize", useGameScale);
    return container;
}
// #endregion

async function startGame() {
    await assignPokemonToCards();
    gameState.state = gameStates.guessing;
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
    //This code was querying the github endpoint too hard and causing it to reject my connections.
    //I wrote loadPokemonTexturesThrottled to slow down the queries slightly.
    // --- Fast Version ---
    // let pokemonTextures = await Promise.all(pokemonImages.map(image => Assets.load(image)));
    // pokemonTextures.forEach(texture => texture.source.scaleMode = 'nearest');
    // return pokemonTextures;
    return loadPokemonTexturesThrottled(pokemonImages);
}

async function loadPokemonTexturesThrottled(pokemonImages) {
    const pokemonTextures = [];
    for (const image of pokemonImages) {
        try {
            const texture = await Assets.load(image);
            texture.source.scaleMode = "nearest";
            pokemonTextures.push(texture);
            //add a small delay to be polite to the server
            await new Promise((res) => setTimeout(res, 500));
        } catch (e) {
            console.warn(`Failed to load image: ${image}`, e);
        }
    }
    return pokemonTextures;
}
