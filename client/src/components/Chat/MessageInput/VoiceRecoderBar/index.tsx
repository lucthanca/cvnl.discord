import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import StopIcon from "~/assets/stop";
import PlayIcon from "~/assets/play";
import "./index.style.scss";
import Recorder from '~/utils/recorder.js';
const DURATION = 1000 * 30; // 1 second

type Voice = { blob: Blob; url: string };
export type VoiceRecorder = {
  clear: (callback?: () => void) => void;
  recordVoice: () => void;
};
const VoiceRecorderBar = forwardRef<VoiceRecorder, {
  onChange?: (voice: Voice | null) => void;
  onStop?: () => void;
  onStart?: () => void;
}>((props, ref) => {
  const recorderBarRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const { onChange, onStart, onStop } = props;
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audio, setAudio] = useState<Voice | null>(null);


  const recorderRef = useRef<Recorder>(null);
  const handleRecordingComplete = () => {
    handleStopRecording();
    recorderBarRef.current!.style.setProperty('--voice-recorder-bar-width', `100%`);
  }
  // const cancelRecording = (): void => {
  //   if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
  //     mediaRecorderRef.current.stop();
  //   }
  //
  //   setIsRecording(false);
  //
  //   // Dọn dẹp stream
  //   if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
  //     mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
  //   }
  // };
  const handleStopRecording = () => {
    if (recorderRef.current?.recording) {
      recorderRef.current.stop();
      recorderRef.current.exportWAV((blob: Blob) => {
        const url = URL.createObjectURL(blob);
        setAudio({
          blob,
          url,
        });
      });
    }
    setIsRecording(false);
    onStop?.();
  };

  const handlePlayAudio = () => {
    if (audioPlayerRef.current) {
      const playing = () => {
        if (!audioPlayerRef.current) return;
        const currentTime = audioPlayerRef.current!.currentTime;
        const duration = audioPlayerRef.current!.duration;
        const percent = (currentTime / duration) * 100;
        recorderBarRef.current!.style.setProperty('--voice-recorder-bar-width', `${percent}%`);
        document.querySelector(".voice-recorder-bar__timer")!.textContent = `${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, "0")}`;

        if (!audioPlayerRef.current!.paused && !audioPlayerRef.current!.ended) {
          requestAnimationFrame(playing);
        }
      }
      audioPlayerRef.current.addEventListener('play', () => requestAnimationFrame(playing));
      
      audioPlayerRef.current.play();
      return;
    }
    alert('Không thể phát âm thanh, vui lòng thử lại sau.');
  }
  const handleStartRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const input = audioCtx.createMediaStreamSource(stream);
    recorderRef.current = new Recorder(input, {
      numChannels: 1,
      mimeType: 'audio/wav',
    })
    recorderRef.current.record();
    setIsRecording(true);
    onStart?.();
    const start = performance.now();

    function tick(now: number) {
      const textCountEl = document.querySelector(".voice-recorder-bar__timer");
      if (!textCountEl) {
        requestAnimationFrame(tick);
      } else {
        const elapsed = now - start;
        const seconds = Math.min(elapsed / 1000, 60);
        // Update the timer text
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const timerText = `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
        // calculate the width of progress bar
        const percent = Math.min(elapsed / DURATION, 1) * 100;
        recorderBarRef.current!.style.setProperty('--voice-recorder-bar-width', `${percent}%`);

        textCountEl.textContent = timerText;

        if (elapsed < DURATION && recorderRef.current?.recording) {
          requestAnimationFrame(tick);
        } else {
          handleRecordingComplete();
        }
      }
    }

    requestAnimationFrame(tick);
  }, []);
  useEffect(() => {
    onChange?.(audio);
  }, [audio, onChange]);
  useImperativeHandle(ref, () => ({
    clear: (callback) => {
      setAudio(null);
      setIsRecording(false);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
      callback?.();
    },
    recordVoice: handleStartRecording,
  }), [handleStartRecording]);
  const bar = (
    <div className="voice-recorder-bar bg-indigo-400 rounded-full py-2 flex">
      {isRecording && (<div className="voice-recorder-bar__button-stop mx-2 cursor-pointer group transition-colors inline-flex relative z-10" onClick={handleStopRecording}>
        <StopIcon width="20px" height="20px" className="text-white group-hover:text-gray-200" />
      </div>)}
      {(!isRecording && audio) && (<div className="voice-recorder-bar__button-play mx-2 cursor-pointer group transition-colors inline-flex relative z-10" onClick={handlePlayAudio}>
        <PlayIcon width="20px" height="20px" className="text-white group-hover:text-gray-200" />
        <audio className="voice-recorder-bar__audio-player mx-2 relative z-10" controls={false} ref={audioPlayerRef}>
          <source src={audio.url} type="audio/wav" />
          Your browser does not support the audio element.
        </audio>
      </div>)}

      <div className="voice-recorder-bar__timer text-indigo-400 text-sm rounded-full px-2 mx-2 bg-white relative z-10 justify-self-end">
        0:00
      </div>
    </div>
  );
  return <div ref={recorderBarRef}>
    {!(!isRecording && !audio) && bar}
  </div>
})

export default VoiceRecorderBar;