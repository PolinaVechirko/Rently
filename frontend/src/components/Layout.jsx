import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Header from './Header'
import './Layout.css'

function Layout({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user is logged in (has token)
    const token = localStorage.getItem('token')
    setIsLoggedIn(!!token)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setIsLoggedIn(false)
    navigate('/')
  }

  return (
    <div className="layout">
        {/* use the shared Header component with sticky behaviour */}
        <Header />

      <main className="main-content">{children}</main>

      <footer className="footer">
        <p>&copy; 2025 Rently. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default Layout
