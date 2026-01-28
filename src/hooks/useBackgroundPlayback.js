import { useEffect, useRef } from 'react';

// Hook to manage background playback, wake lock, and media session
export const useBackgroundPlayback = (currentSong, isPlaying, currentTime, duration) => {
  const wakeLockRef = useRef(null);
  const mediaSessionRef = useRef(null);

  // Request Wake Lock (keeps screen on during playback)
  const requestWakeLock = async () => {
    if (!isPlaying) return;

    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('[Wake Lock] Screen kept active during playback');

        // Release when visibility changes
        document.addEventListener('visibilitychange', () => {
          if (document.hidden && wakeLockRef.current) {
            wakeLockRef.current.release();
            wakeLockRef.current = null;
          }
        });
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
      mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || 'Now Playing',
        artist: currentSong.channel || 'Unknown Artist',
        album: 'StreamVibe',
        artwork: currentSong.thumbnail ? [
          {
            src: currentSong.thumbnail,
            sizes: '256x256',
            type: 'image/jpeg'
          }
        ] : []
      });
    }

    // Set playback state
    mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

    // Handle action handlers
    try {
      mediaSession.setActionHandler('play', () => {
        console.log('[Media Session] Play requested');
        // This will be handled by the parent component through socket events
      });

      mediaSession.setActionHandler('pause', () => {
        console.log('[Media Session] Pause requested');
        // This will be handled by the parent component through socket events
      });

      mediaSession.setActionHandler('nexttrack', () => {
        console.log('[Media Session] Next track requested');
        // This will be handled by the parent component through socket events
      });

      mediaSession.setActionHandler('previoustrack', () => {
        console.log('[Media Session] Previous track requested');
      });

      // Seekbar support
      mediaSession.setActionHandler('seekto', (event) => {
        console.log('[Media Session] Seek to:', event.seekTime);
        // This will be handled by the parent component
      });
    } catch (err) {
      console.warn('[Media Session] Action handlers not fully supported:', err);
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

  // Register Service Worker
  const registerServiceWorker = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('[Service Worker] Registered:', registration);
      }
    } catch (err) {
      console.warn('[Service Worker] Registration failed:', err);
    }
  };

  // Effects
  useEffect(() => {
    registerServiceWorker();
    requestBackgroundPlayback();
  }, []);

  useEffect(() => {
    setupMediaSession();
  }, [currentSong]);

  useEffect(() => {
    updatePositionState();
  }, [currentTime, duration, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      if (!isPlaying) {
        releaseWakeLock();
      }
    };
  }, [isPlaying]);

  return {
    wakeLockActive: wakeLockRef.current !== null,
    mediaSessionReady: mediaSessionRef.current !== null
  };
};

export default useBackgroundPlayback;
