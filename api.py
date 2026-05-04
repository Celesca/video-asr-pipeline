import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import pipeline

app = FastAPI()

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VIDEOS_DIR = Path("videos")
TEXTS_DIR = Path("texts")

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

class VideoRequest(BaseModel):
    filename: str

class TranscriptAnalyzeRequest(BaseModel):
    transcript_text: str

@app.get("/api/videos")
def list_videos():
    if not VIDEOS_DIR.exists():
        return {"videos": []}
    
    videos = []
    for file in VIDEOS_DIR.iterdir():
        if file.is_file() and file.suffix.lower() in [".mp4", ".mov", ".avi", ".mkv"]:
            # Check if there is already a transcript
            transcript_path = TEXTS_DIR / f"{file.stem}.txt"
            has_transcript = transcript_path.exists()
            videos.append({
                "filename": file.name,
                "has_transcript": has_transcript
            })
            
    return {"videos": videos}

@app.get("/api/videos/{filename}")
def serve_video(filename: str):
    file_path = VIDEOS_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(file_path)

@app.get("/api/transcripts/{filename}")
def get_transcript(filename: str):
    # Expecting the video filename and looking for its transcript
    stem = Path(filename).stem
    transcript_path = TEXTS_DIR / f"{stem}.txt"
    if not transcript_path.exists():
        raise HTTPException(status_code=404, detail="Transcript not found")
    
    with open(transcript_path, "r", encoding="utf-8") as f:
        text = f.read()
    return {"transcript": text}

@app.post("/api/transcribe")
def transcribe_video(request: VideoRequest):
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")
        
    file_path = VIDEOS_DIR / request.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
        
    try:
        TEXTS_DIR.mkdir(parents=True, exist_ok=True)
        transcript_path = pipeline.process_video(str(file_path), api_key, str(TEXTS_DIR))
        
        with open(transcript_path, "r", encoding="utf-8") as f:
            transcript_text = f.read()
            
        return {"message": "Transcription successful", "transcript_path": str(transcript_path), "transcript": transcript_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analyze")
def analyze_transcript(request: TranscriptAnalyzeRequest):
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")
        
    try:
        analysis = pipeline.analyze_transcript(request.transcript_text, api_key)
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
