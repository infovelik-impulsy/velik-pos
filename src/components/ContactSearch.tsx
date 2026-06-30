import { useState, useEffect } from 'react'
import { Search, X, UserPlus, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface Contact {
  id: number
  nombres: string
  apellidos: string | null
  telefono: string
  email: string | null
}

interface ContactSearchProps {
  onSelect: (contact: Contact) => void
  selectedName?: string
  ocultarTelefono?: boolean
}

export default function ContactSearch({ onSelect, selectedName, ocultarTelefono = false }: ContactSearchProps) {
  const [search, setSearch] = useState(selectedName || '')
  const [results, setResults] = useState<Contact[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Crear nuevo contacto
  const [creating, setCreating] = useState(false)
  const [nuevoNombres, setNuevoNombres] = useState('')
  const [nuevoApellidos, setNuevoApellidos] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')

  useEffect(() => {
    if (search.length < 2) {
      setResults([])
      return
    }

    async function searchContacts() {
      setLoading(true)
      const { data, error } = await supabase
        .from('contactos')
        .select('*')
        .or(`nombres.ilike.%${search}%,apellidos.ilike.%${search}%,telefono.ilike.%${search}%`)
        .limit(10)

      if (!error && data) {
        setResults(data as Contact[])
        setIsOpen(true)
      }
      setLoading(false)
    }

    const timer = setTimeout(searchContacts, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleSelect = (contact: Contact) => {
    setSearch(`${contact.nombres} ${contact.apellidos || ''}`.trim())
    onSelect(contact)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSearch('')
    setResults([])
    setCreating(false)
  }

  function abrirCrear() {
    // Pre-llenar el nombre con lo que escribió en la búsqueda
    const partes = search.trim().split(/\s+/)
    setNuevoNombres(partes[0] || '')
    setNuevoApellidos(partes.slice(1).join(' '))
    setNuevoTelefono('')
    setNuevoEmail('')
    setErrorCrear('')
    setCreating(true)
    setIsOpen(false)
  }

  async function crearContacto() {
    const tel = nuevoTelefono.replace(/\D/g, '')
    if (!nuevoNombres.trim() || tel.length < 10) {
      setErrorCrear('Nombre y teléfono (10 dígitos) son obligatorios')
      return
    }
    setGuardando(true)
    setErrorCrear('')

    const telefono = nuevoTelefono.startsWith('+') ? nuevoTelefono : '+57' + tel

    // 1. Guardar en Supabase
    const { data, error } = await supabase
      .from('contactos')
      .insert({
        nombres: nuevoNombres.trim(),
        apellidos: nuevoApellidos.trim() || null,
        telefono,
        email: nuevoEmail.trim() || null,
      })
      .select()
      .single()

    if (error) {
      setErrorCrear('Error al guardar: ' + error.message)
      setGuardando(false)
      return
    }

    // 2. Crear/actualizar en GHL (no bloquea si falla)
    try {
      await fetch('https://api.leadconnectorhq.com/contacts/upsert', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer pit-022a5206-1196-4066-8957-50cf5634da09',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: nuevoNombres.trim(),
          lastName: nuevoApellidos.trim(),
          phone: telefono,
          ...(nuevoEmail.trim() ? { email: nuevoEmail.trim() } : {}),
          source: 'POS - Velik Beauty',
        }),
      })
    } catch (err) {
      console.error('Error creando contacto en GHL:', err)
    }

    const nuevo = data as Contact
    setGuardando(false)
    setCreating(false)
    handleSelect(nuevo)
  }

  if (creating) {
    return (
      <div className="border border-[#C9A84C]/40 bg-[#faf6ee] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8a7a6a] flex items-center gap-1">
            <UserPlus size={14} /> Nuevo contacto
          </p>
          <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={nuevoNombres}
            onChange={e => setNuevoNombres(e.target.value)}
            placeholder="Nombres *"
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C] bg-white"
          />
          <input
            value={nuevoApellidos}
            onChange={e => setNuevoApellidos(e.target.value)}
            placeholder="Apellidos"
            className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C] bg-white"
          />
        </div>
        <input
          value={nuevoTelefono}
          onChange={e => setNuevoTelefono(e.target.value)}
          placeholder="Teléfono * (ej: 3001234567)"
          inputMode="tel"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C] bg-white"
        />
        <input
          value={nuevoEmail}
          onChange={e => setNuevoEmail(e.target.value)}
          placeholder="Email (opcional)"
          inputMode="email"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#C9A84C] bg-white"
        />
        {errorCrear && <p className="text-xs text-red-500">{errorCrear}</p>}
        <button
          onClick={crearContacto}
          disabled={guardando}
          className="w-full py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#b8963e] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {guardando ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
          {guardando ? 'Guardando...' : 'Crear y seleccionar'}
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => search.length >= 2 && setIsOpen(true)}
            placeholder="Buscar cliente..."
            className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-[#C9A84C] text-sm"
          />
          {search && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          onClick={abrirCrear}
          title="Crear nuevo contacto"
          className="shrink-0 p-2.5 bg-[#1a1a1a] text-white rounded-xl hover:bg-black transition-colors"
        >
          <UserPlus size={18} />
        </button>
      </div>

      {isOpen && (results.length > 0 || !loading) && search.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
          <div className="max-h-64 overflow-y-auto">
            {results.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleSelect(contact)}
                className="w-full px-4 py-3 text-left hover:bg-[#f9f6ee] border-b border-gray-100 last:border-0 transition-colors flex justify-between items-start"
              >
                <div className="flex-1">
                  <div className="font-semibold text-sm text-[#1a1a1a]">
                    {contact.nombres} {contact.apellidos || ''}
                  </div>
                  {!ocultarTelefono && (
                    <div className="text-xs text-gray-500 mt-1">
                      📱 {contact.telefono}
                    </div>
                  )}
                  {contact.email && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {contact.email}
                    </div>
                  )}
                </div>
                <div className="text-xs bg-[#C9A84C] text-white px-2 py-1 rounded ml-2">
                  Seleccionar
                </div>
              </button>
            ))}
            <button
              onClick={abrirCrear}
              className="w-full px-4 py-3 text-left hover:bg-[#f9f6ee] transition-colors flex items-center gap-2 text-sm font-medium text-[#C9A84C]"
            >
              <UserPlus size={16} />
              {results.length === 0 ? `Crear contacto "${search}"` : 'Crear nuevo contacto'}
            </button>
          </div>
        </div>
      )}

      {isOpen && loading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl p-4 text-center text-sm text-gray-500">
          Buscando...
        </div>
      )}
    </div>
  )
}
