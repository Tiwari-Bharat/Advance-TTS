import React, { useEffect } from 'react';

interface HotkeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: ['Ctrl', '/'], description: 'Toggle this hotkeys guide' },
  { keys: ['Esc'], description: 'Close this hotkeys guide' },
  { keys: ['Enter'], description: 'Generate speech from text' },
  { keys: ['Space'], description: 'Play or stop the generated audio' },
  { keys: ['D'], description: 'Download the generated audio' },
  { keys: ['V'], description: 'Cycle through available voices' },
  { keys: ['S'], description: 'Cycle through playback speeds' },
  { keys: ['E'], description: 'Cycle through sound effects' },
];

const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="px-2 py-1 text-sm font-semibold text-sky-300 bg-slate-900/80 border border-sky-500/30 rounded-md shadow-[0_0_5px_theme(colors.sky.500/30%)]">
    {children}
  </kbd>
);

const HotkeysModal: React.FC<HotkeysModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isOpen && event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900/95 border border-sky-500/30 rounded-lg shadow-2xl shadow-sky-500/10 w-full max-w-md m-4 p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -inset-0.5 rounded-lg border-2 border-sky-500/50 opacity-20 animate-pulse pointer-events-none"></div>
        <div className="absolute -inset-1 rounded-lg border border-sky-500/30 opacity-10 pointer-events-none"></div>
        
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">Keyboard Shortcuts</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
          </button>
        </div>
        <div className="space-y-3">
          {shortcuts.map(({ keys, description }, index) => (
            <div key={index} className="flex justify-between items-center text-slate-300">
              <span>{description}</span>
              <div className="flex items-center gap-1">
                {keys.map((key, i) => (
                  <React.Fragment key={key}>
                    <Kbd>{key}</Kbd>
                    {i < keys.length - 1 && <span className="text-slate-500">+</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HotkeysModal;