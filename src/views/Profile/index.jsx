import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, useAuth } from '../../context/AuthContext';

const Profile = () => {
    const { userId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [bio, setBio] = useState('');
    const [avatarColor, setAvatarColor] = useState('#3b82f6');
    const [isFollowing, setIsFollowing] = useState(false);

    const isOwnProfile = user && user._id === userId;

    useEffect(() => {
        fetchProfile();
        if (user && !isOwnProfile) {
            checkFollowStatus();
        }
    }, [userId, user]);

    const checkFollowStatus = async () => {
        try {
            const res = await api.get(`/api/users/${user._id}/following`);
            const following = res.data.data.following;
            setIsFollowing(following.some(u => u._id === userId));
        } catch (err) {
            console.error(err);
        }
    };

    const handleFollow = async () => {
        try {
            await api.post(`/api/users/${userId}/follow`);
            setIsFollowing(true);
            fetchProfile();
        } catch (err) {
            console.error(err);
        }
    };

    const handleUnfollow = async () => {
        try {
            await api.delete(`/api/users/${userId}/unfollow`);
            setIsFollowing(false);
            fetchProfile();
        } catch (err) {
            console.error(err);
        }
    };

    const fetchProfile = async () => {
        try {
            const res = await api.get(`/api/users/${userId}/profile`);
            setProfileData(res.data.data.user);
            setBio(res.data.data.user.bio || '');
            setAvatarColor(res.data.data.user.avatarColor);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleUpdateProfile = async () => {
        try {
            await api.patch('/api/users/profile', { bio, avatarColor });
            setIsEditing(false);
            fetchProfile();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center">
                <div className="text-blue-500 text-xl">Loading profile...</div>
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center">
                <div className="text-red-500 text-xl">User not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0b0e14] text-slate-200 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="text-slate-500 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                    <h1 className="text-3xl font-bold">Profile</h1>
                </div>

                {/* Profile Card */}
                <div className="card-smooth p-8 space-y-6">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                        {/* Avatar */}
                        <div
                            className="w-32 h-32 rounded-full flex items-center justify-center text-5xl font-bold shadow-2xl"
                            style={{ backgroundColor: isEditing ? avatarColor : profileData.avatarColor }}
                        >
                            {profileData.username[0].toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center md:text-left space-y-4">
                            <h2 className="text-3xl font-bold">{profileData.username}</h2>

                            {isEditing ? (
                                <div className="space-y-4">
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        maxLength={200}
                                        placeholder="Tell us about yourself..."
                                        className="w-full input-smooth rounded-xl p-4 text-sm resize-none h-24"
                                    />
                                    <div className="space-y-2">
                                        <label className="text-xs uppercase tracking-widest text-slate-500">Avatar Color</label>
                                        <input
                                            type="color"
                                            value={avatarColor}
                                            onChange={(e) => setAvatarColor(e.target.value)}
                                            className="w-full h-12 rounded-xl cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={handleUpdateProfile} className="btn-primary px-6 py-2 rounded-xl">
                                            Save
                                        </button>
                                        <button onClick={() => setIsEditing(false)} className="card-smooth px-6 py-2 rounded-xl hover:bg-white/5">
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-slate-400 italic">{profileData.bio || "No bio yet..."}</p>
                                    <div className="flex gap-3">
                                        {isOwnProfile && (
                                            <button onClick={() => setIsEditing(true)} className="btn-primary px-6 py-2 rounded-xl">
                                                Edit Profile
                                            </button>
                                        )}
                                        {!isOwnProfile && user && (
                                            <button
                                                onClick={isFollowing ? handleUnfollow : handleFollow}
                                                className={`px-6 py-2 rounded-xl font-bold transition-all ${isFollowing
                                                        ? 'card-smooth hover:bg-white/5'
                                                        : 'btn-primary'
                                                    }`}
                                            >
                                                {isFollowing ? 'Following' : 'Follow'}
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/5">
                        <div className="text-center space-y-1">
                            <div className="text-3xl font-bold text-blue-500">{profileData.totalListeningHours}</div>
                            <div className="text-xs uppercase tracking-widest text-slate-500">Hours Listened</div>
                        </div>
                        <div className="text-center space-y-1">
                            <div className="text-3xl font-bold text-blue-500">{profileData.createdRoomsCount}</div>
                            <div className="text-xs uppercase tracking-widest text-slate-500">Rooms Created</div>
                        </div>
                        <div className="text-center space-y-1">
                            <div className="text-3xl font-bold text-blue-500">{profileData.followersCount}</div>
                            <div className="text-xs uppercase tracking-widest text-slate-500">Followers</div>
                        </div>
                        <div className="text-center space-y-1">
                            <div className="text-3xl font-bold text-blue-500">{profileData.followingCount}</div>
                            <div className="text-xs uppercase tracking-widest text-slate-500">Following</div>
                        </div>
                    </div>
                </div>

                {/* Recent Listening History */}
                <div className="card-smooth p-6 space-y-4">
                    <h3 className="text-xl font-bold">Recent Sessions</h3>
                    {profileData.recentHistory && profileData.recentHistory.length > 0 ? (
                        <div className="space-y-2">
                            {profileData.recentHistory.map((session, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5">
                                    <div>
                                        <div className="font-bold">{session.roomName || session.roomId}</div>
                                        <div className="text-xs text-slate-500">
                                            {new Date(session.timestamp).toLocaleDateString()} • {Math.floor((session.duration || 0) / 60)} min
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-500 italic text-center py-8">No listening history yet</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;
