import { useEffect, useState } from 'react'
import { reservationsAPI } from '../api/endpoints'
import './Pages.css'

function MyReservationsPage() {
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchMyReservations = async () => {
      try {
        setLoading(true)
        // TODO: call reservationsAPI.getMyReservations() and set reservations
        // const response = await reservationsAPI.getMyReservations()
        // setReservations(response.data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMyReservations()
  }, [])

  const handleCancel = async (reservationId) => {
    try {
      // TODO: call reservationsAPI.cancel(reservationId)
      alert('Reservation cancelled!')
      // Refresh the list
    } catch (err) {
      alert('Failed to cancel: ' + err.message)
    }
  }

  if (loading) return <div className="loading">Loading reservations...</div>
  if (error) return <div className="error">Error: {error}</div>

  return (
    <div className="page">
      <h1>My Reservations</h1>
      <div className="reservations-list">
        {reservations.length === 0 ? (
          <p>You haven't made any reservations yet</p>
        ) : (
          reservations.map((reservation) => (
            <div key={reservation.id} className="reservation-card">
              <h3>{reservation.listingTitle}</h3>
              <p>
                <strong>Check-in:</strong>{' '}
                {new Date(reservation.startDate).toLocaleDateString()}
              </p>
              <p>
                <strong>Check-out:</strong>{' '}
                {new Date(reservation.endDate).toLocaleDateString()}
              </p>
              <p>
                <strong>Guest:</strong> {reservation.userName}
              </p>
              <button
                onClick={() => handleCancel(reservation.id)}
                className="btn-small btn-danger"
              >
                Cancel Reservation
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default MyReservationsPage
