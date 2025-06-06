import { useSetting } from "@src/utils/setting";

(() => {
  const execute = async () => {
    const { isEnabledAutoAnswer } = useSetting();
    if (!(await isEnabledAutoAnswer())) return;
    //find button with text 'Submit all and finish'
    const submitButton = document.querySelector('.quizattempt form button[type="submit"]') as HTMLButtonElement;
    const submitButtonText = submitButton !== null && (submitButton.textContent as string).trim().toLowerCase();
    if (submitButtonText === 're-attempt task') {
      const $nextActivity = document.querySelector('#next-activity #next-activity-link') as HTMLAnchorElement;
      $nextActivity && $nextActivity.click();
      console.log('Navigate to next task');
      return;
    }
    if (submitButtonText === 'do the task' || submitButtonText === 'continue your attempt') {
      console.log('Navigate to do the task');
      submitButton.click();
      return;
    }

    // find next activity button and navigate
    const $nextActivity = document.querySelector('#next-activity #next-activity-link') as HTMLAnchorElement;
    $nextActivity && $nextActivity.click();
    if (submitButton) {
      // click the button
      // submitButton.click();
      return;
    }
  };

  if (document.readyState !== 'loading') {
    execute();
  } else {
    document.addEventListener('DOMContentLoaded', execute);
  }
})();