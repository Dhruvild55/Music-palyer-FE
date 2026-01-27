import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { api } from "../../context/AuthContext";

// HELP: Get your API Key at https://console.cloud.google.com/
const YT_API_KEY = 'AIzaSyBQp-GWu1M0TsiAl_GN7ZCD5Nxu7c75IBc';

const Search = ({ onAdd, queue = [], currentSong = null }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [playlists, setPlaylists] = useState([]);
    const [showPlaylistMenu, setShowPlaylistMenu] = useState(null); // ID of song
    const menuRef = useRef(null);

    useEffect(() => {
        const fetchPlaylists = async () => {
            try {
                const res = await api.get('/api/playlists');
                if (res.data.status === 'success') setPlaylists(res.data.data.playlists);
            } catch (err) { console.error(err); }
        };
        fetchPlaylists();

        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setShowPlaylistMenu(null);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addToPlaylist = async (playlistId, song) => {
        try {
            const playlist = playlists.find(p => p._id === playlistId);
            const updatedSongs = [...playlist.songs, song];
            await api.patch(`/api/playlists/${playlistId}`, { songs: updatedSongs });
            alert(`Stored in signal sequence: ${playlist.name}`);
            setShowPlaylistMenu(null);
            setPlaylists(playlists.map(p => p._id === playlistId ? { ...p, songs: updatedSongs } : p));
        } catch (err) { console.error(err); }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        if (YT_API_KEY === "YOUR_YOUTUBE_API_KEY_HERE") {
            alert("Please provide a valid YouTube API Key in Search.jsx");
            return;
        }

        setLoading(true);
        try {
            const res = await axios.get("https://www.googleapis.com/youtube/v3/search", {
                params: {
                    part: "snippet",
                    maxResults: 10,
                    q: query,
                    type: "video",
                    key: YT_API_KEY,
                }
            });

            const formattedResults = res.data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                channel: item.snippet.channelTitle,
                thumbnail: item.snippet.thumbnails.default.url,
            }));

            setResults(formattedResults);
        } catch (error) {
            console.error("YouTube Search Error:", error);
            alert("Error fetching search results. Check console for details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card-smooth p-6 space-y-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Search Database</h3>
            <form onSubmit={handleSearch} className="relative">
                <input
                    type="text"
                    placeholder="Find tracks..."
                    className="w-full input-smooth rounded-xl py-3 px-10 text-sm font-medium"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                {loading ? (
                    <div className="absolute left-3.5 top-3 h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3.5 top-3 h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                )}
            </form>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {results.length > 0 ? (
                    results.map((song) => (
                        <div
                            key={song.id}
                            className={`flex items-center gap-4 p-3 rounded-xl transition-all group ${(queue.some(s => s.id === song.id) || (currentSong && currentSong.id === song.id))
                                    ? 'opacity-40 cursor-default'
                                    : 'hover:bg-white/5 cursor-pointer'
                                }`}
                            onClick={() => {
                                if (queue.some(s => s.id === song.id) || (currentSong && currentSong.id === song.id)) return;
                                onAdd(song);
                                const btn = document.getElementById(`add-btn-${song.id}`);
                                if (btn) {
                                    btn.innerHTML = "✓";
                                    setTimeout(() => btn.innerHTML = "+", 2000);
                                }
                            }}
                        >
                            <img src={song.thumbnail} alt={song.title} className="w-12 h-12 rounded-lg object-cover transition-transform group-hover:scale-105" />
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-100 truncate mb-1" dangerouslySetInnerHTML={{ __html: song.title }}></h4>
                                <p className="text-[10px] font-medium text-slate-500 uppercase truncate">{song.channel}</p>
                            </div>
                            <div className="flex gap-2">
                                {(queue.some(s => s.id === song.id) || (currentSong && currentSong.id === song.id)) ? (
                                    <div className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase tracking-widest rounded-md whitespace-nowrap">
                                        In Sequence
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowPlaylistMenu(showPlaylistMenu === song.id ? null : song.id);
                                                }}
                                                className="text-slate-500 hover:text-blue-500 p-2 transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                            </button>

                                            {showPlaylistMenu === song.id && (
                                                <div ref={menuRef} className="absolute right-0 bottom-full mb-4 w-56 card-smooth p-2 z-[60] shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest p-2 border-b border-white/5">Storage Selection</p>
                                                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                                        {playlists.map(p => (
                                                            <button
                                                                key={p._id}
                                                                onClick={(e) => { e.stopPropagation(); addToPlaylist(p._id, song); }}
                                                                className="w-full text-left p-2.5 rounded-lg hover:bg-white/5 text-[10px] font-bold uppercase tracking-widest transition-all truncate"
                                                            >
                                                                {p.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div id={`add-btn-${song.id}`} className="text-blue-500 p-2 font-bold text-lg">
                                            +
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    !loading && <div className="py-12 text-center opacity-10">
                        <p className="text-[10px] uppercase font-bold tracking-widest">Awaiting Signal</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Search;
