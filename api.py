import os
import shutil
from pathlib import Path
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from dotenv import load_dotenv
from typing import List, Optional
from pydantic import BaseModel

import pipeline
import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

VIDEOS_DIR = Path("videos")
TEXTS_DIR = Path("texts")
VIDEOS_DIR.mkdir(exist_ok=True)
TEXTS_DIR.mkdir(exist_ok=True)

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

# Pydantic models for request/response
class CourseCreate(BaseModel):
    title: str
    description: Optional[str] = None

class CommentCreate(BaseModel):
    text: str

class VideoResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    has_transcript: bool
    transcript_text: Optional[str] = None
    analysis_text: Optional[str] = None

    class Config:
        from_attributes = True

class CourseResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    videos: List[VideoResponse] = []

    class Config:
        from_attributes = True

class CommentResponse(BaseModel):
    id: int
    text: str

    class Config:
        from_attributes = True

@app.post("/api/courses", response_model=CourseResponse)
def create_course(course: CourseCreate, db: Session = Depends(get_db)):
    db_course = models.Course(title=course.title, description=course.description)
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

@app.get("/api/courses", response_model=List[CourseResponse])
def get_courses(db: Session = Depends(get_db)):
    courses = db.query(models.Course).order_by(models.Course.created_at.desc()).all()
    return courses

@app.get("/api/courses/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course

@app.post("/api/courses/{course_id}/videos")
async def upload_video(course_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Save file
    safe_filename = file.filename.replace(" ", "_")
    file_path = VIDEOS_DIR / safe_filename
    
    # Ensure unique filename
    counter = 1
    stem = file_path.stem
    suffix = file_path.suffix
    while file_path.exists():
        safe_filename = f"{stem}_{counter}{suffix}"
        file_path = VIDEOS_DIR / safe_filename
        counter += 1

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    db_video = models.Video(
        course_id=course_id,
        filename=safe_filename,
        original_name=file.filename
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    
    return {"message": "Video uploaded successfully", "video_id": db_video.id}

@app.get("/api/videos/stream/{filename}")
def stream_video(filename: str):
    file_path = VIDEOS_DIR / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(file_path)

@app.get("/api/videos/{video_id}")
def get_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    
    comments = db.query(models.Comment).filter(models.Comment.video_id == video_id).order_by(models.Comment.created_at.desc()).all()
    
    return {
        "video": VideoResponse.model_validate(video),
        "comments": [CommentResponse.model_validate(c) for c in comments]
    }

@app.post("/api/videos/{video_id}/comments")
def add_comment(video_id: int, comment: CommentCreate, db: Session = Depends(get_db)):
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    db_comment = models.Comment(video_id=video_id, text=comment.text)
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return CommentResponse.model_validate(db_comment)

@app.post("/api/videos/{video_id}/transcribe")
def transcribe_video(video_id: int, db: Session = Depends(get_db)):
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")
        
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    file_path = VIDEOS_DIR / video.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video file not found on disk")
        
    try:
        TEXTS_DIR.mkdir(parents=True, exist_ok=True)
        transcript_path = pipeline.process_video(str(file_path), api_key, str(TEXTS_DIR))
        
        with open(transcript_path, "r", encoding="utf-8") as f:
            transcript_text = f.read()
            
        video.has_transcript = True
        video.transcript_text = transcript_text
        db.commit()
            
        return {"message": "Transcription successful", "transcript": transcript_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/videos/{video_id}/analyze")
def analyze_video(video_id: int, db: Session = Depends(get_db)):
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not set")
        
    video = db.query(models.Video).filter(models.Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
        
    if not video.transcript_text:
        raise HTTPException(status_code=400, detail="Video must be transcribed first")
        
    comments = db.query(models.Comment).filter(models.Comment.video_id == video_id).all()
    comment_texts = [c.text for c in comments]
        
    try:
        analysis = pipeline.analyze_transcript(video.transcript_text, api_key, comments=comment_texts)
        video.analysis_text = analysis
        db.commit()
        
        return {"analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# uvicorn api:app --reload --port 8000