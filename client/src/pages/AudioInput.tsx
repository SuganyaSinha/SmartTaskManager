import React, { useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface AudioInputProps {
  onTranscriptChange: (transcript: string) => void;
}

const AudioInput: React.FC<AudioInputProps> = ({ onTranscriptChange }) => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  // Send transcript to parent whenever it updates
  useEffect(() => {
    if (browserSupportsSpeechRecognition && transcript) {
      onTranscriptChange(transcript);
    }
  }, [transcript, browserSupportsSpeechRecognition, onTranscriptChange]);

  if (!browserSupportsSpeechRecognition) {
    return <p>Your browser does not support speech recognition.</p>;
  }

  const startListening = () => {
    SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
  };

  const stopListening = () => {
    SpeechRecognition.stopListening();
  };

  const handleReset = () => {
    resetTranscript(); // Clear the local transcript
    onTranscriptChange(''); // Notify parent to clear the textarea
  };

  return (
    <div>
      <button onClick={startListening} disabled={listening}>
        Start
      </button>
      <button onClick={stopListening} disabled={!listening}>
        Stop
      </button>
      <button onClick={handleReset} disabled={!transcript}>
        Reset
      </button>
    </div>
  );
};

export default AudioInput;