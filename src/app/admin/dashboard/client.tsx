"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Profile, Course, InstructorApplication } from "@/types/database";
import GuestLayout from "@/components/application/layouts/guest";

export default function AdminDashboardPageClient() {
  const router = useRouter();
  const [stats, setStats] = useState({ courses: 0, learners: 0, instructors: 0, revenue: 0 });
  const [pendingCourses, setPendingCourses] = useState<(Course & { profiles: Profile })[]>([]);
  const [pendingApplications, setPendingApplications] = useState<(InstructorApplication & { profiles: Profile })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/dashboard"); return; }

      const [
        { count: courseCount },
        { count: learnerCount },
        { count: instructorCount },
        { data: revenueData },
        { data: pendingCoursesData },
        { data: pendingAppsData },
      ] = await Promise.all([
        supabase.from("courses").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "learner"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "instructor"),
        supabase.from("payments").select("platform_fee").eq("status", "success"),
        supabase.from("courses").select("*, profiles(*)").eq("status", "pending_review").limit(5),
        supabase.from("instructor_applications").select("*, profiles(*)").eq("status", "pending").limit(5),
      ]);

      const totalRevenue = (revenueData || []).reduce((sum, p) => sum + (p.platform_fee || 0), 0);

      setStats({
        courses: courseCount || 0,
        learners: learnerCount || 0,
        instructors: instructorCount || 0,
        revenue: totalRevenue,
      });
      setPendingCourses((pendingCoursesData || []) as (Course & { profiles: Profile })[]);
      setPendingApplications((pendingAppsData || []) as (InstructorApplication & { profiles: Profile })[]);
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

  return (
    <GuestLayout>
      <section className="w-full min-h-[calc(100vh-80px)] py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-10">Admin Dashboard</h1>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-3xl font-bold text-gray-900">{stats.courses}</p>
              <p className="text-gray-500 text-sm mt-1">Published Courses</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-3xl font-bold text-background-darkYellow">{stats.learners}</p>
              <p className="text-gray-500 text-sm mt-1">Total Learners</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-3xl font-bold text-blue-600">{stats.instructors}</p>
              <p className="text-gray-500 text-sm mt-1">Instructors</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <p className="text-3xl font-bold text-green-600">${stats.revenue.toFixed(2)}</p>
              <p className="text-gray-500 text-sm mt-1">Platform Revenue</p>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { href: "/admin/courses", label: "Manage Courses", icon: "📚" },
              { href: "/admin/courses/new", label: "New Course", icon: "➕" },
              { href: "/admin/instructors", label: "Applications", icon: "👤" },
              { href: "/admin/payments", label: "Payments", icon: "💰" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow flex items-center gap-3"
              >
                <span className="text-2xl">{link.icon}</span>
                <span className="font-semibold text-gray-900 text-sm">{link.label}</span>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pending courses */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Courses Pending Review</h2>
                <Link href="/admin/courses?status=pending_review" className="text-sm text-background-darkYellow font-medium hover:underline">
                  View all
                </Link>
              </div>
              {pendingCourses.length === 0 ? (
                <p className="text-gray-400 text-sm py-4">No courses pending review</p>
              ) : (
                <div className="space-y-3">
                  {pendingCourses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/admin/courses/${course.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-8 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                        {course.thumbnail_url && <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                        <p className="text-xs text-gray-500">{course.profiles?.full_name}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full flex-shrink-0">Review</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Pending applications */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Instructor Applications</h2>
                <Link href="/admin/instructors" className="text-sm text-background-darkYellow font-medium hover:underline">
                  View all
                </Link>
              </div>
              {pendingApplications.length === 0 ? (
                <p className="text-gray-400 text-sm py-4">No pending applications</p>
              ) : (
                <div className="space-y-3">
                  {pendingApplications.map((app) => (
                    <Link
                      key={app.id}
                      href={`/admin/instructors`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-600">
                        {app.profiles?.full_name?.charAt(0) || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{app.profiles?.full_name || app.profiles?.email}</p>
                        <p className="text-xs text-gray-500">{app.expertise}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex-shrink-0">Pending</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
