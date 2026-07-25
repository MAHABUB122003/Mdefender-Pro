import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import api from '../../api/api'

export default function GoogleCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      api.googleCallback(code)
        .then(data => {
          if (data.status === 'success') {
            window.location.href = '/user/dashboard'
          }
        })
        .catch(() => {
          navigate('/user/login?error=google_auth_failed')
        })
    } else {
      navigate('/user/login')
    }
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
        <p className="text-white">Completing Google sign-in...</p>
      </div>
    </div>
  )
}
