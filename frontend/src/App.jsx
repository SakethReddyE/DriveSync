import { Routes, Route, Navigate } from 'react-router-dom'
import PaperBg from './components/PaperBg'
import Navbar from './components/Navbar'
import RequireAuth from './components/RequireAuth'
import Landing from './pages/Landing'
import SignIn from './pages/SignIn'
import Book from './pages/Book'
import BecomeDriver from './pages/BecomeDriver'
import RiderDashboard from './pages/RiderDashboard'
import DriverDashboard from './pages/DriverDashboard'
import AdminDashboard from './pages/AdminDashboard'
import Track from './pages/Track'

export default function App() {
  return (
    <>
      <PaperBg />
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/book" element={<Book />} />
        <Route path="/become-driver" element={<BecomeDriver />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth roles={['user']}>
              <RiderDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/driver"
          element={
            <RequireAuth roles={['driver', 'driver-pending']}>
              <DriverDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth roles={['admin']}>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/track/:id"
          element={
            <RequireAuth roles={['user']}>
              <Track />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
