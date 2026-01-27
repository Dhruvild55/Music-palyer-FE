import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const FriendActivity = () => {
    const { user } = useAuth();
    const socket = useSocket();
    const [friends, setFriends] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (user) {
            fetchFriendsActivity();
            // Refresh every 30 seconds to update live status
            const interval = setInterval(fetchFriendsActivity, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    useEffect(() => {
        if (socket && user) {
            const handleDJLive = async (data) => {
                console.log('Received dj_went_live event:', data);
                try {
                    // Check if we follow this DJ
                    const res = await api.get(`/api/users/${user._id}/following`);
                    const following = res.data.data.following;
                    const isFollowing = following.some(f => f._id === data.djId);

                    console.log(`Do we follow ${data.djName}?`, isFollowing);

                    if (isFollowing) {
                        console.log('Showing notification for', data.djName);
                        setNotification(data);
                        setTimeout(() => setNotification(null), 5000);
                        fetchFriendsActivity();
                    }
                } catch (err) {
                    console.error('Error checking follow status:', err);
                }
            };

            socket.on('dj_went_live', handleDJLive);
            return () => socket.off('dj_went_live', handleDJLive);
        }
    }, [socket, user]);

    const fetchFriendsActivity = async () => {
        try {
            const res = await api.get('/api/users/friends/activity');
            setFriends(res.data.data.friends);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <>
            {/* Live Notification Toast */}
            {notification && (
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
                        >
                            Join
                        </Link>
                    </div>
                </div>
            )}

            <div className="card-smooth p-6 space-y-4 h-fit">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Friends</h3>

                {loading ? (
                    <div className="text-center py-4 text-slate-500">Loading...</div>
                ) : friends.length > 0 ? (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {friends.map((friend) => (
                            <div key={friend._id} className="space-y-2">
                                <Link
                                    to={`/profile/${friend._id}`}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group"
                                >
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold relative"
                                        style={{ backgroundColor: friend.avatarColor }}
                                    >
                                        {friend.username[0].toUpperCase()}
                                        {friend.isLive && (
                                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-[#0b0e14] animate-pulse"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold truncate group-hover:text-blue-400 transition-colors">
                                            {friend.username}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                                            {friend.isLive ? 'LIVE NOW' : 'Following'}
                                        </div>
                                    </div>
                                </Link>
                                {friend.isLive && friend.currentRoom && (
                                    <Link
                                        to={`/room/${friend.currentRoom.roomId}`}
                                        className="ml-13 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold hover:bg-red-500/20 transition-all flex items-center gap-2"
                                    >
                                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                        Join {friend.currentRoom.name}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500 italic">
                        <p className="text-sm">No friends yet</p>
                        <p className="text-xs mt-2">Follow users to see them here!</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default FriendActivity;
