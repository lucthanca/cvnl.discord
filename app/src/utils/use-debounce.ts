import React from "react";
import debounce from 'lodash/debounce';

export const useDebounce = <T = () => void>(callback: T, delay: number) => {
  const ref = React.useRef<any>(null);
  React.useEffect(() => {
    ref.current = callback;
  }, [callback]);
  return React.useMemo(() => {
    const func = () => {
      ref.current?.();
    };
    return debounce(func, delay);
  }, [delay]);
};