export interface ItemCafeteria {
  id: string
  nombre: string
  categoria: 'Bebidas' | 'Aseo' | 'General'
  precio: number
  stock_inicial: number
}

export const CAFETERIA_ITEMS: ItemCafeteria[] = [
  // Bebidas
  { id: 'gatorade',     nombre: 'Gatorade',              categoria: 'Bebidas', precio: 0, stock_inicial: 12 },
  { id: 'corona',       nombre: 'Corona Pequeña',         categoria: 'Bebidas', precio: 0, stock_inicial: 12 },
  { id: 'agua',         nombre: 'Botella de Agua',        categoria: 'Bebidas', precio: 0, stock_inicial: 24 },

  // Aseo
  { id: 'fabuloso',     nombre: 'Fabuloso Morado',        categoria: 'Aseo', precio: 0, stock_inicial: 1 },
  { id: 'limpido',      nombre: 'Limpido Morado',         categoria: 'Aseo', precio: 0, stock_inicial: 1 },
  { id: 'limp_textil',  nombre: 'Limpiador de Textiles',  categoria: 'Aseo', precio: 0, stock_inicial: 1 },
  { id: 'limp_vidrios', nombre: 'Limpia Vidrios',         categoria: 'Aseo', precio: 0, stock_inicial: 1 },
  { id: 'blanqueador',  nombre: 'Blanqueador Desinfectante', categoria: 'Aseo', precio: 0, stock_inicial: 1 },
  { id: 'esponjillas',  nombre: 'Esponjillas de Acero',   categoria: 'Aseo', precio: 0, stock_inicial: 1 },
  { id: 'esponja',      nombre: 'Esponja',                categoria: 'Aseo', precio: 0, stock_inicial: 2 },
  { id: 'ambientador',  nombre: 'Ambientador',            categoria: 'Aseo', precio: 0, stock_inicial: 2 },
  { id: 'arrancagrasa', nombre: 'Arrancagrasa',           categoria: 'Aseo', precio: 0, stock_inicial: 1 },
  { id: 'desengrasante',nombre: 'Desengrasante',          categoria: 'Aseo', precio: 0, stock_inicial: 1 },
  { id: 'bolsas_blancas', nombre: 'Bolsas Blancas (paquete)', categoria: 'Aseo', precio: 0, stock_inicial: 1 },
  { id: 'bolsas_verdes',  nombre: 'Bolsas Verdes (paquete)',  categoria: 'Aseo', precio: 0, stock_inicial: 1 },
  { id: 'limp_pisos',   nombre: 'Limpiador de Pisos Canela', categoria: 'Aseo', precio: 0, stock_inicial: 1 },
  { id: 'cepillo',      nombre: 'Cepillo para Estregar',  categoria: 'Aseo', precio: 0, stock_inicial: 1 },
  { id: 'detergente',   nombre: 'Detergente en Polvo',    categoria: 'Aseo', precio: 0, stock_inicial: 1 },

  // General
  { id: 'candela',      nombre: 'Candela',                categoria: 'General', precio: 0, stock_inicial: 1 },
  { id: 'servilletas',  nombre: 'Servilletas (paquete)',  categoria: 'General', precio: 0, stock_inicial: 1 },
  { id: 'papel_hig',    nombre: 'Papel Higiénico (rollo)', categoria: 'General', precio: 0, stock_inicial: 12 },
]

export const CATEGORIAS_CAFETERIA = ['Bebidas', 'Aseo', 'General'] as const
