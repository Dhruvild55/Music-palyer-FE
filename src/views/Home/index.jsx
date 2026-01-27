import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";

const Home = () => {
    const socket = useSocket();
    const { user, logout } = useAuth();
    const [roomName, setRoomName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [activeRooms, setActiveRooms] = useState([]);
    const navigate = useNavigate();

    // Profile State (for guests)
    const [nickname, setNickname] = useState(localStorage.getItem('streamvibe_name') || '');
    const [userColor, setUserColor] = useState(localStorage.getItem('streamvibe_color') || '#3b82f6');

    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#f43f5e", "#06b6d4"];

    // Effective profile (Auth User vs Guest)
    const activeName = user ? user.username : nickname;
    const activeColor = user ? user.avatarColor : userColor;

    useEffect(() => {
        socket.emit('get_active_rooms');

        socket.on('update_active_rooms', (rooms) => {
            setActiveRooms(rooms);
        });

        return () => {
            socket.off('update_active_rooms');
        };
    }, [socket]);

    useEffect(() => {
        if (!user) {
            localStorage.setItem('streamvibe_name', nickname);
            localStorage.setItem('streamvibe_color', userColor);
        }
    }, [nickname, userColor, user]);

    const handleCreateRoom = (e) => {
        e.preventDefault();
        const trimmedName = roomName.trim().toLowerCase();
        if (trimmedName) {
            socket.emit('create_room', {
                roomId: trimmedName,
                isPublic: !isPrivate,
                name: roomName.trim()
            });
            navigate(`/room/${trimmedName}`);
        }
    };

    const handleJoinRoom = (roomId) => {
        navigate(`/room/${roomId}`);
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-12 bg-[url('/music_player_bg.png')] bg-cover bg-center">
            <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">

                {/* Profile & Create Section */}
                <div className="xl:col-span-4 space-y-8">
                    {/* User Profile Card */}
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6 relative overflow-hidden">
                        {user && (
                            <div className="absolute top-0 right-0 p-4">
                                <button onClick={logout} className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-500 transition-colors">Logout</button>
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black shadow-inner border-2 border-white/10" style={{ backgroundColor: activeColor }}>
                                {activeName ? activeName[0].toUpperCase() : "?"}
                            </div>
                            <div>
                                <h2 className="text-xl font-black italic tracking-tight">{user ? `@${user.username}` : "Guest Identity"}</h2>
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-tight">
                                    {user ? "Authenticated Master DJ" : "Temporary Identity"}
                                </p>
                            </div>
                        </div>

                        {!user ? (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Enter Nickname..."
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-bold placeholder-slate-700 transition-all text-sm"
                                />

                                <div className="flex flex-wrap gap-2.5">
                                    {colors.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setUserColor(c)}
                                            className={`w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110 active:scale-95 ${userColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                            style={{ backgroundColor: c }}
                                        ></button>
                                    ))}
                                </div>
                                <div className="pt-2 text-center">
                                    <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-all">Or Sign In for permanent DJ rights</Link>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Welcome back, {user.username} 🎧</p>
                            </div>
                        )}
                    </div>

                    {/* Create Room Card */}
                    <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
                        <div className="text-center">
                            <h1 className="text-4xl font-black mb-1 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent italic tracking-tighter">
                                Start Vibes
                            </h1>
                        </div>

                        <form onSubmit={handleCreateRoom} className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Room Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Chill Beats..."
                                    value={roomName}
                                    onChange={(e) => setRoomName(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-bold placeholder-slate-700 transition-all"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                <div>
                                    <h4 className="font-bold text-xs">Private</h4>
                                    <p className="text-[8px] text-slate-600 uppercase font-black">Invite only</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isPrivate}
                                        onChange={() => setIsPrivate(!isPrivate)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-black py-4 rounded-xl shadow-xl transform transition hover:scale-[1.02] active:scale-[0.98] uppercase tracking-wide text-sm"
                            >
                                Launch Room 🚀
                            </button>
                        </form>
                    </div>
                </div>

                {/* Discovery Section (Leaderboard) */}
                <div className="xl:col-span-8 space-y-8">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <h2 className="text-3xl font-black tracking-tighter flex items-center gap-3">
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></span>
                            Trending Now
                        </h2>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{activeRooms.length} Public Streams</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                        {activeRooms.length > 0 ? (
                            activeRooms.map((room, index) => (
                                <div
                                    key={room.id}
                                    className="group relative bg-[#181818] hover:bg-[#202020] border border-white/5 p-6 rounded-3xl transition-all shadow-2xl flex flex-col justify-between"
                                >
                                    {/* Rank Badge */}
                                    <div className={`absolute -top-3 -left-3 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg shadow-xl z-10 transform -rotate-12 group-hover:rotate-0 transition-transform ${index === 0 ? 'bg-yellow-500 text-black' : index === 1 ? 'bg-slate-300 text-black' : index === 2 ? 'bg-orange-400 text-black' : 'bg-[#282828] text-white'}`}>
                                        {index + 1}
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-start">
                                            <h3 className="text-2xl font-black group-hover:text-blue-400 transition-colors tracking-tight">#{room.name}</h3>
                                            <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                                                {room.userCount} 🔥
                                            </span>
                                        </div>

                                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 min-h-[80px] flex items-center gap-4">
                                            {room.currentSong ? (
                                                <>
                                                    <img src={room.currentSong.thumbnail} className="w-12 h-12 rounded-lg object-cover shadow-lg" alt="" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-black text-green-500 uppercase tracking-widest animate-pulse">Playing</p>
                                                        <p className="text-sm font-bold truncate text-slate-200">{room.currentSong.title}</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-xs text-slate-600 italic font-medium w-full text-center">Waiting for DJ to drop the beat...</p>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleJoinRoom(room.id)}
                                        className="mt-6 w-full bg-[#282828] hover:bg-blue-600 text-white text-xs font-black py-4 rounded-xl transition-all uppercase tracking-widest border border-white/5 hover:border-blue-500 shadow-xl"
                                    >
                                        Join the Sync
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full bg-white/5 border border-white/5 border-dashed p-20 rounded-[40px] text-center">
                                <div className="text-6xl mb-6 opacity-20">🎛️</div>
                                <p className="text-slate-400 font-black uppercase text-sm tracking-widest">Global Mainframe Empty</p>
                                <p className="text-slate-600 text-xs mt-3 italic">Be the alpha DJ and start the first public stream.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}

export default Home;