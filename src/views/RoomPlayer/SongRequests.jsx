import { useState, useEffect } from "react";

const SongRequestsTab = ({ 
    songRequests = [], 
    isDJ, 
    onAcceptRequest, 
    onDeclineRequest,
    onRequestSong,
    currentSong,
    queue
}) => {
    const [showNewRequest, setShowNewRequest] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        console.log('🎵 SongRequestsTab - songRequests updated:', songRequests);
    }, [songRequests]);

    // Separate requests by status
    const pendingRequests = songRequests?.filter(req => req.status === 'pending') || [];
    const acceptedRequests = songRequests?.filter(req => req.status === 'accepted') || [];
    const declinedRequests = songRequests?.filter(req => req.status === 'declined') || [];

    const handleAccept = (requestId) => {
        onAcceptRequest(requestId);
        // Optional: Show feedback
    };

    const handleDecline = (requestId) => {
        onDeclineRequest(requestId);
        // Optional: Show feedback
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '⏳ Pending' },
            accepted: { bg: 'bg-green-500/20', text: 'text-green-400', label: '✓ Added' },
            declined: { bg: 'bg-red-500/20', text: 'text-red-400', label: '✗ Declined' }
        };
        return badges[status] || badges.pending;
    };

    const RequestCard = ({ request, showActions = true }) => {
        const badge = getStatusBadge(request.status);
        
        return (
            <div className={`p-3 rounded-lg border ${request.status === 'pending' ? 'bg-white/5 border-blue-500/20' : 'bg-white/2 border-white/10'} transition-all`}>
                <div className="flex gap-3">
                    {/* Thumbnail */}
                    <img
                        src={request.thumbnail}
                        alt={request.title}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-200 line-clamp-1">
                            {request.title}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                            {request.channel}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            <div
                                className="w-4 h-4 rounded text-[7px] font-bold flex items-center justify-center text-white"
                                style={{ backgroundColor: request.userColor }}
                            >
                                {request.userName?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <span className="text-[9px] text-slate-400">
                                {request.userName}
                            </span>
                            <span className={`text-[8px] font-black uppercase ml-auto px-2 py-0.5 rounded ${badge.bg} ${badge.text}`}>
                                {badge.label}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    {showActions && request.status === 'pending' && isDJ && (
                        <div className="flex flex-col gap-1 justify-center">
                            <button
                                onClick={() => handleAccept(request._id)}
                                className="text-[9px] font-bold px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all whitespace-nowrap"
                            >
                                Accept
                            </button>
                            <button
                                onClick={() => handleDecline(request._id)}
                                className="text-[9px] font-bold px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all whitespace-nowrap"
                            >
                                Decline
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="card-smooth p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-200">
                        Song Requests {pendingRequests.length > 0 && `(${pendingRequests.length})`}
                    </h3>
                </div>
            </div>

            {/* Pending Requests Section */}
            {pendingRequests.length > 0 ? (
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400 px-2">
                        ⏳ Pending Requests ({pendingRequests.length})
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {pendingRequests.map(request => (
                            <RequestCard key={request._id} request={request} showActions={true} />
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-8 text-slate-400">
                    <p className="text-sm font-semibold mb-2">No pending requests</p>
                    <p className="text-[11px]">Listeners will see their requests here</p>
                </div>
            )}

            {/* Accepted Requests */}
            {acceptedRequests.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-green-400 px-2">
                        ✓ Accepted ({acceptedRequests.length})
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                        {acceptedRequests.map(request => (
                            <RequestCard key={request._id} request={request} showActions={false} />
                        ))}
                    </div>
                </div>
            )}

            {/* Declined Requests */}
            {declinedRequests.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-widest text-red-400 px-2">
                        ✗ Declined ({declinedRequests.length})
                    </p>
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {declinedRequests.slice(-5).map(request => (
                            <RequestCard key={request._id} request={request} showActions={false} />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State for Non-DJs */}
            {!isDJ && pendingRequests.length === 0 && (
                <div className="card-smooth p-6 text-center">
                    <p className="text-[11px] text-slate-400 uppercase font-black tracking-widest mb-2">
                        Submit a Song Request
                    </p>
                    <p className="text-xs text-slate-500 mb-4">
                        Can't decide? Let the DJ know what you want to hear!
                    </p>
                </div>
            )}
        </div>
    );
};

export default SongRequestsTab;
