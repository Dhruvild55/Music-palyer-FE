import { createContext, useContext } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext();

const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
    autoConnect: true,
});

export const SocketProvider = ({ children }) => {
    return (
        <SocketContext.Provider value={socket} >
            {children}
        </SocketContext.Provider>
    )
};

export const useSocket = () => useContext(SocketContext);