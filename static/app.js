const recordButton = document.getElementById("recordButton");
const recordButtonLabel = document.getElementById("recordButtonLabel");
const transcribeButton = document.getElementById("transcribeButton");
const statusText = document.getElementById("status");
const audioPreview = document.getElementById("audioPreview");
const transcript = document.getElementById("transcript");
const phaseButtons = Array.from(document.querySelectorAll("[data-phase]"));
const phaseCopies = Array.from(document.querySelectorAll("[data-phase-copy]"));
const phaseVisuals = Array.from(document.querySelectorAll("[data-phase-visual]"));

let mediaRecorder;
let audioChunks = [];
let audioBlob = null;
let stream = null;
let phaseCycleTimer = null;

const updateStatus = (message) => {
  statusText.textContent = message;
};

const setRecordingVisualState = (isRecording) => {
  recordButton.classList.toggle("is-recording", isRecording);
  recordButton.setAttribute("aria-pressed", String(isRecording));
  recordButtonLabel.textContent = isRecording ? "Stop Recording" : "Start Recording";
};

const cleanupStream = () => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
};

const beginRecording = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    });

    mediaRecorder.addEventListener("stop", () => {
      audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      audioPreview.src = URL.createObjectURL(audioBlob);
      transcribeButton.disabled = false;
      setRecordingVisualState(false);
      updateStatus("Recording complete. Review the audio and translate when ready.");
      cleanupStream();
    });

    mediaRecorder.start();
    transcript.value = "";
    audioPreview.removeAttribute("src");
    transcribeButton.disabled = true;
    setRecordingVisualState(true);
    updateStatus("Recording in progress...");
  } catch (error) {
    setRecordingVisualState(false);
    updateStatus(`Microphone access failed: ${error.message}`);
  }
};

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    return;
  }

  setRecordingVisualState(false);
  cleanupStream();
};

const setActivePhase = (phaseName) => {
  phaseButtons.forEach((button) => {
    const isActive = button.dataset.phase === phaseName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  phaseCopies.forEach((copy) => {
    copy.classList.toggle("is-active", copy.dataset.phaseCopy === phaseName);
  });

  phaseVisuals.forEach((visual) => {
    visual.classList.toggle("is-active", visual.dataset.phaseVisual === phaseName);
  });
};

const startPhaseCycle = () => {
  if (!phaseButtons.length) {
    return;
  }

  const phases = phaseButtons.map((button) => button.dataset.phase);
  let currentIndex = phases.indexOf(
    phaseButtons.find((button) => button.classList.contains("is-active"))?.dataset.phase ?? "recording"
  );

  clearInterval(phaseCycleTimer);
  phaseCycleTimer = window.setInterval(() => {
    currentIndex = (currentIndex + 1) % phases.length;
    setActivePhase(phases[currentIndex]);
  }, 2600);
};

if (phaseButtons.length) {
  phaseButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActivePhase(button.dataset.phase);
      startPhaseCycle();
    });
  });

  startPhaseCycle();
}

recordButton.addEventListener("click", async () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    stopRecording();
    return;
  }

  await beginRecording();
});

transcribeButton.addEventListener("click", async () => {
  if (!audioBlob) {
    updateStatus("Please record audio before transcribing.");
    return;
  }

  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");

  updateStatus("Sending audio to Azure...");
  transcribeButton.disabled = true;

  try {
    const response = await fetch("/transcribe", {
      method: "POST",
      body: formData,
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Transcription failed.");
    }

    transcript.value = payload.text || "";
    updateStatus(
      payload.operation === "translations"
        ? "Translation complete."
        : payload.language
          ? `Transcription complete. Detected language: ${payload.language}.`
          : "Transcription complete."
    );
  } catch (error) {
    updateStatus(error.message);
  } finally {
    transcribeButton.disabled = false;
  }
});
