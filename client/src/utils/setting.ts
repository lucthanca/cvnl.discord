import storageHelper from "@src/utils/storage-helper";
import { AIConfig } from "@src/type";

export const AUTO_ANSWER_CONFIG_KEY = 'auto_answer';
export const DEBUG_LOG_CONFIG_KEY = 'debug_log';
export const AI_CONFIG_KEY = 'ai_config';
export const AI_ENGINE_KEY = `${AI_CONFIG_KEY}__engine`;

export const useSetting = () => {
  const isEnabledAutoAnswer = async () => {
    const config = await storageHelper.get<string>(AUTO_ANSWER_CONFIG_KEY);
    return config === 'true';
  };
  const isEnabledDebugLog = async () => {
    const config = await storageHelper.get<string>(DEBUG_LOG_CONFIG_KEY);
    return config === 'true';
  };

  const getAiEngine = async () => {
    const engine = await storageHelper.get(AI_ENGINE_KEY);
    (await isEnabledDebugLog()) && console.log({ engine });
    if (!engine) {
      return null;
    }
    const config = await storageHelper.get<AIConfig>(`${AI_CONFIG_KEY}__${engine}`);
    (await isEnabledDebugLog()) && console.log({ config });
    if (!config) {
      return null;
    }
    return {
      'engine': engine,
      'model': config?.model,
      'apiKey': config?.apiKey,
    }
  };

  return {
    isEnabledAutoAnswer,
    isEnabledDebugLog,
    getAiEngine,
  };
};