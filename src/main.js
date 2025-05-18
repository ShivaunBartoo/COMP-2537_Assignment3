import { AnimatedSprite, Sprite, Application, Assets, Container } from "pixi.js";
import Card from "./card.js";
import random from "random";

const app = await initializeApplication();

const cardSize = 24;
const tileSize = 16;
let cardsXWidth = 3;
let cardsYWidth = 4;
const pokemonMax = 151;
const pokemonNames = await loadPokemonNames(pokemonMax);
const pokeballTextures = await loadPokeballTextures();
let currentPokeball = "pokeball";
let getCurrentPokeball = () => {
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

await loadPokeballTextures();
const tileset = await loadTileset();
const gameContainer = initializeGameContainer();
// const backgroundContainer = loadBackground();
// drawBackground();
let cards = [];
loadCards(cardsXWidth, cardsYWidth);

positionGameContainer();

function getGameScale() {
    return gameContainer.scale.y;
}

async function initializeApplication() {
    const app = new Application();
    globalThis.__PIXI_APP__ = app;
    await app.init({ background: "#70c8a0", resizeTo: window });
    document.getElementById("pixi-container").appendChild(app.canvas);
    return app;
}

-0.15

function initializeGameContainer() {
    const container = new Container();
    container.label = "Game Container";
    app.stage.addChild(container);
    // container.position.set(app.renderer.width / 2, app.renderer.height / 2);


    // Position the container in the center of the screen

    return container;
}

function positionGameContainer(){
    console.log("width: " +gameContainer.width);
    let x = ((cardsXWidth * cardSize / 2) - (cardSize * 0.5));
    let y = ((cardsYWidth * cardSize / 2) - (cardSize * 0.5));
    console.log(x + ", " + y)
    gameContainer.pivot.set(x, y );
    gameContainer.position.set(app.renderer.width / 2, app.renderer.height / 2);
        const scale = () => {
        // const scale = app.screen.width / 300;

        // gameContainer.scale = scale;
        gameContainer.height = app.renderer.height * 0.5;
        console.log(gameContainer.scale.x);
        gameContainer.scale.x = gameContainer.scale.y;
                // gameContainer.scale.x = gameContainer.scale.y;

            gameContainer.position.set(app.renderer.width / 2, app.renderer.height / 2);

    };
    app.renderer.on("resize", scale);
    scale();

}

async function loadCards(width, height) {
    if ((width * height) % 2 != 0) {
        throw new Error("The number of cards must be even.");
    }
    let grassTexture = tileset.animations.tallgrass;
    // let pokeballTexture = getCurrentPokeball();

    const spriteWidth = 24;
    const spriteHeight = 24;
    const container = new Container();
    container.label = "Card Container";

    //add cards to the container
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const card = new Card(grassTexture);
            card.x = x * spriteWidth;
            card.y = y * spriteHeight;
            container.addChild(card.container);
            cards.push(card);
        }
    }

    //center the container in its parent container
    // container.pivot.set(container.width / 2, container.height / 2);
    // container.position.set(0, 0);
    gameContainer.addChild(container);
    // assignPokemonToCards();
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
}

async function loadPokemonNames(count) {
    let response = await fetch(`https://pokeapi.co/api/v2/pokemon?offset=0&limit=${count}`);
    let json = await response.json();
    return json.results.map((pokemon) => pokemon.name);
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
            // Optionally add a small delay to be polite to the server
            await new Promise((res) => setTimeout(res, 100));
        } catch (e) {
            console.warn(`Failed to load image: ${image}`, e);
        }
    }
    return pokemonTextures;
}

async function loadPokeballTextures() {
    const sheet = await Assets.load("./public/assets/pokeballs.json");

    for (let texture of Object.values(sheet.textures)) {
        texture.source.scaleMode = "nearest";
    }
    return {
        pokeball: sheet.animations.pokeball,
        greatball: sheet.animations.greatball,
        ultraball: sheet.animations.ultraball,
        masterball: sheet.animations.masterball,
    };
    //   const anim = new AnimatedSprite(sheet.animations.pokeball);
    // anim.animationSpeed = 0.1666;
    // anim.x = app.screen.width / 2;
    // anim.y = app.screen.height / 2;
    // anim.scale = 4;
    // anim.play();
    // app.stage.addChild(anim);
}

async function loadTileset() {
    const sheet = await Assets.load("./public/assets/tileset.json");
    for (let texture of Object.values(sheet.textures)) {
        texture.source.scaleMode = "nearest";
    }
    return sheet;
}

function loadBackground() {
    const container = new Container();
    container.label = "Background Container";
    container.pivot.set(0.5, 0.5);
    // container.position.set(app.screen.width / 2 / getGameScale(), app.screen.height / 2 / getGameScale());
    gameContainer.addChild(container);
    container.zIndex = -1;
    let resizeTimeout;

    // window.addEventListener("resize", () => {
    //     clearTimeout(resizeTimeout);

    //     resizeTimeout = setTimeout(() => {
    //         drawBackground();
    //     }, 200);
    // });
    return container;
}

function drawBackground() {
    let groundTiles = [
        tileset.textures.grass_1,
        tileset.textures.grass_2,
        tileset.textures.grass_3,
        tileset.textures.grass_4,
    ];
    random.use("grass-seed");
    backgroundContainer.removeChildren();

    let xCount = Math.floor(app.screen.width / (tileSize * getGameScale())) + 6;
    let yCount = Math.floor(app.screen.height / (tileSize * getGameScale())) + 6;
    // console.log(`xCount ${xCount} yCount ${yCount}`);
    for (let x = 0; x < xCount; x++) {
        for (let y = 0; y < yCount; y++) {
            let texture = groundTiles[random.int(0, 3)];
            const tile = new Sprite(texture);
            backgroundContainer.addChild(tile);
            setTile(tile, x, y);
        }
    }
    backgroundContainer.cacheAsTexture({ antialias: false, resolution: 4 });

    // console.log("num children in bg: " + backgroundContainer.children.length);
}

async function setTile(object, x, y) {
    object.x = x * tileSize;
    object.y = y * tileSize;
}
