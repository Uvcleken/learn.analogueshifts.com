"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Profile, Course } from "@/types/database";
import GuestLayout from "@/components/application/layouts/guest";

interface CourseWithStats extends Course {
  enrollmentCount: number;
}

export default function InstructorDashboardPageClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalEnrollments, setTotalEnrollments] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profileData?.role !== "instructor" && profileData?.role !== "admin") {
        router.push("/dashboard");
        return;
      }
      setProfile(profileData);

      const [{ data: coursesData }, { data: enrollments }, { data: payments }] = await Promise.all([
        supabase.from("courses").select("*").eq("instructor_id", user.id).order("created_at", { ascending: false }),
        supabase.from("enrollments").select("course_id").in(
          "course_id",
          (await supabase.from("courses").select("id").eq("instructor_id", user.id)).data?.map(c => c.id) ?? []
        ),
        supabase.from("payments").select("instructor_payout").eq("instructor_id", user.id).eq("status", "success"),
      ]);

      const courseIds = coursesData?.map(c => c.id) ?? [];
      const enrollmentsByCourse: Record<string, number> = {};
      (enrollments ?? []).forEach((e: { course_id: string }) => {
        enrollmentsByCourse[e.course_id] = (enrollmentsByCourse[e.course_id] || 0) + 1;
      });

      const coursesWithStats: CourseWithStats[] = (coursesData ?? []).map(course => ({
        ...course,
        enrollmentCount: enrollmentsByCourse[course.id] || 0,
      }));
      setCourses(coursesWithStats);
      setTotalEnrollments((enrollments ?? []).length);
      setTotalEarnings((payments ?? []).reduce((sum: number, p: { instructor_payout: number | null }) => sum + (p.instructor_payout || 0), 0));
      setLoading(false);
    }
    load();
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

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    pending_review: "bg-yellow-100 text-yellow-700",
    published: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    archived: "bg-gray-100 text-gray-500",
  };

  return (
    <GuestLayout>
      <section className="w-full min-h-[calc(100vh-80px)] py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between mb-10">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Instructor Dashboard</h1>
              <p className="text-gray-500 mt-1">Welcome back, {profile?.full_name?.split(" ")[0]}</p>
            </div>
            <Link
              href="/instructor/courses/new"
              className="px-6 py-3 bg-background-darkYellow text-white font-semibold rounded-xl hover:bg-yellow-500 transition-colors flex items-center gap-2"
            >
              <span>+</span> Add New Course
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-3xl font-bold text-gray-900">{courses.length}</p>
              <p className="text-gray-500 text-sm mt-1">Total Courses</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-3xl font-bold text-background-darkYellow">{totalEnrollments}</p>
              <p className="text-gray-500 text-sm mt-1">Total Enrollments</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-3xl font-bold text-green-600">${totalEarnings.toFixed(2)}</p>
              <p className="text-gray-500 text-sm mt-1">Total Earnings</p>
            </div>
          </div>

          {/* Courses list */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-6">My Courses</h2>
            {courses.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                <div className="text-5xl mb-4">📖</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No courses yet</h3>
                <p className="text-gray-500 mb-6">Create your first course to get started</p>
                <Link
                  href="/instructor/courses/new"
                  className="px-6 py-3 bg-background-darkYellow text-white font-semibold rounded-xl hover:bg-yellow-500 transition-colors"
                >
                  Create Course
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-5">
                    {course.thumbnail_url && (
                      <div className="w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                        <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full flex-shrink-0 ${statusColors[course.status] || "bg-gray-100 text-gray-600"}`}>
                          {course.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {course.enrollmentCount} enrollments · {course.price === 0 ? "Free" : `$${course.price}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {(course.status === "draft" || course.status === "rejected") && (
                        <Link
                          href={`/instructor/courses/${course.id}/edit`}
                          className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </Link>
                      )}
                      {course.status === "published" && (
                        <Link
                          href={`/courses/${course.id}`}
                          className="px-4 py-2 text-sm font-medium text-background-darkYellow border border-background-darkYellow rounded-xl hover:bg-yellow-50 transition-colors"
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
