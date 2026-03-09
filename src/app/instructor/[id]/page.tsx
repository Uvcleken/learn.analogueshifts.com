export const dynamic = "force-dynamic";
import GuestLayout from "@/components/application/layouts/guest";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import CourseCard from "@/components/application/course-card";
import Link from "next/link";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InstructorProfilePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  const [{ data: profile }, { data: courses }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("courses").select("*").eq("instructor_id", id).eq("status", "published"),
  ]);

  if (!profile) {
    return (
      <GuestLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Instructor not found</h1>
            <Link href="/courses" className="text-background-darkYellow mt-4 inline-block hover:underline">Browse Courses</Link>
          </div>
        </div>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      <section className="w-full py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Profile header */}
          <div className="flex items-start gap-6 mb-12">
            <div className="w-20 h-20 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center text-2xl font-bold text-gray-600">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name || ""} className="w-full h-full object-cover" />
              ) : (
                (profile.full_name?.charAt(0) || "?")
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{profile.full_name}</h1>
              <p className="text-gray-500 text-lg mb-3">{profile.role === "instructor" ? "Instructor" : "Educator"}</p>
              {profile.bio && <p className="text-gray-600 max-w-2xl leading-relaxed">{profile.bio}</p>}
            </div>
          </div>

          {/* Courses */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Courses by {profile.full_name?.split(" ")[0]} ({(courses || []).length})
            </h2>
            {(courses || []).length === 0 ? (
              <p className="text-gray-400">No published courses yet</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {(courses || []).map((course) => (
                  <CourseCard
                    key={course.id}
                    slug={course.id}
                    name={course.title}
                    company={profile.full_name || "Instructor"}
                    description={course.description || ""}
                    duration={course.duration_hours ? `${course.duration_hours}h` : ""}
                    price={course.price === 0 ? "Free" : `$${course.price}`}
                    thumbnail={course.thumbnail_url || "/courses/devops.svg"}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
