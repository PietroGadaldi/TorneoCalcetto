// Specchio client di can_manage() in docs/schema.sql: usato solo per
// nascondere/mostrare azioni nell'interfaccia. Il DB riverifica sempre —
// questo file non è mai la fonte di autorità.

export const ROLES = ['host', 'admin', 'player', 'spectator']

export const ROLE_LABELS = {
  host: 'Host',
  admin: 'Admin',
  player: 'Giocatore',
  spectator: 'Spettatore',
}

export function canManage(myRole, targetRole) {
  if (myRole === 'host') return ['admin', 'player', 'spectator'].includes(targetRole)
  if (myRole === 'admin') return ['player', 'spectator'].includes(targetRole)
  return false
}

export function canPromoteToAdmin(myRole) {
  return myRole === 'host'
}

export function isStaff(myRole) {
  return myRole === 'host' || myRole === 'admin'
}
