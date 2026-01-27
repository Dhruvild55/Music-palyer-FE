import { useState, useEffect } from 'react';
import { api } from '../../context/AuthContext';
import Search from '../RoomPlayer/Search';

const PlaylistTab = ({ onPlaylistLoad }) => {
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [showCreate, setShowCreate] = useState(false);

    const fetchPlaylists = async () => {
        try {
            const res = await api.get('/api/playlists');
            if (res.data.status === 'success') {
                setPlaylists(res.data.data.playlists);
            }
        } catch (err) {
            console.error('Error fetching playlists:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPlaylists();
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newPlaylistName.trim()) return;
        try {
            const res = await api.post('/api/playlists', { name: newPlaylistName.trim() });
            if (res.data.status === 'success') {
                setPlaylists([res.data.data.playlist, ...playlists]);
                setNewPlaylistName('');
                setShowCreate(false);
            }
        } catch (err) {
            console.error('Error creating playlist:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Archiving this sequence? It will be permanently removed from the mainframe.")) return;
        try {
            await api.delete(`/api/playlists/${id}`);
            setPlaylists(playlists.filter(p => p._id !== id));
        } catch (err) {
            console.error('Error deleting playlist:', err);
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex items-end justify-between border-b border-white/5 pb-8">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-2">My Library</p>
                    <h2 className="text-5xl font-black tracking-tighter italic text-glow">Playlists</h2>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="flex items-center gap-4 bg-white text-black py-3 px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all hover:scale-105"
                >
                    {showCreate ? "Cancel" : "New Sequence ⚡"}
                </button>
            </div>

            {showCreate && (
                <div className="glass-panel p-8 rounded-[2rem] premium-border animate-in slide-in-from-top-4 duration-500">
                    <form onSubmit={handleCreate} className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Enter Playlist Name..."
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            className="flex-1 glass-input rounded-2xl py-4 px-6 focus:outline-none text-white font-black placeholder-slate-700 transition-all uppercase tracking-widest text-xs"
                            autoFocus
                        />
                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all">
                            Initialize
                        </button>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="glass-panel h-48 rounded-[2.5rem] animate-pulse"></div>
                    ))}
                </div>
            ) : playlists.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {playlists.map((playlist) => (
                        <div key={playlist._id} className="group glass-panel p-8 rounded-[2.5rem] transition-all duration-500 hover:scale-[1.02] hover:bg-white/[0.05] relative overflow-hidden flex flex-col justify-between min-h-[240px]">
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h3 className="text-2xl font-black tracking-tight group-hover:text-glow transition-all duration-500 leading-tight">
                                            {playlist.name}
                                        </h3>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                            {playlist.songs.length} DATA TRACKS
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(playlist._id)}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-red-500 transition-all"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="flex -space-x-4 overflow-hidden pt-4">
                                    {playlist.songs.slice(0, 4).map((song, i) => (
                                        <img key={i} src={song.thumbnail} className="w-12 h-12 rounded-xl border-4 border-[#020617] group-hover:border-white/10 transition-all" alt="" />
                                    ))}
                                    {playlist.songs.length > 4 && (
                                        <div className="w-12 h-12 rounded-xl bg-white/5 border-4 border-[#020617] flex items-center justify-center text-[10px] font-black">
                                            +{playlist.songs.length - 4}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-8">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">Sequence Created: {new Date(playlist.createdAt).toLocaleDateString()}</p>
                                {/* We'll implement direct loading in the Room view later */}
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {/* Song Discovery for Library */}
            <div className="pt-12 border-t border-white/5 space-y-10">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-2">Build Sequence</p>
                    <h2 className="text-4xl font-black tracking-tighter italic text-glow">Find & Store Tracks</h2>
                </div>
                <div className="max-w-3xl">
                    <Search onAdd={() => {
                        // In the dashboard, click to add to queue is disabled
                        // but the "Add to Playlist" menu inside Search works!
                        alert("Tune into a room to broadcast this track! Use the '+' button to save it to your library.");
                    }} />
                </div>
            </div>
        </div>
    );
};

export default PlaylistTab;
