import data from '@emoji-mart/data';
import Picker from '~/components/EmojiPicker';
import { useRef, useState } from 'react';
import SimpleDialog from '~/components/SimpleDialog';
import { useDevice } from '~/hooks/useDevice';
import MobileEmojiPicker from '~/components/Chat/MessageInput/EmojiPicker/mobileEmojiPicker';
import { IOSBottomSheetHandle } from '~/components/BottomSheet';

export default () => {
  const [showPicker, setShowPicker] = useState(false);
  const mobileEmojiPickerRef = useRef<IOSBottomSheetHandle>(null);
  const showEmojiPicker = () => {
    setShowPicker(p => !p);
    mobileEmojiPickerRef?.current?.snapTo(2);
  };
  const buttonRef = useRef<HTMLButtonElement>(null);
  const device = useDevice();
  const shouldEmojiPicker = device === 'desktop' && showPicker;
  const shouldShowMobileEmojiPicker = device !== 'desktop';
  return (
    <>
      <button
        ref={buttonRef}
        onClick={showEmojiPicker}
        className="rounded-full hover:bg-theme-primary/10 transition-colors flex items-center justify-center p-0 bg-transparent border-none bg-blue-200 w-7 h-7"
      >
        <svg viewBox="0 0 12 13" width="20" height="20" fill="currentColor" aria-hidden="true">
          <g fillRule="evenodd" transform="translate(-450 -1073)">
            <path d="M458.508 1078.5a1 1 0 1 1-.015-2.002 1 1 0 0 1 .015 2.002m-.037 1.668c-.324.91-1.273 1.832-2.46 1.832h-.002c-1.2 0-2.157-.922-2.48-1.832a.5.5 0 1 1 .942-.335c.204.573.835 1.167 1.538 1.167h.001c.692 0 1.315-.593 1.519-1.168a.5.5 0 0 1 .942.335m-5.971-2.667a1 1 0 1 1 2 0 1 1 0 0 1-2 0m3.5-3.5a5.506 5.506 0 0 0-5.5 5.5c0 3.033 2.467 5.5 5.5 5.5s5.5-2.467 5.5-5.5-2.467-5.5-5.5-5.5"></path>
          </g>
        </svg>
      </button>
      {(shouldEmojiPicker && buttonRef.current) && (<SimpleDialog source={buttonRef.current}>
        <Picker data={data} onEmojiSelect={console.log} locale="vi" emojiVersion='15' previewPosition='none' />
      </SimpleDialog>)}
      {shouldShowMobileEmojiPicker && (
        <MobileEmojiPicker ref={mobileEmojiPickerRef} />
      )}
    </>
  );
};
