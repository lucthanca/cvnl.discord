import { useSetting } from "@src/utils/setting";

(() => {
  const execute = async () => {
    const { isEnabledAutoAnswer } = useSetting();
    if (!(await isEnabledAutoAnswer())) return;
    //find button with text 'Submit all and finish'
    const submitButton = document.querySelector('.submitbtns a.mod_quiz-next-nav') as HTMLAnchorElement;
    if ((submitButton.textContent as string).trim().toLowerCase() === 'finish review') {
      submitButton.click();
      return;
    }
    if (submitButton) {
      // click the button
      // submitButton.click();
      return;
    }
  };

  if (document.readyState !== 'loading') {
    execute().then();
  } else {
    document.addEventListener('DOMContentLoaded', execute);
  }
})();