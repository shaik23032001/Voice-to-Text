from __future__ import annotations

import os
import tempfile
from pathlib import Path

from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv
from openai import AzureOpenAI
from werkzeug.utils import secure_filename

BASE_DIR = Path(__file__).resolve().parent
UPLOAD_EXTENSIONS = {".wav", ".webm", ".mp3", ".m4a", ".mp4", ".mpeg", ".mpga"}

load_dotenv(BASE_DIR / ".env")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024


def get_azure_client():
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
    api_key = os.getenv("AZURE_OPENAI_API_KEY")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01")

    if not endpoint or not api_key:
        raise RuntimeError(
            "Missing Azure OpenAI configuration. Set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY in .env."
        )

    return AzureOpenAI(
        api_key=api_key,
        api_version=api_version,
        azure_endpoint=endpoint,
    )


def get_audio_operation() -> str:
    operation = os.getenv("AZURE_OPENAI_AUDIO_OPERATION", "translations").strip().lower()
    if operation not in {"translations", "transcriptions"}:
        raise RuntimeError(
            "AZURE_OPENAI_AUDIO_OPERATION must be either 'translations' or 'transcriptions'."
        )
    return operation


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/transcribe")
def transcribe_audio():
    audio_file = request.files.get("audio")

    if audio_file is None or audio_file.filename == "":
        return jsonify({"error": "No audio file was uploaded."}), 400

    extension = Path(secure_filename(audio_file.filename)).suffix.lower()
    if extension not in UPLOAD_EXTENSIONS:
        return (
            jsonify(
                {
                    "error": "Unsupported file type. Upload wav, webm, mp3, m4a, mp4, mpeg, or mpga."
                }
            ),
            400,
        )

    temp_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=extension) as temp_file:
            audio_file.save(temp_file)
            temp_path = temp_file.name

        deployment_name = os.getenv("AZURE_OPENAI_WHISPER_DEPLOYMENT")
        if not deployment_name:
            raise RuntimeError(
                "Missing AZURE_OPENAI_WHISPER_DEPLOYMENT in .env."
            )

        client = get_azure_client()
        operation = get_audio_operation()
        with open(temp_path, "rb") as audio_stream:
            if operation == "translations":
                result = client.audio.translations.create(
                    file=audio_stream,
                    model=deployment_name,
                )
            else:
                result = client.audio.transcriptions.create(
                    file=audio_stream,
                    model=deployment_name,
                )

        return jsonify(
            {
                "text": (result.text or "").strip(),
                "language": getattr(result, "language", None),
                "operation": operation,
            }
        )
    except Exception as exc:  # pragma: no cover - runtime safety
        return jsonify({"error": str(exc)}), 500
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


if __name__ == "__main__":
    app.run(debug=True)
