import { useState } from 'react'
import { CheckIcon, PencilIcon } from '../icons'

// Testo modificabile inline: mostra un pulsante a matita che apre un piccolo
// form con salva/annulla. Usato per rinominare tornei, squadre e ospiti.
export default function EditableText({ value, onSave, disabled, ariaLabel, as: Tag = 'span' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [busy, setBusy] = useState(false)

  // quando il testo È il titolo della card (as="h3") serve il layout a riga
  // piena, altrimenti la matita insegue la fine dell'ultima parola
  const heading = Tag !== 'span'

  if (!editing) {
    return (
      <span className={`editable-name${heading ? ' editable-name-heading' : ''}`}>
        <Tag className="editable-name-value">{value}</Tag>
        {!disabled && (
          <button
            type="button"
            className="btn btn-ghost btn-sm icon-btn"
            aria-label={ariaLabel ?? 'Rinomina'}
            onClick={() => {
              setDraft(value)
              setEditing(true)
            }}
          >
            <PencilIcon size={14} />
          </button>
        )}
      </span>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const next = draft.trim()
    if (!next || next === value) {
      setEditing(false)
      return
    }
    setBusy(true)
    try {
      await onSave(next)
      setEditing(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      className={`editable-name-form${heading ? ' editable-name-heading' : ''}`}
      onSubmit={handleSubmit}
    >
      <input
        type="text"
        value={draft}
        autoFocus
        disabled={busy}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setEditing(false)
        }}
      />
      <button type="submit" className="btn btn-ghost btn-sm icon-btn" disabled={busy} aria-label="Salva">
        <CheckIcon size={14} />
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm icon-btn"
        disabled={busy}
        aria-label="Annulla"
        onClick={() => setEditing(false)}
      >
        ×
      </button>
    </form>
  )
}
