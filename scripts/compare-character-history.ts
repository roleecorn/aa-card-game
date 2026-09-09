import sharp from 'sharp';
import fs from 'node:fs/promises';

const ids = ['pintbox','mashiro','user79','narrator','ginsakura','bluewind'] as const;
const label = (text:string, width:number, height:number) => Buffer.from(
  `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="white"/>
    <text x="20" y="42" font-size="28" font-family="sans-serif" fill="black">${text}</text>
  </svg>`
);

const cellW=420, imageH=560, labelH=60, cellH=imageH+labelH;
const canvas=sharp({create:{width:cellW*2,height:cellH*ids.length,channels:4,background:{r:240,g:240,b:240,alpha:1}}});
const composites:any[]=[];

for(let row=0;row<ids.length;row++){
  const id=ids[row];
  for(const [col,kind] of [['initial','initial'],['replaced','replaced']] as const){
    const path=`/tmp/${id}-${kind}.webp`;
    const img=await sharp(path).resize(cellW,imageH,{fit:'contain',background:{r:255,g:255,b:255,alpha:1}}).png().toBuffer();
    composites.push({input:img,left:(col==='initial'?0:cellW),top:row*cellH+labelH});
    composites.push({input:label(`${id} — ${col}`,cellW,labelH),left:(col==='initial'?0:cellW),top:row*cellH});
  }
}
await canvas.composite(composites).png().toFile('/tmp/character-history-comparison.png');
