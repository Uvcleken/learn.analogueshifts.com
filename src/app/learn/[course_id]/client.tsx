"use client";
import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getEmbedUrl } from "@/lib/embed-url";
import { Course, Lesson, LessonProgress, Profile } from "@/types/database";
import Link from "next/link";

interface LessonWithProgress extends Lesson {
  completed: boolean;
}

export default function LearnPageClient({ params }: { params: Promise<{ course_id: string }> }) {
  const { course_id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonParam = searchParams.get("lesson");

  const [userId, setUserId] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<LessonWithProgress[]>([]);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    async function loadCourse() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      // Check enrollment
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("learner_id", user.id)
        .eq("course_id", course_id)
        .single();

      if (!enrollment) {
        router.push(`/courses/${course_id}`);
        return;
      }

      const [{ data: courseData }, { data: lessonsData }, { data: progressData }] = await Promise.all([
        supabase.from("courses").select("*").eq("id", course_id).single(),
        supabase.from("lessons").select("*").eq("course_id", course_id).order("order_index"),
        supabase.from("lesson_progress").select("*").eq("learner_id", user.id).eq("course_id", course_id),
      ]);

      setCourse(courseData);

      const lessonsWithProgress = (lessonsData || []).map((lesson) => ({
        ...lesson,
        completed: (progressData || []).some((p: LessonProgress) => p.lesson_id === lesson.id && p.completed),
      }));
      setLessons(lessonsWithProgress);

      // Set current lesson from URL param or first incomplete
      const targetLesson = lessonParam
        ? lessonsData?.find((l) => l.id === lessonParam)
        : lessonsWithProgress.find((l) => !l.completed) || lessonsData?.[0];
      setCurrentLesson(targetLesson || lessonsData?.[0] || null);

      setLoading(false);
    }
    loadCourse();
  }, [course_id, router, lessonParam]);

  async function markComplete() {
    if (!currentLesson || !userId) return;
    setCompleting(true);

    // Upsert lesson progress
    await supabase.from("lesson_progress").upsert({
      learner_id: userId,
      lesson_id: currentLesson.id,
      course_id,
      completed: true,
      completed_at: new Date().toISOString(),
    });

    // Update local state
    const updatedLessons = lessons.map((l) =>
      l.id === currentLesson.id ? { ...l, completed: true } : l
    );
    setLessons(updatedLessons);

    // Check if all lessons are complete
    const allComplete = updatedLessons.every((l) => l.completed);
    if (allComplete) {
      await supabase
        .from("enrollments")
        .update({ completed_at: new Date().toISOString() })
        .eq("learner_id", userId)
        .eq("course_id", course_id);
      setShowCongrats(true);
    } else {
      // Auto-advance to next lesson
      const currentIndex = updatedLessons.findIndex((l) => l.id === currentLesson.id);
      const nextLesson = updatedLessons[currentIndex + 1];
      if (nextLesson) setCurrentLesson(nextLesson);
    }
    setCompleting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
      </div>
    );
  }

  const embedUrl = currentLesson?.embed_url ? getEmbedUrl(currentLesson.embed_url) : null;
  const completedCount = lessons.filter((l) => l.completed).length;
  const progress = lessons.length > 0 ? Math.round((completedCount / lessons.length) * 100) : 0;
  const isCurrentComplete = currentLesson ? lessons.find((l) => l.id === currentLesson.id)?.completed : false;

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-80" : "w-0"} transition-all duration-300 flex-shrink-0 overflow-hidden`}>
        <div className="w-80 h-full flex flex-col bg-gray-900 border-r border-gray-800">
          <div className="p-4 border-b border-gray-800">
            <Link href="/dashboard" className="text-xs text-gray-400 hover:text-white flex items-center gap-1 mb-3">
              ← Dashboard
            </Link>
            <h2 className="font-bold text-sm leading-snug">{course?.title}</h2>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{completedCount}/{lessons.length} lessons</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-background-darkYellow rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {lessons.map((lesson, index) => (
              <button
                key={lesson.id}
                onClick={() => setCurrentLesson(lesson)}
                className={`w-full text-left px-3 py-3 rounded-xl mb-1 flex items-start gap-3 transition-colors ${
                  currentLesson?.id === lesson.id
                    ? "bg-background-darkYellow/20 border border-background-darkYellow/30"
                    : "hover:bg-gray-800"
                }`}
              >
                <div className={`mt-0.5 w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border ${
                  lesson.completed ? "bg-green-500 border-green-500" : "border-gray-600"
                }`}>
                  {lesson.completed ? (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-xs text-gray-400">{index + 1}</span>
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium leading-snug ${
                    currentLesson?.id === lesson.id ? "text-white" : "text-gray-300"
                  }`}>
                    {lesson.title}
                  </p>
                  {lesson.duration_minutes && (
                    <p className="text-xs text-gray-500 mt-0.5">{lesson.duration_minutes} min</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-12 flex-shrink-0 flex items-center px-4 bg-gray-900 border-b border-gray-800 gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-200 flex-1 truncate">{currentLesson?.title}</span>
        </div>

        {/* Video player */}
        <div className="flex-1 overflow-y-auto">
          {embedUrl ? (
            <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : (
            <div className="w-full bg-gray-800 flex items-center justify-center" style={{ minHeight: "400px" }}>
              <div className="text-center">
                <div className="text-5xl mb-3">🎬</div>
                <p className="text-gray-400">No video available for this lesson</p>
              </div>
            </div>
          )}

          {/* Lesson info */}
          <div className="p-6 max-w-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-white mb-2">{currentLesson?.title}</h1>
                {currentLesson?.description && (
                  <p className="text-gray-400 leading-relaxed">{currentLesson.description}</p>
                )}
              </div>
              <button
                onClick={markComplete}
                disabled={completing || !!isCurrentComplete}
                className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                  isCurrentComplete
                    ? "bg-green-600/20 text-green-400 border border-green-600/30 cursor-default"
                    : "bg-background-darkYellow text-white hover:bg-yellow-500 disabled:opacity-60"
                }`}
              >
                {isCurrentComplete ? "✓ Completed" : completing ? "Saving..." : "Mark as Complete"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Congratulations modal */}
      {showCongrats && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-white text-gray-900 rounded-3xl p-8 max-w-md w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-3">Congratulations!</h2>
            <p className="text-gray-500 mb-6">
              You&apos;ve completed <strong>{course?.title}</strong>! Your certificate is ready.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href={`/certificates/${course_id}`}
                className="w-full py-3 bg-background-darkYellow text-white font-semibold rounded-xl hover:bg-yellow-500 transition-colors"
              >
                View My Certificate
              </Link>
              <button
                onClick={() => setShowCongrats(false)}
                className="w-full py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
