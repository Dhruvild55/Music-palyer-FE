import { useState } from "react";

const DJPermissionsPanel = ({ listeners, djPermissions, creatorId, currentUserId, roomId, socket, user }) => {
    const [showDJPanel, setShowDJPanel] = useState(false);
    
    const isRoomOwner = creatorId && String(creatorId) === String(currentUserId);
    
    const handleGrantDJ = (targetUserId) => {
        socket.emit('grant_dj_permission', {
            roomId,
            targetUserId,
            userId: user?._id,
            guestId: currentUserId
        });
    };

    const handleRevokeDJ = (targetUserId) => {
        socket.emit('revoke_dj_permission', {
            roomId,
            targetUserId,
            userId: user?._id,
            guestId: currentUserId
        });
    };

    const getDJList = () => {
        const djs = [];
        
        // Add creator
        const creatorListener = listeners?.find(l => String(l.userId || l.id) === String(creatorId));
        if (creatorListener) {
            djs.push({
                ...creatorListener,
                isCreator: true,
                isDJ: true
            });
        }
        
        // Add co-DJs
        listeners?.forEach(listener => {
            const listenerId = listener.userId || listener.id;
            if (djPermissions?.includes(listenerId) && String(listenerId) !== String(creatorId)) {
                djs.push({
                    ...listener,
                    isCreator: false,
                    isDJ: true
                });
            }
        });
        
        return djs;
    };

    const getRegularListeners = () => {
        return listeners?.filter(listener => {
            const listenerId = listener.userId || listener.id;
            return String(listenerId) !== String(creatorId) && !djPermissions?.includes(listenerId);
        }) || [];
    };

    const djs = getDJList();
    const regularListeners = getRegularListeners();

    return (
        <div className="space-y-4">
            {/* DJ Status Badge */}
            {isRoomOwner && (
                <div className="relative">
                    <button
                        onClick={() => setShowDJPanel(!showDJPanel)}
                        className="w-full card-smooth p-4 hover:bg-white/5 transition-all flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="text-2xl">🎛️</div>
                            <div className="text-left">
                                <p className="text-xs font-black uppercase tracking-widest text-blue-400">DJ Permissions</p>
                                <p className="text-[10px] text-slate-400">{djs.length} DJ{djs.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-4 w-4 transition-transform ${showDJPanel ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </button>

                    {showDJPanel && (
                        <div className="absolute top-full left-0 right-0 mt-2 card-smooth p-4 z-50 shadow-2xl max-w-sm mx-auto w-full animate-in fade-in slide-in-from-top-2">
                            {/* Current DJs */}
                            {djs.length > 0 && (
                                <div className="mb-4">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400 mb-2 pb-2 border-b border-blue-500/20">
                                        🎧 Active DJs ({djs.length})
                                    </p>
                                    <div className="space-y-2">
                                        {djs.map((dj) => (
                                            <div
                                                key={dj.id}
                                                className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/20"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center text-white"
                                                        style={{ backgroundColor: dj.color }}
                                                    >
                                                        {dj.name[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-200">{dj.name}</p>
                                                        {dj.isCreator && (
                                                            <p className="text-[8px] font-black text-yellow-400 uppercase">👑 Room Owner</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {!dj.isCreator && (
                                                    <button
                                                        onClick={() => handleRevokeDJ(dj.userId || dj.id)}
                                                        className="text-[10px] font-bold px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                                                    >
                                                        Revoke
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Available Users to Grant */}
                            {regularListeners.length > 0 && (
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 pb-2 border-b border-white/10">
                                        👥 Grant DJ Access
                                    </p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {regularListeners.map((listener) => (
                                            <div
                                                key={listener.id}
                                                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-all"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center text-white"
                                                        style={{ backgroundColor: listener.color }}
                                                    >
                                                        {listener.name[0].toUpperCase()}
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-200">{listener.name}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleGrantDJ(listener.userId || listener.id)}
                                                    className="text-[10px] font-bold px-2 py-1 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-all"
                                                >
                                                    Grant
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {regularListeners.length === 0 && djs.length <= 1 && (
                                <div className="text-center py-4">
                                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
                                        No other listeners available
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Non-owner DJ indicator */}
            {!isRoomOwner && djPermissions?.length > 0 && (
                <div className="card-smooth p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="text-xs font-black uppercase tracking-widest text-blue-400 mb-2">🎧 DJs in this Room</p>
                    <div className="flex flex-wrap gap-2">
                        {djs.map((dj) => (
                            <div
                                key={dj.id}
                                className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 rounded text-[9px] font-bold text-blue-200"
                            >
                                <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: dj.color }}
                                ></div>
                                {dj.name}
                                {dj.isCreator && " 👑"}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DJPermissionsPanel;
