import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { listingsAPI, reservationsAPI } from '../api/endpoints'
import './Pages.css'

function ListingDetailPage() {
  const { id } = useParams()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reservationDates, setReservationDates] = useState({
    startDate: '',
    endDate: '',
  })

  useEffect(() => {
    const fetchListing = async () => {
      try {
        setLoading(true)
        // TODO: call listingsAPI.getById(id) and set listing
        // const response = await listingsAPI.getById(id)
        // setListing(response.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchListing()
  }, [id])

  const handleReservation = async () => {
    try {
      // TODO: call reservationsAPI.create() with listing id and dates
      // await reservationsAPI.create({
      //   listingId: parseInt(id),
      //   startDate: new Date(reservationDates.startDate),
      //   endDate: new Date(reservationDates.endDate),
      // })
      alert('Reservation created!')
    } catch (err) {
      alert('Failed to create reservation: ' + err.message)
    }
  }

  if (loading) return <div className="loading">Loading listing...</div>
  if (error) return <div className="error">Error: {error}</div>
  if (!listing) return <div className="error">Listing not found</div>

  return (
    <div className="page">
      <h1>{listing.title}</h1>
      <div className="listing-detail">
        <div className="listing-image-large">📷</div>
        <div className="listing-info">
          <p>{listing.description}</p>
          <p className="host-info">Host: {listing.ownerName}</p>
        </div>
        <div className="reservation-form">
          <h3>Make a Reservation</h3>
          <div className="form-group">
            <label htmlFor="startDate">Check-in:</label>
            <input
              type="date"
              id="startDate"
              value={reservationDates.startDate}
              onChange={(e) =>
                setReservationDates((prev) => ({
                  ...prev,
                  startDate: e.target.value,
                }))
              }
            />
          </div>
          <div className="form-group">
            <label htmlFor="endDate">Check-out:</label>
            <input
              type="date"
              id="endDate"
              value={reservationDates.endDate}
              onChange={(e) =>
                setReservationDates((prev) => ({
                  ...prev,
                  endDate: e.target.value,
                }))
              }
            />
          </div>
          <button onClick={handleReservation} className="btn">
            Reserve Now
          </button>
        </div>
      </div>
    </div>
  )
}

export default ListingDetailPage
