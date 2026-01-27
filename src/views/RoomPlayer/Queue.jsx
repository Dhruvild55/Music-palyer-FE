const Queue = ({ queue }) => {
    return (
        <div className="bg-[#121212] rounded-xl p-6 border border-white/5 space-y-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Up Next</h3>

            {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500 space-y-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <p className="text-sm italic">Queue is empty</p>
                </div>
            ) : (
                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {queue.map((song, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/5 transition-all">
                            <span className="text-xs font-bold text-gray-500 w-4">{index + 1}</span>
                            <img src={song.thumbnail} alt={song.title} className="w-10 h-10 rounded-md object-cover" />
                            <div className="flex-1 min-w-0">
                                <h4 className="text-xs font-semibold text-white truncate">{song.title}</h4>
                                <p className="text-[10px] text-gray-400 truncate">{song.channel}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Queue;
