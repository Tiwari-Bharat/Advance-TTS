import { useState, useCallback, useRef, useEffect } from 'react';

export const useAudioPlayer = (audioContext: AudioContext | null) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  
  const animationFrameRef = useRef<number>(0);
  const playbackStartTimeRef = useRef<number>(0); // Time in AudioContext's clock
  const startOffsetRef = useRef<number>(0); // Time within the audio buffer

  const stop = useCallback((resetTime = true) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null; // Prevent onended from firing on manual stop
      audioSourceRef.current.stop();
      audioSourceRef.current.disconnect();
      audioSourceRef.current = null;
    }
    if (resetTime) {
      startOffsetRef.current = 0;
      setCurrentTime(0);
    }
    setIsPlaying(false);
  }, []);

  const tick = useCallback(() => {
    if (audioContext && isPlaying) {
        const elapsedTime = audioContext.currentTime - playbackStartTimeRef.current;
        const newCurrentTime = startOffsetRef.current + elapsedTime;
        setCurrentTime(newCurrentTime);

        if(newCurrentTime < duration) {
            animationFrameRef.current = requestAnimationFrame(tick);
        } else {
            stop(true);
            setCurrentTime(duration);
        }
    }
  }, [audioContext, isPlaying, duration, stop]);

  const play = useCallback((buffer?: AudioBuffer) => {
    if (!audioContext) return;
    
    // If playing, it's a call to pause
    if(isPlaying) {
        startOffsetRef.current += audioContext.currentTime - playbackStartTimeRef.current;
        stop(false); // Stop playback but don't reset time (pause)
        return;
    }

    // Use existing buffer if none is provided (resume)
    const bufferToPlay = buffer || audioBufferRef.current;
    if (!bufferToPlay) return;

    if(buffer) { // If a new buffer is provided, reset everything
      audioBufferRef.current = buffer;
      setDuration(buffer.duration);
      startOffsetRef.current = 0;
      setCurrentTime(0);
    }

    const source = audioContext.createBufferSource();
    source.buffer = bufferToPlay;
    
    // Create GainNode if it doesn't exist
    if (!gainNodeRef.current) {
      gainNodeRef.current = audioContext.createGain();
      gainNodeRef.current.connect(audioContext.destination);
    }
    gainNodeRef.current.gain.value = volume;
    source.connect(gainNodeRef.current);

    source.onended = () => {
        // Only auto-stop if it wasn't manually paused/stopped
        if (audioSourceRef.current === source) {
            stop(true);
            setCurrentTime(duration);
        }
    };
    
    playbackStartTimeRef.current = audioContext.currentTime;
    source.start(0, startOffsetRef.current);

    audioSourceRef.current = source;
    setIsPlaying(true);
    animationFrameRef.current = requestAnimationFrame(tick);
  }, [audioContext, stop, tick, isPlaying, volume, duration]);

  const seek = useCallback((time: number) => {
    if (!audioContext || !audioBufferRef.current) return;

    const wasPlaying = isPlaying;
    stop(false);

    const clampedTime = Math.max(0, Math.min(time, duration));
    setCurrentTime(clampedTime);
    startOffsetRef.current = clampedTime;

    if (wasPlaying) {
      play();
    }
  }, [audioContext, duration, isPlaying, stop, play]);
  
  const changeVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if(gainNodeRef.current) {
        gainNodeRef.current.gain.value = clampedVolume;
    }
  }, []);

  useEffect(() => {
    return () => stop(true); // Cleanup on unmount
  }, [stop]);

  return { play, stop, seek, isPlaying, currentTime, duration, volume, changeVolume };
};