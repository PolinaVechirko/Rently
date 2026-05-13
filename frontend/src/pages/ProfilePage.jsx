import { useEffect, useState } from 'react'
import { authAPI } from '../api/endpoints'
import './Pages.css'

function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        setLoading(true)
        // TODO: call authAPI.getCurrentUser() and set user
        // const response = await authAPI.getCurrentUser()
        // setUser(response.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchCurrentUser()
  }, [])

  if (loading) return <div className="loading">Loading profile...</div>
  if (error) return <div className="error">Error: {error}</div>
  if (!user) return <div className="error">User not found</div>

  return (
    <div className="page">
      <h1>My Profile</h1>
      <div className="profile-card">
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Full Name:</strong> {user.fullName}
        </p>
        <p>
          <strong>Role:</strong> {user.role}
        </p>
      </div>
    </div>
  )
}

export default ProfilePage
