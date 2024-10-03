import React, { useState, useContext, useRef, useEffect } from "react";
import { Play, Pause, Mic, Square, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import video from "./assets/dee.mp4";
// Context for global state management
const AppContext = React.createContext();

const VideoPlayer = ({ videoSrc, audioSrc }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const { isPlaying, setIsPlaying, progress, setProgress } =
    useContext(AppContext);

  const togglePlay = () => {
    if (videoRef.current.paused) {
      videoRef.current.play();
      if (audioRef.current) audioRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleProgress = () => {
    const progress =
      (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(progress);
  };

  const handleSeek = (e) => {
    const progressBar = e.target;
    const position =
      (e.nativeEvent.offsetX / progressBar.offsetWidth) *
      videoRef.current.duration;
    videoRef.current.currentTime = position;
    if (audioRef.current) audioRef.current.currentTime = position;
  };

  useEffect(() => {
    const videoElement = videoRef.current;
    videoElement.addEventListener("timeupdate", handleProgress);
    return () => {
      videoElement.removeEventListener("timeupdate", handleProgress);
    };
  }, []);

  return (
    <div className="relative">
      <video ref={videoRef} src={videoSrc} className="w-full" />
      {audioSrc && <audio ref={audioRef} src={audioSrc} />}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
        <button onClick={togglePlay} className="mr-2">
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <div
          className="inline-block w-4/5 h-2 bg-gray-200 cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-blue-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

const AudioRecorder = () => {
  const { setAudioSrc, isRecording, setIsRecording } = useContext(AppContext);
  const [audioChunks, setAudioChunks] = useState([]);
  const mediaRecorderRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameId = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((chunks) => [...chunks, event.data]);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioSrc(audioUrl);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      visualize(stream);
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      cancelAnimationFrame(animationFrameId.current);
    }
  };

  const visualize = (stream) => {
    const audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 2048;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext("2d");
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;

    const draw = () => {
      animationFrameId.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      canvasCtx.fillStyle = "rgb(200, 200, 200)";
      canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeStyle = "rgb(0, 0, 0)";
      canvasCtx.beginPath();
      const sliceWidth = (WIDTH * 1.0) / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * HEIGHT) / 2;
        if (i === 0) {
          canvasCtx.moveTo(x, y);
        } else {
          canvasCtx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      canvasCtx.lineTo(canvas.width, canvas.height / 2);
      canvasCtx.stroke();
    };
    draw();
  };

  return (
    <div className="mt-4">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
      >
        {isRecording ? <Square size={24} /> : <Mic size={24} />}
      </button>
      <canvas
        ref={canvasRef}
        width="300"
        height="100"
        className="border"
      ></canvas>
    </div>
  );
};

const DialogueDisplay = ({ dialogue }) => {
  const { setDialogues, currentDialogueIndex } = useContext(AppContext);
  const [originalText, setOriginalText] = useState(dialogue.original);
  const [translatedText, setTranslatedText] = useState(dialogue.translated);

  useEffect(() => {
    setOriginalText(dialogue.original);
    setTranslatedText(dialogue.translated);
  }, [dialogue]);

  const handleOriginalTextChange = (e) => {
    setOriginalText(e.target.value);
    setDialogues((prev) => {
      const newDialogues = [...prev];
      newDialogues[currentDialogueIndex] = {
        ...newDialogues[currentDialogueIndex],
        original: e.target.value,
      };
      return newDialogues;
    });
  };

  const handleTranslatedTextChange = (e) => {
    setTranslatedText(e.target.value);
    setDialogues((prev) => {
      const newDialogues = [...prev];
      newDialogues[currentDialogueIndex] = {
        ...newDialogues[currentDialogueIndex],
        translated: e.target.value,
      };
      return newDialogues;
    });
  };

  return (
    <div className="mt-4">
      <textarea
        value={originalText}
        onChange={handleOriginalTextChange}
        className="w-full p-2 border rounded"
        placeholder="Original Text"
      />
      <textarea
        value={translatedText}
        onChange={handleTranslatedTextChange}
        className="w-full p-2 border rounded mt-2"
        placeholder="Translated Text"
      />
    </div>
  );
};

const Navigation = () => {
  const { currentDialogueIndex, setCurrentDialogueIndex, dialogues } =
    useContext(AppContext);

  return (
    <div className="flex justify-between mt-4">
      <button
        onClick={() =>
          setCurrentDialogueIndex(Math.max(currentDialogueIndex - 1, 0))
        }
        disabled={currentDialogueIndex === 0}
        className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50"
      >
        Previous
      </button>
      <button
        onClick={() =>
          setCurrentDialogueIndex(
            Math.min(currentDialogueIndex + 1, dialogues.length - 1)
          )
        }
        disabled={currentDialogueIndex === dialogues.length - 1}
        className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
};

const ErrorBoundary = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error) => {
      console.error(error);
      setHasError(true);
    };

    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, []);

  if (hasError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          An error occurred. Please refresh the page and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return children;
};

const App = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioSrc, setAudioSrc] = useState(null);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [dialogues, setDialogues] = useState([
    { original: "Hello, how are you?", translated: "Hola, ¿cómo estás?" },
    { original: "I'm fine, thank you.", translated: "Estoy bien, gracias." },
    { original: "What's your name?", translated: "¿Cómo te llamas?" },
    { original: "Nice to meet you.", translated: "Encantado de conocerte." },
    { original: "Goodbye!", translated: "¡Adiós!" },
  ]);

  return (
    <AppContext.Provider
      value={{
        isPlaying,
        setIsPlaying,
        progress,
        setProgress,
        audioSrc,
        setAudioSrc,
        isRecording,
        setIsRecording,
        currentDialogueIndex,
        setCurrentDialogueIndex,
        dialogues,
        setDialogues,
      }}
    >
      <ErrorBoundary>
        <div className="max-w-md mx-auto p-4">
          <VideoPlayer
            videoSrc={video} // Replace with your actual video source
            audioSrc={audioSrc}
          />
          <AudioRecorder />
          <DialogueDisplay dialogue={dialogues[currentDialogueIndex]} />
          <Navigation />
        </div>
      </ErrorBoundary>
    </AppContext.Provider>
  );
};

export default App;
