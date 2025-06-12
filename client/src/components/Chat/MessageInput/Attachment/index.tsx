import { MicrophoneIcon, PhotoIcon, PlusIcon } from "@heroicons/react/24/outline/index.js";
import React, { useRef } from "react";

const useAttachment = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return {
    fileInputRef,
  }
};

export default () => {
  const [show, setShow] = React.useState(false);
  const toggle = () => setShow(prev => !prev);
  const { fileInputRef } = useAttachment();

  const handleClickFileInput = () => {
    fileInputRef.current?.click();
    toggle();
  };
  return (
    <>

      {/* Hidden file input */}
      <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
      />
      <button onClick={toggle}
              className="p-2 w-12 h-12 rounded-full text-theme-primary bg-theme-primary/10 hover:bg-theme-primary/20 transition-colors flex items-center justify-center"
      >
        <PlusIcon className="w-16 h-16" />
      </button>

      {show && (
        <div className="absolute bottom-full left-0 mb-2 bg-theme-nav rounded-lg shadow-lg p-2 flex flex-col space-y-2 min-w-[150px]">
          <button onClick={handleClickFileInput} className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-theme-primary/10 text-theme-text">
            <PhotoIcon className="w-5 h-5 text-blue-500" />
            <span>Photo</span>
          </button>

          {!message.trim() && (
                  <button
                          onClick={() => {
                            onStartRecording();
                            setShowAttachments(false);
                          }}
                          className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-theme-primary/10 text-theme-text"
                  >
                    <MicrophoneIcon className="w-5 h-5 text-red-500" />
                    <span>Voice</span>
                  </button>
          )}
        </div>

      )}
    </>
  );
}