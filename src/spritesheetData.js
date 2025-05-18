import { writeFile } from 'fs/promises';

const frameWidth = 16;
const frameHeight = 16;
const sheetWidth = 64;
const sheetHeight = 168;

const cols = sheetWidth / frameWidth; 
const rows = Math.floor(sheetHeight / frameHeight);

const frames = {};
const animations = {};
const animNames = ['masterball', 'ultraball', 'greatball', 'pokeball'];

for (let col = 0; col < cols; col++) {
  const animName = `${animNames[col]}`;
  animations[animName] = [];

  for (let row = 0; row < rows; row++) {
      const frameName = `${animName}_${row}`;
      const x = col * frameWidth;
      const y = row * frameHeight;
      // console.log(row);
      const rowHeight = row != 9 ? frameHeight : 24;
      frames[frameName] = {
          frame: { x, y, w: frameWidth, h: rowHeight }, //last sprite is taller
          anchor: { x: 0.5, y: 1 },
      };

      animations[animName].push(frameName);
  }
}

const json = {
  frames,
  animations,
  meta: {
    image: "pokeballs_cropped.png",
    size: { w: sheetWidth, h: sheetHeight }
  }
};

await writeFile('./public/assets/pokeballs.json', JSON.stringify(json, null, 2));
