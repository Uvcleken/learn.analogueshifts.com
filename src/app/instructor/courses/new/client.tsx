"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lesson } from "@/types/database";
import GuestLayout from "@/components/application/layouts/guest";
import Link from "next/link";

const CATEGORIES = ["Frontend", "Backend", "UI/UX", "DevOps", "Data", "Other"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

export default function NewCoursePageClient() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [addingLesson, setAddingLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    embedUrl: "",
    durationMinutes: "",
    isFreePreview: false,
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    difficulty: "",
    durationHours: "",
    price: "0",
  });

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile?.role !== "instructor" && profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      setUserId(user.id);
    }
    checkAuth();
  }, [router]);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleThumbnailChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
    }
  }

  async function saveCourse() {
    if (!userId || !form.title) {
      setError("Please fill in the course title.");
      return null;
    }
    setSaving(true);
    setError("");

    let thumbnailUrl = null;
    if (thumbnailFile) {
      const ext = thumbnailFile.name.split(".").pop();
      const path = `thumbnails/${userId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("course-thumbnails").upload(path, thumbnailFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("course-thumbnails").getPublicUrl(path);
        thumbnailUrl = urlData.publicUrl;
      }
    }

    const coursePayload = {
      title: form.title,
      description: form.description,
      category: form.category || null,
      difficulty: form.difficulty || null,
      duration_hours: form.durationHours ? parseFloat(form.durationHours) : null,
      price: parseFloat(form.price) || 0,
      instructor_id: userId,
      status: "draft" as const,
      ...(thumbnailUrl && { thumbnail_url: thumbnailUrl }),
    };

    let savedId = courseId;
    if (courseId) {
      const { error: updateError } = await supabase.from("courses").update(coursePayload).eq("id", courseId);
      if (updateError) { setError(updateError.message); setSaving(false); return null; }
    } else {
      const { data, error: insertError } = await supabase.from("courses").insert(coursePayload).select().single();
      if (insertError) { setError(insertError.message); setSaving(false); return null; }
      savedId = data.id;
      setCourseId(data.id);
    }
    setSaving(false);
    return savedId;
  }

  async function addLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) {
      const savedId = await saveCourse();
      if (!savedId) return;
    }
    const currentCourseId = courseId!;
    const { data, error: err } = await supabase.from("lessons").insert({
      course_id: currentCourseId,
      title: lessonForm.title,
      description: lessonForm.description,
      embed_url: lessonForm.embedUrl,
      duration_minutes: lessonForm.durationMinutes ? parseInt(lessonForm.durationMinutes) : null,
      is_free_preview: lessonForm.isFreePreview,
      order_index: lessons.length + 1,
    }).select().single();
    if (err) { setError(err.message); return; }
    setLessons((prev) => [...prev, data]);
    setLessonForm({ title: "", description: "", embedUrl: "", durationMinutes: "", isFreePreview: false });
    setAddingLesson(false);
  }

  async function removeLesson(lessonId: string) {
    await supabase.from("lessons").delete().eq("id", lessonId);
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
  }

  async function submitForReview() {
    setSubmitting(true);
    const savedId = await saveCourse();
    if (!savedId) { setSubmitting(false); return; }
    await supabase.from("courses").update({ status: "pending_review" }).eq("id", savedId);
    router.push("/instructor/dashboard");
    setSubmitting(false);
  }

  return (
    <GuestLayout>
      <section className="w-full min-h-[calc(100vh-80px)] py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/instructor/dashboard" className="text-gray-500 hover:text-gray-900 text-sm">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Create New Course</h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}

          {/* Course form */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Course Details</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course Title *</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                  placeholder="e.g. Complete React Developer Course"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm resize-none"
                  placeholder="Describe your course..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
                  <select
                    name="difficulty"
                    value={form.difficulty}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                  >
                    <option value="">Select difficulty</option>
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (hours)</label>
                  <input
                    type="number"
                    name="durationHours"
                    value={form.durationHours}
                    onChange={handleFormChange}
                    min="0"
                    step="0.5"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                    placeholder="e.g. 10.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price (USD, 0 = free)</label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Thumbnail Image</label>
                <div className="flex items-start gap-4">
                  {thumbnailPreview && (
                    <div className="w-32 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                      <img src={thumbnailPreview} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={saveCourse}
                disabled={saving}
                className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>

          {/* Lessons section */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Lessons ({lessons.length})</h2>
              <button
                onClick={() => setAddingLesson(true)}
                className="px-4 py-2 bg-background-darkYellow text-white text-sm font-semibold rounded-xl hover:bg-yellow-500 transition-colors"
              >
                + Add Lesson
              </button>
            </div>

            {lessons.length === 0 && !addingLesson && (
              <p className="text-gray-400 text-sm text-center py-8">No lessons yet. Add your first lesson.</p>
            )}

            {lessons.map((lesson, index) => (
              <div key={lesson.id} className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl mb-3">
                <span className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{lesson.title}</p>
                  <p className="text-xs text-gray-500">
                    {lesson.duration_minutes ? `${lesson.duration_minutes} min` : "Duration not set"}
                    {lesson.is_free_preview && " · Free Preview"}
                  </p>
                </div>
                <button
                  onClick={() => removeLesson(lesson.id)}
                  className="text-red-400 hover:text-red-600 text-xs font-medium"
                >
                  Remove
                </button>
              </div>
            ))}

            {addingLesson && (
              <form onSubmit={addLesson} className="border border-yellow-200 rounded-xl p-5 bg-yellow-50 mt-3 space-y-4">
                <h3 className="font-semibold text-gray-900">New Lesson</h3>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
                  <input
                    value={lessonForm.title}
                    onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="Lesson title"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                  <textarea
                    value={lessonForm.description}
                    onChange={(e) => setLessonForm((p) => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                    placeholder="Brief description..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Video URL (YouTube, Vimeo, Loom, Drive)</label>
                  <input
                    value={lessonForm.embedUrl}
                    onChange={(e) => setLessonForm((p) => ({ ...p, embedUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={lessonForm.durationMinutes}
                      onChange={(e) => setLessonForm((p) => ({ ...p, durationMinutes: e.target.value }))}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="e.g. 15"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={lessonForm.isFreePreview}
                        onChange={(e) => setLessonForm((p) => ({ ...p, isFreePreview: e.target.checked }))}
                        className="w-4 h-4 accent-yellow-400"
                      />
                      <span className="text-sm font-medium text-gray-700">Free Preview</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="px-5 py-2 bg-background-darkYellow text-white text-sm font-semibold rounded-xl hover:bg-yellow-500 transition-colors">
                    Add Lesson
                  </button>
                  <button type="button" onClick={() => setAddingLesson(false)} className="px-5 py-2 text-gray-600 text-sm font-semibold">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Submit for review */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-bold text-gray-900 mb-2">Submit for Review</h2>
            <p className="text-sm text-gray-500 mb-4">
              Once submitted, you won&apos;t be able to edit this course until it&apos;s reviewed by our team.
            </p>
            <button
              onClick={submitForReview}
              disabled={submitting || !form.title}
              className="px-8 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
