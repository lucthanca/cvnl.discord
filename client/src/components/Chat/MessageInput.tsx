import React, { useState, useRef } from 'react';
import { PaperAirplaneIcon, PhotoIcon, FaceSmileIcon, MicrophoneIcon, PlusIcon } from '@heroicons/react/24/outline';
import EmojiPicker from '../EmojiPicker/EmojiPicker';
import IOSBottomSheet from "../BottomSheet/index.js";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 144); // 6 lines max
      textarea.style.height = newHeight + 'px';
      textarea.style.overflowY = newHeight >= 144 ? 'auto' : 'hidden';
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  };

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
    <div className="w-full bg-theme-input border-t border-theme-border p-4 relative flex-shrink-0">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full right-4 mb-2 z-50">
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      <div className="flex items-end space-x-3">
        {/* Plus Button with Attachments */}
        <div className="relative flex-shrink-0">
          <button>add</button>
        </div>

        {/* Text Input Container */}
        <div className="flex-1 relative bg-theme-input-field border border-theme-border rounded-3xl min-h-[48px]">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleMessageChange}
            onKeyPress={handleKeyPress}
            placeholder="Aa"
            className="w-full bg-transparent px-4 py-3 pr-14 text-theme-text placeholder-theme-text-secondary resize-none min-h-[48px] max-h-[144px] focus:outline-none overflow-y-hidden rounded-3xl"
            rows={1}
          />
          
          {/* Bottom Right Icons */}
          <div className="absolute bottom-3 right-3">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-8 h-8 rounded-full hover:bg-theme-primary/10 transition-colors flex items-center justify-center"
            >
              <FaceSmileIcon className="w-6 h-6 text-theme-primary" />
            </button>
          </div>
        </div>

        {/* Send Button */}
        <div className="flex-shrink-0">
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className={`w-12 h-12 rounded-full transition-colors flex items-center justify-center ${
              message.trim()
                ? 'bg-theme-primary text-white hover:bg-theme-primary-dark'
                : 'bg-theme-border text-theme-text-secondary cursor-not-allowed'
            }`}
          >
            <PaperAirplaneIcon className="w-7 h-7" />
          </button>
        </div>
      </div>
      <IOSBottomSheet />
    </div>
  );
};

export default MessageInput;
