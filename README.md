# Whisper Flow

A small speech-to-text web app with:

- Python backend using Flask
- HTML/CSS/JavaScript frontend
- Azure OpenAI Whisper for transcription

## Features

- Record audio directly in the browser
- Send the recording to the backend
- Transcribe speech into text
- Show the detected language when available

## Project structure

```text
.
|-- app.py
|-- requirements.txt
|-- static/
|   |-- app.js
|   `-- styles.css
`-- templates/
    `-- index.html
```

## Setup

1. Create and activate a virtual environment.
2. Install the dependencies:

```bash
pip install -r requirements.txt
```

3. Create your local environment file:

```bash
copy .env.example .env
```

4. Fill in these Azure values in `.env`:

```bash
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_API_KEY=your_azure_openai_api_key
AZURE_OPENAI_API_VERSION=2024-06-01
AZURE_OPENAI_WHISPER_DEPLOYMENT=your-whisper-deployment-name
AZURE_OPENAI_AUDIO_OPERATION=translations
```

5. Start the server:

```bash
python app.py
```

6. Open `http://127.0.0.1:5000` in your browser.

## Notes

- The app reads Azure settings from `.env`.
- Your deployment name must exactly match the Azure OpenAI Whisper deployment name.
- `AZURE_OPENAI_AUDIO_OPERATION=translations` matches Azure `/audio/translations` and translates speech into English.
- If you want same-language speech-to-text instead, set `AZURE_OPENAI_AUDIO_OPERATION=transcriptions`.
- Azure OpenAI Whisper supports `mp3`, `mp4`, `mpeg`, `mpga`, `m4a`, `wav`, and `webm`, with a 25 MB limit.
- Supported upload formats in this app: `wav`, `webm`, `mp3`, `m4a`, `mp4`, `mpeg`, `mpga`
