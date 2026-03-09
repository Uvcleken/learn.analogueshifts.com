"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Course, Lesson } from "@/types/database";
import GuestLayout from "@/components/application/layouts/guest";
import Link from "next/link";

const CATEGORIES = ["Frontend", "Backend", "UI/UX", "DevOps", "Data", "Other"];
const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

export default function EditCoursePageClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
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
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    difficulty: "",
    durationHours: "",
    price: "0",
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const { data: courseData } = await supabase.from("courses").select("*").eq("id", id).single();
      if (!courseData || courseData.instructor_id !== user.id) {
        router.push("/instructor/dashboard");
        return;
      }
      if (courseData.status !== "draft" && courseData.status !== "rejected") {
        router.push("/instructor/dashboard");
        return;
      }
      setCourse(courseData);
      setForm({
        title: courseData.title,
        description: courseData.description || "",
        category: courseData.category || "",
        difficulty: courseData.difficulty || "",
        durationHours: courseData.duration_hours?.toString() || "",
        price: courseData.price?.toString() || "0",
      });

      const { data: lessonsData } = await supabase.from("lessons").select("*").eq("course_id", id).order("order_index");
      setLessons(lessonsData || []);
    }
    load();
  }, [id, router]);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function saveChanges() {
    if (!userId) return;
    setSaving(true);
    setError("");
    const { error: err } = await supabase.from("courses").update({
      title: form.title,
      description: form.description,
      category: form.category || null,
      difficulty: form.difficulty || null,
      duration_hours: form.durationHours ? parseFloat(form.durationHours) : null,
      price: parseFloat(form.price) || 0,
    }).eq("id", id);
    if (err) setError(err.message);
    setSaving(false);
  }

  async function addLesson(e: React.FormEvent) {
    e.preventDefault();
    const { data, error: err } = await supabase.from("lessons").insert({
      course_id: id,
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
    await saveChanges();
    await supabase.from("courses").update({ status: "pending_review" }).eq("id", id);
    router.push("/instructor/dashboard");
    setSubmitting(false);
  }

  if (!course) return null;

  return (
    <GuestLayout>
      <section className="w-full min-h-[calc(100vh-80px)] py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/instructor/dashboard" className="text-gray-500 hover:text-gray-900 text-sm">← Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-900">Edit Course</h1>
          </div>

          {course.status === "rejected" && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="font-semibold text-red-700 mb-1">Course Rejected</p>
              <p className="text-sm text-red-600">Please review the feedback and resubmit.</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Course Details</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Course Title *</label>
                <input name="title" value={form.title} onChange={handleFormChange} required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea name="description" value={form.description} onChange={handleFormChange} rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                  <select name="category" value={form.category} onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm">
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>
                  <select name="difficulty" value={form.difficulty} onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm">
                    <option value="">Select difficulty</option>
                    {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (hours)</label>
                  <input type="number" name="durationHours" value={form.durationHours} onChange={handleFormChange} min="0" step="0.5"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Price (USD)</label>
                  <input type="number" name="price" value={form.price} onChange={handleFormChange} min="0" step="0.01"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={saveChanges} disabled={saving}
                className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Lessons */}
          <div className="bg-white rounded-2xl border border-gray-100 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-gray-900">Lessons ({lessons.length})</h2>
              <button onClick={() => setAddingLesson(true)}
                className="px-4 py-2 bg-background-darkYellow text-white text-sm font-semibold rounded-xl hover:bg-yellow-500 transition-colors">
                + Add Lesson
              </button>
            </div>
            {lessons.map((lesson, index) => (
              <div key={lesson.id} className="flex items-center gap-3 p-4 border border-gray-100 rounded-xl mb-3">
                <span className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{lesson.title}</p>
                  <p className="text-xs text-gray-500">{lesson.duration_minutes ? `${lesson.duration_minutes} min` : ""}{lesson.is_free_preview && " · Free Preview"}</p>
                </div>
                <button onClick={() => removeLesson(lesson.id)} className="text-red-400 hover:text-red-600 text-xs font-medium">Remove</button>
              </div>
            ))}
            {addingLesson && (
              <form onSubmit={addLesson} className="border border-yellow-200 rounded-xl p-5 bg-yellow-50 mt-3 space-y-4">
                <h3 className="font-semibold text-gray-900">New Lesson</h3>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
                  <input value={lessonForm.title} onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))} required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Video URL</label>
                  <input value={lessonForm.embedUrl} onChange={(e) => setLessonForm((p) => ({ ...p, embedUrl: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Duration (min)</label>
                    <input type="number" value={lessonForm.durationMinutes} onChange={(e) => setLessonForm((p) => ({ ...p, durationMinutes: e.target.value }))} min="0"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={lessonForm.isFreePreview} onChange={(e) => setLessonForm((p) => ({ ...p, isFreePreview: e.target.checked }))} className="w-4 h-4 accent-yellow-400" />
                      <span className="text-sm font-medium text-gray-700">Free Preview</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="px-5 py-2 bg-background-darkYellow text-white text-sm font-semibold rounded-xl hover:bg-yellow-500">Add Lesson</button>
                  <button type="button" onClick={() => setAddingLesson(false)} className="px-5 py-2 text-gray-600 text-sm font-semibold">Cancel</button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <button onClick={submitForReview} disabled={submitting}
              className="px-8 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60">
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
