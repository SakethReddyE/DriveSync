import { Routes, Route } from 'react-router-dom'
import PaperBg from './components/PaperBg'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import SignIn from './pages/SignIn'
import Book from './pages/Book'

export default function App() {
  return (
    <>
      <PaperBg />
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/book" element={<Book />} />
      </Routes>
    </>
  )
}
