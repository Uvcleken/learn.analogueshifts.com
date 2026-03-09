"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Course, Profile } from "@/types/database";
import GuestLayout from "@/components/application/layouts/guest";

type CourseWithInstructor = Course & { profiles: Profile | null };

export default function AdminCoursesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";
  const [courses, setCourses] = useState<CourseWithInstructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/dashboard"); return; }

      let query = supabase.from("courses").select("*, profiles(*)").order("created_at", { ascending: false });
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data } = await query;
      setCourses((data || []) as CourseWithInstructor[]);
      setLoading(false);
    }
    load();
  }, [router, statusFilter]);

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    pending_review: "bg-yellow-100 text-yellow-700",
    published: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    archived: "bg-gray-100 text-gray-500",
  };

  const statuses = ["all", "pending_review", "published", "draft", "rejected", "archived"];

  if (loading) {
    return (
      <GuestLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
        </div>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      <section className="w-full min-h-[calc(100vh-80px)] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-900 text-sm">← Admin Dashboard</Link>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">All Courses</h1>
            </div>
            <Link href="/admin/courses/new"
              className="px-5 py-2.5 bg-background-darkYellow text-white font-semibold rounded-xl hover:bg-yellow-500 transition-colors text-sm">
              + New Course
            </Link>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            {statuses.map((s) => (
              <Link
                key={s}
                href={`/admin/courses${s !== "all" ? `?status=${s}` : ""}`}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s.replace("_", " ")}
              </Link>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Course</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Instructor</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Price</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Created</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {course.thumbnail_url && (
                          <div className="w-12 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                            <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <p className="font-medium text-gray-900 text-sm max-w-xs truncate">{course.title}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{course.profiles?.full_name || "Admin"}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusColors[course.status] || "bg-gray-100 text-gray-600"}`}>
                        {course.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{course.price === 0 ? "Free" : `$${course.price}`}</td>
                    <td className="px-5 py-4 text-sm text-gray-500">{new Date(course.created_at).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <Link href={`/admin/courses/${course.id}`} className="text-sm text-background-darkYellow font-medium hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {courses.length === 0 && (
              <div className="text-center py-16 text-gray-400">No courses found</div>
            )}
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
