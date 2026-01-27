import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { SocketProvider, useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import YouTube from "react-youtube";
import Chat from "../Chat";
import Search from "./Search";
import Queue from "./Queue";

const RoomPlayer = () => {
    const { roomId } = useParams();
    const socket = useSocket();
    const { user } = useAuth();
    const playerRef = useRef(null);

    // Room State
    const [isDJ, setIsDJ] = useState(false);
    const [room] = useState(roomId);
    const [status, setStatus] = useState("Paused");
    const [hasInteracted, setHasInteracted] = useState(false);
    const [queue, setQueue] = useState([]);
    const [currentSong, setCurrentSong] = useState(null);
    const [reactions, setReactions] = useState([]);
    const [skipVotes, setSkipVotes] = useState({ count: 0, threshold: 1 });
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [listeners, setListeners] = useState([]);
    const [showShareToast, setShowShareToast] = useState(false);
    const [roomOwnerId, setRoomOwnerId] = useState(null);
    const timeUpdateRef = useRef(null);

    const nickname = user ? user.username : (localStorage.getItem('streamvibe_name') || "Guest");
    const userColor = user ? user.avatarColor : (localStorage.getItem('streamvibe_color') || "#3b82f6");
    const username = nickname;

    useEffect(() => {
        socket.emit('join_room', {
            roomId: room,
            userProfile: { name: nickname, color: userColor }
        });

        socket.on('receive_room_state', (state) => {
            setQueue(state.queue);
            setCurrentSong(state.currentSong);
            setSkipVotes({ count: 0, threshold: Math.ceil((state.users?.length || 1) / 2) });
            setListeners(state.users || []);
            setRoomOwnerId(state.owner);

            // Auto-DJ for owner
            if (user && state.owner === user._id) {
                setIsDJ(true);
            }

            if (state.currentTime > 0) {
                setCurrentTime(state.currentTime);
                if (playerRef.current) {
                    playerRef.current.seekTo(state.currentTime, true);
                    if (state.isPlaying) {
                        playerRef.current.playVideo();
                        setStatus("Playing");
                    }
                }
            }
        });

        socket.on('update_listeners', (users) => {
            setListeners(users);
        });

        socket.on('update_queue', (newQueue) => {
            setQueue(newQueue);
        });

        socket.on('receive_play_song', (song) => {
            setCurrentSong(song);
            setStatus("Playing");
            setSkipVotes(prev => ({ ...prev, count: 0 }));
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

        socket.on('receive_reaction', (reaction) => {
            setReactions(prev => [...prev, reaction]);
            setTimeout(() => {
                setReactions(prev => prev.filter(r => r.id !== reaction.id));
            }, 3000);
        });

        socket.on('update_skip_votes', (data) => {
            setSkipVotes(data);
        });

        timeUpdateRef.current = setInterval(() => {
            if (playerRef.current && playerRef.current.getCurrentTime && playerRef.current.getPlayerState() === 1 && !isDragging.current) {
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
            socket.off('update_skip_votes');
            if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
        };
    }, [room, socket, duration, nickname, userColor]);

    const handleAddSong = (song) => {
        socket.emit('add_to_queue', { roomId: room, song });
    };

    const sendReaction = (emoji) => {
        socket.emit('send_reaction', { roomId: room, emoji });
    };

    const handleVoteSkip = () => {
        socket.emit('cast_skip_vote', room);
    };

    const handlePlayerStateChange = (event) => {
        if (event.data === 0 && isDJ) {
            socket.emit('next_song', room);
        }
    };

    const onPlayerReady = (event) => {
        playerRef.current = event.target;
        setDuration(event.target.getDuration());
        if (currentTime > 0) {
            event.target.seekTo(currentTime, true);
            if (status.includes("Playing")) {
                event.target.playVideo();
            }
        }
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
        socket.emit('send_seek', {
            roomId: room,
            time: newTime
        });
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

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Share failed', err);
            }
        } else {
            // Fallback: Copy to clipboard
            try {
                await navigator.clipboard.writeText(window.location.href);
                setShowShareToast(true);
                setTimeout(() => setShowShareToast(false), 2000);
            } catch (err) {
                console.log('Clipboard failed', err);
            }
        }
    };

    const togglePlayPause = () => {
        if (!isDJ || !playerRef.current) return;
        const playerState = playerRef.current.getPlayerState();
        const isCurrentlyPlaying = playerState === 1 || playerState === 3;
        if (isCurrentlyPlaying) {
            playerRef.current.pauseVideo();
            socket.emit('send_pause', { roomId: room });
            setStatus("Paused (Host)");
        } else {
            playerRef.current.playVideo();
            socket.emit('send_play', {
                roomId: room,
                time: playerRef.current.getCurrentTime()
            });
            setStatus("Playing (Host)");
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 relative overflow-hidden">
            {/* Floating Reactions */}
            <div className="fixed inset-0 pointer-events-none z-40">
                {reactions.map(r => (
                    <div key={r.id} className="absolute bottom-20 left-1/2 -translate-x-1/2 animate-float-up text-4xl opacity-0">
                        {r.emoji}
                    </div>
                ))}
            </div>

            {/* Interaction Overlay */}
            {!hasInteracted && !isDJ && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
                    <button onClick={() => setHasInteracted(true)} className="bg-green-600 hover:bg-green-500 text-black font-black py-6 px-12 rounded-full shadow-2xl transform transition hover:scale-105 active:scale-95 text-2xl uppercase tracking-tighter">
                        Join the Session 🎧
                    </button>
                </div>
            )}

            <div className="max-w-7xl mx-auto flex flex-col xl:flex-row gap-8">
                <div className="flex-1 space-y-8">
                    {/* Player Info */}
                    <div className="bg-[#181818] rounded-2xl p-8 border border-white/5 shadow-2xl relative overflow-hidden group">
                        {/* Copy Link Toast */}
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-black py-2 px-4 rounded-b-xl z-50 transition-all duration-300 ${showShareToast ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
                            🔗 LINK COPIED!
                        </div>

                        <div className="absolute top-0 right-0 p-4 flex gap-4">
                            <button
                                onClick={handleShare}
                                className="bg-white/5 hover:bg-white/10 text-white p-2 rounded-full border border-white/10 transition-all"
                                title="Share Room"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                            </button>
                            {!isDJ && (
                                <button onClick={handleVoteSkip} className="bg-white/5 hover:bg-white/10 text-white text-[10px] font-black py-2 px-4 rounded-full border border-white/10 transition-all uppercase tracking-widest flex items-center gap-2">
                                    Vote Skip ({skipVotes.count}/{skipVotes.threshold})
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (roomOwnerId && (!user || user._id !== roomOwnerId)) return;
                                    setIsDJ(!isDJ);
                                }}
                                disabled={roomOwnerId && (!user || user._id !== roomOwnerId)}
                                className={`px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest transition-all ${isDJ ? "bg-green-500 text-black" : "bg-[#282828] text-white hover:bg-[#3e3e3e]"} ${roomOwnerId && (!user || user._id !== roomOwnerId) ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}
                                title={roomOwnerId && (!user || user._id !== roomOwnerId) ? "Only the room owner can host" : (isDJ ? "Relinquish Host" : "Become Host")}
                            >
                                {isDJ ? "Hosting" : "Listener"}
                            </button>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-10 mt-4 md:mt-0">
                            {/* Vinyl Visual */}
                            <div className="relative group">
                                <div className={`w-56 h-56 rounded-full bg-[#121212] flex items-center justify-center border-8 border-black shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 ${status.includes("Playing") ? "animate-spin-slow" : ""}`}>
                                    <div className="w-16 h-16 bg-[#282828] rounded-full border-4 border-black flex items-center justify-center text-[8px] font-black text-slate-800 uppercase tracking-tighter">StreamVibe</div>
                                    {currentSong && <img src={currentSong.thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover rounded-full opacity-20 pointer-events-none" />}
                                </div>
                                <div className={`absolute -top-4 -right-4 w-24 h-4 bg-gray-400 origin-right transition-transform duration-500 z-20 ${status.includes("Playing") ? "rotate-[25deg]" : "rotate-0"}`} style={{ clipPath: "polygon(0 0, 100% 40%, 100% 60%, 0 100%)" }}></div>
                            </div>

                            <div className="flex-1 text-center md:text-left space-y-4">
                                <h2 className="text-4xl font-black tracking-tighter truncate max-w-md">{currentSong ? currentSong.title : "No song playing"}</h2>
                                <p className="text-gray-400 font-medium">#{roomId} • {currentSong ? currentSong.channel : "Wait for DJ"}</p>

                                {!isDJ && skipVotes.count > 0 && (
                                    <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mb-2">
                                        <div className="bg-white h-full transition-all duration-500" style={{ width: `${(skipVotes.count / skipVotes.threshold) * 100}%` }}></div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <input type="range" min="0" max={duration} value={currentTime} onChange={handleScrub} onMouseUp={handleSeekComplete} onTouchEnd={handleSeekComplete} className={`w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-green-500 transition-all ${!isDJ && 'pointer-events-none'}`} />
                                    <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                                    <span className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-xs font-bold uppercase tracking-wider">
                                        <span className={`w-2 h-2 bg-green-500 rounded-full ${status.includes("Playing") ? "animate-ping" : ""}`}></span>
                                        {status}
                                    </span>
                                    <div className="flex gap-2 bg-black/40 p-1 rounded-full border border-white/5">
                                        {['🔥', '❤️', '👏', '🎶'].map(emoji => (
                                            <button key={emoji} onClick={() => sendReaction(emoji)} className="hover:scale-125 transition-transform p-1 filter drop-shadow-md active:scale-95">{emoji}</button>
                                        ))}
                                    </div>
                                </div>

                                {isDJ && (
                                    <div className="flex gap-4 pt-4">
                                        <button onClick={togglePlayPause} className="bg-white text-black font-black p-4 rounded-full hover:scale-105 transition-transform">
                                            {status.includes("Playing") ? <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                                        </button>
                                        <button onClick={() => socket.emit("next_song", room)} className="bg-[#282828] text-white p-4 rounded-full hover:bg-[#3e3e3e] transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Hidden YouTube Player */}
                        <div className="hidden">
                            {currentSong && (
                                <YouTube videoId={currentSong.id} opts={{ playerVars: { autoplay: 1, controls: 0 } }} onReady={onPlayerReady} onStateChange={handlePlayerStateChange} />
                            )}
                        </div>
                    </div>

                    <div className="bg-[#181818] rounded-2xl p-6 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">Listeners</h3>
                            <div className="flex -space-x-3 overflow-hidden">
                                {listeners.map((user) => (
                                    <div key={user.id} className="inline-block h-10 w-10 rounded-full ring-2 ring-[#181818] flex items-center justify-center text-xs font-black border border-white/10 hover:z-10 transition-transform hover:scale-110 cursor-help" style={{ backgroundColor: user.color }} title={user.name}>
                                        {user.name[0].toUpperCase()}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
                            {listeners.length} Total Connected
                        </div>
                    </div>

                    <Search onAdd={handleAddSong} />
                </div>

                <div className="w-full xl:w-96 space-y-8 flex flex-col">
                    <Queue queue={queue} />
                    <Chat roomId={roomId} username={username} />
                </div>
            </div>
        </div>
    );
};

export default RoomPlayer;
