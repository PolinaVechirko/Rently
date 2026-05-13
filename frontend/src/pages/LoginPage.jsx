import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../api/endpoints'
import './Pages.css'

function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      // TODO: call authAPI.login(formData)
      // const response = await authAPI.login(formData)
      // localStorage.setItem('token', response.data.token)
      // localStorage.setItem('user', JSON.stringify(response.data.user))
      // navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="form-container">
        <h1>Login</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LoginPage
