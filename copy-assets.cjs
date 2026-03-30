const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'Explore – Vista Reels_files');
const DEST = path.join(__dirname, 'public', 'assets');

function cp(src, dest) {
  const dir = path.dirname(dest);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(src, dest);
}

// SVGs and logos
['Group-22.svg','Group-4-1.svg','Group-4.svg','Group-9076-2.svg','Group-9577.svg',
 'Vector-40.svg','Link.svg','Link-1.svg','Link-2.svg',
 'hero-backdrop-1.png','hero-backdrop-2.png','hero-backdrop-3.png'
].forEach(f => {
  const s = path.join(SRC, f);
  if (fs.existsSync(s)) cp(s, path.join(DEST, f));
});

// Features
['all_in_one_place-comp.png','one_search-comp-2.png','one_watchlist-comp.png'].forEach(f => {
  const s = path.join(SRC, f);
  if (fs.existsSync(s)) cp(s, path.join(DEST, 'features', f));
});

// Providers
['d94dafd6f62ba00a07a7d5a51a01f49aa57e66b8.png','fdecad6007515e6cb05b264e157182d1d6c33216.png',
 'Mask-group-4.png','Mask-group-5.png','Mask-group-6.png','Frame-1000003932-1.png',
 'adf8feccf3df33cdaa1500ea0b9939196709838e.png','b9374b1d26f2762033cb948e5fa646739036e549.png',
 'Mask-group-12.png','Mask-group.png'
].forEach(f => {
  const s = path.join(SRC, f);
  if (fs.existsSync(s)) cp(s, path.join(DEST, 'providers', f));
});

// Posters (all .jpg)
const files = fs.readdirSync(SRC).filter(f => f.endsWith('.jpg'));
files.forEach(f => {
  cp(path.join(SRC, f), path.join(DEST, 'posters', f));
});

console.log(`Copied ${files.length} posters + logos + features + providers`);
