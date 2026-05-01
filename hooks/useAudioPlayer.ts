import { useState, useCallback, useRef, useEffect } from 'react';

export const useAudioPlayer = (audioContext: AudioContext | null) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [pitch, setPitch] = useState(0);

  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  
  const animationFrameRef = useRef<number>(0);
  const playbackStartTimeRef = useRef<number>(0);
  const startOffsetRef = useRef<number>(0);

  // Use refs for currently applied rate/pitch to calculate time accurately
  const currentRateRef = useRef<number>(1);

  const stop = useCallback((resetTime = true) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioSourceRef.current) {
      audioSourceRef.current.onended = null;
      try {
        audioSourceRef.current.stop();
        audioSourceRef.current.disconnect();
      } catch (e) {
        console.error("Error stopping audio source:", e);
      }
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
        const elapsedTime = (audioContext.currentTime - playbackStartTimeRef.current) * currentRateRef.current;
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
    if (!audioContext) {
      console.error("Audio Context not found");
      return;
    }
    
    if(isPlaying) {
        startOffsetRef.current += (audioContext.currentTime - playbackStartTimeRef.current) * currentRateRef.current;
        stop(false);
        return;
    }

    const bufferToPlay = buffer || audioBufferRef.current;
    if (!bufferToPlay) return;

    if(buffer) {
      audioBufferRef.current = buffer;
      setDuration(buffer.duration);
      startOffsetRef.current = 0;
      setCurrentTime(0);
    }

    try {
      const source = audioContext.createBufferSource();
      source.buffer = bufferToPlay;
      
      // Apply current playback rate and pitch
      currentRateRef.current = playbackRate;
      source.playbackRate.value = playbackRate;
      source.detune.value = pitch * 1200; // -1 to 1 maps to -1200 to 1200 cents (1 octave)

      if (!gainNodeRef.current) {
        gainNodeRef.current = audioContext.createGain();
        gainNodeRef.current.connect(audioContext.destination);
      }
      gainNodeRef.current.gain.value = volume;
      source.connect(gainNodeRef.current);

      source.onended = () => {
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
    } catch (err) {
      console.error("Failed to play audio:", err);
      stop(true);
      throw new Error("Failed to initialize audio playback.");
    }
  }, [audioContext, stop, tick, isPlaying, volume, duration, playbackRate, pitch]);

  const seek = useCallback((time: number) => {
    if (!audioContext || !audioBufferRef.current) return;

    const wasPlaying = isPlaying;
    
    if (wasPlaying) {
      startOffsetRef.current += (audioContext.currentTime - playbackStartTimeRef.current) * currentRateRef.current;
    }
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

  const changePlaybackRate = useCallback((newRate: number) => {
    const clamped = Math.max(0.5, Math.min(2, newRate));
    setPlaybackRate(clamped);
    if (isPlaying && audioContext) {
      // Update running playback offset
      startOffsetRef.current += (audioContext.currentTime - playbackStartTimeRef.current) * currentRateRef.current;
      playbackStartTimeRef.current = audioContext.currentTime;
      currentRateRef.current = clamped;
      if (audioSourceRef.current) {
        audioSourceRef.current.playbackRate.value = clamped;
      }
    }
  }, [isPlaying, audioContext]);

  const changePitch = useCallback((newPitch: number) => {
    const clamped = Math.max(-1, Math.min(1, newPitch));
    setPitch(clamped);
    if (audioSourceRef.current) {
      audioSourceRef.current.detune.value = clamped * 1200;
    }
  }, []);

  useEffect(() => {
    return () => stop(true);
  }, [stop]);

  return { play, stop, seek, isPlaying, currentTime, duration, volume, changeVolume, playbackRate, changePlaybackRate, pitch, changePitch };
};