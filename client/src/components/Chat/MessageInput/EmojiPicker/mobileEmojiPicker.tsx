import IOSBottomSheet, { IOSBottomSheetHandle } from '~/components/BottomSheet';
import React, { memo, useState } from 'react';
import GifPicker from './GifPicker';
import EmojiPicker from './EmojiPicker';
import { motion } from 'framer-motion';
import './mobileEmojiPicker.style.scss';

type Props = {
  onCloseSheet?: () => void;
  onGifSelect?: (gifUrl: string) => void;
  onEmojiSelect?: (emoji: string) => void;
}
const tabs = ['gif', 'emoji'] as const;

const MobileEmojiPicker = React.forwardRef<IOSBottomSheetHandle, Props>(({ onCloseSheet, onGifSelect, onEmojiSelect }, ref) => {
  const [activeTab, setActiveTab] = useState<'gif' | 'emoji'>('emoji');
  return (
    <IOSBottomSheet ref={ref} onClose={onCloseSheet}>
      <div className="bg-white flex flex-col flex-1 overflow-hidden pb-4">
        {/* Tab Header */}
        <div className="emojiPicker__nav flex items-center justify-center p-2">
          <div className="relative flex bg-gray-100 rounded-lg p-1 gap-1">
            {/* Background animate block */}
            <motion.div
              layout
              layoutId="active-tab-bg"
              className="__indicator absolute top-1/2 left-0 h-[calc(100%-0.5rem)] w-[calc(50%-0.25rem)] bg-white rounded-md shadow-sm z-0"
              data-tab-id={activeTab}
            />

            {/* Tab buttons */}
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`bg-transparent relative z-10 min-w-[100px] px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none ${
                  activeTab === tab
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'gif' ? (
          <GifPicker onGifSelect={onGifSelect} />
        ) : (
          <EmojiPicker onEmojiSelect={onEmojiSelect} />
        )}
      </div>
    </IOSBottomSheet>
  );
});

export default memo(MobileEmojiPicker);
