"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { BookOpen, Plus, Loader2, AlertCircle } from "lucide-react";

interface Course {
  id: number;
  title: string;
  description: string | null;
}

const API_BASE = "http://localhost:8000/api";

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/courses`);
      setCourses(res.data);
    } catch (err) {
      console.error(err);
      setError("Could not load courses. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setCreateLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/courses`, {
        title: newTitle,
        description: newDesc || null,
      });
      setCourses([res.data, ...courses]);
      setNewTitle("");
      setNewDesc("");
      setIsCreating(false);
    } catch (err) {
      console.error(err);
      setError("Failed to create course");
    } finally {
      setCreateLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-8 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Courses</h1>
          <p className="text-gray-500 mt-1">Manage your video courses and analyze transcripts</p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:bg-indigo-700 hover:shadow flex items-center gap-2 transition-all"
        >
          <Plus className="w-5 h-5" /> Create Course
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start gap-3 shadow-sm border border-red-100">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          {error}
        </div>
      )}

      {isCreating && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Create New Course</h2>
          <form onSubmit={handleCreateCourse} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                required
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                placeholder="e.g. Advanced Java Programming"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
                placeholder="A brief description of this course..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading || !newTitle}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
              >
                {createLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Course
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.length === 0 && !isCreating ? (
          <div className="col-span-full bg-white p-12 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 flex flex-col items-center">
            <BookOpen className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No courses yet</h3>
            <p>Create your first course to start uploading videos.</p>
          </div>
        ) : (
          courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-indigo-300 transition-all group flex flex-col h-full"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                    {course.title}
                  </h3>
                </div>
              </div>
              <p className="text-gray-500 text-sm line-clamp-3 mt-auto pt-4 border-t border-gray-100">
                {course.description || "No description provided."}
              </p>
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
