// Icone SVG inline, stile Material Symbols semplificato — vedi STYLE.md §1.
// viewBox 0 0 24 24, currentColor, componenti riutilizzabili con size/className.

export function BallIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Pallone"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.2 15.2 10.6 14 14.4H10L8.8 10.6Z" />
      <path d="M12 8.2V4.3M15.2 10.6l3.6-1.3M14 14.4l1.9 3.4M10 14.4 8.1 17.8M8.8 10.6l-3.6-1.3" />
    </svg>
  )
}

export function WhistleIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Crea torneo"
    >
      <path d="M9 8h6.5a4 4 0 1 1 0 8H12l-3.5 4v-4H8a5 5 0 0 1-5-5v-1a2 2 0 0 1 2-2h1" />
      <circle cx="15.5" cy="12" r="1.6" />
      <path d="M4 8V5.5" />
    </svg>
  )
}

export function KeyIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Entra con codice"
    >
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12 18.5 4.5M18.5 4.5 21 7M18.5 4.5 16 7" />
    </svg>
  )
}

export function TrophyIcon({ size = 20, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      role="img"
      aria-label="Trofeo"
    >
      <title>Trofeo</title>
      <path d="M7 3h10v3h2.5a2.5 2.5 0 0 1-2.5 2.5v-.3A6 6 0 0 1 13 14.9V17h2a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2h2v-2.1A6 6 0 0 1 7 8.2V8.5A2.5 2.5 0 0 1 4.5 6H7Z" />
    </svg>
  )
}

export function CrownIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      role="img"
      aria-label="Host"
    >
      <title>Host</title>
      <path d="M4 8.5 8 12l4-6 4 6 4-3.5V17H4Z" />
      <rect x="4" y="18" width="16" height="2" rx="1" />
    </svg>
  )
}

export function ShieldIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Admin"
    >
      <path d="M12 3.5 19 6.3v5.1c0 4.4-2.9 7.7-7 8.6-4.1-.9-7-4.2-7-8.6V6.3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

export function UserIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Giocatore"
    >
      <circle cx="12" cy="8.2" r="3.2" />
      <path d="M5.5 19.5c0-3.2 2.9-5.7 6.5-5.7s6.5 2.5 6.5 5.7" />
    </svg>
  )
}

export function EyeIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Spettatore"
    >
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  )
}

export function EyeOffIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Nascondi"
    >
      <path d="M3.5 3.5 20.5 20.5" />
      <path d="M9.9 5.6C10.6 5.5 11.3 5.5 12 5.5c6 0 9.5 6.5 9.5 6.5a13.6 13.6 0 0 1-3.1 3.9M6.4 7.1C4 8.7 2.5 12 2.5 12S6 18.5 12 18.5c1.3 0 2.5-.3 3.6-.8" />
      <path d="M9.8 10.2a2.6 2.6 0 0 0 3.6 3.7" />
    </svg>
  )
}

export function CopyIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Copia"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 9V6.5A1.5 1.5 0 0 0 13.5 5H6a1.5 1.5 0 0 0-1.5 1.5v7.5A1.5 1.5 0 0 0 6 15.5H9" />
    </svg>
  )
}

export function CheckIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Salva"
    >
      <path d="M4.5 12.5 10 18 19.5 6.5" />
    </svg>
  )
}

export function PencilIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Modifica"
    >
      <path d="M4 20l.9-3.9L15.5 5.4a1.5 1.5 0 0 1 2.1 0l1 1a1.5 1.5 0 0 1 0 2.1L8 19.1 4 20Z" />
      <path d="M14 7 17 10" />
    </svg>
  )
}

export function UndoIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Annulla risultato"
    >
      <path d="M6.5 8H15a5 5 0 1 1 0 10h-3" />
      <path d="M9.5 4.5 6 8l3.5 3.5" />
    </svg>
  )
}

export function PlusIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Aggiungi gol"
    >
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  )
}

export function MinusIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Togli gol"
    >
      <path d="M5.5 12h13" />
    </svg>
  )
}

export function HomeIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Home"
    >
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5h12V10" />
      <path d="M10 19.5V14h4v5.5" />
    </svg>
  )
}

export function LogoutIcon({ size = 16, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Esci"
    >
      <path d="M14.5 4.5H8A1.5 1.5 0 0 0 6.5 6v12A1.5 1.5 0 0 0 8 19.5h6.5" />
      <path d="M11 12h9.5M20.5 12 17 8.5M20.5 12 17 15.5" />
    </svg>
  )
}

export function ChevronRightIcon({ size = 18, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label="Vai"
    >
      <path d="M9 5.5 15.5 12 9 18.5" />
    </svg>
  )
}
