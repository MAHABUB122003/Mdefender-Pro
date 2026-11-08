import { Navigate } from 'react-router-dom'

export default function SessionsPage() {
  return <Navigate to="/user/settings?tab=sessions" replace />
}
