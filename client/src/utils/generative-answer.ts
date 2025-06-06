import { GoogleGenerativeAI } from '@google/generative-ai';
import type { GenerateContentResult, Part } from '@google/generative-ai/dist/types';
import { useSetting } from "@src/utils/setting";
import { AIAnswer, AIConfig } from "@src/type";
import Anthropic from '@anthropic-ai/sdk';
import { Engine } from "@src/constants";

export type OnGenerative = (isLoading: boolean) => void;


export const callApiWithRetry = async (api: () => Promise<GenerateContentResult>, maxRetries: number = 5, baseDelay = 1000, maxDelay: 10000) => {
  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      return await api();
    } catch (e: any) {
      if (e.status !== 429 || attempt === maxRetries) {
        throw e;
      }
      // tính delay dựa trên backoff exponential
      const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);
      const jitter = Math.random() * delay * 0.5;
      const finalDelay = delay + jitter;
      console.warn(`Retry attempt #${attempt + 1}. Waiting for ${Math.round(finalDelay)}ms.`);
      await new Promise((resolve) => setTimeout(resolve, finalDelay));
      attempt++;
    }
  }
}
const callClaudeApi = async (prompt: string, config: AIConfig) => {
  const client = new Anthropic({
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true,
  });
  try {
    return await client.messages.create({
      model: config.model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    });
  } catch (e) {
    // handle if rate-limit by retry-after header
    console.log(JSON.stringify(e, null, 2));
    // @ts-ignore
    if (e.response && e.response.headers['retry-after']) {
      // @ts-ignore
      const retryAfter = parseInt(e.response.headers['retry-after']);
      console.warn(`Rate limit exceeded, retry after ${retryAfter} seconds`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return await callClaudeApi(prompt, config);
    }
    throw e;
  }
}
const callGeminiApi = async (prompt: string | Array<string | Part>, config: AIConfig) => {
  const ai = new GoogleGenerativeAI(config.apiKey);
  const model = ai.getGenerativeModel({ model: config.model });
  try {
    const result = await callApiWithRetry(() => model.generateContent(prompt), 5, 1000, 10000);
    if (result && result.response) {
      return result.response.text();
    }
    return "{}";
  } catch (e) {
    throw new Error('Không thể tạo câu trả lời bằng AI, thử đổi model trong Cài Đặt và thử lại nếu vẫn không được thì đợi, hoặc tự trả lời câu hỏi này');
  }
};
export default async (html: string, onGenerative: OnGenerative, prompt?: string, audioUri?: string) => {
  const { isEnabledDebugLog, getAiEngine } = useSetting();
  const aiEngine = await getAiEngine();
  (await isEnabledDebugLog()) && console.log({ aiEngine });
  if (!aiEngine?.apiKey) {
    throw new Error('Không tìm thấy cài đặt AI Engine, hãy chắc chắn bạn đã cài đặt AI Engine trong cài đặt');
  }
  onGenerative && onGenerative(true);
  let correct_prompt: string | Array<string | Part> = prompt as string;
  if (!correct_prompt) {
    correct_prompt = ` here is the html input: ${html}. Follow the input html, analyst the question and answer then return the result of answer in json string only, structure is: {"exactly_element_selector": maybe_index_number_or_true}, example: {{"input[type=checkbox][name=\"choice01\"][id=\"questid_sub_answer0\"]": true},"input[type=checkbox][name=\"choice01\"][value=\"1\"]": true},{"input[type=checkbox][name=\"choice01\"][value=\"1\"]": true,"select[name=\"single_select_choice1\"]":[1],"select[name=multi_select_choice]":[2,5],"input[type=text][name=\"text_input\"]:"text answer 1",...}. If selector is select element, it must not index with empty answer. REMEMBER, just raw json string, because i need to parse the response using JS. dont put \`\`\`json or something other would make JSON.parse failed.`;
  }
  // function blobToBase64(blob: Blob): Promise<string> {
  //   return new Promise((resolve, _) => {
  //     const reader = new FileReader();
  //     reader.onloadend = () => resolve(reader.result as string);
  //     reader.readAsDataURL(blob);
  //   });
  // }
  // if (audioUri) {
  //   correct_prompt = [
  //     correct_prompt,
  //     {
  //       fileData: {
  //         mimeType: uploadResult.file.mimeType,
  //         fileUri: uploadResult.file.uri,
  //       },
  //     }
  //   ];
  // }
  (await isEnabledDebugLog()) && console.log({ correct_prompt });
  if (aiEngine.engine === Engine.GEMINI) {
    try {
      let result = await callGeminiApi(correct_prompt, aiEngine as unknown as AIConfig);
      (await isEnabledDebugLog()) && console.log(result);
      // remove ```json if have
      result = result.replace(/```json/g, '').replace(/```/g, '');
      // replace \\: => \\\\: to prevent JSON.parse error
      result = result.replace(/\\:/g, '\\\\:');
      return result;
    } catch (e) {
      throw e;
    } finally {
      onGenerative && onGenerative(false);
    }
  }
  try {
    const result = await callClaudeApi(prompt as unknown as string, aiEngine as unknown as AIConfig);

    return JSON.stringify(result);
  } catch (e) {
    onGenerative && onGenerative(false);
    // @ts-ignore
    if (e.code === 429) {
      throw new Error('Không thể tạo câu trả lời bằng AI, thử đổi model trong cài đặt và thử lại, nếu vẫn lỗi thì chờ vài phút, vẫn bị thì tự điền tay đi 😅');
    }
    throw e;
  } finally {
    onGenerative && onGenerative(false);
  }
};

export const processTheAnswer = async (answerResponse: string): Promise<void> => {
  const { isEnabledDebugLog } = useSetting();
  try {
    const answerSelectors = JSON.parse(answerResponse) as AIAnswer;
    (await isEnabledDebugLog()) && console.log({ answerSelectors });
    // check if answerSelectors is not empty object
    if (Object.keys(answerSelectors).length > 0) {
      // loop through all answerSelectors
      for (let selector in answerSelectors) {
        const value = answerSelectors[selector];
        (await isEnabledDebugLog()) && console.log({ selector });
        // check if selector has : but not \\: then need to add \\: to prevent document.querySelectorAll error
        if (selector.includes(':') && !selector.includes('\\:')) {
          selector = selector.replace(/:/g, '\\:');
        }
        const elements = document.querySelectorAll(selector);
        (await isEnabledDebugLog()) &&  console.log({ selector, value, elements });
        // loop through all elements
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          if (typeof value === 'boolean') {
            if (element instanceof HTMLOptionElement) {
              (element as HTMLOptionElement).selected = value;
              break;
            }
            (element as HTMLInputElement).checked = value;
          } else if (Array.isArray(value)) {
            if (element instanceof HTMLSelectElement) {
              element.selectedIndex = value[0];
            } else {
              (element as HTMLInputElement).checked = value.indexOf(i) !== -1;
            }
          } else {
            // check is radio or checkbox
            if (element instanceof HTMLInputElement && (element.type === 'radio' || element.type === 'checkbox')) {
              // check if elements length > 1, then try to find correct element by id with suffix value index
              const elId = `${element.name}${value}`;
              if (element.id == elId) {
                (element as HTMLInputElement).checked = true;
                break;
              }
              // continue to next element
              continue;
            }
            (element as HTMLInputElement).value = value;
          }
        }
      }
      return;
    }

    throw new Error('Empty answer');
  } catch (e) {
    if (e instanceof Error && e.message === 'Empty answer') {
      throw e;
    }
    console.log(e);
    throw new Error('Không parse JSON answer được. Thử tải lại page nhé, nếu vài lần vẫn bị thì thôi, tự làm bằng tay :))');
  }
}