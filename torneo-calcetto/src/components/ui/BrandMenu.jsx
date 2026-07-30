import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BallIcon, HomeIcon, LogoutIcon } from '../icons'
import { useAuth } from '../../context/AuthContext'

// Icona del pallone in alto a sinistra: apre un menu con le scorciatoie
// "Torna alla home" (dashboard tornei) e "Esci".
export default function BrandMenu() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const { signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    function handleKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div className="brand-menu" ref={rootRef}>
      <button
        type="button"
        className="brand-mark brand-mark-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
      >
        <BallIcon size={18} />
      </button>
      {open && (
        <div className="brand-menu-dropdown" role="menu">
          <button
            type="button"
            role="menuitem"
            className="brand-menu-item"
            onClick={() => {
              setOpen(false)
              navigate('/dashboard')
            }}
          >
            <HomeIcon size={16} />
            Torna alla home
          </button>
          <button
            type="button"
            role="menuitem"
            className="brand-menu-item"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
          >
            <LogoutIcon size={16} />
            Esci
          </button>
        </div>
      )}
    </div>
  )
}
