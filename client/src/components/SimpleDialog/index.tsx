import React, { useEffect, useState } from 'react';
import './index.style.scss';

type SimpleDialogProps = {
  source: HTMLElement;
  children?: React.ReactNode;
  options?: Option[];
  contentClasses?: string;
}
type OptionClickHandler = () => void;
export type Option = {
  label: string;
  onClick?: OptionClickHandler;
  icon?: React.ReactNode;
}

const SimpleDialog: React.FC<SimpleDialogProps> = props => {
  const { source, options, contentClasses } = props;
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const bounds = source.getBoundingClientRect();
  const [dialogPosition, setPosition] = React.useState<{ bottom: number; left: number }>({
    bottom: window.innerHeight - bounds.top,
    left: bounds.left + window.scrollX + bounds.width / 2,
  });
  const [indicatorX, setIndicatorX] = useState(0);

  useEffect(() => {
    if (!dialogRef.current || !bounds) return;
    const observer = new ResizeObserver(() => {
      const dialogWidth = dialogRef.current!.offsetWidth;
      const pos = {
        bottom: window.innerHeight - bounds.top,
        left: bounds.left + window.scrollX + bounds.width / 2,
      };
      if (pos.left + dialogWidth > window.innerWidth) {
        const sourceCenter = pos.left;
        const dialogLeft = window.innerWidth - dialogWidth - 15;
        setIndicatorX(prev => {
          const indicatorOffset = sourceCenter - dialogLeft;
          if (indicatorOffset === prev) return prev;
          return indicatorOffset;
        });

        pos.left = window.innerWidth - dialogWidth - 15;
      }
      setPosition(prev => {
        if (prev.bottom === pos.bottom && prev.left === pos.left) return prev;
        return pos;
      });
    });

    observer.observe(dialogRef.current);

    return () => observer.disconnect();
  }, [bounds]);
  return (
    <div
      ref={dialogRef}
      className="dialog fixed max-w-[400px] bg-transparent z-[9999]"
      style={{
        bottom: dialogPosition.bottom,
        left: dialogPosition.left,
      }}
    >
      <div className={`dialog__content ${contentClasses}`} style={{ borderBottomLeftRadius: indicatorX !== 0 ? 12: 0}}>
        {options?.map((option, index) => (
          <div key={index} className="dialog__item p-2 mx-2" onClick={option.onClick}>
            <div className="flex gap-2">
              {option.icon}
              <span>{option.label}</span>
            </div>
          </div>
        ))}
        {props.children}
      </div>
      <svg
        aria-hidden="true"
        height="12"
        viewBox="0 0 21 12"
        width="21"
        fill="white"
        style={{ transform: `translateX(${indicatorX}px)`}}
      >
        <path d="M21 0c-2.229.424-4.593 2.034-6.496 3.523L5.4 10.94c-2.026 2.291-5.434.62-5.4-2.648V0h21Z"></path>
      </svg>
    </div>
  );
};

export default SimpleDialog;