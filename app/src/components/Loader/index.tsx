import React from 'react';
import './index.style.scss';

type LoaderProps = {
  show: boolean;
};

const Loader: React.FC<LoaderProps> = (props) => {
  const { show } = props;
  return (
    <div id="loading-notify" style={{ opacity: show ? '1': '0' }}>
      <div className="popup" style={{ transform: show ? 'translateY(0)' : 'translateY(-100%)' }}>
        <img src="https://cdn.discordapp.com/emojis/1309088606668718120.webp?size=96&animated=true" alt="loading"/>
          <span>
            Loadinggg...
          </span>
      </div>
    </div>
  );
};

export default React.memo(Loader);