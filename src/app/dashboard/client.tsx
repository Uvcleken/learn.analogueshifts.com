"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Profile, Enrollment, Course, LessonProgress, Lesson } from "@/types/database";
import GuestLayout from "@/components/application/layouts/guest";

interface EnrolledCourse {
  enrollment: Enrollment;
  course: Course;
  instructor: Profile | null;
  totalLessons: number;
  completedLessons: number;
}

export default function DashboardPageClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(profileData);

      // Redirect instructors/admins to their respective dashboards
      if (profileData?.role === "instructor") {
        router.push("/instructor/dashboard");
        return;
      }
      if (profileData?.role === "admin") {
        router.push("/admin/dashboard");
        return;
      }

      // Load enrollments with courses
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("*")
        .eq("learner_id", user.id)
        .order("enrolled_at", { ascending: false });

      if (enrollments && enrollments.length > 0) {
        const courseIds = enrollments.map((e) => e.course_id);

        const [{ data: courses }, { data: lessons }, { data: progress }] = await Promise.all([
          supabase.from("courses").select("*, profiles(*)").in("id", courseIds),
          supabase.from("lessons").select("id, course_id").in("course_id", courseIds),
          supabase
            .from("lesson_progress")
            .select("*")
            .eq("learner_id", user.id)
            .in("course_id", courseIds)
            .eq("completed", true),
        ]);

        const enriched: EnrolledCourse[] = enrollments.map((enrollment) => {
          const course = courses?.find((c) => c.id === enrollment.course_id) as Course & { profiles: Profile };
          const courseLessons = (lessons as Lesson[] | null)?.filter((l) => l.course_id === enrollment.course_id) ?? [];
          const completedLessons = (progress as LessonProgress[] | null)?.filter((p) => p.course_id === enrollment.course_id).length ?? 0;
          return {
            enrollment,
            course,
            instructor: course?.profiles ?? null,
            totalLessons: courseLessons.length,
            completedLessons,
          };
        });
        setEnrolledCourses(enriched);
      }

      setLoading(false);
    }
    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <GuestLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
        </div>
      </GuestLayout>
    );
  }

  const completedCourses = enrolledCourses.filter((ec) => ec.enrollment.completed_at);
  const inProgressCourses = enrolledCourses.filter((ec) => !ec.enrollment.completed_at);

  return (
    <GuestLayout>
      <section className="w-full min-h-[calc(100vh-80px)] py-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Welcome */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {profile?.full_name?.split(" ")[0] || "Learner"}! 👋
            </h1>
            <p className="text-gray-500 mt-2">Continue your learning journey</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-3xl font-bold text-gray-900">{enrolledCourses.length}</p>
              <p className="text-gray-500 text-sm mt-1">Enrolled Courses</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-3xl font-bold text-green-600">{completedCourses.length}</p>
              <p className="text-gray-500 text-sm mt-1">Completed</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-3xl font-bold text-background-darkYellow">{inProgressCourses.length}</p>
              <p className="text-gray-500 text-sm mt-1">In Progress</p>
            </div>
          </div>

          {/* In Progress */}
          {inProgressCourses.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Continue Learning</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inProgressCourses.map(({ enrollment, course, instructor, totalLessons, completedLessons }) => {
                  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
                  return (
                    <div key={enrollment.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                      {course?.thumbnail_url && (
                        <div className="h-44 bg-gray-100 overflow-hidden">
                          <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="font-bold text-gray-900 mb-1 truncate">{course?.title}</h3>
                        <p className="text-sm text-gray-500 mb-3">{instructor?.full_name || "Analogue Shifts"}</p>
                        {/* Progress bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{completedLessons}/{totalLessons} lessons</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-background-darkYellow rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <Link
                          href={`/learn/${course?.id}`}
                          className="block w-full py-2.5 bg-background-darkYellow text-white text-center text-sm font-semibold rounded-xl hover:bg-yellow-500 transition-colors"
                        >
                          Continue Learning
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed */}
          {completedCourses.length > 0 && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Completed Courses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedCourses.map(({ enrollment, course, instructor }) => (
                  <div key={enrollment.id} className="bg-white rounded-2xl border border-green-100 overflow-hidden hover:shadow-md transition-shadow">
                    {course?.thumbnail_url && (
                      <div className="h-44 bg-gray-100 overflow-hidden">
                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Completed</span>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1 truncate">{course?.title}</h3>
                      <p className="text-sm text-gray-500 mb-4">{instructor?.full_name || "Analogue Shifts"}</p>
                      <Link
                        href={`/certificates/${enrollment.id}`}
                        className="block w-full py-2.5 border-2 border-green-500 text-green-600 text-center text-sm font-semibold rounded-xl hover:bg-green-50 transition-colors"
                      >
                        View Certificate
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {enrolledCourses.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📚</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No courses yet</h2>
              <p className="text-gray-500 mb-6">Start your learning journey today</p>
              <Link
                href="/courses"
                className="px-8 py-3 bg-background-darkYellow text-white font-semibold rounded-xl hover:bg-yellow-500 transition-colors"
              >
                Browse Courses
              </Link>
            </div>
          )}
        </div>
      </section>
    </GuestLayout>
  );
}
