import './App.css'
import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Home from './views/Home';
import RoomPlayer from './views/RoomPlayer';
import Profile from './views/Profile';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import GlobalNotifications from './components/GlobalNotifications';


function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <GlobalNotifications />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/room/:roomId" element={<RoomPlayer />} />
            <Route path="/profile/:userId" element={<Profile />} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App
