import { createRoot } from "react-dom/client";
import App from "@src/components/App";
import React from "react";
import { useSetting } from "@src/utils/setting";
import generativeAnswer, { type OnGenerative } from "@src/utils/generative-answer";

(() => {
  const navigateToNextActivity = () => {
    const $nextActivity = document.querySelector('#next-activity #next-activity-link') as HTMLAnchorElement;
    $nextActivity && $nextActivity.click();
  };
  const execute = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    if (!action) {
      const submissionBtn = document.querySelector('.submissionstatustable button[type=submit]') as HTMLButtonElement;
      submissionBtn && submissionBtn.click();
      console.log('Navigate to add submission');
      return;
    }
    if (action !== 'editsubmission') {
      // find next activity button and navigate
      navigateToNextActivity();
      return;
    }
    const execute_ = async (onGenerative: OnGenerative) => {
      const { isEnabledAutoAnswer } = useSetting();
      if (!(await isEnabledAutoAnswer())) return;
      setTimeout(async () => {
        const requestAnswer = async () => {
          const questionEl = document.querySelector('#intro') as HTMLDivElement;
          if (!questionEl) {
            throw new Error('[BUG] Question not found');
          }
          const prompt = `follow the input html, analyst the question and answer then return the result as html, do not put other stubs like "answer: " or "Here are the answers.... etc". `;
          return await generativeAnswer(questionEl.outerHTML, onGenerative, prompt);
        };

        const textArea = document.querySelector('#id_textforum_editor') as HTMLTextAreaElement || document.querySelector('#id_onlinetext_editor') as HTMLTextAreaElement;
        if (!textArea) {
          alert('[BUG] Text area not found');
          navigateToNextActivity();
          return;
        }

        const isFileUploadAnswer = document.querySelector('[name=files_filemanager]');
        if (isFileUploadAnswer && !textArea) {
          alert('Not support file upload answer');
          navigateToNextActivity();
          return;
        }

        let resultText = '';
        try {
          resultText = await requestAnswer();
        } catch (e) {
          if (e instanceof Error) {
            alert(e.message);
          }
          console.log(e);
          return;
        }


        const showCodeBtn = document.querySelector('.atto_html_button') as HTMLButtonElement;
        if (showCodeBtn) {
          showCodeBtn.click()
        } else {
          alert('[BUG] Show code button not found');
        }

        textArea.value = resultText;
        // wait for 3s to submit
        await new Promise(resolve => setTimeout(resolve, 3000));
        const submitButton = document.querySelector('#id_submitbutton') as HTMLInputElement;
        if (submitButton) {
          const form = submitButton.closest('form') as HTMLFormElement;
          form && form.submit();
          return;
        }
        // submitButton.click();
        return;
      }, 5000)
    };
    const div = document.createElement('div');
    div.id = '__root';
    document.body.appendChild(div);
    const rootContainer = document.querySelector('#__root');
    if (!rootContainer) throw new Error("Can't find Content root element");
    const root = createRoot(rootContainer);
    root.render(<App onLoad={execute_}/>);
  };

  if (document.readyState !== 'loading') {
    execute();
  } else {
    document.addEventListener('DOMContentLoaded', execute);
  }
})();