import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listingsAPI } from '../api/endpoints'
import './Pages.css'

function MyListingsPage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchMyListings = async () => {
      try {
        setLoading(true)
        const user = JSON.parse(localStorage.getItem('user') || '{}')
        // TODO: call listingsAPI.getByOwner(user.id) and set listings
        // const response = await listingsAPI.getByOwner(user.id)
        // setListings(response.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMyListings()
  }, [])

  if (loading) return <div className="loading">Loading listings...</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <div className="page">
      <h1>My Listings</h1>
      <Link to="/create-listing" className="btn">
        + Create New Listing
      </Link>
      <div className="listings-grid">
        {listings.length === 0 ? (
          <p>You haven't created any listings yet</p>
        ) : (
          listings.map((listing) => (
            <div key={listing.id} className="listing-card">
              <div className="listing-image">📷</div>
              <h3>{listing.title}</h3>
              <p>{listing.description}</p>
              <div className="card-actions">
                <button className="btn-small">Edit</button>
                <button className="btn-small btn-danger">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default MyListingsPage
