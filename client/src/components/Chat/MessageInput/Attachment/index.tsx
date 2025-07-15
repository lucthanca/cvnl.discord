import { useRef, useState } from 'react';
import Microphone from '~/assets/microphone.js';
import GalleryIcon from '~/assets/gallery.js';
import SimpleDialog, { Option } from '~/components/SimpleDialog';
import PlusIcon from '~/assets/plus';

const useAttachment = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return {
    fileInputRef,
  };
};

const Options = (props: {
  itemClassName?: string;
}) => {
  const { itemClassName } = props;
  return (
    <>
      <div className={itemClassName}>
        <button className="bg-transparent p-2">
          <Microphone />
        </button>
      </div>
      <div className={itemClassName}>
        <button className="bg-transparent p-2">
          <GalleryIcon />
        </button>
      </div>
    </>
  );
}

type Props = {
  onPhotoSelected?: (files: File[]) => void;
  onVoiceRecordingClick?: () => void;
}
export default (props: Props) => {
  const { onPhotoSelected, onVoiceRecordingClick } = props;
  const [isCollapsed] = useState(true);
  const moreOptionsRef = useRef<HTMLDivElement>(null);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const { fileInputRef } = useAttachment();
  const handleClickUploadImage = () => {
    const fileInput = fileInputRef.current;
    if (fileInput) {
      fileInput.click();
    }
    setShowMoreOptions(false);
  };
  const handleClickRecordingVoice = () => {
    setShowMoreOptions(false);
    onVoiceRecordingClick?.();
  };
  const [options] = useState<Option[]>([
    { label: "Gửi ảnh", icon: <GalleryIcon />, onClick: handleClickUploadImage },
    { label: "Ghi âm", icon: <Microphone />, onClick: handleClickRecordingVoice },
  ]);

  const handleToggleShowOptions = () => {
    setShowMoreOptions(prev => !prev);
  }

  return (
    <>
      <div className="flex">
        <div
          className="flex-shrink-0 mx-[-2px]"
          ref={moreOptionsRef}
          onClick={handleToggleShowOptions}>
          <button className="bg-transparent p-2">
            <PlusIcon />
          </button>
        </div>
        {!isCollapsed && <Options itemClassName="flex-shrink-0 mx-[-2px]" />}
        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          multiple
          ref={fileInputRef}
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
              onPhotoSelected?.(Array.from(files));
            }
          }}
        />
      </div>

      {(showMoreOptions && moreOptionsRef.current) && (
        <SimpleDialog source={moreOptionsRef.current} options={options} contentClasses="py-2 bg-white"/>
      )}
    </>
  );
};
