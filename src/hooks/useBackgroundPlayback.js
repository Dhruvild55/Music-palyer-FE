import { useEffect, useRef, useCallback } from 'react';

// Hook to manage background playback using Media Session API
// This enables lock screen controls and keeps playback alive
export const useBackgroundPlayback = (currentSong, isPlaying, currentTime, duration, onPlayPause, onNext) => {
  const wakeLockRef = useRef(null);
  const mediaSessionRef = useRef(null);
  const callbacksRef = useRef({ onPlayPause, onNext });

  // Request Wake Lock (keeps screen on during playback)
  const requestWakeLock = async () => {
    if (!isPlaying) return;

    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[Wake Lock] Screen kept active during playback');
      }
    } catch (err) {
      console.warn('[Wake Lock] Not supported or failed:', err);
    }
  };

  // Release Wake Lock
  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('[Wake Lock] Screen lock released');
      } catch (err) {
        console.warn('[Wake Lock] Release failed:', err);
      }
    }
  };

  // Setup Media Session API (lock screen controls)
  const setupMediaSession = () => {
    if (!('mediaSession' in navigator)) {
      console.warn('[Media Session] Not supported');
      return;
    }

    const mediaSession = navigator.mediaSession;

    // Set metadata
    if (currentSong) {
      try {
        mediaSession.metadata = new MediaMetadata({
          title: currentSong.title || 'Now Playing',
          artist: currentSong.channel || 'Unknown Artist',
          album: 'StreamVibe',
          artwork: currentSong.thumbnail ? [
            {
              src: currentSong.thumbnail,
              sizes: '96x96 128x128 192x192 256x256 384x384 512x512',
              type: 'image/jpeg'
            }
          ] : []
        });
        console.log('[Media Session] Metadata updated:', currentSong.title);
      } catch (err) {
        console.warn('[Media Session] Metadata update failed:', err);
      }
    }

    // Set playback state
    mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    // Handle lock screen play/pause button
    try {
      mediaSession.setActionHandler('play', () => {
        console.log('[Media Session] Play button pressed on lock screen');
        if (callbacksRef.current?.onPlayPause) callbacksRef.current.onPlayPause();
      });

      mediaSession.setActionHandler('pause', () => {
        console.log('[Media Session] Pause button pressed on lock screen');
        if (callbacksRef.current?.onPlayPause) callbacksRef.current.onPlayPause();
      });

      // Handle next track button
      mediaSession.setActionHandler('nexttrack', () => {
        console.log('[Media Session] Next button pressed on lock screen');
        if (callbacksRef.current?.onNext) callbacksRef.current.onNext();
        console.log('[Media Session] Previous button pressed on lock screen');
      });

      // Handle seekbar on lock screen
      mediaSession.setActionHandler('seekto', (event) => {
        console.log('[Media Session] Seek to:', event.seekTime);
        // Seek will be handled through the parent component
      });
    } catch (err) {
      console.warn('[Media Session] Action handlers failed:', err);
    }

    mediaSessionRef.current = mediaSession;
  };

  // Update position state
  const updatePositionState = () => {
    if ('mediaSession' in navigator && navigator.mediaSession.setPositionState && currentSong) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration || 0,
          playbackRate: isPlaying ? 1 : 0,
          position: currentTime || 0
        });
      } catch (err) {
        console.warn('[Media Session] Position update failed:', err);
      }
    }
  };

  // Setup background permission
  const requestBackgroundPlayback = async () => {
    try {
      if ('permissions' in navigator) {
        const permission = await navigator.permissions.query({ name: 'background-sync' });
        if (permission.state === 'granted') {
          console.log('[Background Playback] Permission granted');
        }
      }
    } catch (err) {
      console.warn('[Background Playback] Permission check failed:', err);
    }
  };

  // Effects
  useEffect(() => {
    callbacksRef.current = { onPlayPause, onNext };
  }, [onPlayPause, onNext]);

  useEffect(() => {
    requestBackgroundPlayback();
  }, []);

  useEffect(() => {
    setupMediaSession();
  }, [currentSong, isPlaying]);

  useEffect(() => {
    updatePositionState();
  }, [currentTime, duration, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
  }, [isPlaying]);

  return {
    wakeLockActive: wakeLockRef.current !== null,
    mediaSessionReady: mediaSessionRef.current !== null
  };
};

export default useBackgroundPlayback;
