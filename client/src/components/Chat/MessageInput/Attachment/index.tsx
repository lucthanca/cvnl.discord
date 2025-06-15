import { MicrophoneIcon, PhotoIcon, PlusIcon } from '@heroicons/react/24/outline/index.js';
import React, { useRef, useState } from 'react';
import Microphone from '~/assets/microphone.js';
import GalleryIcon from '~/assets/gallery.js';
import SimpleDialog, { Option } from '~/components/SimpleDialog';

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
}
export default (props: Props) => {
  const { onPhotoSelected } = props;
  const [isCollapsed, setIsCollapsed] = useState(true);
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
  const [options] = useState<Option[]>([
    { label: "Gửi ảnh", icon: <GalleryIcon />, onClick: handleClickUploadImage },
    { label: "Ghi âm", icon: <Microphone /> },
  ]);

  return (
    <>
      <div className="flex">
        <div
          className="flex-shrink-0 mx-[-2px]"
          ref={moreOptionsRef}
          onClick={() => setShowMoreOptions(prev => !prev)}>
          <button className="bg-transparent p-2">
            <svg viewBox="0 0 12 13" width="20" height="20" fill="currentColor" aria-hidden="true">
              <g fill-rule="evenodd" transform="translate(-450 -1073)">
                <path d="M459 1080.25h-2.25v2.25c0 .412-.337.75-.75.75a.752.752 0 0 1-.75-.75v-2.25H453a.752.752 0 0 1-.75-.75c0-.412.337-.75.75-.75h2.25v-2.25c0-.412.337-.75.75-.75s.75.338.75.75v2.25H459c.413 0 .75.338.75.75s-.337.75-.75.75m-3-6.75c-3.308 0-6 2.691-6 6s2.692 6 6 6 6-2.691 6-6-2.692-6-6-6"></path>
              </g>
            </svg>
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
