import React from "react";

const GifPicker = () => {
  const [show, setShow] = React.useState(false);
  const handleClick = () => {}
  return (
    <>
      <button onClick={handleClick} className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-theme-primary/10 text-theme-text">
        <span className="w-5 h-5 text-purple-500 font-bold text-sm">GIF</span>
        <span>GIF</span>
      </button>

      {}
    </>
  );
};

export default React.memo(GifPicker);