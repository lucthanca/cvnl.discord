import React, { InputHTMLAttributes, forwardRef, ForwardedRef } from "react";
import { useDebounce } from "@src/utils/use-debounce";

type TextboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  title: string;
  name: string;
  id?: string;
  onChange?: (value: string) => void;
  value?: string;
  placeholder?: string;
  type?: "text" | "password";
  style?: React.CSSProperties;
  disabled?: boolean;
};
export type TextboxRef = {
  setValue: (value: string) => void;
};
const Textbox: React.FC<TextboxProps> = forwardRef(
  (props, ref: ForwardedRef<TextboxRef>) => {
    const {
      title,
      name,
      id,
      onChange,
      value,
      placeholder,
      type = "text",
      style,
      disabled = false,
      ...inputProps
    } = props;
    const [stateValue, setValue] = React.useState(value ?? "");
    const stateOnChange = () => {
      console.log("State value:", stateValue);
      onChange?.(stateValue);
    };
    const debounceChange = useDebounce(stateOnChange, 250);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      debounceChange();
      setValue(e.target.value);
    };
    React.useImperativeHandle(ref, () => {
      return {
        setValue: (value) => setValue(value),
      };
    }, []);
    return (
      <div className="form-control__root">
        <label htmlFor={id ?? name}>{title}</label>
        <input
          className="form-control__control text-input focusable"
          type={type}
          name={name}
          id={id ?? name}
          value={stateValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            fontSize: "14px",
            outline: "none",
            transition: "border-color 0.2s",
            ...style,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#007bff";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#ddd";
          }}
          {...inputProps}
        />
      </div>
    );
  }
);

export default React.memo(
  Textbox
) as (props: TextboxProps & { ref?: ForwardedRef<TextboxRef> }) => React.ReactNode;
