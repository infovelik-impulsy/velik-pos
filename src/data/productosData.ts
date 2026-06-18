export interface Producto {
  nombre: string
  precio: number
  categoria: string
}

export const PRODUCTOS: Producto[] = [
  // Replenish
  { nombre: 'Replenish Shampoo 300ml',              precio: 145990, categoria: 'Replenish' },
  { nombre: 'Replenish Acondicionador 250ml',        precio: 191990, categoria: 'Replenish' },
  { nombre: 'Replenish Acondicionador Spray 250ml',  precio: 178990, categoria: 'Replenish' },
  { nombre: 'Replenish Rich Mascarilla 200ml',       precio: 240990, categoria: 'Replenish' },
  { nombre: 'Replenish Light Mascarilla 200ml',      precio: 240990, categoria: 'Replenish' },

  // Amplify
  { nombre: 'Amplify Shampoo 300ml',                precio: 145990, categoria: 'Amplify' },
  { nombre: 'Amplify Acondicionador 250ml',          precio: 191990, categoria: 'Amplify' },
  { nombre: 'Amplify Acondicionador Spray 250ml',    precio: 178990, categoria: 'Amplify' },
  { nombre: 'Amplify Mousse 200ml',                  precio: 150990, categoria: 'Amplify' },

  // Glow
  { nombre: 'Glow Shampoo 300ml',                   precio: 145990, categoria: 'Glow' },
  { nombre: 'Glow Acondicionador 250ml',             precio: 191990, categoria: 'Glow' },
  { nombre: 'Glow Mascarilla 200ml',                 precio: 240990, categoria: 'Glow' },
  { nombre: 'Glow Cool Cleanser 300ml',              precio: 145990, categoria: 'Glow' },
  { nombre: 'Glow Sprayable Serum 200ml',            precio: 200990, categoria: 'Glow' },

  // Hydrate
  { nombre: 'Hydrate Shampoo 300ml',                precio: 145990, categoria: 'Hydrate' },
  { nombre: 'Hydrate Acondicionador 250ml',          precio: 191990, categoria: 'Hydrate' },
  { nombre: 'Hydrate Acondicionador Spray 250ml',    precio: 178990, categoria: 'Hydrate' },
  { nombre: 'Hydrate Mascarilla 200ml',              precio: 240990, categoria: 'Hydrate' },
  { nombre: 'Hydrate Lotion 150ml',                  precio: 187990, categoria: 'Hydrate' },
  { nombre: 'Hydrate Smoothing Serum 100ml',         precio: 202990, categoria: 'Hydrate' },
  { nombre: 'Hydrate Curl Enhancer 250ml',           precio: 187990, categoria: 'Hydrate' },
  { nombre: 'Hydrate Intense Treatment 200ml',       precio: 240990, categoria: 'Hydrate' },

  // All Hair Types
  { nombre: 'Deep Cleansing Shampoo 300ml',          precio: 145990, categoria: 'All Hair Types' },
  { nombre: 'Indulging Fluid Oil 100ml',             precio: 200990, categoria: 'All Hair Types' },
  { nombre: 'Bare Cleanser 300ml',                   precio: 145990, categoria: 'All Hair Types' },
  { nombre: 'Jelly Mask 200ml',                      precio: 212990, categoria: 'All Hair Types' },

  // Beyond The Hair
  { nombre: 'Eau de Toilette 50ml',                  precio: 202990, categoria: 'Beyond The Hair' },
  { nombre: 'Hand & Hair Light Cream 75ml',          precio: 90990,  categoria: 'Beyond The Hair' },
  { nombre: 'Enhancing Water 100ml',                 precio: 119990, categoria: 'Beyond The Hair' },
  { nombre: 'Sensorial Cream Scrub 250ml',           precio: 177990, categoria: 'Beyond The Hair' },

  // Styling
  { nombre: 'Flawless Primer 250ml',                 precio: 170990, categoria: 'Styling' },
  { nombre: 'Shaping Cream 150ml',                   precio: 187990, categoria: 'Styling' },
  { nombre: 'Gritty Wax Paste 85ml',                precio: 149990, categoria: 'Styling' },
  { nombre: 'Solid Pomade 85ml',                     precio: 149990, categoria: 'Styling' },
  { nombre: 'Pliable Styling Paste 85ml',            precio: 149990, categoria: 'Styling' },
  { nombre: 'Working HairSpray 300ml',               precio: 130990, categoria: 'Styling' },
  { nombre: 'Strong Hold Spray 100ml',               precio: 54990,  categoria: 'Styling' },
  { nombre: 'Airy Texture Spray 300ml',              precio: 130990, categoria: 'Styling' },
  { nombre: 'Dry Shampoo 100ml',                     precio: 54990,  categoria: 'Styling' },
  { nombre: 'Nude Powder SPR 12g',                   precio: 172990, categoria: 'Styling' },
  { nombre: 'Nymph Salt Spray 250ml',                precio: 170990, categoria: 'Styling' },
  { nombre: 'Cosmic Blow-Dry Jelly 150ml',           precio: 187990, categoria: 'Styling' },
]

export const CATEGORIAS_PRODUCTOS = [...new Set(PRODUCTOS.map(p => p.categoria))]
