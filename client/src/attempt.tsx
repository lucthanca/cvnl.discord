import { createRoot } from 'react-dom/client';
import App from './components/App';
import generativeAnswer, { processTheAnswer } from './utils/generative-answer';
import type { OnGenerative } from './utils/generative-answer';
import React from "react";
import './root.style.scss';
import storage from "@src/storage";
import {useSetting} from "@src/utils/setting";

const div = document.createElement('div');
div.id = '__root';
document.body.appendChild(div);

const execute_ = async (onGenerative: OnGenerative) => {
  const { isEnabledAutoAnswer } = useSetting();
  if (!(await isEnabledAutoAnswer())) return;
  // const storage = (await import('./storage')).default;
  await storage.init();
  // get taskID by param cmid
  const urlParams = new URLSearchParams(window.location.search);
  const cmid = urlParams.get('cmid');
  const attempt = urlParams.get('attempt');
  if (!cmid) return;
  const page = urlParams.get('page');
  let taskID = `${cmid}-${attempt}`;
  if (page) {
    taskID = `${taskID}-${page}`;
  }
  // get task by taskID
  const task = await storage.get(taskID);
  console.log(task);
  if (task) return;

  const responseForm = document.querySelector('#responseform');
  if (!responseForm) return;
  // listen on submit form
  responseForm.addEventListener('submit', async (e) => {
    // push taskID to storage
    await storage.add({ id: taskID, name: taskID.toString() });
  });
  // const formTask = document.querySelector('.formulation.clearfix');
  // try using Google Gemini to answer the question from html
  if (!responseForm) return;
  try {
    const audioUri = responseForm.querySelector('audio source')?.getAttribute('src') as string;
    const answer = await generativeAnswer(responseForm?.outerHTML || '', onGenerative, undefined, audioUri);
    await processTheAnswer(answer);

    const submitButton: HTMLButtonElement | HTMLInputElement | null = document.querySelector('.submitbtns input[type="submit"]');
    const buttonText = submitButton && (submitButton.textContent || submitButton.value || '').trim().toLowerCase();
    if (submitButton && buttonText === 'previous page') {
      // get next page button, same $().next()
      const nextPageBtn = submitButton.nextElementSibling as HTMLInputElement;
      if (nextPageBtn && (nextPageBtn.textContent || nextPageBtn.value || '').trim().toLowerCase() === 'next page') {
        nextPageBtn.click();
        return;
      }
    }
    if (buttonText === 'next page') {
      submitButton && submitButton.click();
      return;
    }
    if (submitButton && buttonText === 'finish attempt ...') {
      // Finish attempt ...
      // push taskID to storage
      // await storage.add({ id: taskID, name: taskID.toString() });
      submitButton.click();
      return;
    }
    return;
  } catch (e) {
    if (e instanceof Error) {
      alert(e.message);
      return;
    }
    console.log(e);
  }

  const answers = document.querySelectorAll(".formulation.clearfix .answer");
  // loop through all answers using for instead of forEach
  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i];
    const answerInputs = answer.querySelectorAll("input");
    // answer will have children with input radio. now we need random checked radio
    const randomIndex = Math.floor(Math.random() * answerInputs.length);
    console.log({ randomIndex, leng: answerInputs.length })
    const randomRadio = answerInputs[randomIndex];
    // check the random radio
    // const input = randomRadio.querySelector("input");
    console.log(randomRadio)
    if (randomRadio) {
      randomRadio.checked = true;
    }
  }

  // find all answer select type and select random option
  const selects = document.querySelectorAll(".formulation.clearfix select");

  for (let i = 0; i < selects.length; i++) {
    const select = selects[i] as HTMLSelectElement;

    let randomIndex = 0;
    do{
      randomIndex = Math.floor(Math.random() * select.options.length);
    } while (randomIndex === 0);

    console.log({ randomIndex })
    select.selectedIndex = randomIndex;
  }

  let answersTable = [];
  let shouldRandomAnswer = true;
  // check if have table of answer to fill
  // try to find suggested answers
  const table = document.querySelectorAll(".formulation.clearfix table");
  if (table.length === 0) {
    console.log('không có table, thử tìm theo suggested words');
    // suggested words sẽ có dạng <p>&nbsp;&nbsp;Suggested words: <strong>future</strong>, <strong>companies</strong>, <strong>robot</strong>, <strong>machines</strong>, <strong>technology</strong>, <strong>sensors</strong>, <strong>surveillance</strong>, <strong>whatever</strong>, <strong>baby</strong>, <strong>scientists</strong></p>
    const suggestedWords = document.querySelectorAll(".formulation.clearfix p");
    if (suggestedWords.length > 0) {
      for (let i = 0; i < suggestedWords.length; i++) {
        const rowP = suggestedWords[i];
        const rowPText = rowP.textContent as string;
        if (rowPText && rowPText.trim().toLowerCase().includes('suggested words:')) {
          const removedSuggestedWordsTitle = rowPText.split(":")[1];
          const wordsArr = removedSuggestedWordsTitle.split(",");
          for (let j = 0; j < wordsArr.length; j++) {
            const word = wordsArr[j].trim();
            answersTable.push(word);
          }
        }
      }
    }
  } else {
    // get all rows of table
    const rows = table[0].querySelectorAll("tr");
    if (rows.length === 1) {
      const row1 = rows[0];
      // check if only 2 colums, then column 2 is bulk of answers, maybe separated by p tag, and last answer is not wrapped by p tag
      const cells = row1.querySelectorAll("td");
      if (cells.length === 2) {
        const cell2 = cells[1];
        let cellTextContent = cell2.textContent as string;
        const answers = cell2.querySelectorAll("p");
        for (let i = 0; i < answers.length; i++) {
          const answer = answers[i];
          answersTable.push((answer.textContent as string).trim());
          // replace text in cell with empty string
          cellTextContent = cellTextContent.replace((answer.textContent as string).trim(), "");
        }
        // push last answer
        answersTable.push(cellTextContent.trim());
      } else if (cells.length === 1) {
        const cell1 = cells[0];
        // suggested words separated by ,
        const words = cell1.textContent?.split(",");
        if (words) {
          for (let i = 0; i < words.length; i++) {
            answersTable.push(words[i].trim());
          }
        }
      } else {
        // loop through all rows
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          // get all cells of row
          const cells = row.querySelectorAll("td");
          // loop cells
          for (let j = 0; j < cells.length; j++) {
            const cell = cells[j];
            // deep search text in this td, the text maybe in a multi-level element
            let text = cell.textContent;
            if (null === text) continue;
            // trim and remove unwanted characters likes ●
            text = text.replace("●", "").trim();
            // push to answersTable
            answersTable.push(text);
          }
        }
      }
    }
  }

  console.log({ answersTable });
  // get all input text
  const inputs = document.querySelectorAll(".formulation.clearfix input[type='text']");
  if (inputs.length === 0) {
    console.log('No input text answer found');
  } else {
    // check if has mediaplugin element
    const mediaPluginel = document.querySelector(".formulation.clearfix .mediaplugin");
    if (answersTable.length < inputs.length && mediaPluginel === null) {
      // try to find suggested answers in the form
      const formText = document.querySelector(".formulation.clearfix")?.textContent;
      if (formText && formText.trim()) {
        const matches = formText.trim().match(/\(\d+\.\s*(\w+)\)/g);
        answersTable = matches ? matches.map(match => match.match(/\w+/g)?.[1] || null).filter(value => value !== null) : [];
        shouldRandomAnswer = false;
      }
    }
    // otherwise, get random words from lorem ipsum and put to answersTable until it has enough answers to fill all inputs
    // take random words from lorem ipsum
    const lorem = "Lorem ipsum dolor sit amet, consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua";
    const words = lorem.split(" ");
    // put random words to answersTable, until it has enough words to fill all inputs
    while (answersTable.length < inputs.length) {
      const randomIndex = Math.floor(Math.random() * words.length);
      const randomWord = words[randomIndex];
      answersTable.push(randomWord);
    }

    // loop through all inputs
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i] as HTMLInputElement;
      let index = i;
      if (shouldRandomAnswer) {
        // get random answer from answersTable, pick one and remove from answersTable
        index = Math.floor(Math.random() * answersTable.length);
        answersTable.splice(index, 1);
      }
      // fill the input with random answer
      input.value = answersTable[index] as string;
    }
  }

  const submitButton: HTMLButtonElement | HTMLInputElement | null = document.querySelector('.submitbtns input[type="submit"]');
  const buttonText = submitButton && (submitButton.textContent || submitButton.value || '').trim().toLowerCase();
  if (submitButton && buttonText === 'previous page') {
    // get next page button, same $().next()
    const nextPageBtn = submitButton.nextElementSibling as HTMLInputElement;
    if (nextPageBtn && (nextPageBtn.textContent || nextPageBtn.value || '').trim().toLowerCase() === 'next page') {
      nextPageBtn.click();
      return;
    }
  }
  if (buttonText === 'next page') {
    submitButton && submitButton.click();
    return;
  }
  if (submitButton && buttonText === 'finish attempt ...') {
    // Finish attempt ...
    // push taskID to storage
    // await storage.add({ id: taskID, name: taskID.toString() });
    // submitButton.click();
    return;
  }
  // console.log('Form not found');
}

const rootContainer = document.querySelector('#__root');
if (!rootContainer) throw new Error("Can't find Content root element");
const root = createRoot(rootContainer);
root.render(<App onLoad={execute_}/>);