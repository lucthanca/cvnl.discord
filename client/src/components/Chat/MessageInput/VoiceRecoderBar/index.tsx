import { useEffect, useRef, useState } from "react";
import StopIcon from "~/assets/stop";
import PlayIcon from "~/assets/play";
import "./index.style.scss";
const DURATION = 1000 * 10; // 1 second
const VoiceRecorderBar = (props: {
  onComplete?: () => void;
}) => {
  const recorderBarRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);
  const { onComplete } = props;
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audio, setAudio] = useState<{ blob: Blob; url: string } | null>(null);
  const handleRecordingComplete = () => {
    handleStopRecording();
    recorderBarRef.current!.style.setProperty('--voice-recorder-bar-width', `100%`);
    onComplete?.();
  }
  const cancelRecording = (): void => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    
    // Dọn dẹp stream
    if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handlePlayAudio = () => {
    if (audioPlayerRef.current) {
      const playing = () => {
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
  const handleStartRecording = () => {
    (async () => {
      const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudio({
          blob: audioBlob,
          url: URL.createObjectURL(audioBlob),
        });
        
        // Dọn dẹp stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      const start = performance.now();

      function tick(now: number) {
        const elapsed = now - start;
        const seconds = Math.min(elapsed / 1000, 60);
        // Update the timer text
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const timerText = `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
        // calculate the width of progress bar
        const percent = Math.min(elapsed / DURATION, 1) * 100;
        recorderBarRef.current!.style.setProperty('--voice-recorder-bar-width', `${percent}%`);

        document.querySelector(".voice-recorder-bar__timer")!.textContent = timerText;

        if (elapsed < DURATION && mediaRecorder.state === 'recording') {
          requestAnimationFrame(tick);
        } else {
          handleRecordingComplete();
        }
      }

      requestAnimationFrame(tick);
    })();
  }
  return (
    <div ref={recorderBarRef} className="voice-recorder-bar bg-indigo-400 rounded-full py-2 flex">
      <div title="ghi âm" className="cursor-pointer w-[20px] aspect-square bg-black rounded-md relative z-10 mx-2 shrink-0" onClick={handleStartRecording}>
      </div>
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
}

export default VoiceRecorderBar;