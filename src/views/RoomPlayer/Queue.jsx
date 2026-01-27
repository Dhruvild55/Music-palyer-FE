const Queue = ({ queue }) => {
    return (
        <div className="card-smooth p-6 space-y-6 flex flex-col h-fit">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Up Next</h3>
                <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">{queue.length} Tracks</span>
            </div>

            {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-700 space-y-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p className="text-[10px] uppercase font-bold tracking-widest italic opacity-30">Queue is Clear</p>
                </div>
            ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {queue.map((song, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.03] transition-all group">
                            <span className="text-[10px] font-bold text-slate-700 group-hover:text-blue-500 w-4">{index + 1}</span>
                            <img src={song.thumbnail} alt={song.title} className="w-10 h-10 rounded-lg object-cover" />
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-bold text-slate-200 truncate tracking-tight">{song.title}</h4>
                                <p className="text-[9px] font-medium text-slate-500 uppercase truncate">{song.channel}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Queue;
