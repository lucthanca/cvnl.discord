// EmojiPicker.tsx
import React, { memo } from 'react';

type Props = {
  onEmojiSelect?: (emoji: string) => void;
}

const EmojiPicker: React.FC<Props> = ({ onEmojiSelect }) => {
  const emojiCategories = {
    'Mặt cười': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰'],
    'Cảm xúc': ['😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔'],
    'Tay': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆'],
    'Trái tim': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖'],
    'Động vật': ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔'],
    'Thức ăn': ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅']
  };

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect?.(emoji);
  };

  return (
    <div className="overflow-y-auto">
      {Object.entries(emojiCategories).map(([category, emojis]) => (
        <div key={category} className="mb-4">
          <h3 className="text-sm font-medium text-gray-600 mb-2">{category}</h3>
          <div className="grid grid-cols-8 gap-2">
            {emojis.map((emoji, index) => (
              <button
                key={`${category}-${index}`}
                onClick={() => handleEmojiClick(emoji)}
                className="aspect-square flex items-center justify-center text-2xl hover:bg-gray-100 rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default memo(EmojiPicker);