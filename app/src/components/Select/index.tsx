import React, { KeyboardEvent, PropsWithChildren, useState, ForwardedRef, forwardRef } from "react";
import './index.style.scss';
import Portal from '@src/components/Portal';
import cx from 'classnames';

export type SelectOption<T> = {
  value: T;
  label: string;
};
type SelectProps<T> = {
  title: string;
  value: T;
  onChange?: (value: T) => void;
  name: string;
  id?: string;
  options: SelectOption<T>[];
  tabIndex?: number;
};
export type SelectRef<T> = {
  setSelected: (value: T) => void;
};

const Select = <T,>(props: SelectProps<T>, ref: ForwardedRef<SelectRef<T>>) => {
  const { onChange } = props;
  const [state, setState] = useState<'OPEN'|'CLOSE'>('CLOSE');
  const [selected, setSelected] = useState<T>(props.value);
  const open = async () => {
    if (!menuRef.current || !backdropRef.current) return;
    setState('OPEN');
    backdropRef.current.classList.add('menu-backdrop-open');
    menuRef.current.classList.add('menu-open');
    menuRef.current.focus();
    await animateCSS(menuRef.current).then();
    const active = menuRef.current.querySelector(".active");
    if (!active) return;
    active.scrollIntoView({ behavior: "smooth", block: "end", inline: "center" });
  };
  const close = async () => {
    if (!menuRef.current || !backdropRef.current || !formControlRef.current) return;
    setState('CLOSE');
    menuRef.current.classList.remove('menu-open');
    backdropRef.current.classList.remove('menu-backdrop-open');
    formControlRef.current.focus();
  };
  const onOptionClick = (optionValue: T) => {
    setSelected(optionValue);
    close();
    onChange?.(optionValue);
  };
  const menuRef = React.useRef<HTMLUListElement>(null);
  const backdropRef = React.useRef<HTMLDivElement>(null);
  const formControlRef = React.useRef<HTMLDivElement>(null);
  const animateCSS = (element: HTMLElement, prefix = 'animate__') => {
    return new Promise((resolve, reject) => {
      const animationName = `${prefix}bounceInUp`;
      // const node = document.querySelector(element);

      element.classList.add(`${prefix}animated`, animationName);

      // When the animation ends, we clean the classes and resolve the Promise
      function handleAnimationEnd(event: AnimationEvent) {
        event.stopPropagation();
        element.classList.remove(`${prefix}animated`, animationName);
        resolve('Animation ended');
      }

      element.addEventListener('animationend', handleAnimationEnd, { once: true });
    });
  }
  const selectedLabel = props.options.find(option => option.value === selected)?.label;
  console.log({ selectedLabel, selected });
  const handleKeyDown = React.useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        open();
        break;
      default:
        break;
    }
  }, [open]);
  React.useImperativeHandle(ref, () => {
    return {
      setSelected: (value) => setSelected(value),
    };
  }, []);
  return (
    <div className='form-control__root'>
      <label>{props.title}</label>
      <div className={cx({
        'form-control__control': true,
        'select-clicked': state === 'OPEN',
        'focusable': true,
      })} ref={formControlRef} onClick={open} tabIndex={props.tabIndex} onKeyDown={handleKeyDown}>
        <>
          <span className="selected">{selectedLabel}</span>
          <div className={cx({caret: true, 'caret-rotate': state === 'OPEN'})}></div>
        </>
      </div>
      <Portal>
        <div className={`portal__` + props.name}>
          <div ref={backdropRef} className='menu-backdrop' onClick={close}>
          </div>
          <ul className='menu' ref={menuRef} tabIndex={state === 'OPEN' ? 0 : -1}>
            {
              props.options.map(option => {
                const classes = cx({ active: option.value === selected, focusable: true });
                return <li tabIndex={state === 'OPEN' ? 0 : -1} className={classes} key={String(option.value)} data-value={option.value} onClick={() => onOptionClick(option.value)}>{option.label}</li>
              })
            }
          </ul>
        </div>
      </Portal>
    </div>
  );
};

export default React.memo(forwardRef(Select)) as <T>(props: SelectProps<T> & React.RefAttributes<SelectRef<T>>) => React.ReactNode;