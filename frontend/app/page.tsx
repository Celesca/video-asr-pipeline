"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Video, FileText, Activity, AlertCircle, CheckCircle } from "lucide-react";

interface VideoItem {
  filename: string;
  has_transcript: boolean;
}

const API_BASE = "http://localhost:8000/api";

export default function Home() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [analysis, setAnalysis] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await axios.get(`${API_BASE}/videos`);
      setVideos(res.data.videos);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
      setError("Could not load videos. Is the backend running?");
    }
  };

  const handleSelectVideo = async (video: VideoItem) => {
    setSelectedVideo(video);
    setTranscript("");
    setAnalysis("");
    setError(null);
    
    if (video.has_transcript) {
      try {
        const res = await axios.get(`${API_BASE}/transcripts/${video.filename}`);
        setTranscript(res.data.transcript);
      } catch (err) {
        console.error("Could not fetch transcript", err);
      }
    }
  };

  const handleTranscribe = async () => {
    if (!selectedVideo) return;
    setIsTranscribing(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/transcribe`, {
        filename: selectedVideo.filename,
      });
      setTranscript(res.data.transcript);
      // Update the local state to indicate transcript exists
      setVideos(videos.map(v => v.filename === selectedVideo.filename ? { ...v, has_transcript: true } : v));
      setSelectedVideo({ ...selectedVideo, has_transcript: true });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to transcribe video");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAnalyze = async () => {
    if (!transcript) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/analyze`, {
        transcript_text: transcript,
      });
      setAnalysis(res.data.analysis);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to analyze transcript");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      <header className="bg-white border-b px-8 py-4 shadow-sm">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-indigo-600">
          <Video className="w-8 h-8" />
          Video Analyzer Pro
        </h1>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sidebar: Video List */}
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-2">
            <Video className="w-5 h-5 text-gray-500" />
            Your Videos
          </h2>
          {error && !selectedVideo && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-start gap-2 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          {videos.length === 0 ? (
            <p className="text-gray-500 text-sm">No videos found. Add .mp4 files to the "videos" folder.</p>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto pr-2 max-h-[60vh]">
              {videos.map((video) => (
                <button
                  key={video.filename}
                  onClick={() => handleSelectVideo(video)}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 group ${
                    selectedVideo?.filename === video.filename
                      ? "border-indigo-500 bg-indigo-50 shadow-md ring-1 ring-indigo-500"
                      : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium text-sm truncate group-hover:text-indigo-600 transition-colors">
                    {video.filename}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                    {video.has_transcript ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Transcribed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                        <AlertCircle className="w-3 h-3" /> Needs Transcript
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {selectedVideo ? (
            <>
              {/* Video Player Section */}
              <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col gap-4">
                <h2 className="text-xl font-semibold break-all text-gray-800">
                  {selectedVideo.filename}
                </h2>
                <div className="rounded-lg overflow-hidden bg-black aspect-video relative shadow-inner">
                  <video
                    src={`${API_BASE}/videos/${selectedVideo.filename}`}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div className="flex gap-4 mt-2">
                  <button
                    onClick={handleTranscribe}
                    disabled={isTranscribing}
                    className="flex-1 bg-indigo-600 text-white font-medium py-3 rounded-lg shadow-sm hover:bg-indigo-700 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    {isTranscribing ? "Transcribing Video (This may take a minute)..." : "Transcribe Video"}
                  </button>
                </div>
              </div>

              {/* Analysis Section */}
              {(transcript || isTranscribing) && (
                <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between items-center border-b pb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                      <FileText className="w-5 h-5 text-gray-500" />
                      Transcript
                    </h2>
                    {transcript && (
                      <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="bg-emerald-600 text-white font-medium py-2 px-6 rounded-lg shadow-sm hover:bg-emerald-700 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                      >
                        <Activity className="w-4 h-4" />
                        {isAnalyzing ? "Analyzing Content..." : "Analyze Relevance"}
                      </button>
                    )}
                  </div>
                  
                  {error && transcript && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-start gap-2 text-sm mt-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  {/* Transcript Content */}
                  <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {transcript || "Transcription in progress. Please wait..."}
                  </div>

                  {/* LLM Analysis Result */}
                  {analysis && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 p-6 rounded-xl relative shadow-sm">
                      <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        AI Content Analysis
                      </h3>
                      <div className="text-blue-800 whitespace-pre-wrap leading-relaxed">
                        {analysis}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border p-12 flex flex-col items-center justify-center h-full text-center text-gray-500">
              <div className="bg-gray-50 p-6 rounded-full mb-4 shadow-inner">
                <Video className="w-12 h-12 text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Video Selected</h3>
              <p className="max-w-md">Select a video from the sidebar to view it, transcribe its audio, and analyze its content for relevance.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
