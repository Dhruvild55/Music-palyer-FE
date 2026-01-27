import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import PlaylistTab from "./PlaylistTab";
import FriendActivity from "../../components/FriendActivity";

const Home = () => {
    const socket = useSocket();
    const { user, logout } = useAuth();
    const [roomName, setRoomName] = useState('');
    const [roomDesc, setRoomDesc] = useState('');
    const [selectedMood, setSelectedMood] = useState('Chill');
    const [filterMood, setFilterMood] = useState('All');
    const [isPrivate, setIsPrivate] = useState(false);
    const [activeRooms, setActiveRooms] = useState([]);
    const [activeTab, setActiveTab] = useState('rooms');
    const navigate = useNavigate();

    // Profile State (for guests)
    const [nickname, setNickname] = useState(localStorage.getItem('streamvibe_name') || '');
    const [userColor, setUserColor] = useState(localStorage.getItem('streamvibe_color') || '#3b82f6');

    const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#f43f5e", "#06b6d4"];
    const moods = ["Chill", "Party", "Study", "Gaming", "Lofi", "Electronic"];

    const activeName = user ? user.username : nickname;
    const activeColor = user ? user.avatarColor : userColor;

    useEffect(() => {
        socket.emit('get_active_rooms');
        socket.on('update_active_rooms', (rooms) => {
            setActiveRooms(rooms);
        });
        return () => socket.off('update_active_rooms');
    }, [socket]);

    const handleCreateRoom = (e) => {
        e.preventDefault();
        const trimmedName = roomName.trim().toLowerCase();

        let gid = localStorage.getItem('streamvibe_uid');
        if (!gid) {
            gid = `guest_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
            localStorage.setItem('streamvibe_uid', gid);
        }

        if (trimmedName) {
            socket.emit('create_room', {
                roomId: trimmedName,
                isPublic: !isPrivate,
                name: roomName.trim(),
                userId: user?._id,
                guestId: gid,
                tags: [selectedMood],
                description: roomDesc.trim()
            });
            navigate(`/room/${trimmedName}`);
        }
    };

    const handleJoinRoom = (roomId) => navigate(`/room/${roomId}`);

    return (
        <div className="min-h-screen text-slate-200 p-6 md:p-12 animate-fade-in">
            <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-10 items-start max-w-[1600px] mx-auto">

                {/* Profile & Action Sidebar */}
                <div className="xl:col-span-4 space-y-8">
                    {/* Simplified Profile Card */}
                    <div className="card-smooth p-8 space-y-6 relative overflow-hidden">
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg" style={{ backgroundColor: activeColor }}>
                                    {activeName ? activeName[0].toUpperCase() : "?"}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0b0e14]"></div>
                            </div>
                            <div>
                                {user ? (
                                    <Link to={`/profile/${user._id}`} className="hover:text-blue-400 transition-colors">
                                        <h2 className="text-xl font-bold tracking-tight">{user.username}</h2>
                                    </Link>
                                ) : (
                                    <h2 className="text-xl font-bold tracking-tight">Guest User</h2>
                                )}
                                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{user ? "Authenticated" : "Temporary Session"}</p>
                            </div>
                            {user && (
                                <button onClick={logout} className="ml-auto text-[10px] font-bold text-slate-500 hover:text-red-400 transition-colors uppercase">Logout</button>
                            )}
                        </div>

                        {!user && (
                            <div className="space-y-4 pt-4 border-t border-white/5">
                                <input
                                    type="text"
                                    placeholder="Enter Nickname..."
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className="w-full input-smooth rounded-xl py-3 px-4 text-sm font-medium placeholder-slate-700"
                                />
                                <div className="flex flex-wrap gap-2">
                                    {colors.map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setUserColor(c)}
                                            className={`w-7 h-7 rounded-lg transition-all ${userColor === c ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-40 hover:opacity-100'}`}
                                            style={{ backgroundColor: c }}
                                        ></button>
                                    ))}
                                </div>
                                <div className="pt-2">
                                    <Link to="/login" className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest">Sign in for DJ status</Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Simple Create Room Card */}
                    <div className="card-smooth p-8 space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-bold tracking-tight">Launch Room</h3>
                            <p className="text-xs text-slate-500">Create a new frequency to broadcast music.</p>
                        </div>

                        <form onSubmit={handleCreateRoom} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Room identifier..."
                                value={roomName}
                                onChange={(e) => setRoomName(e.target.value)}
                                className="w-full input-smooth rounded-xl py-4 px-5 text-sm font-medium"
                                required
                            />

                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Vibe / Mood</label>
                                <div className="flex flex-wrap gap-2">
                                    {moods.map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setSelectedMood(m)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${selectedMood === m ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <input
                                type="text"
                                placeholder="Short slogan / info..."
                                value={roomDesc}
                                onChange={(e) => setRoomDesc(e.target.value)}
                                className="w-full input-smooth rounded-xl py-4 px-5 text-sm font-medium"
                            />

                            <button
                                type="submit"
                                className="w-full btn-primary py-4 rounded-xl text-xs uppercase tracking-widest"
                            >
                                Initialize Room
                            </button>
                        </form>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="xl:col-span-8 space-y-8">
                    {/* Navigation Tabs & Filter */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-white/5 gap-6">
                        <div className="flex gap-8">
                            <button
                                onClick={() => setActiveTab('rooms')}
                                className={`pb-4 text-sm font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'rooms' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Global Rooms
                                {activeTab === 'rooms' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 animate-in fade-in slide-in-from-bottom-1"></div>}
                            </button>

                            {user && (
                                <button
                                    onClick={() => setActiveTab('playlists')}
                                    className={`pb-4 text-sm font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'playlists' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    My Library
                                    {activeTab === 'playlists' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 animate-in fade-in slide-in-from-bottom-1"></div>}
                                </button>
                            )}
                        </div>

                        {activeTab === 'rooms' && (
                            <div className="flex items-center gap-3 pb-4 overflow-x-auto no-scrollbar">
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mr-2 whitespace-nowrap">Explore:</span>
                                {["All", ...moods].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => setFilterMood(m)}
                                        className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${filterMood === m ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-600 hover:text-slate-400'}`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {activeTab === 'rooms' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                            {activeRooms.filter(r => filterMood === 'All' || r.tags?.includes(filterMood)).length > 0 ? (
                                activeRooms.filter(r => filterMood === 'All' || r.tags?.includes(filterMood)).map((room) => (
                                    <div
                                        key={room.id}
                                        className="card-smooth p-6 flex flex-col justify-between min-h-[260px] transition-all hover:-translate-y-1 group"
                                    >
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="text-xl font-bold tracking-tight">#{room.name}</h3>
                                                        <div className="flex gap-1">
                                                            {room.tags?.map(t => (
                                                                <span key={t} className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase tracking-widest rounded-md">
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 font-medium italic line-clamp-1">{room.description || "No broadcast signal description."}</p>
                                                </div>
                                            </div>

                                            <div className="bg-[#020617] p-4 rounded-xl border border-white/5 flex items-center gap-4 group-hover:bg-[#020617]/80 transition-all">
                                                {room.currentSong ? (
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <img src={room.currentSong.thumbnail} className="w-10 h-10 rounded-lg object-cover" alt="" />
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                                                <p className="text-[9px] font-bold text-green-500 uppercase tracking-widest leading-none">Live</p>
                                                            </div>
                                                            <p className="text-xs font-bold truncate text-slate-200">{room.currentSong.title}</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-slate-600 font-bold uppercase w-full text-center">Frequency Idle</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between mt-6">
                                            <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                                {room.userCount} Listeners
                                            </div>
                                            <button
                                                onClick={() => handleJoinRoom(room.id)}
                                                className="px-6 py-2.5 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95"
                                            >
                                                Tune In
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-24 text-center space-y-4 border-2 border-dashed border-white/5 rounded-3xl">
                                    <p className="text-slate-600 font-bold uppercase text-xs tracking-[0.2em]">No streams identified</p>
                                    <p className="text-[10px] text-slate-700 uppercase font-bold tracking-widest">Be the first to initialize a global frequency</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-500 space-y-8">
                            <PlaylistTab />
                            <FriendActivity />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Home;