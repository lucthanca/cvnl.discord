import React from "react";
import './index.style.scss';
import Switch from "@src/components/Switch";
import Select, { SelectOption, SelectRef } from "@src/components/Select";
import Textbox, { TextboxRef } from '@src/components/Textbox';
import configProvider from '@src/utils/storage-helper';
import { AUTO_ANSWER_CONFIG_KEY, DEBUG_LOG_CONFIG_KEY, AI_CONFIG_KEY, AI_ENGINE_KEY } from "@src/utils/setting";
import { AIConfig } from "@src/type";

type SettingsProps = {};
enum Engine {
  GEMINI = 'gemini',
  CLAUDE = 'claude',
}

const MODELS_MAP: {
  [key in Engine]: SelectOption<string>[];
} = {
  [Engine.GEMINI]: [
    { value: 'gemini-exp-1206', label: 'Gemini Experimental 1206' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash-8B' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
    { value: 'text-embedding-004', label: 'Nhúng văn bản' },
    { value: 'aqa', label: 'AQA' },
  ],
  [Engine.CLAUDE]: [
    {
      value: 'claude-3-5-sonnet-latest',
      label: 'Claude 3.5 Sonnet Latest',
    },
    {
      value: 'claude-3-5-sonnet-20241022',
      label: 'Claude 3.5 Sonnet 2024-10-22',
    },
    {
      value: 'claude-3-5-sonnet-20240620',
      label: 'Claude 3.5 Sonnet 2024-06-20',
    },
    {
      value: 'claude-3-sonnet-20240229',
      label: 'Claude 3.5 Sonnet 2024-02-29',
    },
    {
      value: 'claude-3-5-haiku-latest',
      label: 'Claude 3.5 Haiku Latest',
    },
    {
      value: 'claude-3-5-haiku-20241022',
      label: 'Claude 3.5 Haiku 2024-10-22',
    },
    {
      value: 'claude-3-haiku-20240307',
      label: 'Claude 3.5 Haiku 2024-03-07',
    },
    {
      value: 'claude-3-opus-latest',
      label: 'Claude 3.5 Opus Latest',
    },
    {
      value: 'claude-3-opus-20240229',
      label: 'Claude 3.5 Opus 2024-02-29',
    },
  ],
};

const Settings: React.FC<SettingsProps> = () => {
  const [engine, setEngine] = React.useState<Engine>(Engine.GEMINI);
  const [engines] = React.useState<SelectOption<Engine>[]>([{value: Engine.GEMINI, label: "Google Gemini"}, {value: Engine.CLAUDE, label: 'Claude'}]);
  const models = React.useMemo(() => {
    return MODELS_MAP[engine];
  }, [engine]);
  const [selectedModel, setSelectedModel] = React.useState<string>(MODELS_MAP[engine][0].value);
  const [apiKey, setApiKey] = React.useState<string>('');
  const aiEngineRef = React.useRef<SelectRef<Engine>>(null);
  const modelRef = React.useRef<SelectRef<string>>(null);
  const apiKeyRef = React.useRef<TextboxRef>(null);
  const getConfigKey = (e?: Engine): string => {
    if (e) {
      return `${AI_CONFIG_KEY}__${e}`;
    }
    return `${AI_CONFIG_KEY}__${engine}`
  };
  const handleChangeEngine = React.useCallback(async (value: Engine) => {
    setEngine(value);
    const ENGINE_CONFIG_KEY = getConfigKey(value);
    await configProvider.set(AI_ENGINE_KEY, value);
    const config = await configProvider.get<AIConfig>(ENGINE_CONFIG_KEY);
    console.log(config);
    try {
      // check if selected model is available in new engine
      const newSelectedModel = MODELS_MAP[value].find(model => model.value === selectedModel)?.value || MODELS_MAP[value][0].value;
      if (!config) {
        configProvider.set<AIConfig>(ENGINE_CONFIG_KEY, { model: newSelectedModel, apiKey });
        setSelectedModel(newSelectedModel);
        modelRef.current?.setSelected(newSelectedModel);
        return;
      }
      if (config.model !== selectedModel) {
        setSelectedModel(config.model);
        modelRef.current?.setSelected(config.model);
      }
      setApiKey(config.apiKey);
      apiKeyRef.current?.setValue(config.apiKey);
    } catch (e) {
      console.log(e);
    }
  }, [apiKey, selectedModel, getConfigKey]);
  const handleChangeModel = React.useCallback((value: string) => {
    setSelectedModel(value);
    configProvider.set<AIConfig>(getConfigKey(engine), { model: value, apiKey });
  }, [engine, apiKey]);
  const handleChangeApiKey = React.useCallback((value: string) => {
    setApiKey(value);
    configProvider.set<AIConfig>(getConfigKey(engine), { model: selectedModel, apiKey: value });
  }, [selectedModel, engine]);
  const mainBlockRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    mainBlockRef.current?.focus();
  }, [mainBlockRef.current]);
  React.useEffect(() => {
    (async () => {
      const storedEngine = await configProvider.get<Engine>(AI_ENGINE_KEY);
      console.log({ storedEngine });
      if (storedEngine) {
        setEngine(storedEngine);
        aiEngineRef.current?.setSelected(storedEngine);
      }
      const config = await configProvider.get<AIConfig>(getConfigKey(storedEngine));
      console.log({ config });
      if (!config) {
        return;
      }
      setSelectedModel(config.model);
      modelRef.current?.setSelected(config.model);
      setApiKey(config.apiKey);
      apiKeyRef.current?.setValue(config.apiKey);
    })();
  }, []);
  return (
    <div className="main-container focusable" ref={mainBlockRef} tabIndex={0}>
      <div id='setting_block' className="block-1">
        <div className='settings-heading'>
          <img src="https://cdn.discordapp.com/emojis/986178507291889664.webp?size=96&animated=true" alt="settings"/>
          <h2>Cài đặt</h2>
        </div>
        <Switch title={'Tự động tìm & điền đáp án'} name={AUTO_ANSWER_CONFIG_KEY} value={false} tabIndex={0} />
        <Switch title={'Log Debug'} name={DEBUG_LOG_CONFIG_KEY} value={false} tabIndex={0} />
        <Select<Engine>
          tabIndex={0}
          ref={aiEngineRef}
          title='Engine'
          name='ai_engine'
          value={engine}
          options={engines}
          onChange={handleChangeEngine} />
        <Select<string>
          tabIndex={0}
          ref={modelRef}
          title='Model'
          name='model'
          value={selectedModel}
          options={models}
          onChange={handleChangeModel} />
        <Textbox
          title={'API Key'}
          ref={apiKeyRef}
          name='api_key'
          value=''
          placeholder='Nhập API key'
          tabIndex={0}
          onChange={handleChangeApiKey}
        />
      </div>
    </div>
  );
};

export default React.memo(Settings);
