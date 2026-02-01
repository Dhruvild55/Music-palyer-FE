import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { SocketProvider, useSocket } from "../../context/SocketContext";
import { api, useAuth } from "../../context/AuthContext";
import YouTube from "react-youtube";
import Chat from "../Chat";
import Search from "./Search";
import Queue from "./Queue";
import DJPermissionsPanel from "../../components/DJPermissionsPanel";
import SongRequestsTab from "./SongRequests";
import useBackgroundPlayback from "../../hooks/useBackgroundPlayback";
import useScreenShare from "../../hooks/useScreenShare";

// Helper component to properly attach remote stream to video element
const RemoteScreenVideo = ({ id, stream, isFocused = false, onClick = () => { } }) => {
    const videoRef = useRef(null);

    useEffect(() => {
        if (!videoRef.current || !stream) return;
        try {
            videoRef.current.srcObject = stream;
            console.debug('[RemoteScreenVideo] Attached stream to video', id, stream);

            // Log active tracks
            const videoTracks = stream.getVideoTracks();
            const audioTracks = stream.getAudioTracks();
            console.debug('[RemoteScreenVideo] Stream tracks:', {
                videoTracks: videoTracks.length,
                audioTracks: audioTracks.length,
                videoEnabled: videoTracks.length > 0 ? videoTracks[0].enabled : false,
                audioEnabled: audioTracks.length > 0 ? audioTracks[0].enabled : false
            });

            // Force play if autoplay doesn't work
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.debug('[RemoteScreenVideo] Video play started', id);
                    })
                    .catch(err => {
                        console.warn('[RemoteScreenVideo] Autoplay blocked, attempting with muted:', id, err);
                        // Some browsers require muted to autoplay
                        videoRef.current.muted = true;
                        videoRef.current.play().catch(e => {
                            console.error('[RemoteScreenVideo] Forced play failed:', id, e);
                        });
                    });
            }
        } catch (err) {
            console.error('[RemoteScreenVideo] Failed to attach stream', id, err);
        }
    }, [stream, id]);

    const wrapperClasses = `relative group cursor-pointer ${isFocused ? 'md:col-span-2' : ''}`;

    return (
        <div className={wrapperClasses} onClick={() => onClick(id)}>
            {/* Vibrant Border & Shadow */}
            <div className="bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 p-1 rounded-2xl shadow-2xl">
                <video
                    ref={videoRef}
                    className={`w-full ${isFocused ? 'h-[560px]' : 'h-64'} object-contain bg-black rounded-xl border-2 border-blue-400`}
                    autoPlay
                    playsInline
                    controls={false}
                    onLoadedMetadata={() => {
                        try {
                            console.debug('[RemoteScreenVideo] onLoadedMetadata fired', id, {
                                duration: videoRef.current?.duration,
                                readyState: videoRef.current?.readyState,
                                paused: videoRef.current?.paused
                            });
                        } catch (e) { }
                    }}
                    onPlay={() => {
                        try { console.debug('[RemoteScreenVideo] onPlay fired', id); } catch (e) { }
                    }}
                    onCanPlay={() => {
                        try { console.debug('[RemoteScreenVideo] onCanPlay fired', id); } catch (e) { }
                    }}
                    onError={(e) => {
                        try { console.error('[RemoteScreenVideo] Video error', id, e.target?.error); } catch (err) { }
                    }}
                />
            </div>

            {/* Live Badge */}
            <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                🔴 LIVE
            </div>

            {/* User ID Label */}
            <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur text-cyan-300 px-3 py-2 rounded-lg text-xs font-mono border border-cyan-400/50">
                ID: {id.substring(0, 8)}...
            </div>
        </div>
    );
};

// Local preview component for presenter's camera
const LocalPreviewVideo = ({ stream }) => {
    const ref = useRef(null);

    useEffect(() => {
        if (!ref.current || !stream) return;
        try {
            ref.current.srcObject = stream;
            ref.current.muted = true;
            const p = ref.current.play();
            if (p && p.catch) p.catch(() => { });
        } catch (e) {
            console.error('[LocalPreviewVideo] attach failed', e);
        }
    }, [stream]);

    return <video ref={ref} className="w-full h-full object-cover" playsInline />;
};

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
    const [djPermissions, setDjPermissions] = useState([]);
    const [songRequests, setSongRequests] = useState([]);
    const [room] = useState(roomId);
    const [status, setStatus] = useState("Paused");
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
    const shadowAudioRef = useRef(null);

    // Focused share id (click a stream to enlarge)
    const [focusedShare, setFocusedShare] = useState(null);

    const nickname = user ? user.username : (localStorage.getItem('streamvibe_name') || "Guest");
    const userColor = user ? user.avatarColor : (localStorage.getItem('streamvibe_color') || "#3b82f6");
    const username = nickname;

    useEffect(() => {
        console.log(`[RoomPlayer] Joining room ${room}`);
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
            setDjPermissions(state.djPermissions || []);
            setSongRequests(state.songRequests || []);

            // Check if current user is a DJ (either creator or has djPermissions)
            const isUserDJ = (state.creatorId && String(state.creatorId) === String(currentUserId)) ||
                (state.djPermissions && state.djPermissions.includes(currentUserId));
            setIsDJ(isUserDJ);

            if (state.currentTime > 0 && playerRef.current && typeof playerRef.current.seekTo === 'function') {
                try {
                    setCurrentTime(state.currentTime);
                    playerRef.current.seekTo(state.currentTime, true);
                } catch (err) {
                    console.warn('Seek error on room state:', err);
                }
            }

            // Sync status immediately
            setStatus(state.isPlaying ? "Playing" : "Paused");
            if (state.isPlaying && playerRef.current) {
                playerRef.current.playVideo();
            } else if (!state.isPlaying && playerRef.current) {
                playerRef.current.pauseVideo();
            }
        });

        socket.on('join_failed', (data) => {
            const message = data?.message || 'Failed to join room.';
            console.error('[JoinFailed]', message);

            // Show error and redirect to home
            alert(message);
            navigate('/');
        });

        socket.on('update_listeners', (users) => setListeners(users));
        socket.on('update_queue', (newQueue) => setQueue(newQueue));
        socket.on('receive_play_song', (song) => {
            setCurrentSong(song);
            setCurrentTime(0);
            setStatus("Playing");
        });

        socket.on('receive_play', (data) => {
            if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                try {
                    playerRef.current.seekTo(data.time, true);
                    playerRef.current.playVideo();
                    setStatus("Playing");
                } catch (err) {
                    console.warn('Seek error on receive_play:', err);
                }
            }
        });

        socket.on('receive_pause', () => {
            if (playerRef.current) {
                playerRef.current.pauseVideo();
                setStatus("Paused");
            }
        });

        socket.on('receive_seek', (data) => {
            if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                try {
                    playerRef.current.seekTo(data.time, true);
                    setCurrentTime(data.time);
                } catch (err) {
                    console.warn('Seek error on receive_seek:', err);
                }
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

        socket.on('queue_feedback', (fb) => {
            if (fb.type === 'error') alert(fb.message);
        });

        socket.on('dj_permissions_updated', (data) => {
            setDjPermissions(data.djPermissions || []);
            // Update isDJ status based on new permissions
            const isUserDJ = (creatorId && String(creatorId) === String(currentUserId)) ||
                (data.djPermissions && data.djPermissions.includes(currentUserId));
            setIsDJ(isUserDJ);
        });

        socket.on('song_requests_updated', (data) => {
            setSongRequests(data.songRequests || []);
        });

        socket.on('request_feedback', (feedback) => {
            if (feedback.type === 'error') {
                alert('❌ ' + feedback.message);
            } else if (feedback.type === 'success') {
                console.log('✅ Song request submitted successfully');
            }
        });

        // Background Persistence: Silent Shadow Audio
        // This keeps the PWA alive as an "audio" app when the phone is locked.
        if (!shadowAudioRef.current) {
            // A small silent base64 MP3 to trick the OS into keeping the process alive
            const silentSrc = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhAAQACABAAAABkYXRhAgAAAAEA";
            const audio = new Audio(silentSrc);
            audio.loop = true;
            shadowAudioRef.current = audio;
        }

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
            socket.off('dj_permissions_updated');
            socket.off('song_requests_updated');
            socket.off('request_feedback');
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
        if (currentTime > 0 && event.target && typeof event.target.seekTo === 'function') {
            try {
                event.target.seekTo(currentTime, true);
            } catch (err) {
                console.warn('Seek error on player ready:', err);
            }
        }
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
        if (typeof playerRef.current.seekTo === 'function') {
            try {
                playerRef.current.seekTo(newTime, true);
            } catch (err) {
                console.warn('Seek error on handle seek complete:', err);
            }
        }
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

    const handleRemoveFromQueue = (songId) => {
        socket.emit('remove_from_queue', { roomId: room, queueId: songId, userId: user?._id, guestId: currentUserId });
    };

    const handleShuffleQueue = () => {
        socket.emit('shuffle_queue', { roomId: room, userId: user?._id, guestId: currentUserId });
    };

    const handleRequestSong = (song) => {
        console.log('🎤 handleRequestSong called with:', song);
        socket.emit('request_song', {
            roomId: room,
            song,
            userId: user?._id,
            guestId: currentUserId,
            userName: nickname,
            userColor: userColor
        });
    };

    const handleAcceptRequest = (requestId) => {
        socket.emit('accept_request', {
            roomId: room,
            requestId,
            userId: user?._id,
            guestId: currentUserId
        });
    };

    const handleDeclineRequest = (requestId) => {
        socket.emit('decline_request', {
            roomId: room,
            requestId,
            userId: user?._id,
            guestId: currentUserId
        });
    };

    // Setup background playback with Media Session API
    useBackgroundPlayback(
        currentSong,
        status.includes("Playing"),
        currentTime,
        duration,
        togglePlayPause,
        () => socket.emit("next_song", { roomId: room, userId: user?._id, guestId: currentUserId })
    );

    const { isSharing, startShare, stopShare, remoteStreams, localPreview } = useScreenShare(room, listeners);
    const [includeCam, setIncludeCam] = useState(false);

    return (
        <div className="min-h-screen text-slate-200 p-4 md:p-8 animate-fade-in max-w-[1800px] mx-auto overflow-x-hidden">
            {/* Simple Reactions Overlay */}
            <div className="fixed inset-0 pointer-events-none z-40">
                {reactions && reactions.map(r => (
                    <div key={r.id} className="absolute bottom-20 left-1/2 -translate-x-1/2 animate-float-up text-5xl opacity-0">
                        {r.emoji}
                    </div>
                ))}
            </div>

            <div className="w-full flex flex-col xl:flex-row gap-8">
                <div className="flex-1 space-y-6 md:space-y-8 min-w-0 w-full">
                    {/* Dynamic Player Card with Ambient Lighting */}
                    <div className="card-smooth p-6 md:p-12 relative overflow-hidden group w-full">
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

                        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                            {/* High-Fidelity Vinyl Visual */}
                            <div className="relative shrink-0 perspective-1000">
                                <div className={`w-48 h-48 md:w-64 md:h-64 rounded-full bg-[#020617] border-4 border-slate-800 flex items-center justify-center shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden relative transition-all duration-700 ${status.includes("Playing") ? "animate-spin-slow scale-105" : "scale-100"}`}>
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
                                <div className={`absolute -top-4 -right-2 md:-right-4 w-16 md:w-20 h-2 bg-slate-700 rounded-full origin-left transition-all duration-700 ${status.includes("Playing") ? "rotate-45" : "rotate-0 shadow-lg"}`}></div>
                            </div>

                            <div className="flex-1 min-w-0 space-y-6 text-center lg:text-left">
                                <div>
                                    <button
                                        onClick={() => navigate('/')}
                                        className="mb-4 card-smooth p-2 rounded-lg hover:bg-white/5 transition-all inline-flex items-center gap-2 text-slate-400 hover:text-white"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        <span className="text-xs font-bold uppercase tracking-widest">Back</span>
                                    </button>
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
                                    <h2 className="text-lg md:text-xl font-bold tracking-tight text-white line-clamp-2 leading-tight min-h-[3.5rem] lg:min-h-0">
                                        {currentSong ? currentSong.title : "Waiting for playback..."}
                                    </h2>
                                    <p className="text-sm font-medium text-slate-500 mt-1 truncate">
                                        {currentSong ? currentSong.channel : "Establishing Signal"}
                                    </p>
                                </div>

                                <div className="space-y-3 w-full">
                                    <div className="relative group/progress w-full flex items-center h-4">
                                        <input
                                            type="range"
                                            min="0" max={duration}
                                            value={currentTime}
                                            onChange={handleScrub}
                                            onMouseUp={handleSeekComplete}
                                            onTouchEnd={handleSeekComplete}
                                            className={`w-full h-1 md:h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-blue-500 transition-all z-10 ${!isDJ && 'pointer-events-none'}`}
                                        />
                                        <div className="absolute left-0 h-1 md:h-1.5 bg-blue-500 rounded-full pointer-events-none shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
                                    {isDJ && (
                                        <div className="flex gap-3 md:gap-4">
                                            <button onClick={togglePlayPause} className="btn-primary p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg">
                                                {status.includes("Playing") ? <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>}
                                            </button>
                                            <button onClick={() => socket.emit("next_song", { roomId: room, userId: user?._id, guestId: currentUserId })} className="card-smooth p-3 md:p-4 rounded-xl md:rounded-2xl hover:bg-white/5">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
                                            </button>
                                            <div className="relative">
                                                <button onClick={() => setShowPlaylistLoad(!showPlaylistLoad)} className="card-smooth p-3 md:p-4 rounded-xl md:rounded-2xl hover:bg-white/5 flex items-center gap-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-6 md:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
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
                                    {/* <button onClick={() => setIncludeCam(!includeCam)} className={`card-smooth p-3 rounded-xl hover:bg-white/5 ml-2 ${includeCam ? 'bg-white/5 ring-2 ring-cyan-400' : ''}`} title="Include Camera">
                                        {includeCam ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-300" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h4l2-2h4l2 2h4v14H4z" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M4 5h4l2-2h4l2 2h4v14H4z" /></svg>
                                        )}
                                    </button> */}
                                    {/* <button onClick={() => isSharing ? stopShare() : startShare({ withCamera: includeCam })} className="card-smooth p-3 rounded-xl hover:bg-white/5 ml-2">
                                        {isSharing ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14v-4zM3 6h8v12H3z" /></svg>
                                        )}
                                    </button> */}
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

                        {/* Local Camera Preview (PiP) */}
                        {/* {localPreview && (
                            <div className="absolute bottom-6 right-6 w-36 h-20 rounded-xl overflow-hidden border-2 border-white/10 shadow-2xl bg-black/60">
                                <LocalPreviewVideo stream={localPreview} />
                            </div>
                        )} */}

                        {/* Remote Screenshares */}
                        {/* <div className="space-y-6 mt-8 pt-6 border-t border-slate-700">
                            {remoteStreams && Object.entries(remoteStreams).length > 0 && (
                                <>
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 animate-pulse"></div>
                                        <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 uppercase tracking-widest">
                                            📺 Screen Shares
                                        </h3>
                                        <span className="text-xs font-bold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-full ml-auto">
                                            {Object.entries(remoteStreams).length} {Object.entries(remoteStreams).length === 1 ? 'Stream' : 'Streams'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {(() => {
                                            const entries = Object.entries(remoteStreams);
                                            if (!entries.length) return null;
                                            // If a focusedShare exists and is in streams, render it first
                                            const ordered = focusedShare && remoteStreams[focusedShare]
                                                ? [[focusedShare, remoteStreams[focusedShare]], ...entries.filter(([id]) => id !== focusedShare)]
                                                : entries;

                                            return ordered.map(([id, stream]) => (
                                                <RemoteScreenVideo
                                                    key={id}
                                                    id={id}
                                                    stream={stream}
                                                    isFocused={focusedShare === id}
                                                    onClick={(clickedId) => setFocusedShare(focusedShare === clickedId ? null : clickedId)}
                                                />
                                            ));
                                        })()}
                                    </div>
                                </>
                            )}
                        </div> */}
                    </div>

                    {/* Listeners Info */}
                    <div className="card-smooth p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">Listeners ({listeners.length})</p>
                        </div>
                        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                            {listeners.length > 0 ? (
                                listeners.map((user) => (
                                    <Link
                                        key={user.id}
                                        to={user.userId ? `/profile/${user.userId}` : '#'}
                                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-all group"
                                    >
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shadow-lg flex-shrink-0"
                                            style={{ backgroundColor: user.color }}
                                        >
                                            {user.name[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-200 truncate group-hover:text-white">{user.name}</p>
                                            <p className="text-[10px] text-slate-600 uppercase font-black tracking-widest">
                                                {user.userId


                                                    ? 'User' : 'Guest'}
                                            </p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="text-xs text-slate-600 text-center py-4">No listeners yet</p>
                            )}
                        </div>
                    </div>

                    <Search onAdd={handleAddSong} onRequestSong={handleRequestSong} isDJ={isDJ} queue={queue} currentSong={currentSong} />
                </div>

                <div className="w-full xl:w-[400px] space-y-8 flex flex-col xl:sticky xl:top-8 self-start h-fit">
                    <DJPermissionsPanel
                        listeners={listeners}
                        djPermissions={djPermissions}
                        creatorId={creatorId}
                        currentUserId={currentUserId}
                        roomId={room}
                        socket={socket}
                        user={user}
                    />
                    <SongRequestsTab
                        songRequests={songRequests}
                        isDJ={isDJ}
                        onAcceptRequest={handleAcceptRequest}
                        onDeclineRequest={handleDeclineRequest}
                        onRequestSong={handleRequestSong}
                        currentSong={currentSong}
                        queue={queue}
                    />
                    <Queue queue={queue} isDJ={isDJ} onRemove={handleRemoveFromQueue} onShuffle={handleShuffleQueue} />
                    <Chat roomId={roomId} username={username} />
                </div>
            </div>
        </div>
    );
};

export default RoomPlayer;
