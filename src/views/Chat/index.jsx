import { useEffect, useState, useRef } from "react";
import { useSocket } from "../../context/SocketContext";

const Chat = ({ roomId, username }) => {
    const socket = useSocket();
    const [messageList, setMessageList] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const scrollRef = useRef();

    useEffect(() => {
        socket.on('receive_message', (data) => {
            setMessageList((list) => [...list, data]);
        });

        return () => {
            socket.off('receive_message');
        };
    }, [socket]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messageList]);

    const userColor = localStorage.getItem('streamvibe_color') || "#3b82f6";

    const sendMessage = (e) => {
        if (e) e.preventDefault();
        if (currentMessage.trim()) {
            const messageData = {
                roomId,
                user: username,
                color: userColor,
                text: currentMessage,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
            socket.emit("send_message", messageData);
            setCurrentMessage('');
        }
    };

    return (
        <div className="flex flex-col h-[500px] w-full xl:w-80 bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-[#181818] p-5 border-b border-white/5">
                <h3 className="text-white font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                    Live Feed
                </h3>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
                {messageList.map((content, index) => (
                    <div key={index} className={`flex gap-3 ${content.user === username ? 'flex-row-reverse' : 'flex-row'}`}>
                        {/* Avatar Mini */}
                        <div
                            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black border border-white/10 shadow-lg"
                            style={{ backgroundColor: content.color || '#3b82f6' }}
                        >
                            {content.user[0].toUpperCase()}
                        </div>

                        <div className={`flex flex-col ${content.user === username ? 'items-end' : 'items-start'} max-w-[70%]`}>
                            <div className="flex items-center gap-2 mb-1 px-1">
                                <span className="text-[10px] font-bold text-slate-400">{content.user}</span>
                                <span className="text-[8px] font-medium text-slate-600 uppercase">{content.time}</span>
                            </div>
                            <div className={`px-4 py-2.5 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${content.user === username
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/5'
                                }`}>
                                {content.text}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={scrollRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 bg-[#181818] border-t border-white/5 flex gap-3">
                <input
                    type="text"
                    className="flex-1 bg-black/40 text-white text-xs font-bold rounded-xl px-5 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-white/5 placeholder-slate-700 transition-all"
                    value={currentMessage}
                    placeholder="Type a message..."
                    onChange={(e) => setCurrentMessage(e.target.value)}
                />
                <button
                    type="submit"
                    className="bg-white/5 hover:bg-white/10 text-white p-3 rounded-xl border border-white/5 transition-all active:scale-95"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500">
                        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                    </svg>
                </button>
            </form>
        </div>
    );
};

export default Chat;