import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import ListingDetailPage from './pages/ListingDetailPage'
import MyListingsPage from './pages/MyListingsPage'
import CreateListingPage from './pages/CreateListingPage'
import MyReservationsPage from './pages/MyReservationsPage'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/my-listings" element={<MyListingsPage />} />
          <Route path="/create-listing" element={<CreateListingPage />} />
          <Route path="/my-reservations" element={<MyReservationsPage />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
