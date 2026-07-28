export default function Alert({ tone = 'error', children }) {
  if (!children) return null
  return <div className={`alert alert-${tone}`}>{children}</div>
}
