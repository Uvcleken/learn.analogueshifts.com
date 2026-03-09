"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Lesson } from "@/types/database";
import GuestLayout from "@/components/application/layouts/guest";
import Link from "next/link";

const CATEGORIES = ["Frontend", "Backend", "UI/UX", "DevOps", "Data", "Other"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

export default function AdminNewCoursePageClient() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [addingLesson, setAddingLesson] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: "", description: "", embedUrl: "", durationMinutes: "", isFreePreview: false });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", category: "", difficulty: "", durationHours: "", price: "0", isFeatured: false });

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/dashboard"); return; }
      setUserId(user.id);
    }
    checkAuth();
  }, [router]);

  async function saveCourse(publishNow = false) {
    if (!userId || !form.title) { setError("Please fill in the course title."); return null; }
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
      is_featured: form.isFeatured,
      status: publishNow ? "published" as const : "draft" as const,
      ...(thumbnailUrl && { thumbnail_url: thumbnailUrl }),
    };

    let savedId = courseId;
    if (courseId) {
      await supabase.from("courses").update(coursePayload).eq("id", courseId);
    } else {
      const { data, error: insertError } = await supabase.from("courses").insert(coursePayload).select().single();
      if (insertError) { setError(insertError.message); setSaving(false); return null; }
      savedId = data.id;
      setCourseId(data.id);
    }
    setSaving(false);
    return savedId;
  }

  async function publishCourse() {
    setPublishing(true);
    const savedId = await saveCourse(true);
    if (savedId) router.push("/admin/courses");
    setPublishing(false);
  }

  async function addLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) { const id = await saveCourse(); if (!id) return; }
    const { data, error: err } = await supabase.from("lessons").insert({
      course_id: courseId!,
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

  return (
    <GuestLayout>
      <section className="w-full min-h-[calc(100vh-80px)] py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/admin/courses" className="text-gray-500 hover:text-gray-900 text-sm">← All Courses</Link>
            <h1 className="text-2xl font-bold text-gray-900">New Course (Admin)</h1>
          </div>

          {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Course Details</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course Title *</label>
                <input name="title" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea name="description" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm">
                    <option value="">Select</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
                  <select value={form.difficulty} onChange={(e) => setForm(p => ({ ...p, difficulty: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm">
                    <option value="">Select</option>
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (hours)</label>
                  <input type="number" value={form.durationHours} onChange={(e) => setForm(p => ({ ...p, durationHours: e.target.value }))} min="0" step="0.5"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price (USD)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))} min="0" step="0.01"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Thumbnail</label>
                <div className="flex items-start gap-4">
                  {thumbnailPreview && <div className="w-32 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100"><img src={thumbnailPreview} alt="" className="w-full h-full object-cover" /></div>}
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setThumbnailFile(f); setThumbnailPreview(URL.createObjectURL(f)); } }}
                    className="text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100" />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm(p => ({ ...p, isFeatured: e.target.checked }))} className="w-4 h-4 accent-yellow-400" />
                  <span className="text-sm font-medium text-gray-700">Feature this course on homepage</span>
                </label>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => saveCourse(false)} disabled={saving}
                className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 disabled:opacity-60">
                {saving ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>

          {/* Lessons */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Lessons ({lessons.length})</h2>
              <button onClick={() => setAddingLesson(true)} className="px-4 py-2 bg-background-darkYellow text-white text-sm font-semibold rounded-xl hover:bg-yellow-500">+ Add Lesson</button>
            </div>
            {lessons.map((lesson, index) => (
              <div key={lesson.id} className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl mb-3">
                <span className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">{index + 1}</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{lesson.title}</p>
                  <p className="text-xs text-gray-500">{lesson.duration_minutes ? `${lesson.duration_minutes} min` : ""}</p>
                </div>
              </div>
            ))}
            {addingLesson && (
              <form onSubmit={addLesson} className="border border-yellow-200 rounded-xl p-5 bg-yellow-50 space-y-3">
                <input value={lessonForm.title} onChange={(e) => setLessonForm(p => ({ ...p, title: e.target.value }))} required placeholder="Lesson title"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input value={lessonForm.embedUrl} onChange={(e) => setLessonForm(p => ({ ...p, embedUrl: e.target.value }))} placeholder="Video URL"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <div className="flex gap-3">
                  <button type="submit" className="px-5 py-2 bg-background-darkYellow text-white text-sm font-semibold rounded-xl">Add</button>
                  <button type="button" onClick={() => setAddingLesson(false)} className="px-5 py-2 text-gray-600 text-sm">Cancel</button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <button onClick={publishCourse} disabled={publishing || !form.title}
              className="px-8 py-3 bg-background-darkYellow text-white font-bold rounded-2xl hover:bg-yellow-500 transition-colors disabled:opacity-60">
              {publishing ? "Publishing..." : "Publish Course"}
            </button>
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
