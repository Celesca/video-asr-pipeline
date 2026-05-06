"use client";

import { useEffect, useState, use } from "react";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, Video, FileText, Activity, MessageSquare, Send, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface Comment {
  id: number;
  text: string;
}

interface VideoData {
  id: number;
  filename: string;
  original_name: string;
  has_transcript: boolean;
  transcript_text: string | null;
  analysis_text: string | null;
}

const API_BASE = "http://localhost:8000/api";

export default function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const videoId = resolvedParams.id;

  const [video, setVideo] = useState<VideoData | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    fetchVideoData();
  }, [videoId]);

  const fetchVideoData = async () => {
    try {
      const res = await axios.get(`${API_BASE}/videos/${videoId}`);
      setVideo(res.data.video);
      setComments(res.data.comments);
    } catch (err) {
      console.error(err);
      setError("Failed to load video data.");
    } finally {
      setLoading(false);
    }
  };

  const handleTranscribe = async () => {
    setIsTranscribing(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/videos/${videoId}/transcribe`);
      setVideo(prev => prev ? { ...prev, has_transcript: true, transcript_text: res.data.transcript } : null);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to transcribe video");
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await axios.post(`${API_BASE}/videos/${videoId}/analyze`);
      setVideo(prev => prev ? { ...prev, analysis_text: res.data.analysis } : null);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to analyze transcript");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmittingComment(true);
    try {
      const res = await axios.post(`${API_BASE}/videos/${videoId}/comments`, {
        text: newComment
      });
      setComments([res.data, ...comments]); // Prepend new comment
      setNewComment("");
    } catch (err: any) {
      console.error(err);
      setError("Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <AlertCircle className="w-12 h-12 mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Video Not Found</h2>
        <Link href="/" className="mt-4 text-indigo-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-8 flex flex-col gap-8">
      <div className="flex items-center gap-4">
        <button onClick={() => window.history.back()} className="p-2 bg-white rounded-full border shadow-sm hover:bg-gray-50 transition-colors text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-3xl font-bold text-gray-900 truncate" title={video.original_name}>
          {video.original_name}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 shadow-sm border border-red-100">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Content: Player, Transcript, Analysis */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          
          {/* Player */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="aspect-video bg-black relative">
              <video
                src={`${API_BASE}/videos/stream/${video.filename}`}
                controls
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
               <div className="flex items-center gap-2">
                 {video.has_transcript ? (
                   <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                     <CheckCircle className="w-4 h-4" /> Transcript Available
                   </span>
                 ) : (
                   <span className="flex items-center gap-1 text-amber-600 text-sm font-medium">
                     <AlertCircle className="w-4 h-4" /> No Transcript
                   </span>
                 )}
               </div>
               {!video.has_transcript && (
                 <button
                   onClick={handleTranscribe}
                   disabled={isTranscribing}
                   className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                 >
                   {isTranscribing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                   {isTranscribing ? "Transcribing..." : "Transcribe Now"}
                 </button>
               )}
            </div>
          </div>

          {/* Transcript & Analysis */}
          {(video.has_transcript || isTranscribing) && (
            <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
                    <FileText className="w-5 h-5 text-gray-500" />
                    Transcript
                  </h2>
                  {video.has_transcript && !video.analysis_text && (
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
                    >
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                      {isAnalyzing ? "Analyzing..." : "Analyze with AI"}
                    </button>
                  )}
                </div>
                <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed shadow-inner">
                  {video.transcript_text || "Transcription in progress. Please wait..."}
                </div>
              </div>

              {video.analysis_text && (
                <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl relative shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-blue-900 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      AI Content Analysis
                    </h3>
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                    >
                      {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Re-Analyze"}
                    </button>
                  </div>
                  <div className="text-blue-800 whitespace-pre-wrap leading-relaxed text-sm">
                    {video.analysis_text}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Sidebar: Comments */}
        <div className="bg-white rounded-xl shadow-sm border p-6 flex flex-col h-[calc(100vh-8rem)] sticky top-24">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4 text-gray-800">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            Comments
          </h2>
          
          <div className="flex-1 overflow-y-auto mb-4 flex flex-col gap-3 pr-2">
            {comments.length === 0 ? (
              <div className="text-center text-gray-500 py-8 text-sm">
                No comments yet. Add context for the AI analysis!
              </div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="bg-gray-50 border p-3 rounded-lg text-sm text-gray-700 shadow-sm">
                  {comment.text}
                </div>
              ))
            )}
          </div>

          <form onSubmit={handlePostComment} className="border-t pt-4">
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Comments provide context to the AI during analysis.
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmittingComment}
                className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center"
              >
                {isSubmittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </form>
        </div>

      </div>
    </main>
  );
}
