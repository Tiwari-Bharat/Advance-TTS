import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import TextArea from './components/TextArea';
import Select from './components/Select';
import Button from './components/Button';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProgressBar from './components/ProgressBar';
import HotkeysModal from './components/HotkeysModal';
import { AVAILABLE_VOICES, PLAYBACK_SPEEDS, SOUND_EFFECTS, DEFAULT_TEXT, EFFECT_PROMPTS } from './constants';
import { generateSpeech, analyzeTextEmotion } from './services/geminiService';
import { audioBufferToWav, audioBufferToMp3 } from './services/audioUtils';
import { useAudioPlayer } from './hooks/useAudioPlayer';

const PlayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.647c1.295.742 1.295 2.545 0 3.286L7.279 20.99c-1.25.717-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
    </svg>
);

const PauseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75zm9 0a.75.75 0 01.75.75v12a.75.75 0 01-1.5 0V6a.75.75 0 01.75-.75z" clipRule="evenodd" />
    </svg>
);

const VolumeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
);


const App: React.FC = () => {
    const [text, setText] = useState<string>(DEFAULT_TEXT);
    const [selectedVoice, setSelectedVoice] = useState<string>(AVAILABLE_VOICES[0].value);
    const [selectedEffect, setSelectedEffect] = useState<string>(SOUND_EFFECTS[0].value);
    const [customEffect, setCustomEffect] = useState<string>('In a dramatic voice, say: ');
    const [playbackRate, setPlaybackRate] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [isHotkeysModalOpen, setIsHotkeysModalOpen] = useState(false);
    const [downloadFormat, setDownloadFormat] = useState<'wav' | 'mp3'>('wav');

    const audioContextRef = useRef<AudioContext | null>(null);
    const { play, stop, seek, isPlaying, currentTime, duration, volume, changeVolume } = useAudioPlayer(audioContextRef.current);

    useEffect(() => {
        if (!audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                setError("Web Audio API is not supported in this browser.");
            }
        }
    }, []);

    const handleGenerateSpeech = useCallback(async () => {
        if (!text.trim()) {
            setError("Please enter some text to generate speech.");
            return;
        }
        if (!audioContextRef.current) {
            setError("Audio context not available. Please refresh the browser.");
            return;
        }

        setIsLoading(true);
        setError(null);
        if (isPlaying) stop();
        setAudioBuffer(null);

        try {
            let effectPrompt = '';
            if (selectedEffect === 'auto') {
                setLoadingMessage('Analyzing emotion...');
                effectPrompt = await analyzeTextEmotion(text);
            } else if (selectedEffect === 'custom') {
                effectPrompt = customEffect;
            } else {
                effectPrompt = EFFECT_PROMPTS[selectedEffect] || '';
            }

            setLoadingMessage('Generating speech...');
            const buffer = await generateSpeech(text, selectedVoice, effectPrompt, audioContextRef.current);
            setAudioBuffer(buffer);
            play(buffer); // Autoplay
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(errorMessage);
            setAudioBuffer(null);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [text, selectedVoice, selectedEffect, customEffect, isPlaying, stop, play]);

    const handlePlayPause = useCallback(() => {
        if (!audioBuffer) return;
        try {
            setError(null);
            if (audioContextRef.current?.state === 'suspended') {
                audioContextRef.current.resume();
            }
            play(); // Toggles play/pause
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown playback error occurred.";
            setError(`Failed to play audio: ${errorMessage}`);
            stop();
        }
    }, [audioBuffer, play, stop]);
    
    const handleDownload = useCallback(() => {
        if (!audioBuffer) return;
        try {
            const blob = downloadFormat === 'wav' ? audioBufferToWav(audioBuffer) : audioBufferToMp3(audioBuffer);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gemini-tts-audio.${downloadFormat}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            setError("Failed to prepare audio for download.");
        }
    }, [audioBuffer, downloadFormat]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key === '/') {
            event.preventDefault();
            setIsHotkeysModalOpen(prev => !prev);
            return;
        }
        
        if (isHotkeysModalOpen) return;

        const target = event.target as HTMLElement;
        const isTyping = ['TEXTAREA', 'SELECT', 'INPUT'].includes(target.tagName);

        if (event.code === 'Space' && !isTyping) {
             event.preventDefault();
             if (audioBuffer) handlePlayPause();
             return;
        }
        
        if (isTyping) return;

        const key = event.key.toLowerCase();

        if (audioBuffer && key === 'd') {
             event.preventDefault();
             handleDownload();
             return;
        }

        if (key === 'v') {
            event.preventDefault();
            const currentIndex = AVAILABLE_VOICES.findIndex(v => v.value === selectedVoice);
            const nextIndex = (currentIndex + 1) % AVAILABLE_VOICES.length;
            setSelectedVoice(AVAILABLE_VOICES[nextIndex].value);
        } else if (key === 's') {
            event.preventDefault();
            const currentIndex = PLAYBACK_SPEEDS.findIndex(s => parseFloat(s.value) === playbackRate);
            const nextIndex = (currentIndex + 1) % PLAYBACK_SPEEDS.length;
            setPlaybackRate(parseFloat(PLAYBACK_SPEEDS[nextIndex].value));
        } else if (key === 'e') {
            event.preventDefault();
            const currentIndex = SOUND_EFFECTS.findIndex(e => e.value === selectedEffect);
            const nextIndex = (currentIndex + 1) % SOUND_EFFECTS.length;
            setSelectedEffect(SOUND_EFFECTS[nextIndex].value);
        }

    }, [audioBuffer, handlePlayPause, handleDownload, selectedVoice, playbackRate, selectedEffect, isHotkeysModalOpen]);
    
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const selectedVoiceDetails = AVAILABLE_VOICES.find(v => v.value === selectedVoice);

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Navbar />
            <main className="flex-grow flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-2xl mx-auto space-y-8">
                    <Header />
                    <div className="relative bg-slate-800/50 p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-lg">
                        <div className="absolute -inset-px rounded-2xl border-2 border-sky-500/20 shadow-[0_0_30px_theme(colors.sky.500/20%)] pointer-events-none"></div>
                        <form onSubmit={(e) => { e.preventDefault(); handleGenerateSpeech(); }} className="space-y-6">
                            <TextArea label="Your Text" id="tts-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text to convert to speech..." rows={8}/>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div>
                                   <Select label="Select a Voice" id="voice-select" value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} options={AVAILABLE_VOICES}/>
                                   {selectedVoiceDetails && (<p className="mt-2 text-sm text-slate-400 px-1">{selectedVoiceDetails.description}</p>)}
                                </div>
                                <Select label="Add an Effect" id="effect-select" value={selectedEffect} onChange={(e) => setSelectedEffect(e.target.value)} options={SOUND_EFFECTS}/>
                            </div>
                            {selectedEffect === 'custom' && (
                                <div className="animate-fade-in">
                                    <label htmlFor="custom-effect" className="block text-sm font-medium text-slate-300 mb-2">Custom Effect Prompt</label>
                                    <input type="text" id="custom-effect" value={customEffect} onChange={(e) => setCustomEffect(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"/>
                                </div>
                            )}
                            {error && (<div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md text-sm">{error}</div>)}
                            <div className="flex flex-col gap-4 pt-2">
                                <Button type="submit" isLoading={isLoading} loadingMessage={loadingMessage} disabled={isLoading || !text.trim()} className="w-full">Generate Speech</Button>
                                {audioBuffer && (
                                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 space-y-4 animate-slide-up-fade-in">
                                        <ProgressBar currentTime={currentTime} duration={duration} onSeek={seek} />
                                        <div className="flex items-center gap-4 flex-wrap">
                                            <Button type="button" onClick={handlePlayPause} icon={isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}>
                                                {isPlaying ? 'Pause' : 'Play'}
                                            </Button>
                                            <div className="flex items-center gap-2 flex-grow min-w-[150px]">
                                                <VolumeIcon className="w-5 h-5 text-slate-400" />
                                                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => changeVolume(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-slate-400">Download:</span>
                                                <div className="inline-flex rounded-md shadow-sm" role="group">
                                                    <button type="button" onClick={() => { setDownloadFormat('wav'); handleDownload(); }} className={`px-4 py-2 text-sm font-medium rounded-l-lg border border-slate-600 ${downloadFormat === 'wav' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>WAV</button>
                                                    <button type="button" onClick={() => { setDownloadFormat('mp3'); handleDownload(); }} className={`px-4 py-2 text-sm font-medium rounded-r-lg border-y border-r border-slate-600 ${downloadFormat === 'mp3' ? 'bg-sky-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>MP3</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </form>
                        <div className="text-center text-xs text-slate-500 pt-4 border-t border-slate-700/50 mt-6">
                            <p>Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-300 bg-slate-700/50 border border-slate-600 rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-300 bg-slate-700/50 border border-slate-600 rounded">/</kbd> or <button onClick={() => setIsHotkeysModalOpen(true)} className="underline hover:text-sky-400 transition-colors">click here</button> for hotkeys.</p>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
            <HotkeysModal isOpen={isHotkeysModalOpen} onClose={() => setIsHotkeysModalOpen(false)} />
        </div>
    );
};

export default App;