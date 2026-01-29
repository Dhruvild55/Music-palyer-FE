import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../context/SocketContext';

export default function useScreenShare(roomId, listeners) {
    const socket = useSocket();
    const pcsRef = useRef({}); // peer connections keyed by remote socket id
    const localStreamRef = useRef(null);
    // Build RTC config from env (supports VITE_ICE_SERVERS as JSON or single TURN vars)
    const getIceServers = () => {
        try {
            const raw = import.meta.env.VITE_ICE_SERVERS;
            if (raw) {
                // allow JSON string or simple semicolon-separated STUN/TURN URLs
                try { return JSON.parse(raw); } catch (e) {}
                return [{ urls: raw }];
            }

            const turnUrl = import.meta.env.VITE_TURN_URL;
            const turnUser = import.meta.env.VITE_TURN_USERNAME || import.meta.env.VITE_TURN_USER;
            const turnPass = import.meta.env.VITE_TURN_PASSWORD || import.meta.env.VITE_TURN_PASS;
            if (turnUrl) {
                const creds = turnUser && turnPass ? { username: turnUser, credential: turnPass } : {};
                return [{ urls: turnUrl, ...creds }, { urls: 'stun:stun.l.google.com:19302' }];
            }
        } catch (err) {
            console.warn('Failed to parse ICE servers from env', err);
        }
        return [{ urls: 'stun:stun.l.google.com:19302' }];
    };
    const RTC_CONFIG = { iceServers: getIceServers() };
    const [isSharing, setIsSharing] = useState(false);
    const [remoteStreams, setRemoteStreams] = useState({}); // { socketId: MediaStream }

    useEffect(() => {
        if (!socket) return;

        const handleOffer = async ({ from, sdp }) => {
            try {
                if (from === socket.id) return;
                const pc = new RTCPeerConnection(RTC_CONFIG);

                pc.ontrack = (ev) => {
                    setRemoteStreams(prev => ({ ...prev, [from]: ev.streams[0] }));
                };

                pc.onicecandidate = (e) => {
                    if (e.candidate) socket.emit('screenshare-candidate', { roomId, to: from, candidate: e.candidate });
                };

                // If we have any local audio to send, add tracks (optional)
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
                }

                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                pcsRef.current[from] = pc;
                socket.emit('screenshare-answer', { roomId, to: from, sdp: pc.localDescription });
            } catch (err) {
                console.error('Error handling screenshare offer', err);
            }
        };

        const handleAnswer = async ({ from, sdp }) => {
            try {
                const pc = pcsRef.current[from];
                if (!pc) return;
                await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            } catch (err) {
                console.error('Error handling screenshare answer', err);
            }
        };

        const handleCandidate = async ({ from, candidate }) => {
            try {
                const pc = pcsRef.current[from];
                if (!pc) return;
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error('Error adding ICE candidate', err);
            }
        };

        const handleStop = ({ from }) => {
            // remote stopped sharing
            const pc = pcsRef.current[from];
            if (pc) {
                try { pc.close(); } catch (e) {}
                delete pcsRef.current[from];
            }
            setRemoteStreams(prev => {
                const copy = { ...prev };
                delete copy[from];
                return copy;
            });
        };

        socket.on('screenshare-offer', handleOffer);
        socket.on('screenshare-answer', handleAnswer);
        socket.on('screenshare-candidate', handleCandidate);
        socket.on('screenshare-stop', handleStop);

        return () => {
            socket.off('screenshare-offer', handleOffer);
            socket.off('screenshare-answer', handleAnswer);
            socket.off('screenshare-candidate', handleCandidate);
            socket.off('screenshare-stop', handleStop);
        };
    }, [socket, roomId]);

    useEffect(() => {
        // If we're currently sharing and listeners change, offer to new listeners
        if (!isSharing || !socket) return;

        const currentTargets = Object.keys(pcsRef.current);
        (listeners || []).forEach(l => {
            const targetId = l.id;
            if (!targetId || targetId === socket.id) return;
            if (currentTargets.includes(targetId)) return;
            createOfferTo(targetId).catch(e => console.error(e));
        });

    }, [listeners]);

        const createOfferTo = async (targetId) => {
        if (!localStreamRef.current) return;
        const pc = new RTCPeerConnection(RTC_CONFIG);

        pc.onicecandidate = (e) => {
            if (e.candidate) socket.emit('screenshare-candidate', { roomId, to: targetId, candidate: e.candidate });
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
                try { pc.close(); } catch (e) {}
                delete pcsRef.current[targetId];
            }
        };

        localStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localStreamRef.current));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        pcsRef.current[targetId] = pc;
        socket.emit('screenshare-offer', { roomId, to: targetId, sdp: pc.localDescription });
    };

    const startShare = async () => {
        try {
            // Ask for display media with audio when supported (Chrome can capture system/tab audio)
            const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

            // If displayStream has no audio (browser didn't provide system audio), try to get microphone audio as fallback
            if (displayStream.getAudioTracks().length === 0) {
                try {
                    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    micStream.getAudioTracks().forEach((t) => displayStream.addTrack(t));
                } catch (e) {
                    // microphone permission denied or not available — continue without audio
                    console.warn('Microphone fallback unavailable', e);
                }
            }

            localStreamRef.current = displayStream;
            setIsSharing(true);

            // Create offers to existing listeners
            (listeners || []).forEach(l => {
                const targetId = l.id;
                if (!targetId || targetId === socket.id) return;
                createOfferTo(targetId).catch(e => console.error(e));
            });

            // When the display video track ends (user stops sharing), stop share
            const vt = displayStream.getVideoTracks()[0];
            if (vt) vt.addEventListener('ended', () => {
                stopShare();
            });
        } catch (err) {
            console.error('Could not start screen share', err);
        }
    };

    const stopShare = () => {
        try {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
                localStreamRef.current = null;
            }
            Object.values(pcsRef.current).forEach(pc => { try { pc.close(); } catch (e) {} });
            pcsRef.current = {};
            setIsSharing(false);
            socket.emit('screenshare-stop', { roomId });
        } catch (err) {
            console.error('Error stopping share', err);
        }
    };

    return { isSharing, startShare, stopShare, remoteStreams };
}
