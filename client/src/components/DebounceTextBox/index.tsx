import React, { ChangeEvent, ForwardedRef, useCallback, useImperativeHandle, useState } from 'react';
type Props = {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
};

export type TextBoxApi = {
  setValue: (value: string) => void;
};

const TextBox = React.forwardRef((props: Props, ref: ForwardedRef<TextBoxApi>) => {
  const { placeholder, value: propValue, onChange, className } = props;
  const [value, setValue] = useState<string>(propValue ?? '');
  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    onChange?.(event.target.value);
  }, [onChange]);
  useImperativeHandle(ref, () => ({
    setValue,
  }), []);
  console.log('RENDER TEXTBOX');
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      className={className}
    />
  );
});

export default React.memo(TextBox);