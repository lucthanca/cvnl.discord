import { createRoot } from 'react-dom/client';
import Loader from './components/Loader';
import generativeAnswer, { processTheAnswer } from './utils/generative-answer';
import type { OnGenerative } from './utils/generative-answer';
import React, { useEffect } from "react";
import './root.style.scss';
import { useSetting } from "@src/utils/setting";

const div = document.createElement('div');
div.id = '__root';
document.body.appendChild(div);

const useExecute = async (onGenerative: OnGenerative) => {
  const { isEnabledAutoAnswer } = useSetting();
  if (!(await isEnabledAutoAnswer())) return;
  // find complete the survey button
  const completeSurveyButton = document.querySelector('.mod_questionnaire_viewpage .complete a') as HTMLAnchorElement;
  if (completeSurveyButton && completeSurveyButton?.textContent?.trim().toLowerCase() === 'complete the survey...') {
    completeSurveyButton.click();
    return;
  }
  // find the form to submit
  const form = document.querySelector('#phpesp_response') as HTMLFormElement;
  if (!form) {
    // if is complete the survey page
    const completeSurveyButton = document.querySelector('.mod_questionnaire_completepage .singlebutton button[type=submit]') as HTMLButtonElement;
    if (completeSurveyButton && completeSurveyButton.textContent?.trim().toLowerCase() === 'continue') {
      completeSurveyButton.click();
      return;
    }
    alert('Form not found');
    return;
  }

  try {
    const answer = await generativeAnswer(form.outerHTML, onGenerative);
    await processTheAnswer(answer);
    // submit the form
    form.submit();
    return;
  } catch (e) {
    console.log(e);
  }
  alert('Không tự động điền được câu trả lời, thử đổi model rồi load lại, hoặc tự điền đi bạn ơi!');
};
const App = () => {
  const [loading, setLoading] = React.useState(false);
  useEffect(() => {
    const execute = () => useExecute((isLoading: boolean) => setLoading(isLoading));
    if (document.readyState !== 'loading') {
      execute().then();
    } else {
      document.addEventListener('DOMContentLoaded', execute);
    }
    return () => {
      try {
        document.removeEventListener('DOMContentLoaded', execute);
      } catch (e) {}
    };
  }, []);
  return <Loader show={loading} />
};

const rootContainer = document.querySelector('#__root');
if (!rootContainer) throw new Error("Can't find Content root element");
const root = createRoot(rootContainer);
root.render(<App />);
