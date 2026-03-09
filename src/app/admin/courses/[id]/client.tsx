"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Course, Lesson, Profile } from "@/types/database";
import GuestLayout from "@/components/application/layouts/guest";
import Link from "next/link";
import { getEmbedUrl } from "@/lib/embed-url";

export default function AdminCourseReviewPageClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [course, setCourse] = useState<Course & { profiles: Profile | null } | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/dashboard"); return; }

      const [{ data: courseData }, { data: lessonsData }] = await Promise.all([
        supabase.from("courses").select("*, profiles(*)").eq("id", id).single(),
        supabase.from("lessons").select("*").eq("course_id", id).order("order_index"),
      ]);
      setCourse(courseData as Course & { profiles: Profile | null });
      setLessons(lessonsData || []);
      setActiveLesson(lessonsData?.[0] || null);
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function approve() {
    setProcessing(true);
    await supabase.from("courses").update({ status: "published" }).eq("id", id);
    router.push("/admin/courses");
    setProcessing(false);
  }

  async function reject() {
    if (!rejectReason.trim()) return;
    setProcessing(true);
    await supabase.from("courses").update({ status: "rejected" }).eq("id", id);
    // Update instructor application with admin note if applicable
    setShowRejectModal(false);
    router.push("/admin/courses");
    setProcessing(false);
  }

  if (loading || !course) {
    return (
      <GuestLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
        </div>
      </GuestLayout>
    );
  }

  const embedUrl = activeLesson?.embed_url ? getEmbedUrl(activeLesson.embed_url) : null;

  return (
    <GuestLayout>
      <section className="w-full min-h-[calc(100vh-80px)] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Link href="/admin/courses" className="text-gray-500 hover:text-gray-900 text-sm">← All Courses</Link>
            <h1 className="text-xl font-bold text-gray-900">Course Review</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Course details */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                {course.thumbnail_url && (
                  <div className="h-44 rounded-xl overflow-hidden mb-4 bg-gray-100">
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <h2 className="font-bold text-gray-900 text-lg mb-2">{course.title}</h2>
                <p className="text-sm text-gray-500 mb-3">by {course.profiles?.full_name || "Unknown"}</p>
                <div className="space-y-2 text-sm">
                  {course.category && <div className="flex justify-between"><span className="text-gray-500">Category</span><span className="font-medium">{course.category}</span></div>}
                  {course.difficulty && <div className="flex justify-between"><span className="text-gray-500">Difficulty</span><span className="font-medium">{course.difficulty}</span></div>}
                  {course.duration_hours && <div className="flex justify-between"><span className="text-gray-500">Duration</span><span className="font-medium">{course.duration_hours}h</span></div>}
                  <div className="flex justify-between"><span className="text-gray-500">Price</span><span className="font-medium">{course.price === 0 ? "Free" : `$${course.price}`}</span></div>
                </div>
                {course.description && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-600 leading-relaxed">{course.description}</p>
                  </div>
                )}
              </div>

              {/* Approve/Reject */}
              {course.status === "pending_review" && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
                  <h3 className="font-bold text-gray-900">Review Decision</h3>
                  <button
                    onClick={approve}
                    disabled={processing}
                    className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60"
                  >
                    ✓ Approve & Publish
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processing}
                    className="w-full py-3 border-2 border-red-300 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    ✗ Reject
                  </button>
                </div>
              )}
              {course.status !== "pending_review" && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <p className="text-sm text-gray-500">Status: <span className="font-semibold text-gray-900">{course.status}</span></p>
                </div>
              )}
            </div>

            {/* Video preview */}
            <div className="lg:col-span-2 space-y-6">
              {/* Video player */}
              <div className="bg-gray-900 rounded-2xl overflow-hidden">
                {embedUrl ? (
                  <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                    <iframe src={embedUrl} className="absolute inset-0 w-full h-full" allowFullScreen />
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    <p>Select a lesson to preview</p>
                  </div>
                )}
              </div>

              {/* Lessons list */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Lessons ({lessons.length})</h3>
                {lessons.length === 0 ? (
                  <p className="text-gray-400 text-sm">No lessons added</p>
                ) : (
                  <div className="space-y-2">
                    {lessons.map((lesson, index) => (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLesson(lesson)}
                        className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors ${
                          activeLesson?.id === lesson.id ? "bg-yellow-50 border border-yellow-200" : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{lesson.title}</p>
                          <p className="text-xs text-gray-500">
                            {lesson.duration_minutes ? `${lesson.duration_minutes} min` : ""}
                            {lesson.is_free_preview && " · Free Preview"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reject modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-bold text-gray-900 text-lg mb-3">Reject Course</h3>
            <p className="text-sm text-gray-500 mb-4">Please provide a reason for rejection so the instructor can improve their course.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none mb-4"
              placeholder="e.g. Please add more content to lessons, improve video quality..."
            />
            <div className="flex gap-3">
              <button onClick={reject} disabled={!rejectReason.trim() || processing}
                className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60">
                {processing ? "Rejecting..." : "Reject Course"}
              </button>
              <button onClick={() => setShowRejectModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </GuestLayout>
  );
}
