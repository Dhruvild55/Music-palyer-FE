import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

const GlobalNotifications = () => {
    const socket = useSocket();
    const { user } = useAuth();
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (socket && user) {
            const handleDJLive = async (data) => {
                console.log('🔴 Received dj_went_live event:', data);
                try {
                    // Check if we follow this DJ
                    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${user._id}/following`, {
                        credentials: 'include'
                    });
                    const result = await res.json();
                    console.log('Following API response:', result);

                    // Handle the response structure correctly
                    const following = result.data?.following || [];
                    const isFollowing = following.some(f => f._id === data.djId);

                    console.log(`Do we follow ${data.djName}?`, isFollowing);

                    if (isFollowing) {
                        console.log('✅ Showing notification for', data.djName);
                        setNotification(data);
                        setTimeout(() => setNotification(null), 8000);
                    }
                } catch (err) {
                    console.error('Error checking follow status:', err);
                }
            };

            socket.on('dj_went_live', handleDJLive);
            console.log('👂 Global notification listener active');

            return () => {
                socket.off('dj_went_live', handleDJLive);
            };
        }
    }, [socket, user]);

    if (!notification) return null;

    return (
        <div className="fixed top-4 right-4 z-50 card-smooth p-4 shadow-2xl animate-in slide-in-from-top-2 max-w-sm">
            <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <div className="flex-1">
                    <p className="text-sm font-bold">{notification.djName} is now live!</p>
                    <p className="text-xs text-slate-500">{notification.roomName}</p>
                </div>
                <Link
                    to={`/room/${notification.roomId}`}
                    className="btn-primary px-3 py-1 rounded-lg text-xs"
                    onClick={() => setNotification(null)}
                >
                    Join
                </Link>
            </div>
        </div>
    );
};

export default GlobalNotifications;
