import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function RequireAuth({ roles, children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="page-loader">
        <Loader2 className="spin" size={28} />
      </div>
    )
  }
  if (!user) return <Navigate to="/signin" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}
