import React, { useEffect } from "react";
import Loader from '../Loader';

type AppProps = {
  children?: React.ReactNode;
}

const App: React.FC<AppProps> = ({ children }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const execute = React.useCallback(() => {
    // Simulate a loading state for the initial render
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
