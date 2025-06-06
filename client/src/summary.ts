import { useSetting } from "@src/utils/setting";

const execute = async () => {
  const { isEnabledAutoAnswer } = useSetting();
  if (!(await isEnabledAutoAnswer())) return;
  //find button with text 'Submit all and finish'
  const submitButtons = document.querySelectorAll('.submitbtns form button[type="submit"]');
  for (let i = 0; i < submitButtons.length; i++) {
    const button = submitButtons[i] as HTMLButtonElement;
    if (!button || !button.textContent) continue;
    // check if button text is 'Submit all and finish', shoud trim and lowercase the text
    if (button.textContent.trim().toLowerCase() === 'submit all and finish') {
      // click the button
      // get parent form
      const form = button.closest('form');
      if (form) {
        form.submit();
        return;
      }
    }
  }
};

if (document.readyState !== 'loading') {
  execute().then();
} else {
  document.addEventListener('DOMContentLoaded', execute);
}