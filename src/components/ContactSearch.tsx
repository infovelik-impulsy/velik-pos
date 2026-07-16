import { useState, useEffect } from 'react'
import { Search, X, UserPlus, Loader2, Trash2, Pencil, Check } from 'lucide-react'
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

  // Crear nuevo contacto
  const [creating, setCreating] = useState(false)
  const [nuevoNombres, setNuevoNombres] = useState('')
  const [nuevoApellidos, setNuevoApellidos] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')

  // Eliminar contacto
  const [confirmDelId, setConfirmDelId] = useState<number | null>(null)
  const [eliminando, setEliminando] = useState(false)

  // Editar contacto
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNombres, setEditNombres] = useState('')
  const [editApellidos, setEditApellidos] = useState('')
  const [editTelefono, setEditTelefono] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [guardandoEdit, setGuardandoEdit] = useState(false)
  const [errorEditar, setErrorEditar] = useState('')

  // Todos los contactos (cache local para búsqueda sin acentos/mayúsculas)
  const [allContacts, setAllContacts] = useState<Contact[]>([])

  // Normaliza: minúsculas + sin acentos
  const normalize = (s: string) =>
    (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  async function cargarContactos() {
    const { data } = await supabase
      .from('contactos')
      .select('*')
      .order('nombres', { ascending: true })
      .limit(5000)
    if (data) setAllContacts(data as Contact[])
  }

  useEffect(() => { cargarContactos() }, [])

  useEffect(() => {
    if (search.length < 2) {
      setResults([])
      return
    }
    const q = normalize(search)
    const qDigits = search.replace(/\D/g, '')
    const filtered = allContacts.filter(c => {
      const nombre = normalize(`${c.nombres} ${c.apellidos || ''}`)
      const tel = (c.telefono || '').replace(/\D/g, '')
      return nombre.includes(q) || (qDigits.length >= 3 && tel.includes(qDigits))
    }).slice(0, 15)
    setResults(filtered)
    setIsOpen(true)
  }, [search, allContacts])

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

  async function eliminarContacto(id: number) {
    setEliminando(true)
    const { error } = await supabase.from('contactos').delete().eq('id', id)
    setEliminando(false)
    if (error) {
      setErrorCrear('Error al eliminar: ' + error.message)
      return
    }
    setResults(prev => prev.filter(c => c.id !== id))
    setAllContacts(prev => prev.filter(c => c.id !== id))
    setConfirmDelId(null)
  }

  function abrirEditar(contact: Contact) {
    setEditingId(contact.id)
    setEditNombres(contact.nombres)
    setEditApellidos(contact.apellidos || '')
    setEditTelefono(contact.telefono)
    setEditEmail(contact.email || '')
    setErrorEditar('')
    setConfirmDelId(null)
  }

  async function guardarEdicion(id: number) {
    const tel = editTelefono.replace(/\D/g, '')
    if (!editNombres.trim() || tel.length < 10) {
      setErrorEditar('Nombre y teléfono (10 dígitos) son obligatorios')
      return
    }
    setGuardandoEdit(true)
    setErrorEditar('')

    const telefono = editTelefono.startsWith('+') ? editTelefono : '+57' + tel

    const { data, error } = await supabase
      .from('contactos')
      .update({
        nombres: editNombres.trim(),
        apellidos: editApellidos.trim() || null,
        telefono,
        email: editEmail.trim() || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      setErrorEditar('Error al guardar: ' + error.message)
      setGuardandoEdit(false)
      return
    }

    try {
      await fetch('https://api.leadconnectorhq.com/contacts/upsert', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer pit-022a5206-1196-4066-8957-50cf5634da09',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: editNombres.trim(),
          lastName: editApellidos.trim(),
          phone: telefono,
          ...(editEmail.trim() ? { email: editEmail.trim() } : {}),
          source: 'POS - Velik Beauty',
        }),
      })
    } catch (err) {
      console.error('Error actualizando contacto en GHL:', err)
    }

    const actualizado = data as Contact
    setAllContacts(prev => prev.map(c => c.id === id ? actualizado : c))
    setResults(prev => prev.map(c => c.id === id ? actualizado : c))
    setGuardandoEdit(false)
    setEditingId(null)
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
    setAllContacts(prev => [...prev, nuevo])
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

      {isOpen && search.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
          <div className="max-h-64 overflow-y-auto">
            {results.map((contact) => (
              <div
                key={contact.id}
                className="px-4 py-3 hover:bg-[#f9f6ee] border-b border-gray-100 last:border-0 transition-colors"
              >
                {editingId === contact.id ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={editNombres}
                        onChange={e => setEditNombres(e.target.value)}
                        placeholder="Nombres *"
                        className="px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]"
                      />
                      <input
                        value={editApellidos}
                        onChange={e => setEditApellidos(e.target.value)}
                        placeholder="Apellidos"
                        className="px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]"
                      />
                    </div>
                    <input
                      value={editTelefono}
                      onChange={e => setEditTelefono(e.target.value)}
                      placeholder="Teléfono *"
                      inputMode="tel"
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]"
                    />
                    <input
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      placeholder="Email (opcional)"
                      inputMode="email"
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#C9A84C]"
                    />
                    {errorEditar && <p className="text-xs text-red-500">{errorEditar}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => guardarEdicion(contact.id)}
                        disabled={guardandoEdit}
                        className="flex-1 flex items-center justify-center gap-1 py-2 bg-[#C9A84C] text-white rounded-lg text-xs font-medium disabled:opacity-60"
                      >
                        {guardandoEdit ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start gap-2">
                      <button onClick={() => handleSelect(contact)} className="flex-1 text-left">
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
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleSelect(contact)}
                          className="text-xs bg-[#C9A84C] text-white px-2 py-1 rounded"
                        >
                          Seleccionar
                        </button>
                        <button
                          onClick={() => abrirEditar(contact)}
                          title="Editar contacto"
                          className="p-1.5 text-gray-300 hover:text-[#C9A84C] hover:bg-[#faf6ee] rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDelId(confirmDelId === contact.id ? null : contact.id)}
                          title="Eliminar contacto"
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {confirmDelId === contact.id && (
                      <div className="mt-2 flex items-center gap-2 bg-red-50 rounded-lg p-2">
                        <p className="text-xs text-red-600 flex-1">¿Eliminar este contacto?</p>
                        <button
                          onClick={() => eliminarContacto(contact.id)}
                          disabled={eliminando}
                          className="px-2.5 py-1 bg-red-500 text-white text-xs rounded-lg font-medium disabled:opacity-60"
                        >
                          {eliminando ? '...' : 'Sí, eliminar'}
                        </button>
                        <button
                          onClick={() => setConfirmDelId(null)}
                          className="px-2.5 py-1 bg-gray-200 text-gray-600 text-xs rounded-lg font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
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
    </div>
  )
}
