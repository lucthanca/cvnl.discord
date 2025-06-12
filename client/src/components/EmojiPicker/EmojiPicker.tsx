import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose }) => {
  const emojis = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
    '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳',
    '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️',
    '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤',
    '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
    '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟',
    '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
  ];

  return (
    <div className="bg-theme-nav rounded-lg shadow-lg border border-theme-border p-4 max-h-64 overflow-y-auto w-80">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-theme-text">Emojis</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-theme-primary/10 transition-colors"
        >
          <XMarkIcon className="w-5 h-5 text-theme-text-secondary" />
        </button>
      </div>
      
      <div className="grid grid-cols-8 gap-2">
        {emojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => onEmojiSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center text-xl hover:bg-theme-primary/10 rounded transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
