import { useState } from 'react'
import { USUARIOS } from '../types'

interface Props {
  onLogin: (userId: string, nombre: string, rol: string) => void
}

export default function Login({ onLogin }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  function handlePin(digit: string) {
    if (pin.length >= 4) return
    const next = pin + digit
    setPin(next)
    if (next.length === 4) {
      const user = USUARIOS.find(u => u.pin === next)
      if (user) {
        onLogin(user.id, user.nombre, user.rol)
      } else {
        setError('PIN incorrecto')
        setTimeout(() => { setPin(''); setError('') }, 800)
      }
    }
  }

  function handleDel() {
    setPin(p => p.slice(0, -1))
    setError('')
  }

  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="min-h-screen bg-[#f5f4f0] flex flex-col items-center justify-center">
      <div className="mb-8 text-center">
        <h1 className="font-serif text-5xl font-light tracking-widest text-[#1a1a1a]">VELIK</h1>
        <p className="text-xs tracking-[0.3em] text-[#8a7a6a] uppercase mt-1">Beauty House · POS</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-xs mx-4">
        <p className="text-center text-sm text-[#8a7a6a] mb-6">Ingresa tu PIN</p>

        <div className="flex justify-center gap-3 mb-8">
          {[0,1,2,3].map(i => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i < pin.length
                  ? error ? 'bg-red-400' : 'bg-[#C9A84C]'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-center text-xs text-red-400 -mt-4 mb-4">{error}</p>}

        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => (
            <button
              key={i}
              onClick={() => d === '⌫' ? handleDel() : d !== '' ? handlePin(d) : null}
              className={`h-14 rounded-xl text-lg font-medium transition-all ${
                d === '' ? 'invisible' :
                d === '⌫' ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' :
                'bg-[#f5f4f0] text-[#1a1a1a] hover:bg-[#C9A84C] hover:text-white active:scale-95'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
