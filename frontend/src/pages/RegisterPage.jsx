import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../api/endpoints'
import './Pages.css'

function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'Guest',
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
      // TODO: call authAPI.register(formData)
      // const response = await authAPI.register(formData)
      // localStorage.setItem('token', response.data.token)
      // localStorage.setItem('user', JSON.stringify(response.data.user))
      // navigate('/')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="form-container">
        <h1>Register</h1>
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
            <label htmlFor="fullName">Full Name:</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
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
          <div className="form-group">
            <label htmlFor="role">I want to:</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
            >
              <option value="Guest">Book a property (Guest)</option>
              <option value="Host">List a property (Host)</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="btn">
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage
