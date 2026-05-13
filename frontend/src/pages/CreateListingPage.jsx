import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listingsAPI } from '../api/endpoints'
import './Pages.css'

function CreateListingPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
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
      // TODO: call listingsAPI.create(formData)
      // await listingsAPI.create(formData)
      alert('Listing created successfully!')
      navigate('/my-listings')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create listing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="form-container">
        <h1>Create New Listing</h1>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="form">
          <div className="form-group">
            <label htmlFor="title">Title:</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Apartment in the city center"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your property..."
              rows="5"
              required
            ></textarea>
          </div>
          <button type="submit" disabled={loading} className="btn">
            {loading ? 'Creating...' : 'Create Listing'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CreateListingPage
