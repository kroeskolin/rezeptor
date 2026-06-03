const unitSuggestions = {
  // Gewicht
  mehl: 'g', zucker: 'g', salz: 'g', butter: 'g', hackfleisch: 'g',
  reis: 'g', linsen: 'g', nudeln: 'g', spaghetti: 'g', parmesan: 'g',
  käse: 'g', speck: 'g', pancetta: 'g', lachs: 'g', garnelen: 'g',
  hähnchen: 'g', rindfleisch: 'g', schweinefleisch: 'g', mandeln: 'g',
  nüsse: 'g', schokolade: 'g', haferflocken: 'g', paniermehl: 'g',

  // Flüssigkeiten
  milch: 'ml', sahne: 'ml', wasser: 'ml', brühe: 'ml', öl: 'ml',
  olivenöl: 'ml', wein: 'ml', essig: 'ml', zitronensaft: 'ml',
  sojasoße: 'ml', kokosmilch: 'ml',

  // Stück
  ei: 'Stück', eier: 'Stück', tomate: 'Stück', tomaten: 'Stück',
  zwiebel: 'Stück', zwiebeln: 'Stück', knoblauch: 'Zehe',
  kartoffel: 'Stück', kartoffeln: 'Stück', karotte: 'Stück',
  karotten: 'Stück', paprika: 'Stück', zucchini: 'Stück',
  aubergine: 'Stück', avocado: 'Stück', zitrone: 'Stück',
  limette: 'Stück', apfel: 'Stück', banane: 'Stück',

  // Kleine Mengen
  hefe: 'g', backpulver: 'TL', natron: 'TL', zimt: 'TL',
  pfeffer: 'Prise', chilipulver: 'TL', paprikapulver: 'TL',
  kreuzkümmel: 'TL', oregano: 'TL', basilikum: 'TL', thymian: 'TL',

  // Später unsortiert hinzugefügt:
  spinat: 'g', brokkoli: 'g', blumenkohl: 'Stück', champignons: 'g',
}

const allUnits = ['g', 'kg', 'ml', 'l', 'Stück', 'Zehe', 'EL', 'TL', 'Prise', 'Bund', 'Packung', 'nach Geschmack']

export function suggestUnit(ingredientName) {
  const key = ingredientName.toLowerCase().trim()
  return unitSuggestions[key] || 'Stück'
}

export { allUnits }