import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

interface AudioInputProps {
  onTranscriptChange: (transcript: string) => void;
}

export interface AudioInputHandle {
  stop: () => void;
}

const AudioInput = forwardRef<AudioInputHandle, AudioInputProps>(
  ({ onTranscriptChange }, ref) => {
    const {
      transcript,
      listening,
      resetTranscript,
      browserSupportsSpeechRecognition,
    } = useSpeechRecognition();

    const shouldListenRef = useRef(false);

    const stopListening = () => {
      shouldListenRef.current = false;
      SpeechRecognition.stopListening();
    };

    // Expose stop() to parent components (e.g. on form submit)
    useImperativeHandle(ref, () => ({ stop: stopListening }));

    // iOS Safari stops the recognizer after each utterance; restart if user
    // hasn't explicitly stopped.
    useEffect(() => {
      if (!listening && shouldListenRef.current) {
        SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
      }
    }, [listening]);

    // Stop when the user switches tabs or minimises the browser.
    useEffect(() => {
      const handleVisibilityChange = () => {
        if (document.hidden) stopListening();
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
      if (browserSupportsSpeechRecognition && transcript) {
        onTranscriptChange(transcript);
      }
    }, [transcript, browserSupportsSpeechRecognition, onTranscriptChange]);

    if (!browserSupportsSpeechRecognition) {
      return (
        <p className="text-xs text-gray-400 italic">
          Speech recognition is not supported in this browser.
        </p>
      );
    }

    const startListening = () => {
      shouldListenRef.current = true;
      SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
    };

    const handleReset = () => {
      resetTranscript();
      onTranscriptChange('');
    };

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Start / Stop toggle */}
        <button
          onClick={listening ? stopListening : startListening}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all select-none',
            listening
              ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50',
          ].join(' ')}
        >
          {listening ? (
            <>
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              Stop
            </>
          ) : (
            <>
              <svg
                width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                className="flex-shrink-0"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              Record
            </>
          )}
        </button>

        {/* Clear transcript */}
        <button
          onClick={handleReset}
          disabled={!transcript}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors select-none"
        >
          <svg
            width="10" height="10" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" className="flex-shrink-0"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Clear
        </button>
      </div>
    );
  }
);

AudioInput.displayName = 'AudioInput';

export default AudioInput;
