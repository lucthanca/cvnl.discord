import React, { useState, useRef } from 'react';
import { PaperAirplaneIcon, PhotoIcon, FaceSmileIcon, MicrophoneIcon, PlusIcon } from '@heroicons/react/24/outline';
import EmojiPicker from '../EmojiPicker/EmojiPicker';
import GifPicker from '../GifPicker/GifPicker';
import VoiceRecorder from '../VoiceRecorder/VoiceRecorder';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  onSendVoice: (audioBlob: Blob) => void;
  onSendImage: (imageFile: File) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onSendVoice,
  onSendImage,
  isRecording,
  onStartRecording,
  onStopRecording,
}) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onSendImage(file);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const handleGifSelect = (gifUrl: string) => {
    onSendMessage(gifUrl);
    setShowGifPicker(false);
  };

  return (
    <div className="bg-theme-input border-t border-theme-border p-4">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <EmojiPicker
          onEmojiSelect={handleEmojiSelect}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}

      {/* GIF Picker */}
      {showGifPicker && (
        <GifPicker
          onGifSelect={handleGifSelect}
          onClose={() => setShowGifPicker(false)}
        />
      )}

      <div className="flex items-end space-x-2">
        {/* Attachment Button */}
        <div className="relative">
          <button
            onClick={() => setShowAttachments(!showAttachments)}
            className="p-2 rounded-full text-theme-text-secondary hover:text-theme-primary hover:bg-theme-primary/10 transition-colors"
          >
            <PlusIcon className="w-6 h-6" />
          </button>
          
          {showAttachments && (
            <div className="absolute bottom-full left-0 mb-2 bg-theme-nav rounded-lg shadow-lg p-2 flex flex-col space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-theme-primary/10 text-theme-text"
              >
                <PhotoIcon className="w-5 h-5" />
                <span>Photo</span>
              </button>
            </div>
          )}
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="w-full bg-theme-input-field border border-theme-border rounded-lg px-4 py-3 pr-24 text-theme-text placeholder-theme-text-secondary resize-none max-h-32 focus:outline-none focus:ring-2 focus:ring-theme-primary"
            rows={1}
          />
          
          {/* Emoji Button */}
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="absolute right-12 top-1/2 transform -translate-y-1/2 p-1 rounded text-theme-text-secondary hover:text-theme-primary transition-colors"
          >
            <FaceSmileIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Voice/Send Button */}
        {message.trim() ? (
          <button
            onClick={handleSend}
            className="p-3 bg-theme-primary text-white rounded-full hover:bg-theme-primary-dark transition-colors"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        ) : (
          <VoiceRecorder
            onSendVoice={onSendVoice}
            isRecording={isRecording}
            onStartRecording={onStartRecording}
            onStopRecording={onStopRecording}
          />
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
};

export default MessageInput;
