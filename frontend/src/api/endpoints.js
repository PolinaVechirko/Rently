import apiClient from './apiClient'

// Auth endpoints
export const authAPI = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  getCurrentUser: () => apiClient.get('/auth/me'),
}

// Listings endpoints
export const listingsAPI = {
  getAll: () => apiClient.get('/listings'),
  getById: (id) => apiClient.get(`/listings/${id}`),
  create: (data) => apiClient.post('/listings', data),
  update: (id, data) => apiClient.put(`/listings/${id}`, data),
  delete: (id) => apiClient.delete(`/listings/${id}`),
  getByOwner: (ownerId) => apiClient.get(`/listings/owner/${ownerId}`),
}

// Reservations endpoints
export const reservationsAPI = {
  getAll: () => apiClient.get('/reservations'),
  getById: (id) => apiClient.get(`/reservations/${id}`),
  create: (data) => apiClient.post('/reservations', data),
  cancel: (id) => apiClient.delete(`/reservations/${id}`),
  getMyReservations: () => apiClient.get('/reservations/user/my'),
  getByListing: (listingId) => apiClient.get(`/reservations/listing/${listingId}`),
  checkAvailability: (data) => apiClient.post('/reservations/check-availability', data),
}
