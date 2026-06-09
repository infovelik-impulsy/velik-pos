import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
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
}

export default function ContactSearch({ onSelect, selectedName }: ContactSearchProps) {
  const [search, setSearch] = useState(selectedName || '')
  const [results, setResults] = useState<Contact[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

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
        .ilike('nombres', `%${search}%`)
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
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
          <div className="max-h-60 overflow-y-auto">
            {results.map((contact) => (
              <button
                key={contact.id}
                onClick={() => handleSelect(contact)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
              >
                <div className="font-medium text-sm">
                  {contact.nombres} {contact.apellidos || ''}
                </div>
                <div className="text-xs text-gray-500">
                  {contact.telefono}
                </div>
              </button>
            ))}
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
