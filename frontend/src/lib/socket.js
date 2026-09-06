import { io } from 'socket.io-client'
import { SOCKET_URL } from './api'

let socket = null

export function connectSocket(role, id) {
  if (!id) return null
  if (!socket) {
    socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] })
  }
  const register = () => socket.emit('register', { role, id })
  if (socket.connected) register()
  socket.off('connect', register)
  socket.on('connect', register)
  return socket
}

export function getSocket() {
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
