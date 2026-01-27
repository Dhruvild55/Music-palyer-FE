import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { SocketProvider, useSocket } from "../../context/SocketContext";
import { api, useAuth } from "../../context/AuthContext";
import YouTube from "react-youtube";
import Chat from "../Chat";
import Search from "./Search";
import Queue from "./Queue";

const RoomPlayer = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const socket = useSocket();
    const { user } = useAuth();
    const playerRef = useRef(null);

    // Identity
    const [guestId] = useState(() => {
        let gid = localStorage.getItem('streamvibe_uid');
        if (!gid) {
            gid = `guest_${Math.random().toString(36).substring(2, 11)}_${Date.now()}`;
            localStorage.setItem('streamvibe_uid', gid);
        }
        return gid;
    });
    const currentUserId = user ? String(user._id) : guestId;

    // Room State
    const [isDJ, setIsDJ] = useState(false);
    const [room] = useState(roomId);
    const [status, setStatus] = useState("Paused");
    const [hasInteracted, setHasInteracted] = useState(false);
    const [queue, setQueue] = useState([]);
    const [currentSong, setCurrentSong] = useState(null);
    const [reactions, setReactions] = useState([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [listeners, setListeners] = useState([]);
    const [showShareToast, setShowShareToast] = useState(false);
    const [userPlaylists, setUserPlaylists] = useState([]);
    const [showPlaylistLoad, setShowPlaylistLoad] = useState(false);
    const [roomMeta, setRoomMeta] = useState({ tags: [], description: "" });
    const [roomOwnerId, setRoomOwnerId] = useState(null);
    const [creatorId, setCreatorId] = useState(null);
    const timeUpdateRef = useRef(null);

    const nickname = user ? user.username : (localStorage.getItem('streamvibe_name') || "Guest");
    const userColor = user ? user.avatarColor : (localStorage.getItem('streamvibe_color') || "#3b82f6");
    const username = nickname;

    useEffect(() => {
        socket.emit('join_room', {
            roomId: room,
            userProfile: { name: nickname, color: userColor, userId: user?._id },
            guestId: currentUserId
        });

        socket.on('receive_room_state', (state) => {
            setQueue(state.queue);
            setCurrentSong(state.currentSong);
            setListeners(state.users || []);
            setRoomMeta({ tags: state.tags || [], description: state.description || "" });
            setRoomOwnerId(state.owner);
            setCreatorId(state.creatorId);

            if (state.creatorId && String(state.creatorId) === String(currentUserId)) {
                setIsDJ(true);
            }

            if (state.currentTime > 0 && playerRef.current) {
                setCurrentTime(state.currentTime);
                playerRef.current.seekTo(state.currentTime, true);
                if (state.isPlaying) {
                    playerRef.current.playVideo();
                    setStatus("Playing");
                }
            }
        });

        socket.on('update_listeners', (users) => setListeners(users));
        socket.on('update_queue', (newQueue) => setQueue(newQueue));
        socket.on('receive_play_song', (song) => {
            setCurrentSong(song);
            setCurrentTime(0);
            setStatus("Playing");
        });

        socket.on('receive_play', (data) => {
            if (playerRef.current) {
                playerRef.current.seekTo(data.time, true);
                playerRef.current.playVideo();
                setStatus("Playing");
            }
        });

        socket.on('receive_pause', () => {
            if (playerRef.current) {
                playerRef.current.pauseVideo();
                setStatus("Paused");
            }
        });

        socket.on('receive_seek', (data) => {
            if (playerRef.current) {
                playerRef.current.seekTo(data.time, true);
                setCurrentTime(data.time);
            }
        });

        socket.on('room_deleted', () => {
            alert("This room has been deleted by the owner.");
            navigate('/');
        });

        socket.on('receive_reaction', (reaction) => {
            setReactions(prev => [...prev, reaction]);
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== reaction.id));
            }, 3000);
        });

        timeUpdateRef.current = setInterval(() => {
            if (playerRef.current && playerRef.current.getPlayerState() === 1 && !isDragging.current) {
                const now = playerRef.current.getCurrentTime();
                setCurrentTime(now);
                const d = playerRef.current.getDuration();
                if (d > 0 && d !== duration) setDuration(d);
            }
        }, 1000);

        return () => {
            socket.off('receive_room_state');
            socket.off('update_listeners');
            socket.off('update_queue');
            socket.off('receive_play_song');
            socket.off('receive_play');
            socket.off('receive_pause');
            socket.off('receive_seek');
            socket.off('receive_reaction');
            socket.off('room_deleted');
            if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
        };
    }, [room, socket, duration, nickname, userColor, currentUserId, user, navigate]);

    useEffect(() => {
        if (user) {
            const fetchPlaylists = async () => {
                try {
                    const res = await api.get('/api/playlists');
                    if (res.data.status === 'success') setUserPlaylists(res.data.data.playlists);
                } catch (err) { console.error(err); }
            };
            fetchPlaylists();
        }
    }, [user]);

    const handleAddSong = (song) => socket.emit('add_to_queue', { roomId: room, song });
    const sendReaction = (emoji) => socket.emit('send_reaction', { roomId: room, emoji });
    const handleDeleteRoom = () => {
        if (window.confirm("Are you sure you want to delete this room? Everyone will be disconnected.")) {
            socket.emit('delete_room', { roomId: room, userId: user?._id, guestId: currentUserId });
        }
    };

    const handlePlayerStateChange = (event) => {
        if (event.data === 0 && isDJ) {
            socket.emit('next_song', { roomId: room, userId: user?._id, guestId: currentUserId });
        }
    };

    const onPlayerReady = (event) => {
        playerRef.current = event.target;
        setDuration(event.target.getDuration());
        if (currentTime > 0) event.target.seekTo(currentTime, true);
        if (status.includes("Playing")) event.target.playVideo();
    };

    const isDragging = useRef(false);
    const handleScrub = (e) => {
        if (!isDJ) return;
        isDragging.current = true;
        setCurrentTime(parseFloat(e.target.value));
    };

    const handleSeekComplete = (e) => {
        if (!isDJ || !playerRef.current) return;
        const newTime = parseFloat(e.target.value);
        playerRef.current.seekTo(newTime, true);
        isDragging.current = false;
        socket.emit('send_seek', { roomId: room, time: newTime, userId: user?._id, guestId: currentUserId });
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleShare = async () => {
        const shareData = {
            title: 'Join my StreamVibe session!',
            text: `I'm listening to music in #${room}. Come join me!`,
            url: window.location.href,
        };
        try {
            if (navigator.share) await navigator.share(shareData);
            else {
                await navigator.clipboard.writeText(window.location.href);
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(false), 2000);
            }
        } catch (err) { console.log('Share failed', err); }
    };

    const togglePlayPause = () => {
        if (!isDJ || !playerRef.current) return;
        const isCurrentlyPlaying = playerRef.current.getPlayerState() === 1 || playerRef.current.getPlayerState() === 3;
        if (isCurrentlyPlaying) {
            playerRef.current.pauseVideo();
            socket.emit('send_pause', { roomId: room, userId: user?._id, guestId: currentUserId });
            setStatus("Paused (Host)");
        } else {
            playerRef.current.playVideo();
            socket.emit('send_play', { roomId: room, time: playerRef.current.getCurrentTime(), userId: user?._id, guestId: currentUserId });
            setStatus("Playing (Host)");
        }
    };

    return (
        <div className="min-h-screen text-slate-200 p-4 md:p-8 animate-fade-in max-w-[1800px] mx-auto">
            {/* Simple Reactions Overlay */}
            <div className="fixed inset-0 pointer-events-none z-40">
                {reactions && reactions.map(r => (
                    <div key={r.id} className="absolute bottom-20 left-1/2 -translate-x-1/2 animate-float-up text-5xl opacity-0">
                        {r.emoji}
                    </div>
                ))}
            </div>

            {/* Light Interaction Overlay */}
            {!hasInteracted && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0e14]/80 backdrop-blur-sm">
                    <button
                        onClick={() => setHasInteracted(true)}
                        className="btn-primary py-6 px-12 rounded-2xl text-2xl uppercase tracking-[0.2em] shadow-2xl"
                    >
                        Join Session 🎧
                    </button>
                </div>
            )}

            <div className="w-full flex flex-col xl:flex-row gap-8">
                <div className="flex-1 space-y-8">
                    {/* Dynamic Player Card with Ambient Lighting */}
                    <div className="card-smooth p-8 md:p-12 relative overflow-hidden group">
                        {/* Ambient Light Bloom */}
                        {currentSong && (
                            <div className="absolute inset-0 opacity-20 pointer-events-none transition-all duration-1000 overflow-hidden">
                                <img
                                    src={currentSong.thumbnail}
                                    className={`w-full h-full object-cover blur-[100px] scale-150 ${status.includes("Playing") ? "animate-pulse" : ""}`}
                                    alt=""
                                />
                            </div>
                        )}

                        {/* Share Toast */}
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold py-2 px-6 rounded-b-xl z-50 transition-all ${showShareToast ? 'translate-y-0' : '-translate-y-full'}`}>
                            SYNC LINK COPIED
                        </div>

                        <div className="flex flex-col lg:flex-row items-center gap-12">
                            {/* High-Fidelity Vinyl Visual */}
                            <div className="relative shrink-0 perspective-1000">
                                <div className={`w-64 h-64 rounded-full bg-[#020617] border-4 border-slate-800 flex items-center justify-center shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden relative transition-all duration-700 ${status.includes("Playing") ? "animate-spin-slow scale-105" : "scale-100"}`}>
                                    {/* Record Texture & Grooves */}
                                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_transparent_40%,_black_41%,_transparent_42%,_black_43%,_transparent_44%)]"></div>

                                    {/* Album Art Label */}
                                    {currentSong ? (
                                        <img src={currentSong.thumbnail} className="absolute inset-0 w-full h-full object-cover opacity-60 scale-110" alt="" />
                                    ) : (
                                        <div className="text-4xl opacity-5">📻</div>
                                    )}

                                    {/* Record Gloss / Light Reflection */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"></div>
                                    <div className="absolute inset-0 bg-gradient-to-tl from-white/5 via-transparent to-transparent pointer-events-none"></div>

                                    {/* Spindle Hole */}
                                    <div className="w-4 h-4 bg-[#0b0e14] rounded-full z-10 border-2 border-slate-700 shadow-inner"></div>
                                </div>

                                {/* Turntable Needle (Static for minimalist look but adds detail) */}
                                <div className={`absolute -top-4 -right-4 w-20 h-2 bg-slate-700 rounded-full origin-left transition-all duration-700 ${status.includes("Playing") ? "rotate-45" : "rotate-0 shadow-lg"}`}></div>
                            </div>

                            <div className="flex-1 min-w-0 space-y-6 text-center lg:text-left">
                                <div>
                                    <div className="flex items-center justify-center lg:justify-start gap-4 mb-3">
                                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] bg-blue-500/5 px-3 py-1.5 rounded-lg border border-blue-500/10">#{roomId}</p>
                                        {roomMeta.tags.map(t => (
                                            <span key={t} className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t}</span>
                                        ))}
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg text-[8px] font-bold uppercase tracking-widest text-slate-400">
                                            <span className={`w-1.5 h-1.5 rounded-full ${status.includes("Playing") ? "bg-green-500 animate-pulse" : "bg-slate-600"}`}></span>
                                            {status}
                                        </div>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-500 italic mb-4 max-w-2xl px-1">{roomMeta.description || "Synthesizing broadcast pulse..."}</p>
                                    <h2 className="text-xl font-bold tracking-tight text-white truncate leading-tight">
                                        {currentSong ? currentSong.title : "Waiting for playback..."}
                                    </h2>
                                    <p className="text-sm font-medium text-slate-500 mt-1 truncate">
                                        {currentSong ? currentSong.channel : "Establishing Signal"}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="relative group/progress">
                                        <input
                                            type="range"
                                            min="0" max={duration}
                                            value={currentTime}
                                            onChange={handleScrub}
                                            onMouseUp={handleSeekComplete}
                                            onTouchEnd={handleSeekComplete}
                                            className={`w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500 transition-all ${!isDJ && 'pointer-events-none'}`}
                                        />
                                        <div className="absolute top-0 left-0 h-1.5 bg-blue-500 rounded-full pointer-events-none shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                                    {isDJ && (
                                        <div className="flex gap-4">
                                            <button onClick={togglePlayPause} className="btn-primary p-4 rounded-2xl shadow-lg">
                                                {status.includes("Playing") ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                                            </button>
                                            <button onClick={() => socket.emit("next_song", { roomId: room, userId: user?._id, guestId: currentUserId })} className="card-smooth p-4 rounded-2xl hover:bg-white/5">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                                            </button>
                                            <div className="relative">
                                                <button onClick={() => setShowPlaylistLoad(!showPlaylistLoad)} className="card-smooth p-4 rounded-2xl hover:bg-white/5 flex items-center gap-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                                </button>
                                                {showPlaylistLoad && (
                                                    <div className="absolute left-0 bottom-full mb-4 w-64 card-smooth p-4 z-50 shadow-2xl animate-in slide-in-from-bottom-2">
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pb-3 border-b border-white/5 mb-2">Load Playlist</p>
                                                        <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                                                            {userPlaylists.map(p => (
                                                                <button key={p._id} onClick={() => { p.songs.forEach(s => handleAddSong(s)); setShowPlaylistLoad(false); }} className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-all">
                                                                    <p className="text-xs font-bold text-slate-200">{p.name}</p>
                                                                    <p className="text-[9px] text-slate-500 uppercase font-black">{p.songs.length} Tracks</p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        {['🔥', '❤️', '👏', '🎵'].map(emoji => (
                                            <button key={emoji} onClick={() => sendReaction(emoji)} className="text-xl hover:scale-125 transition-all p-2 active:scale-95">{emoji}</button>
                                        ))}
                                    </div>
                                    <button onClick={handleShare} className="ml-auto card-smooth p-3 rounded-xl hover:bg-white/5 opacity-40 hover:opacity-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                    </button>
                                    {isDJ && (
                                        <button onClick={handleDeleteRoom} className="card-smooth p-3 rounded-xl text-red-500 hover:bg-red-500/10 opacity-40 hover:opacity-100">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Hidden Player */}
                        <div className="absolute opacity-0 pointer-events-none -z-50 overflow-hidden w-0 h-0">
                            {currentSong && <YouTube videoId={currentSong.id} opts={{ playerVars: { autoplay: 1, controls: 0 } }} onReady={onPlayerReady} onStateChange={handlePlayerStateChange} />}
                        </div>
                    </div>

                    {/* Listeners Info */}
                    <div className="card-smooth p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Listeners</p>
                            <div className="flex -space-x-2">
                                {listeners.map((user) => (
                                    <div key={user.id} className="w-8 h-8 rounded-lg border-2 border-[#0b0e14] flex items-center justify-center text-[10px] font-bold shadow-lg transition-transform hover:-translate-y-1" style={{ backgroundColor: user.color }} title={user.name}>
                                        {user.name[0].toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500 bg-blue-500/5 px-4 py-2 rounded-lg">
                            {listeners.length} Synchronized Users
                        </div>
                    </div>

                    <Search onAdd={handleAddSong} />
                </div>

                <div className="w-full xl:w-[400px] space-y-8 flex flex-col xl:sticky xl:top-8 self-start h-fit">
                    <Queue queue={queue} />
                    <Chat roomId={roomId} username={username} />
                </div>
            </div>
        </div>
    );
};

export default RoomPlayer;
