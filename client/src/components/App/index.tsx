import React, { useEffect } from "react";
import Loader from '../Loader';
import type { OnGenerative } from '@src/utils/generative-answer';

type AppProps = {
  children?: React.ReactNode;
  onLoad: (onGenerative: OnGenerative) => Promise<void>;
}

const App: React.FC<AppProps> = ({ children, onLoad }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const execute = React.useCallback(() => {
    onLoad((loading) => setIsLoading(loading));
  }, []);
  useEffect(() => {
    if (document.readyState !== 'loading') {
      execute();
    } else {
      document.addEventListener('DOMContentLoaded', execute);
    }
    return () => {
      try {
        document.removeEventListener('DOMContentLoaded', execute);
      } catch (e) {}
    };
  }, []);
  return (
    <>
      <Loader show={isLoading} />
      {children}
    </>
  );
};

export default App;
