
import React from 'react';

const Header: React.FC = () => (
  <header className="text-center">
    <h1 
      className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300"
      style={{ textShadow: '0 0 15px rgba(71, 163, 228, 0.4)' }}
    >
      Gemini Advanced TTS
    </h1>
    <p className="mt-3 text-lg text-slate-400">
      Transform your text into lifelike speech with the power of Gemini.
    </p>
  </header>
);

export default Header;