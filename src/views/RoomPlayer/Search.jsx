import { useState } from "react";
import axios from "axios";

// HELP: Get your API Key at https://console.cloud.google.com/
const YT_API_KEY = 'AIzaSyBQp-GWu1M0TsiAl_GN7ZCD5Nxu7c75IBc';
;
const Search = ({ onAdd }) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

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
        <div className="bg-[#121212] rounded-xl p-6 border border-white/5 space-y-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent italic">Sync Search</h3>
            <form onSubmit={handleSearch} className="relative">
                <input
                    type="text"
                    placeholder="Search for a song..."
                    className="w-full bg-[#181818] border border-white/10 rounded-full py-3 px-12 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm transition-all"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                {loading ? (
                    <div className="absolute left-4 top-3.5 h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-3.5 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                )}
            </form>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {results.length > 0 ? (
                    results.map((song) => (
                        <div
                            key={song.id}
                            className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group border border-transparent hover:border-white/5"
                            onClick={() => onAdd(song)}
                        >
                            <img src={song.thumbnail} alt={song.title} className="w-12 h-12 rounded-md object-cover shadow-lg" />
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold text-white truncate group-hover:text-green-400 transition-colors" dangerouslySetInnerHTML={{ __html: song.title }}></h4>
                                <p className="text-xs text-gray-400 truncate">{song.channel}</p>
                            </div>
                            <button className="bg-green-500/10 text-green-500 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-500 hover:text-black">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                        </div>
                    ))
                ) : (
                    !loading && <p className="text-gray-600 text-center text-xs italic">Start searching to populate the list...</p>
                )}
            </div>
        </div>
    );
};

export default Search;
