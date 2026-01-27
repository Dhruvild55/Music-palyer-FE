import './App.css'
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Home from './views/Home';
import RoomPlayer from './views/RoomPlayer';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';


function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/room/:roomId" element={<RoomPlayer />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App
