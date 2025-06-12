import React, { useState, useRef } from 'react';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';

interface VoiceRecorderProps {
  onSendVoice: (audioBlob: Blob) => void;
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onSendVoice,
  isRecording,
  onStartRecording,
  onStopRecording,
}) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        onSendVoice(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      onStartRecording();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      onStopRecording();
    }
  };

  return (
    <button
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onTouchStart={startRecording}
      onTouchEnd={stopRecording}
      className={`p-3 rounded-full transition-colors ${
        isRecording
          ? 'bg-red-500 text-white'
          : 'bg-theme-primary text-white hover:bg-theme-primary-dark'
      }`}
    >
      {isRecording ? (
        <StopIcon className="w-5 h-5" />
      ) : (
        <MicrophoneIcon className="w-5 h-5" />
      )}
    </button>
  );
};

export default VoiceRecorder;
