export interface Servicio {
  nombre: string
  calendarId: string
  duracion: number
  precio: string
  precioEditable?: boolean // precio se define en valoración (ej: servicios de color)
  profesionales?: string[] // userIds; omit = all
}

export interface Profesional {
  nombre: string
  userId: string
  especialidad: string
  iniciales: string
  foto?: string
}

export const CATEGORIAS = [
  "Manicure", "Pedicure", "Manicura y Pedicura",
  "Cabello", "Cejas y Pestañas", "Depilación",
  "Maquillaje Profesional", "Corporal",
]

const LA = "UzLj5T8ZOrJ8reSig5os"  // Luz Aida         — SOLO faciales, masajes, estrías y maquillaje
const GB = "saGMogKgCH3kmIhq4VlJ"  // Geraldine Berrio — SOLO uñas (manicure, pedicure y combos)

const NAILS = [GB]
const HAIR: string[] = []

export const SERVICIOS: Record<string, Servicio[]> = {
  // ─── MANICURE ── Carolina, Laura y Geraldine ─────────────────────────────────
  "Manicure": [
    { nombre: "Manos Semipermanente",               calendarId: "EDiqwAb54xY6nID5yzB8", duracion: 60,  precio: "$60.000",  profesionales: NAILS },
    { nombre: "Manos Tradicional",                  calendarId: "ItIbYfgFYYvZYQ6Oje0B", duracion: 45,  precio: "$35.000",  profesionales: NAILS },
    { nombre: "Manos Evolution",                    calendarId: "uyBy6KxStea3tyJXkxvE", duracion: 45,  precio: "$40.000",  profesionales: NAILS },
    { nombre: "Builder Gel",                        calendarId: "58aCvkqxbMBcFFPgZmyk", duracion: 120, precio: "$85.000",  profesionales: NAILS },
    { nombre: "Baby Boomer",                        calendarId: "HhrSGv6kTKZOtLwLtLaO", duracion: 170, precio: "$160.000", profesionales: NAILS },
    { nombre: "Base Rubber Manos",                  calendarId: "yVTJ5MuqOiTIG6aW4Zzu", duracion: 60,  precio: "$85.000",  profesionales: NAILS },
    { nombre: "Uñas Esculpidas Polygel/Acrílico",   calendarId: "5FzBoBw7GCdwViMPesPC", duracion: 150, precio: "$140.000", profesionales: NAILS },
    { nombre: "Recubrimiento Polygel/Acrílico",     calendarId: "MmI8fIlxThj3dg3qXB5E", duracion: 150, precio: "$100.000", profesionales: NAILS },
    { nombre: "Retoque Esculpidas Polygel/Acrílico",calendarId: "JuHPG8vMNXKSOiyVNzjR", duracion: 110, precio: "$100.000", profesionales: NAILS },
    { nombre: "Retoque Recubrimiento Poly/Acrílico",calendarId: "g7a3uGcoBdAdrffowsY1", duracion: 100, precio: "$90.000",  profesionales: NAILS },
    { nombre: "Uñas Dip Powder + Semipermanente",   calendarId: "DIDIge2ItuyDQU3hfjqA", duracion: 70,  precio: "$85.000",  profesionales: NAILS },
    { nombre: "Uñas Press On",                      calendarId: "CwNB6YUweNhSrYOTFElB", duracion: 90,  precio: "$100.000", profesionales: NAILS },
    { nombre: "Retoque Press On",                   calendarId: "rSP0C1qAAvA82qSGwSsz", duracion: 80,  precio: "$85.000",  profesionales: NAILS },
    { nombre: "Esmaltado Semipermanente Manos",     calendarId: "UdfCTzTMPNhYuemDnWsb", duracion: 20,  precio: "$40.000",  profesionales: NAILS },
    { nombre: "Esmaltado Tradicional Manos",        calendarId: "54RoAHSPDVzWjfk4N2cR", duracion: 30,  precio: "$25.000",  profesionales: NAILS },
    { nombre: "Retiro Semipermanente Manos",        calendarId: "CUY39YrfaRmiHvMdGTol", duracion: 15,  precio: "$15.000",  profesionales: NAILS },
    { nombre: "Retiro Rubber/Dipping",              calendarId: "KDdZgv19rQYsaxXNeIMB", duracion: 20,  precio: "$25.000",  profesionales: NAILS },
    { nombre: "Retiro Polygel/Acrílico",            calendarId: "NbDO7tF3rTsVlsNAqweR", duracion: 30,  precio: "$25.000",  profesionales: NAILS },
    { nombre: "Limpieza Manos",                     calendarId: "yENMASOfLO8JTFgjW23z", duracion: 30,  precio: "$25.000",  profesionales: NAILS },
    { nombre: "Masaje Relajante de Manos",          calendarId: "74JOMcKwGJTEqfgqo2Ra", duracion: 7,   precio: "$25.000",  profesionales: NAILS },
    { nombre: "Diseño",                             calendarId: "ZIeJPQLAeo3bM3tLDL8z", duracion: 10,  precio: "$0",       profesionales: NAILS },
    { nombre: "Garantías",                          calendarId: "Oi2Dn1v3MpIR3wn06LyY", duracion: 30,  precio: "$0",       profesionales: NAILS },
  ],

  // ─── PEDICURE ── Carolina, Laura y Geraldine ─────────────────────────────────
  "Pedicure": [
    { nombre: "Pies Semipermanente",            calendarId: "szaDqVWMTKAFCVcYjgTh", duracion: 60, precio: "$60.000",  profesionales: NAILS },
    { nombre: "Pedicura Tradicional + Pedi Spa",calendarId: "MPv75km6l8sal1NKHqtV", duracion: 60, precio: "$85.000",  profesionales: NAILS },
    { nombre: "Pedicura Semi + Pedi Spa",       calendarId: "1OpkJJuQoNlATF5hd9Zi", duracion: 70, precio: "$105.000", profesionales: NAILS },
    { nombre: "Pies Evolution",                 calendarId: "tKn5Hy3A7pKqg7nhVpgC", duracion: 45, precio: "$45.000",  profesionales: NAILS },
    { nombre: "Tradicional Pies",               calendarId: "XbxF4HF4VH3KNB16sNBU", duracion: 40, precio: "$40.000",  profesionales: NAILS },
    { nombre: "Retiro Semipermanente Pies",     calendarId: "FJDuHD0L2DqBLPUeYsqM", duracion: 20, precio: "$15.000",  profesionales: NAILS },
    { nombre: "Solo Limpieza Pies",             calendarId: "rcuBG3bPRNwG11VFqgH2", duracion: 30, precio: "$30.000",  profesionales: NAILS },
  ],

  // ─── MANICURA Y PEDICURA ── Carolina, Laura y Geraldine ─────────────────────
  "Manicura y Pedicura": [
    { nombre: "Uñas Semipermanente (Manos y Pies)",        calendarId: "0jYIRtI8bl33hIyhVJC1", duracion: 90,  precio: "$120.000", profesionales: NAILS },
    { nombre: "Manos Semipermanentes y Pies Tradicional",  calendarId: "xpyrWObNXPeV2kMJtlIy", duracion: 120, precio: "$100.000", profesionales: NAILS },
    { nombre: "Manos Evolution y Pies Semipermanentes",    calendarId: "zfKlMG4wsoLWam1yRQCl", duracion: 100, precio: "$100.000", profesionales: NAILS },
    { nombre: "Uñas Esmaltado Tradicional (Manos y Pies)", calendarId: "OYVNrcCxrbSYEd1SbV3f", duracion: 100, precio: "$60.000",  profesionales: NAILS },
    { nombre: "Manos Semipermanente y Pies Evo",           calendarId: "z6VLaBzxm2hxO4JglzOI", duracion: 120, precio: "$105.000", profesionales: NAILS },
    { nombre: "Evolution (Manos y Pies)",                  calendarId: "ZLEVvENlOAsJdUVyyLGf", duracion: 80,  precio: "$85.000",  profesionales: NAILS },
    { nombre: "Manos Tradicionales + Pies Semipermanente", calendarId: "iAOrgphopFSqRQt5dxTm", duracion: 120, precio: "$95.000",  profesionales: NAILS },
    { nombre: "Solo Limpieza Manos y Pies",                calendarId: "FMTaDks9JBTh1hXZ9k2U", duracion: 60,  precio: "$50.000",  profesionales: NAILS },
    { nombre: "Retiro Semipermanente Manos y Pies",        calendarId: "fcpxmqMktM3vzoyrhumR", duracion: 30,  precio: "$30.000",  profesionales: NAILS },
  ],

  // ─── CABELLO ── Carolina y Laura ─────────────────────────────────────────────
  "Cabello": [
    { nombre: "Valoración de Cabello",                      calendarId: "yePA3PPHJC9Fdu6A6WMt", duracion: 30,  precio: "$30.000",  profesionales: [CP] },
    { nombre: "Alisado Natural Argán y Coco (Corto)",       calendarId: "tYgB9RKWsWnAY6yzHbzo", duracion: 300, precio: "$250.000", profesionales: HAIR },
    { nombre: "Alisado Natural Argán y Coco (Medio)",       calendarId: "YsyBC5BKtrnN8YQYRDBm", duracion: 300, precio: "$290.000", profesionales: HAIR },
    { nombre: "Alisado Natural Argán y/o Coco Largo",       calendarId: "aO1pbT4UQDyqLJwXnPqX", duracion: 300, precio: "$400.000", profesionales: HAIR },
    { nombre: "Alisado Natural Argán y/o Coco Extra Largo", calendarId: "NFFYkmfD3gwaVACAOBxq", duracion: 300, precio: "$430.000", profesionales: HAIR },
    { nombre: "Color Cabello Corto",                        calendarId: "tdu7sEKcoUaJGN6TS5dR", duracion: 60,  precio: "$150.000", precioEditable: true, profesionales: HAIR },
    { nombre: "Color Cabello Medio",                        calendarId: "XEmC3LZdNFLzri44z5fe", duracion: 60,  precio: "$220.000", precioEditable: true, profesionales: HAIR },
    { nombre: "Color Cabello Largo",                        calendarId: "SZnHg7E8gOsBB0CxxpAk", duracion: 90,  precio: "$290.000", precioEditable: true, profesionales: HAIR },
    { nombre: "Color Cabello Extra Largo",                  calendarId: "HXfDgBJXCdD5xD7rqgmW", duracion: 90,  precio: "$360.000", precioEditable: true, profesionales: HAIR },
    { nombre: "Cepillado Cabello Corto",                    calendarId: "AFzeRInudMfQvytS7rYI", duracion: 30,  precio: "$50.000",  profesionales: HAIR },
    { nombre: "Cepillado Cabello Medio",                    calendarId: "BhjqV08NlQwTyAer5Rah", duracion: 40,  precio: "$70.000",  profesionales: HAIR },
    { nombre: "Cepillado Cabello Largo",                    calendarId: "zxVN8YcfF9nQh3uOhLcD", duracion: 45,  precio: "$90.000",  profesionales: HAIR },
    { nombre: "Cepillado Cabello Extralargo",               calendarId: "IM2RYaBSfWNytuAmACml", duracion: 60,  precio: "$120.000", profesionales: HAIR },
    { nombre: "Planchado de Cabello",                       calendarId: "eSmQWFTgnrsIhICBidoF", duracion: 40,  precio: "$50.000",  profesionales: HAIR },
    { nombre: "Ondas",                                      calendarId: "pyw2lCLu7OmMz5i1Xj0i", duracion: 45,  precio: "$70.000",  profesionales: HAIR },
    { nombre: "Corte en Capas",                             calendarId: "cYESJstUsKOBcrKLfI61", duracion: 35,  precio: "$70.000",  profesionales: HAIR },
    { nombre: "Corte de Puntas",                            calendarId: "4aMo5CLViO46g2Q6jnip", duracion: 30,  precio: "$50.000",  profesionales: HAIR },
    { nombre: "Corte Caballero",                            calendarId: "6V88WbxYuumHKt5RBfGO", duracion: 30,  precio: "$50.000",  profesionales: HAIR },
    { nombre: "Terapia Capilar de L'Oréal",                 calendarId: "gJhd4efPJ7Zs7Ogybq95", duracion: 20,  precio: "$120.000", profesionales: HAIR },
    { nombre: "Terapia Capilar Authentic",                  calendarId: "",                       duracion: 60,  precio: "$250.000", profesionales: HAIR },
    { nombre: "Toxina Botulínica",                          calendarId: "7G42EdlizK39sGWSRTWO", duracion: 20,  precio: "$0",       profesionales: HAIR },
  ],

  // ─── CEJAS Y PESTAÑAS ── Carolina y Laura (extensiones/retoque solo Laura) ──
  "Cejas y Pestañas": [
    { nombre: "Lifting de Pestañas",                      calendarId: "Z7WKPMSF94iQoA8Mf9ne", duracion: 60, precio: "$120.000", profesionales: HAIR },
    { nombre: "Laminado de Cejas",                        calendarId: "JGZXM08wqm28dl4qfp9T", duracion: 50, precio: "$100.000", profesionales: HAIR },
    { nombre: "Laminado de Cejas y Lifting de Pestañas",  calendarId: "KuZ6tseSF1WIC3wmAwGj", duracion: 70, precio: "$220.000", profesionales: HAIR },
    { nombre: "Extensión de Pestañas Efecto Clásica",     calendarId: "dry2VkC24zeouSdN4VEm", duracion: 70, precio: "$160.000", profesionales: [] },
    { nombre: "Extensión de Pestañas Efecto Híbrido",     calendarId: "dbxPJAla6tTHNv73eo1l", duracion: 90, precio: "$180.000", profesionales: [] },
    { nombre: "Extensión de Pestañas Efecto Tecnológico", calendarId: "4O1RVMdKaXEUaHqQqVP1", duracion: 90, precio: "$200.000", profesionales: [] },
    { nombre: "Retoque Pestañas",                         calendarId: "yuikssBrbkVHsArQoe65", duracion: 60, precio: "$80.000",  profesionales: [] },
    { nombre: "Pestañas Punto a Punto",                   calendarId: "zT9oLreL1DCiwWDmO1Dx", duracion: 45, precio: "$50.000",  profesionales: HAIR },
    { nombre: "Depilación de Cejas con Cera",             calendarId: "VYpzK2GHuBJ63aO2lSaV", duracion: 10, precio: "$25.000",  profesionales: HAIR },
    { nombre: "Depilación de Cejas con Hilo",             calendarId: "ozLRNZ5V55zBOpGxcygz", duracion: 15, precio: "$30.000",  profesionales: [] },
    { nombre: "Depilación de Cejas con Henna",            calendarId: "n49lc4VkUvtvdtCRcgTB", duracion: 10, precio: "$55.000",  profesionales: HAIR },
    { nombre: "Depilación Perfilado/Cuchilla Cejas",      calendarId: "GcGJ59uvGEDf3LZCyrg2", duracion: 25, precio: "$20.000",  profesionales: HAIR },
  ],

  // ─── DEPILACIÓN ── Carolina y Laura (hilo solo Carolina) ─────────────────────
  "Depilación": [
    { nombre: "Depilación Pierna Completa",          calendarId: "cmyFlDKVr8UemAn9N71W", duracion: 90, precio: "$100.000", profesionales: HAIR },
    { nombre: "Depilación Media Pierna",             calendarId: "eRj3f8o8CLcD7i0rIgm3", duracion: 60, precio: "$50.000",  profesionales: HAIR },
    { nombre: "Depilación Línea del Bikini",         calendarId: "mfXJuW1bdCIPV4GgCSx3", duracion: 45, precio: "$45.000",  profesionales: HAIR },
    { nombre: "Depilación de Pubis Completo",        calendarId: "1vn5jyzI6R8TstZCZhOI", duracion: 60, precio: "$80.000",  profesionales: HAIR },
    { nombre: "Depilación de Axilas",                calendarId: "mSw9Swdz68i0hC5cqNme", duracion: 18, precio: "$30.000",  profesionales: HAIR },
    { nombre: "Depilación Espalda Baja",             calendarId: "9HqMBn6P9DBAsMqZmFit", duracion: 60, precio: "$50.000",  profesionales: HAIR },
    { nombre: "Depilación de Glúteos",               calendarId: "woQv67dSOZkRipYxGaXm", duracion: 20, precio: "$40.000",  profesionales: HAIR },
    { nombre: "Depilación Bigote",                   calendarId: "UKZG99bvj0QCeFJaLNk7", duracion: 10, precio: "$20.000",  profesionales: HAIR },
    { nombre: "Depilación Bigote con Hilo",          calendarId: "eHXH3nwnTLLoacCnQKeh", duracion: 10, precio: "$25.000",  profesionales: [] },
    { nombre: "Depilación Barbilla con Hilo",        calendarId: "9M1FFJKZmz9tPhwEitAb", duracion: 10, precio: "$20.000",  profesionales: [] },
    { nombre: "Depilación Orejas",                   calendarId: "whI104AHCNJGaV35yii2", duracion: 20, precio: "$20.000",  profesionales: HAIR },
    { nombre: "Depilación Nariz",                    calendarId: "ZdfgP31Jmj4hWCEezhda", duracion: 20, precio: "$20.000",  profesionales: HAIR },
    { nombre: "Depilación Rostro Completo con Hilo", calendarId: "hKENNyPe7hZhcz5HGHny", duracion: 30, precio: "$100.000", profesionales: [] },
  ],

  // ─── MAQUILLAJE PROFESIONAL ── Luz (Baño de Novia: Carolina y Laura) ─────────
  "Maquillaje Profesional": [
    { nombre: "Maquillaje Social",    calendarId: "71J4eTC3TIEuDXfsP1Iw", duracion: 60, precio: "$170.000", profesionales: [LA] },
    { nombre: "Maquillaje Blindado",  calendarId: "hdrmUKbZXwO4tbNVsIkb", duracion: 60, precio: "$200.000", profesionales: [LA] },
    { nombre: "Maquillaje Halloween", calendarId: "PelRqVASPHp0QEu7P5Xs", duracion: 60, precio: "$230.000", profesionales: [LA] },
    { nombre: "Baño de Novia Brazos", calendarId: "OybBhb6gij304Vromp7n", duracion: 15, precio: "$30.000",  profesionales: HAIR },
  ],

  // ─── CORPORAL ── Luz (Piedras Volcánicas: Laura y Luz) ───────────────────────
  "Corporal": [
    { nombre: "Drenaje Linfático",                           calendarId: "wAwK46EAzP7OMVbVZ4Na", duracion: 60,  precio: "$100.000",   profesionales: [LA] },
    { nombre: "Masaje Relajación Piedras Volcánicas + Velas",calendarId: "q2Iz4gfTyoB3JkRNZ4CZ", duracion: 60,  precio: "$140.000",   profesionales: [LA] },
    { nombre: "Paquete 1 Masaje Reductor",                   calendarId: "kjgB0Whm8mjpYv8I075K", duracion: 45,  precio: "$450.000",   profesionales: [LA] },
    { nombre: "Paquete 2 Masaje Reductor",                   calendarId: "8iU9qGnCM5nT6816pEAh", duracion: 45,  precio: "$650.000",   profesionales: [LA] },
    { nombre: "Paquete 3 Masaje Reductor",                   calendarId: "uajeiWuAmnwZ9BPA4RlT", duracion: 45,  precio: "$850.000",   profesionales: [LA] },
    { nombre: "Reestructuración de Estrías",                 calendarId: "9PiZEDHNec91qK58o3de", duracion: 40,  precio: "$400.000",   profesionales: [LA] },
    { nombre: "Camuflaje de Estrías",                        calendarId: "xU7HfkiIbhZwHo1EnrTz", duracion: 120, precio: "$1.600.000", profesionales: [LA] },
    { nombre: "Limpieza Facial Especial",                    calendarId: "vxUBF94v8PKqobjUBeZc", duracion: 90,  precio: "$150.000",   profesionales: [LA] },
    { nombre: "Limpieza Facial Tradicional",                 calendarId: "fz9614uqbCIz8bLDXYNR", duracion: 60,  precio: "$100.000",   profesionales: [LA] },
    { nombre: "Cosmetología Facial",                         calendarId: "6Gq72d3MJ8FqYsWYEeWD", duracion: 30,  precio: "$30.000",    profesionales: [LA] },
  ],
}

export const PROFESIONALES: Profesional[] = [
  { nombre: "Luz Aida",         userId: LA, especialidad: "Facial & Corporal",    iniciales: "LA", foto: "/fotos/luz.jpg" },
  { nombre: "Geraldine Berrio", userId: GB, especialidad: "Uñas & Manicure",      iniciales: "GB", foto: "/fotos/geraldine.jpg" },
]

export const SLOTS_URL = "https://santiagon8nmejia.dominadoresia.com/webhook/booking/slots"
export const CREAR_URL = "https://santiagon8nmejia.dominadoresia.com/webhook/booking/crear"
