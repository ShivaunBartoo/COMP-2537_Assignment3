import { Sprite, AnimatedSprite, Container, Graphics, Ticker } from "pixi.js";
import { getCurrentPokeball, gameState, gameStates, incrementClicks, onMatch, onWrongGuess } from "./main";

export default class Card {
    constructor(grassTexture) {
        this.flipped = false;
        this.container = new Container();
        this.container.label = "Card";

        this.grassAnimation = new AnimatedSprite(grassTexture);
        this.grassAnimation.anchor.set(0.5);
        this.grassAnimation.gotoAndStop(0);
        this.grassAnimation.loop = false;
        this.grassAnimation.label = "Grass Animation";
        this.grassAnimation.zIndex = 2;
        this.grassAnimation.animationSpeed = 0.1666;
        this.grassAnimation.visible = false;
        this.grassAnimation.onFrameChange = () => {
            if (this.grassAnimation.currentFrame == this.grassAnimation.totalFrames - 1) {
                this.grassAnimation.visible = false;
            }
        };
        this.container.addChild(this.grassAnimation);

        this.grassSprite = new Sprite(grassTexture[0]);
        this.container.addChild(this.grassSprite);
        this.grassSprite.anchor.set(0.5);
        this.grassSprite.label = "Grass Sprite";

        this.setupEvents();
    }

    assignPokemonToCard(pokemonTexture) {
        this.id = pokemonTexture.id;
        this.pokemonContainer = new Container();
        this.container.addChild(this.pokemonContainer);
        this.pokemonContainer.label = "Pokemon Container";
        this.mask = new Graphics().rect(0, 0, this.container.width * 3, this.container.height * 2).fill("red");
        this.mask.label = "mask";
        this.mask.pivot.set(this.mask.width / 2, this.mask.height);
        this.mask.y += this.container.height / 2;
        this.pokemonContainer.mask = this.mask;
        this.pokemonContainer.addChild(this.mask);
        this.pokemonSprite = new Sprite(pokemonTexture.texture);
        this.pokemonContainer.addChild(this.pokemonSprite);
        this.pokemonSprite.anchor = (0.5, 0.5);
        this.pokemonSprite.zIndex = 1;

        this.pokemonSprite.anchor.set(0.5);
        this.pokemonSprite.label = "Pokemon Sprite";
        this.pokemonSprite.visible = false;
    }

    setupEvents() {
        this.container.eventMode = "static";
        this.container.on("click", (event) => clickEvent(event));
        this.container.on("touchend", (event) => clickEvent(event));
        const clickEvent = () => {
            switch (gameState.state) {
                case "initializing":
                    console.log("cannot reveal. Pokemon are not yet loaded.");
                    break;
                case "readyToStart":
                    console.log("cannot reveal. Game has not started.");
                    break;
                case "guessing":
                    if (!this.flipped) {
                        this.revealPokemon();
                    } else {
                        console.log("cannot reveal. Already flipped.");
                    }
                    break;
                case "revealing":
                    console.log("cannot reveal. Already revealing.");
                    break;
            }
        };
    }

    async revealPokemon() {
        incrementClicks();
        this.flipped = true;
        gameState.state = gameStates.revealing;
        this.playGrassAnimation();
        await this.playPokemonJump(150);
        if (!gameState.flippedCard) {
            gameState.flippedCard = this;
            if (gameState.state != gameStates.readyToStart) {
                gameState.state = gameStates.guessing;
            }
        } else if (this.id == gameState.flippedCard.id) {
            console.log("match!");
            onMatch();
            this.capturePokemon();
            gameState.flippedCard.capturePokemon();
            gameState.flippedCard = null;
            if (gameState.state != gameStates.readyToStart) {
                gameState.state = gameStates.guessing;
            }
        } else {
            setTimeout(() => {
                onWrongGuess();
                this.reset();
                gameState.flippedCard.reset();
                gameState.flippedCard = null;
                if (gameState.state != gameStates.readyToStart) {
                    gameState.state = gameStates.guessing;
                }
            }, 200);
        }
    }

    playGrassAnimation() {
        this.grassAnimation.visible = true;
        this.grassAnimation.gotoAndStop(1);
        setTimeout(() => {
            this.grassAnimation.play();
        }, 50);
    }

    async playPokemonJump(delay) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        this.pokemonSprite.visible = true;
        this.pokemonSprite.alpha = 1;
        this.jumpTime = 0;
        const jumpHeight = 12; // pixels
        const landHeight = -6;
        const maxHeight = (jumpHeight - 1) * -1; // pixels
        const jumpSpeed = 0.1; // radians per frame
        this.pokemonSprite._baseY = this.pokemonSprite.y;

        if (this._jumpTicker) {
            Ticker.shared.remove(this._jumpTicker);
            this._jumpTicker = null;
        }

        this.falling = false;

        await new Promise((resolve) => {
            this._jumpTicker = () => {
                this.jumpTime += jumpSpeed;
                this.pokemonSprite.y =
                    this.pokemonSprite._baseY - Math.floor(Math.abs(Math.sin(this.jumpTime) * jumpHeight));
                if (this.pokemonSprite.y == maxHeight) {
                    this.falling = true;
                }
                if (this.falling && this.pokemonSprite.y == landHeight) {
                    Ticker.shared.remove(this._jumpTicker);
                    this._jumpTicker = null;
                    this.falling = false;
                    resolve();
                }
            };
            Ticker.shared.add(this._jumpTicker);
        });
    }

    async reset() {
        this.pokemonSprite.visible = true;
        this.pokemonSprite.alpha = 1;
        this.pokemonSprite._baseY = this.pokemonSprite.y;
        const amplitude = 16; // how high to pop up
        const jumpSpeed = 0.08; // radians per frame
        const offset = 4;
        const fadeSpeed = 0.1;
        if (this._popTicker) {
            Ticker.shared.remove(this._popTicker);
            this._popTicker = null;
        }
        this.falling = false;
        this.popTime = 0;
        await new Promise((resolve) => {
            this._popTicker = () => {
                this.popTime += jumpSpeed;
                let yPrev = this.pokemonSprite.y;
                this.pokemonSprite.y =
                    -1 *
                    Math.floor(
                        Math.sin(this.popTime + Math.asin(((this.pokemonSprite._baseY - offset) * -1) / amplitude)) *
                            amplitude -
                            offset
                    );
                if (yPrev < this.pokemonSprite.y) {
                    if (!this.falling) {
                        this.falling = true;
                        this.grassAnimation.visible = true;
                        this.grassAnimation.gotoAndPlay(2);
                    }
                    this.pokemonSprite.alpha -= fadeSpeed;
                } else if (this.pokemonSprite.y >= amplitude - offset) {
                    Ticker.shared.remove(this._popTicker);
                    this._popTicker = null;
                    this.falling = false;
                    this.flipped = false;
                    this.pokemonSprite.y = 0;
                    resolve();
                }
            };
            Ticker.shared.add(this._popTicker);
        });
    }

    async capturePokemon() {
        this.pokeball = new AnimatedSprite(getCurrentPokeball());
        this.pokeball.anchor.set(0.5, 0.5);
        this.container.addChild(this.pokeball);
        this.pokemonContainer.zIndex = 4;

        this.pokeball.gotoAndStop(0);

        // Animate pokeball scaling up to full size
        this.pokeball.scale.set(0, 0);
        await new Promise((resolve) => {
            const growRate = 0.1;
            let currentScale = 0;
            this._pokeballGrowTicker = () => {
                currentScale += growRate;
                if (currentScale >= 1) {
                    currentScale = 1;
                    this.pokeball.scale.set(currentScale, currentScale);
                    Ticker.shared.remove(this._pokeballGrowTicker);
                    this._pokeballGrowTicker = null;
                    resolve();
                } else {
                    this.pokeball.scale.set(currentScale, currentScale);
                }
            };
            Ticker.shared.add(this._pokeballGrowTicker);
        });

        this.pokeball.gotoAndStop(9);
        await new Promise((resolve) => {
            const shrinkRate = 0.05;
            let currentScale = 1;
            this._captureTicker = () => {
                this.pokemonSprite.scale.set(currentScale, currentScale);
                currentScale -= shrinkRate;
                if (this.pokemonSprite.y < 0) {
                    this.pokemonSprite.y += 0.5;
                }
                if (currentScale <= 0) {
                    this.pokemonSprite.visible = false;
                    Ticker.shared.remove(this._captureTicker);
                    this._captureTicker = null;
                    resolve();
                }
            };
            Ticker.shared.add(this._captureTicker);
        });
        this.pokeball.animationSpeed = 0.5;
        this.pokeball.onFrameChange = () => {
            if (this.pokeball.currentFrame == 7) {
                if (this.pokeball.animationSpeed < 0.35) {
                    this.pokeball.gotoAndStop(8);
                    setTimeout(() => this.pokeball.gotoAndStop(0), 300);
                } else {
                    this.pokeball.animationSpeed -= 0.1;
                    this.pokeball.gotoAndPlay(0);
                }
            }
        };
        this.pokeball.gotoAndPlay(0);
    }

    get x() {
        return this.container.x;
    }

    set x(value) {
        this.container.x = value;
    }

    get y() {
        return this.container.y;
    }

    set y(value) {
        this.container.y = value;
    }
}
