// The playing cards in TWENTY-ONE and HIGHER OR LOWER (QA UI-09, 2026-11-09: the diamond read as a plus, the club as a
// plane, a Jack was a letter and a pip). Literal fill rows; build-art.mjs keeps them unoutlined (pips) or adds the 1px
// outline (the court figures). Suits: hearts and diamonds in R (r shadow, W gloss), clubs and spades in P (p sheen).
// The court is the casino's: THE DEALER's green eyeshade on the Jack, a tiara and pearls on the Queen, a crown, ermine
// and a chip on a chain on the King.

// Index pips (9x9, drawn at 3 px a pixel on a full-size card): under the rank in the card's corner.
const PIP_S = {
  pipHeartS: [
    '.RR...RR.',
    'RWRR.RRRR',
    'RWRRRRRRR',
    'RRRRRRRRr',
    'RRRRRRRRr',
    '.RRRRRRr.',
    '..RRRRr..',
    '...RRr...',
    '....r....',
  ],
  pipDiamondS: [
    '....R....',
    '...RRR...',
    '..RWRRR..',
    '.RWRRRRR.',
    'RRRRRRRRr',
    '.RRRRRRr.',
    '..RRRRr..',
    '...RRr...',
    '....r....',
  ],
  pipClubS: [
    '...PPP...',
    '..PpPPP..',
    '..PPPPP..',
    '...PPP...',
    '.PP.P.PP.',
    'PPPPPPPPP',
    'PPPPPPPPP',
    '.PP.P.PP.',
    '...PPP...',
  ],
  pipSpadeS: [
    '....P....',
    '...PPP...',
    '..PpPPP..',
    '.PpPPPPP.',
    'PPPPPPPPP',
    'PPPPPPPPP',
    '.PP.P.PP.',
    '....P....',
    '...PPP...',
  ],
};

// Centre pips (13x13, 4 px a pixel; the ace's at 6).
const PIP_L = {
  pipHeartL: [
    '.............',
    '..RRR...RRR..',
    '.RWWRR.RRRRR.',
    'RWWRRRRRRRRRR',
    'RWRRRRRRRRRRR',
    'RRRRRRRRRRRRr',
    'RRRRRRRRRRRRr',
    '.RRRRRRRRRRr.',
    '..RRRRRRRRr..',
    '...RRRRRRr...',
    '....RRRRr....',
    '.....RRr.....',
    '......r......',
  ],
  pipDiamondL: [
    '......R......',
    '.....RRR.....',
    '....RWRRR....',
    '...RWRRRRR...',
    '..RWRRRRRRR..',
    '.RRRRRRRRRRR.',
    'RRRRRRRRRRRRr',
    '.RRRRRRRRRRr.',
    '..RRRRRRRRr..',
    '...RRRRRRr...',
    '....RRRRr....',
    '.....RRr.....',
    '......r......',
  ],
  pipClubL: [
    '.....PPP.....',
    '....PppPP....',
    '...PPpPPPP...',
    '...PPPPPPP...',
    '....PPPPP....',
    '.PPP.PPP.PPP.',
    'PppPPPPPPPPPP',
    'PpPPPPPPPPPPP',
    'PPPPPPPPPPPPP',
    '.PPP..P..PPP.',
    '......P......',
    '.....PPP.....',
    '....PPPPP....',
  ],
  pipSpadeL: [
    '......P......',
    '.....PPP.....',
    '....PpPPP....',
    '...PpPPPPP...',
    '..PpPPPPPPP..',
    '.PpPPPPPPPPP.',
    'PPPPPPPPPPPPP',
    'PPPPPPPPPPPPP',
    'PPPPPPPPPPPPP',
    '.PPP..P..PPP.',
    '......P......',
    '.....PPP.....',
    '....PPPPP....',
  ],
};

// The court (22x30 busts, 3 px a pixel), auto-outlined. One figure per rank for every suit: the suit is the corner's.
const COURT = {
  // THE JACK: the house's dealer. Green eyeshade, slick hair, white shirt, red bow tie, black vest, a card in hand.
  faceJack: [
    '......................',
    '......................',
    '......................',
    '.......bbbbbbbb.......',
    '......bbbbbbbbbb......',
    '.....eeeeeeeeeeee.....',
    '....eEEeeeeeeeeeee....',
    '....QQQQQQQQQQQQQQ....',
    '.......FFFFFFFF.......',
    '......bFFFFFFFFb......',
    '......bFKFFFFKFb......',
    '.......FFFFFFFF.......',
    '.......FFFffFFF.......',
    '.......FFFFFFFF.......',
    '.......FFKKKKFF.......',
    '........FFFFFF........',
    '.........ffff.........',
    '......TTTRrrRTTT......',
    '....kkTTTRrrRTTTkk....',
    '...kkkkTTTTTTTTkkkk...',
    '..kkkkkkTTTTTTkkkkkk..',
    '..kPkkkkkTTTTkkkkkPk..',
    '..kPkkkkkkTTkkkkkkPk..',
    '..kPkkkkkkGGkkkkkkPk..',
    '..kPkkkkkkkkkkkkTTTT..',
    '..kPkkkkkkGGkkkkTRRT..',
    '..kPkkkkkkkkkkkkTRRT..',
    '..kPkkkkkkGGkkkkTTTT..',
    '..kPkkkkkkkkkkkkkkPk..',
    '..kkkkkkkkkkkkkkkkkk..',
  ],
  // THE QUEEN: a gold tiara with a ruby, long auburn hair, red lips, pearl earrings and necklace, a plum gown.
  faceQueen: [
    '......................',
    '..........YY..........',
    '.......Y..YY..Y.......',
    '.......YYGRRGYY.......',
    '.......gGGGGGGg.......',
    '......oooooooooo......',
    '.....ooFFFFFFFFoo.....',
    '.....oFFFFFFFFFFo.....',
    '.....oFKKFFFFKKFo.....',
    '.....oFFFFFFFFFFo.....',
    '....ooFFFFffFFFFoo....',
    '....oWFFFFFFFFFFWo....',
    '....ooFFFFRRFFFFoo....',
    '....oooFFFFFFFFooo....',
    '....oooofFFFFfoooo....',
    '....ooooofFFfooooo....',
    '....oooooFFFFooooo....',
    '....ooJVWVWVWVWVJoo...',
    '...ooJJVVVVVVVVVVJoo..',
    '...oJJVVVVVVVVVVVVJo..',
    '..JJJVVVVVVVVVVVVVVJ..',
    '..JVVVVVVVVVVVVVVVVv..',
    '..JVVVVVVVVVVVVVVVVv..',
    '..JVVVVVVVVYVVVVVVVv..',
    '..JVVVVVVVYRYVVVVVVv..',
    '..JVVVVVVVVYVVVVVVVv..',
    '..JVVVVVVVVVVVVVVVVv..',
    '..JVVVVVVVVVVVVVVVVv..',
    '..vVVVVVVVVVVVVVVVVv..',
    '..vvvvvvvvvvvvvvvvvv..',
  ],
  // THE KING: a jewelled crown, white hair and beard, a red robe with an ermine collar, a gold chain and a chip.
  faceKing: [
    '......................',
    '.....Y....YY....Y.....',
    '.....YY...YY...YY.....',
    '.....YYY.YYYY.YYY.....',
    '.....YGYYGRRGYYGY.....',
    '.....GGRGGGGGGRGG.....',
    '.....gggggggggggg.....',
    '.....LFFFFFFFFFFL.....',
    '.....LFKKFFFFKKFL.....',
    '.....LFFFFFFFFFFL.....',
    '.....LFFFFffFFFFL.....',
    '.....LFFFFFFFFFFL.....',
    '.....LLLLKKKKLLLL.....',
    '.....LLLLLLLLLLLL.....',
    '......LLLLLLLLLL......',
    '.......LLLLLLLL.......',
    '........LLLLLL........',
    '....LKLLLLLLLLLLLKL...',
    '...LLLLKLLRRRLLKLLLL..',
    '..RRRLLLLRRRRRLLLLRR..',
    '..RRRRRGRRRRRRRGRRRr..',
    '..RRRRRRGRRRRRGRRRRr..',
    '..RRRRRRRGRRRGRRRRRr..',
    '..RRRRRRRRGGGRRRRRRr..',
    '..RRRRRRRRYRYRRRRRRr..',
    '..RRRRRRRYRWRYRRRRRr..',
    '..RRRRRRRRYRYRRRRRRr..',
    '..RRRRRRRRRRRRRRRRRr..',
    '..rRRRRRRRRRRRRRRRRr..',
    '..rrrrrrrrrrrrrrrrrr..',
  ],
};

// The back (37x52, 3 px a pixel): the house's red with a gold frame and a diamond lattice around a chip.
function back() {
  const W = 37, H = 52;
  const g = Array.from({ length: H }, () => Array(W).fill('r'));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
    const frame = (x === 2 || x === W - 3) && y >= 2 && y <= H - 3 || (y === 2 || y === H - 3) && x >= 2 && x <= W - 3;
    if (edge) g[y][x] = 'r';
    else if (frame) g[y][x] = 'G';
    else if (x > 3 && x < W - 4 && y > 3 && y < H - 4) {
      // The lattice: diagonals 6 apart both ways, gold on the house's red.
      const a = (x + y) % 6 === 0, b = (x - y + 60) % 6 === 0;
      g[y][x] = a || b ? 'd' : 'r';
      if (a && b) g[y][x] = 'g';
    }
  }
  // The chip in the middle: a gold ring, red inside, a white star of notches.
  const cx = 18, cy = 25;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= 8.5) g[y][x] = d > 7.2 ? 'K' : d > 5.6 ? 'G' : d > 4.4 ? 'g' : 'R';
  }
  for (const [dx, dy] of [[0, -6], [0, 6], [-6, 0], [6, 0], [-4, -4], [4, -4], [-4, 4], [4, 4]]) g[cy + dy][cx + dx] = 'T';
  for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) g[cy + dy][cx + dx] = 'Y';
  return g.map((r) => r.join(''));
}

export const CARD_PIPS = { ...PIP_S, ...PIP_L };
export const CARD_COURT = COURT;
export const CARD_BACK = { cardBackDeck: back() };
