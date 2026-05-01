import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import TextArea from './components/TextArea';
import Select from './components/Select';
import Button from './components/Button';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProgressBar from './components/ProgressBar';
import HotkeysModal from './components/HotkeysModal';
import { AVAILABLE_VOICES, SOUND_EFFECTS, DEFAULT_TEXT, EFFECT_PROMPTS, TARGET_LANGUAGES } from './constants';
import { generateSpeech, analyzeTextEmotion, translateText, translateVideoText } from './services/geminiService';
import { audioBufferToWav, audioBufferToMp3 } from './services/audioUtils';
import { useAudioPlayer } from './hooks/useAudioPlayer';

interface Preset {
  id: string;
  name: string;
  voice: string;
  effect: string;
  customEffect: string;
  playbackRate: number;
  pitch: number;
  isSsml?: boolean;
}

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
    const [pitch, setPitch] = useState<number>(0);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [isHotkeysModalOpen, setIsHotkeysModalOpen] = useState(false);
    const [downloadFormat, setDownloadFormat] = useState<'wav' | 'mp3'>('wav');
    const [presets, setPresets] = useState<Preset[]>([]);
    const [presetName, setPresetName] = useState<string>('');
    const [isSsml, setIsSsml] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<'tts' | 'translator'>('tts');
    const [targetLanguage, setTargetLanguage] = useState<string>(TARGET_LANGUAGES[0].label);
    const [translatedText, setTranslatedText] = useState<string>('');

    const audioContextRef = useRef<AudioContext | null>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const { play, stop, seek, isPlaying, currentTime, duration, volume, changeVolume, changePlaybackRate, changePitch } = useAudioPlayer(audioContextRef.current);

    useEffect(() => {
        const savedPresets = localStorage.getItem('tts-presets');
        if (savedPresets) {
            try {
                setPresets(JSON.parse(savedPresets));
            } catch (e) {}
        }
    }, []);

    useEffect(() => {
        changePlaybackRate(playbackRate);
    }, [playbackRate, changePlaybackRate]);

    useEffect(() => {
        changePitch(pitch);
    }, [pitch, changePitch]);

    const savePreset = () => {
        if (!presetName.trim()) return;
        const newPreset: Preset = {
            id: Date.now().toString(),
            name: presetName.trim(),
            voice: selectedVoice,
            effect: selectedEffect,
            customEffect,
            playbackRate,
            pitch,
            isSsml
        };
        const updatedPresets = [...presets, newPreset];
        setPresets(updatedPresets);
        localStorage.setItem('tts-presets', JSON.stringify(updatedPresets));
        setPresetName('');
    };

    const loadPreset = (preset: Preset) => {
        setSelectedVoice(preset.voice);
        setSelectedEffect(preset.effect);
        setCustomEffect(preset.customEffect || 'In a dramatic voice, say: ');
        setPlaybackRate(preset.playbackRate ?? 1);
        setPitch(preset.pitch ?? 0);
        setIsSsml(preset.isSsml || false);
    };

    const deletePreset = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const updatedPresets = presets.filter(p => p.id !== id);
        setPresets(updatedPresets);
        localStorage.setItem('tts-presets', JSON.stringify(updatedPresets));
    };

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
            if (!isSsml) {
                if (selectedEffect === 'auto') {
                    setLoadingMessage('Analyzing emotion...');
                    effectPrompt = await analyzeTextEmotion(text);
                } else if (selectedEffect === 'custom') {
                    effectPrompt = customEffect;
                } else {
                    effectPrompt = EFFECT_PROMPTS[selectedEffect] || '';
                }
            }

            setLoadingMessage('Generating speech...');
            const buffer = await generateSpeech(text, selectedVoice, effectPrompt, audioContextRef.current, isSsml);
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

    const handleTranslateVoice = useCallback(async () => {
        if (!text.trim()) {
            setError("Please enter some text to translate.");
            return;
        }
        if (!audioContextRef.current) {
            setError("Audio context not available.");
            return;
        }

        setIsLoading(true);
        setError(null);
        if (isPlaying) stop();
        setAudioBuffer(null);
        setTranslatedText('');

        try {
            setLoadingMessage(`Translating to ${targetLanguage}...`);
            // Check if input is likely a URL or mentions a video
            const isUrl = /https?:\/\/[^\s]+/.test(text.trim()) || text.toLowerCase().includes('video');
            const translated = isUrl ? await translateVideoText(text, targetLanguage) : await translateText(text, targetLanguage);
            setTranslatedText(translated);

            setLoadingMessage('Generating speech...');
            const buffer = await generateSpeech(translated, selectedVoice, '', audioContextRef.current, false);
            setAudioBuffer(buffer);
            play(buffer);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(errorMessage);
            setAudioBuffer(null);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    }, [text, selectedVoice, targetLanguage, isPlaying, stop, play]);

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
            setPlaybackRate(prev => {
                const newRate = prev >= 2 ? 0.5 : prev + 0.25;
                return newRate;
            });
        } else if (key === 'e') {
            event.preventDefault();
            const currentIndex = SOUND_EFFECTS.findIndex(e => e.value === selectedEffect);
            const nextIndex = (currentIndex + 1) % SOUND_EFFECTS.length;
            setSelectedEffect(SOUND_EFFECTS[nextIndex].value);
        }

    }, [audioBuffer, handlePlayPause, handleDownload, selectedVoice, selectedEffect, isHotkeysModalOpen]);
    
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const selectedVoiceDetails = AVAILABLE_VOICES.find(v => v.value === selectedVoice);

    const insertSsmlTag = (openTag: string, closeTag: string = '') => {
        const textarea = textAreaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = text.substring(start, end);
        
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);
        
        const newText = before + openTag + selectedText + closeTag + after;
        setText(newText);

        setTimeout(() => {
            textarea.focus();
            if (closeTag) {
                textarea.setSelectionRange(start + openTag.length, start + openTag.length + selectedText.length);
            } else {
                textarea.setSelectionRange(start + openTag.length, start + openTag.length);
            }
        }, 10);
    };

    return (
        <div className="min-h-screen flex flex-col font-sans">
            <Navbar />
            <main className="flex-grow flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-2xl mx-auto space-y-8">
                    <Header />
                    <div className="relative bg-slate-800/50 p-6 md:p-8 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-lg">
                        <div className="absolute -inset-px rounded-2xl border-2 border-sky-500/20 shadow-[0_0_30px_theme(colors.sky.500/20%)] pointer-events-none"></div>
                        
                        <div className="flex border-b border-slate-700 mb-6 relative z-10">
                            <button 
                                type="button" 
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tts' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                                onClick={() => setActiveTab('tts')}
                            >
                                Text to Speech
                            </button>
                            <button 
                                type="button" 
                                className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'translator' ? 'border-sky-500 text-sky-400' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
                                onClick={() => setActiveTab('translator')}
                            >
                                Translator
                            </button>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); activeTab === 'tts' ? handleGenerateSpeech() : handleTranslateVoice(); }} className="space-y-6 relative z-10">
                            
                            {activeTab === 'tts' ? (
                                <>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <label htmlFor="tts-text" className="block text-sm font-medium text-slate-300">Your Text</label>
                                            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300 font-medium">
                                                <input type="checkbox" checked={isSsml} onChange={(e) => setIsSsml(e.target.checked)} className="rounded border-slate-600 bg-slate-800 text-sky-500 focus:ring-sky-500 focus:ring-offset-slate-900 border-2 w-4 h-4" />
                                                Enable SSML
                                            </label>
                                        </div>
                                        {isSsml && (
                                            <div className="flex gap-2 flex-wrap mb-2 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                                <button type="button" className="px-3 py-1.5 text-xs font-semibold bg-slate-800 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-700 transition" onClick={() => insertSsmlTag('<break time="1s"/>')}>Break</button>
                                                <button type="button" className="px-3 py-1.5 text-xs font-semibold bg-slate-800 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-700 transition" onClick={() => insertSsmlTag('<emphasis level="strong">', '</emphasis>')}>Emphasis</button>
                                                <button type="button" className="px-3 py-1.5 text-xs font-semibold bg-slate-800 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-700 transition" onClick={() => insertSsmlTag('<prosody rate="slow">', '</prosody>')}>Slow</button>
                                                <button type="button" className="px-3 py-1.5 text-xs font-semibold bg-slate-800 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-700 transition" onClick={() => insertSsmlTag('<prosody rate="fast">', '</prosody>')}>Fast</button>
                                                <button type="button" className="px-3 py-1.5 text-xs font-semibold bg-slate-800 border border-slate-600 rounded-md text-slate-300 hover:bg-slate-700 transition" onClick={() => insertSsmlTag('<prosody pitch="+2st">', '</prosody>')}>Pitch Up</button>
                                            </div>
                                        )}
                                        <TextArea ref={textAreaRef} label="" id="tts-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={isSsml ? "Enter SSML tags here..." : "Enter text to convert to speech..."} rows={8}/>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                       <div>
                                           <Select label="Select a Voice" id="voice-select" value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} options={AVAILABLE_VOICES}/>
                                           {selectedVoiceDetails && (<p className="mt-2 text-sm text-slate-400 px-1">{selectedVoiceDetails.description}</p>)}
                                        </div>
                                        <Select label="Add an Effect" id="effect-select" value={selectedEffect} onChange={(e) => setSelectedEffect(e.target.value)} options={SOUND_EFFECTS} disabled={isSsml} title={isSsml ? "Effects disabled when using SSML" : ""} />
                                    </div>
                                    {selectedEffect === 'custom' && !isSsml && (
                                        <div className="animate-fade-in">
                                            <label htmlFor="custom-effect" className="block text-sm font-medium text-slate-300 mb-2">Custom Effect Prompt</label>
                                            <input type="text" id="custom-effect" value={customEffect} onChange={(e) => setCustomEffect(e.target.value)} className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"/>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <TextArea ref={textAreaRef} label="Original Text or Video URL" id="translator-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter English text or paste a video link to translate..." rows={5}/>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Select label="Target Language" id="target-language" value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)} options={TARGET_LANGUAGES}/>
                                        <div>
                                            <Select label="Select a Voice" id="voice-select-translate" value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} options={AVAILABLE_VOICES}/>
                                            {selectedVoiceDetails && (<p className="mt-2 text-sm text-slate-400 px-1">{selectedVoiceDetails.description}</p>)}
                                        </div>
                                    </div>
                                    {translatedText && (
                                        <div className="p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg animate-fade-in">
                                            <h3 className="text-sm font-medium text-slate-300 mb-2 drop-shadow-sm">Translated Text ({targetLanguage}):</h3>
                                            <p className="text-slate-200 text-sm whitespace-pre-wrap">{translatedText}</p>
                                        </div>
                                    )}
                                </>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-slate-300 flex justify-between">
                                        <span>Playback Speed</span>
                                        <span className="text-sky-400 font-mono">{playbackRate.toFixed(2)}x</span>
                                    </label>
                                    <input type="range" min="0.5" max="2" step="0.05" value={playbackRate} onChange={(e) => setPlaybackRate(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-sm font-medium text-slate-300 flex justify-between">
                                        <span>Pitch</span>
                                        <span className="text-sky-400 font-mono">{pitch > 0 ? `+${pitch.toFixed(2)}` : pitch.toFixed(2)}</span>
                                    </label>
                                    <input type="range" min="-1" max="1" step="0.05" value={pitch} onChange={(e) => setPitch(parseFloat(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500" />
                                </div>
                            </div>

                            <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-700/50 space-y-4">
                                <h3 className="text-sm font-medium text-slate-200 flex items-center justify-between">
                                    Saved Presets
                                    <span className="text-xs text-slate-500 font-normal">Saves voice, effects & sliders</span>
                                </h3>
                                <div className="flex gap-2">
                                     <input type="text" value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="Preset name..." className="flex-grow p-2 text-sm bg-slate-800 border border-slate-700 rounded-md text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500" />
                                     <Button type="button" onClick={savePreset} disabled={!presetName.trim()} className="whitespace-nowrap px-4 py-2 text-sm !h-auto">Save Current</Button>
                                </div>
                                {presets.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {presets.map(p => (
                                            <div key={p.id} className="inline-flex rounded-md shadow-sm border border-slate-600 bg-slate-800">
                                                <button type="button" onClick={() => loadPreset(p)} className="px-3 py-1.5 text-xs font-medium rounded-l-md text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                                                    {p.name}
                                                </button>
                                                <button type="button" onClick={(e) => deletePreset(p.id, e)} className="px-2 py-1.5 text-xs font-medium rounded-r-md text-slate-400 hover:bg-red-900/50 hover:text-red-300 transition-colors border-l border-slate-700" title="Delete Preset">
                                                    &times;
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {error && (<div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md text-sm">{error}</div>)}
                            <div className="flex flex-col gap-4 pt-2">
                                <Button type="submit" isLoading={isLoading} loadingMessage={loadingMessage} disabled={isLoading || !text.trim()} className="w-full">
                                    {activeTab === 'tts' ? 'Generate Speech' : 'Translate & Read'}
                                </Button>
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