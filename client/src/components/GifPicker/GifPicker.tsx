import React, { useState } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const GifPicker: React.FC<GifPickerProps> = ({ onGifSelect, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Placeholder GIFs - replace with Tenor API integration later
  const placeholderGifs = [
    'https://media.tenor.com/images/placeholder1.gif',
    'https://media.tenor.com/images/placeholder2.gif',
    'https://media.tenor.com/images/placeholder3.gif',
    'https://media.tenor.com/images/placeholder4.gif',
  ];

  return (
    <div className="bg-theme-nav rounded-lg shadow-lg border border-theme-border p-4 max-h-96">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-theme-text">GIFs</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-theme-primary/10 transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-theme-text-secondary" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-theme-text-secondary" />
        <input
          type="text"
          placeholder="Search GIFs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-theme-input-field border border-theme-border rounded-lg text-theme-text placeholder-theme-text-secondary focus:outline-none focus:ring-2 focus:ring-theme-primary"
        />
      </div>

      {/* GIF Grid */}
      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
        {placeholderGifs.map((gifUrl, index) => (
          <button
            key={index}
            onClick={() => onGifSelect(gifUrl)}
            className="aspect-square bg-theme-border rounded-lg hover:opacity-80 transition-opacity flex items-center justify-center text-theme-text-secondary"
          >
            GIF {index + 1}
          </button>
        ))}
      </div>

      <p className="text-xs text-theme-text-secondary mt-2 text-center">
        Tenor integration coming soon
      </p>
    </div>
  );
};

export default GifPicker;
