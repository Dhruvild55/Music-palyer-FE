import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Set default axios config
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
axios.defaults.withCredentials = true;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if user is logged in on mount
        const checkLoggedIn = async () => {
            try {
                const res = await axios.get('/api/auth/me');
                if (res.data.status === 'success') {
                    setUser(res.data.data.user);
                }
            } catch (err) {
                // Not logged in or guest
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkLoggedIn();
    }, []);

    const signup = async (userData) => {
        const res = await axios.post('/api/auth/signup', userData);
        if (res.data.status === 'success') {
            setUser(res.data.data.user);
            return res.data.data.user;
        }
    };

    const login = async (email, password) => {
        const res = await axios.post('/api/auth/login', { email, password });
        if (res.data.status === 'success') {
            setUser(res.data.data.user);
            return res.data.data.user;
        }
    };

    const logout = async () => {
        await axios.get('/api/auth/logout');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signup, login, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
