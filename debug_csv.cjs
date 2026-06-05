const fs = require('fs')

const raw = fs.readFileSync('../velik beauty house/diciembre2024_18mayo2025.csv', 'latin1')
const lines = raw.split('\n').filter(l => l.trim())
const headers = lines[0].split(';').map(h => h.trim())

console.log('Headers:', headers)
console.log('\n---\n')

// Primera fila de datos
const row1 = lines[1].split(';')
const obj1 = {}
headers.forEach((h, i) => { obj1[h] = (row1[i] || '').trim() })

console.log('Fila 1:')
console.log('Nombre:', obj1['Nombre'])
console.log('Apellido:', obj1['Apellido'])
console.log('Fecha:', obj1['Fecha de realización'])
console.log('Precio real:', obj1['Precio real'])
console.log('Estado:', obj1['Estado'])
console.log('Estado de pago:', obj1['Estado de pago'])
console.log('Prestador:', obj1['Prestador'])
