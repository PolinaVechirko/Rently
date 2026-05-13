import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listingsAPI } from '../api/endpoints'
import './Pages.css'
// import image for photo square
import mainPhoto from '../assets/images/background-mainPadge.png'

function HomePage() {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchListings = async () => {
      try {
        setLoading(true)
        // TODO: call listingsAPI.getAll() and set listings
        // const response = await listingsAPI.getAll()
        // setListings(response.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchListings()
  }, [])

  if (loading) return <div className="loading">Loading listings...</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <div className="page">
      <div className="photo-square">
        <img src={mainPhoto} alt="Main" />
      </div>
      <h1>Available Listings</h1>
      <div className="listings-grid">
        {listings.length === 0 ? (
          <p>No listings available</p>
        ) : (
          listings.map((listing) => (
            <Link
              key={listing.id}
              to={`/listing/${listing.id}`}
              className="listing-card"
            >
              <div className="listing-image">📷</div>
              <h3>{listing.title}</h3>
              <p>{listing.description}</p>
              <p className="owner">Host: {listing.ownerName}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export default HomePage
