export const palettes = {
  loft: {
    name:'Listening Loft', note:'Tobacco leather, oiled walnut and warm light.',
    wall:'#a39b8c', windowWall:'#9a8171', floor:'#8f6848', floorLine:'#654932', rug:'#c8b79d', stripe:'#856652', sofa:'#73422f', chair:'#373e31'
  },
  gallery: {
    name:'Gallery White', note:'Chalk plaster, pale ash and saddle leather.',
    wall:'#ddd8ce', windowWall:'#cac4b9', floor:'#c3a783', floorLine:'#9c8160', rug:'#ece4d5', stripe:'#998b75', sofa:'#966143', chair:'#393633'
  },
  dusk: {
    name:'After Hours', note:'Olive plaster, smoked oak and oxblood velvet.',
    wall:'#655f49', windowWall:'#726454', floor:'#48382f', floorLine:'#302725', rug:'#a98d69', stripe:'#67463a', sofa:'#622c31', chair:'#b28b53'
  },
} as const;
export type PaletteId = keyof typeof palettes;
export const finishes = [
  ['Tobacco','#73422f'], ['Oxblood','#622c31'], ['Olive','#373e31'], ['Sand','#ae9271'], ['Ink','#323131'],
] as const;
