"use client";

import { useEffect, useState, use } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Video, PlayCircle, Loader2, AlertCircle, CheckCircle } from "lucide-react";

interface VideoItem {
  id: number;
  filename: string;
  original_name: string;
  has_transcript: boolean;
}

interface Course {
  id: number;
  title: string;
  description: string | null;
  videos: VideoItem[];
}

const API_BASE = "http://localhost:8000/api";

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;
  
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const res = await axios.get(`${API_BASE}/courses/${courseId}`);
      setCourse(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load course details.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      await axios.post(`${API_BASE}/courses/${courseId}/videos`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setSelectedFile(null);
      // Reload course to get the new video
      fetchCourse();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to upload video.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
        <AlertCircle className="w-12 h-12 mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-700">Course Not Found</h2>
        <Link href="/" className="mt-4 text-indigo-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-8 flex flex-col gap-8">
      <div className="flex items-center gap-4 border-b pb-6">
        <Link href="/" className="p-2 bg-white rounded-full border shadow-sm hover:bg-gray-50 transition-colors text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
          <p className="text-gray-500 mt-1">{course.description || "No description provided."}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 shadow-sm border border-red-100">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Videos List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2 text-gray-800">
            <PlayCircle className="w-6 h-6 text-indigo-600" />
            Course Videos
          </h2>
          
          {course.videos.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 flex flex-col items-center">
              <Video className="w-12 h-12 text-gray-300 mb-4" />
              <p>No videos uploaded yet. Upload a video to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {course.videos.map(video => (
                <Link
                  key={video.id}
                  href={`/videos/${video.id}`}
                  className="bg-white rounded-xl shadow-sm border p-4 hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col"
                >
                  <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center border group-hover:border-indigo-200 overflow-hidden relative">
                     <Video className="w-8 h-8 text-gray-300 group-hover:text-indigo-300 transition-colors" />
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 truncate" title={video.original_name}>
                    {video.original_name}
                  </h3>
                  <div className="mt-2 text-xs text-gray-500">
                    {video.has_transcript ? (
                       <span className="flex items-center gap-1 text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full w-max">
                         <CheckCircle className="w-3 h-3" /> Transcribed
                       </span>
                    ) : (
                       <span className="flex items-center gap-1 text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full w-max">
                         <AlertCircle className="w-3 h-3" /> Needs Transcript
                       </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Upload */}
        <div>
          <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-24">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 text-gray-800">
              <Upload className="w-5 h-5 text-indigo-600" />
              Upload Video
            </h2>
            <div className="flex flex-col gap-4">
              <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-gray-50 hover:border-indigo-300 transition-colors">
                <Video className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm font-medium text-gray-700">Select a video file</span>
                <span className="text-xs text-gray-500 mt-1">MP4, MOV, AVI</span>
                <input 
                  type="file" 
                  accept="video/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>
              
              {selectedFile && (
                <div className="bg-indigo-50 text-indigo-700 px-4 py-3 rounded-lg text-sm flex items-center justify-between border border-indigo-100">
                  <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  <button onClick={() => setSelectedFile(null)} className="text-indigo-400 hover:text-indigo-800 font-medium text-xs ml-2">Clear</button>
                </div>
              )}
              
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium shadow-sm hover:bg-indigo-700 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" /> Upload to Course
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
