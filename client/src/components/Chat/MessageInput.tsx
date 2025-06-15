import React, { useState, useRef } from 'react';
import { PaperAirplaneIcon, PhotoIcon, FaceSmileIcon, MicrophoneIcon, PlusIcon } from '@heroicons/react/24/outline';
import IOSBottomSheet from "../BottomSheet/index.js";
import GifPicker from '../GifPicker/GifPicker';
import VoiceRecorder from '../VoiceRecorder/VoiceRecorder';
import Microphone from '~/assets/microphone';
import GalleryIcon from '~/assets/gallery';
import "./MessageInput.style.scss";
import Attachment from '~/components/Chat/MessageInput/Attachment';
import EmojiPicker from '~/components/Chat/MessageInput/EmojiPicker';
import Close from '~/assets/close.js';
import VoiceRecorderBar from '~/components/Chat/MessageInput/VoiceRecoderBar';

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

  const [selectedImgs, setSelectedImgs] = useState<File[]>([]);

  const renderPhotoPreview = (files: File[]) => {
    setSelectedImgs(files);
  };

  return (
    <div className="w-full bg-theme-input border-t border-theme-border p-3 relative flex-shrink-0">
      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-full right-4 mb-2 z-50">
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Attachment onPhotoSelected={renderPhotoPreview} />

        {/* Text Input Container */}
        <div className="msgTxt__container flex-1 relative bg-theme-input-field border border-theme-border rounded-3xl">
          <VoiceRecorderBar />
          {/* Preview image */}
          {false && (
            <>
            {selectedImgs.length > 0 && (
            <div className="flex gap-2 overflow-x-auto p-2">
              {selectedImgs.map((img, index) => (
                <div key={index} className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                  <img
                    src={URL.createObjectURL(img)}
                    alt={`Preview ${index}`}
                    className="w-full h-full object-contain"
                  />
                  <button
                    className="p-0 bg-transparent absolute top-0 right-0 text-slate-800 rounded-full"
                    onClick={() => setSelectedImgs(prev => prev.filter((_, i) => i !== index))}
                  >
                    <Close width='1rem' height="1rem" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="__wrapper flex w-full h-full items-center pr-[5.875px]">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyPress={handleKeyPress}
              placeholder="Aa"
              className="w-full bg-transparent pl-4 pr-2 py-2 text-theme-text placeholder-theme-text-secondary resize-none focus:outline-none self-center"
              rows={1}
            />

            {/* Bottom Right Icons */}
            <div className="mb-[5.875px] self-end flex-shrink-0">
              <EmojiPicker />
            </div>
          </div>
            </>
          )}
        </div>

        {/* Send Button */}
        <div className="flex-shrink-0">
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className={`p-2 bg-transparent rounded-full aspect-square transition-colors flex items-center justify-center hover:bg-gray-200 ${
              message.trim() ? 'text-blue-500' : 'text-theme-text-secondary cursor-not-allowed'
            }`}
          >
            <svg viewBox="0 0 12 13" width="20" height="20" fill="currentColor" aria-hidden="true">
              <g fillRule="evenodd" transform="translate(-450 -1073)">
                <path d="m458.371 1079.75-6.633.375a.243.243 0 0 0-.22.17l-.964 3.255c-.13.418-.024.886.305 1.175a1.08 1.08 0 0 0 1.205.158l8.836-4.413c.428-.214.669-.677.583-1.167-.06-.346-.303-.633-.617-.79l-8.802-4.396a1.073 1.073 0 0 0-1.183.14c-.345.288-.458.77-.325 1.198l.963 3.25c.03.097.118.165.22.17l6.632.375s.254 0 .254.25-.254.25-.254.25"></path>
              </g>
            </svg>
          </button>
        </div>
      </div>
      <IOSBottomSheet />
    </div>
  );
};

export default MessageInput;
