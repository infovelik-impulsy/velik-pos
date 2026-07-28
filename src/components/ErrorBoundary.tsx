import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', padding: 24, textAlign: 'center', fontFamily: 'sans-serif', gap: 12,
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 600 }}>No se pudo cargar Velik POS</h1>
          <p style={{ color: '#555', maxWidth: 420 }}>
            Esto suele pasar en modo de navegación privada/incógnito o con el bloqueo de cookies activado.
            Intenta abrir el enlace en una pestaña normal de Safari o Chrome.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc', background: '#fff' }}
          >
            Reintentar
          </button>
          <p style={{ color: '#999', fontSize: 12, maxWidth: 420, wordBreak: 'break-word' }}>
            {this.state.error.message}
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
