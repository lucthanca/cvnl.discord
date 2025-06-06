import React, { KeyboardEventHandler, KeyboardEvent } from "react";
import configProvider from '@src/utils/storage-helper';
import './index.style.scss';

type SwitchProps = {
  title: string;
  value: boolean;
  onChange?: (value: boolean) => void;
  name: string;
  id?: string;
  tabIndex?: number;
};
const Switch: React.FC<SwitchProps> = (props) => {
  const { tabIndex } = props;
  const [configKey] = React.useState(props.name);
  const [id] = React.useState(props.id || Math.random().toString(36).substring(7));
  const [value, setValue] = React.useState(props.value);
  const storeValue = async (value: boolean) => {
    await configProvider.set(configKey, value.toString());
  };
  const changeValue = (value: boolean) => {
    setValue(value);
    props.onChange?.(value);
    storeValue(value).then();
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    changeValue(e.target.checked);
  };
  const handleKeyDown: KeyboardEventHandler<HTMLSpanElement> = React.useCallback((event: KeyboardEvent<HTMLSpanElement>) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        changeValue(!value);
        break;
      case 'ArrowLeft':
        changeValue(false);
        break;
      case 'ArrowRight':
        changeValue(true);
        break;
      default:
        break;
    }
  }, [value]);
  React.useEffect(() => {
    (async () => {
      const config = await configProvider.get<string>(configKey);
      console.log(config, configKey);
      if (config) {
        // cast string value to boolean
        changeValue(config === 'true');
      } else {
        // cast props value boolean to string
        await configProvider.set(configKey, props.value.toString());
      }
    })();
  }, []);
  return (
    <div className='form-control__root switch__root'>
      <label htmlFor={id} >{props.title}</label>
      <div className="switch" onClick={() => changeValue(!value)}>
        <input id={id} name={props.name} type="checkbox" checked={value} onChange={onChange} tabIndex={-1} />
        <span className="slider round focusable" tabIndex={tabIndex} onKeyDown={handleKeyDown}></span>
      </div>
    </div>
  );
}

export default React.memo(Switch);
