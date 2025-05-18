import { Sprite, AnimatedSprite, Container } from "pixi.js";

export default class Card {
    constructor(grassTexture) {
        this.container = new Container();
        this.container.label = "Card";

        this.grassSprite = new AnimatedSprite(grassTexture);
        this.container.addChild(this.grassSprite);
        this.grassSprite.anchor.set(0.5);
        this.grassSprite.gotoAndStop(0);
        this.grassSprite.label = "Grass Sprite";
    }

    assignPokemonToCard(pokemonTexture) {
        this.pokemonSprite = new Sprite(pokemonTexture);
        this.container.addChild(this.pokemonSprite);
        this.pokemonSprite.anchor.set(0.5);
        this.pokemonSprite.x = this.container.x;
        this.pokemonSprite.label = "Pokemon Sprite";
        // this.pokemonSprite.visible = false;
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
