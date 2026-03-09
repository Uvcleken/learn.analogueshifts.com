"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Profile, Course, Enrollment } from "@/types/database";
import Image from "next/image";
import NavLogo from "@/assets/images/nav-logo.svg";

export default function CertificatePageClient({ params }: { params: Promise<{ enrollment_id: string }> }) {
  const { enrollment_id } = use(params);
  const router = useRouter();
  const [learner, setLearner] = useState<Profile | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCertificate() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: enrollmentData } = await supabase
        .from("enrollments")
        .select("*")
        .eq("id", enrollment_id)
        .eq("learner_id", user.id)
        .single();

      if (!enrollmentData?.completed_at) {
        router.push("/dashboard");
        return;
      }
      setEnrollment(enrollmentData);

      const [{ data: profileData }, { data: courseData }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("courses").select("*").eq("id", enrollmentData.course_id).single(),
      ]);

      setLearner(profileData);
      setCourse(courseData);
      setLoading(false);
    }
    loadCertificate();
  }, [enrollment_id, router]);

  function handlePrint() {
    window.print();
  }

  function handleLinkedIn() {
    if (!course) return;
    const text = `I just completed "${course.title}" on Analogue Shifts Learn Platform! 🎓 #Learning #AnalogueShifts`;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}&summary=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
      </div>
    );
  }

  const completionDate = enrollment?.completed_at
    ? new Date(enrollment.completed_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Action buttons - hidden in print */}
      <div className="print:hidden w-full flex justify-center gap-4 py-6 px-4">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-3 bg-background-darkYellow text-white font-semibold rounded-xl hover:bg-yellow-500 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Download as PDF
        </button>
        <button
          onClick={handleLinkedIn}
          className="flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          Share on LinkedIn
        </button>
      </div>

      {/* Certificate */}
      <div className="flex justify-center px-4 pb-12">
        <div
          id="certificate"
          className="w-full max-w-4xl bg-white shadow-2xl print:shadow-none"
          style={{
            border: "8px solid #FFBB0A",
            padding: "60px",
            position: "relative",
            minHeight: "600px",
          }}
        >
          {/* Corner decorations */}
          <div className="absolute top-3 left-3 w-12 h-12 border-t-4 border-l-4 border-yellow-400" />
          <div className="absolute top-3 right-3 w-12 h-12 border-t-4 border-r-4 border-yellow-400" />
          <div className="absolute bottom-3 left-3 w-12 h-12 border-b-4 border-l-4 border-yellow-400" />
          <div className="absolute bottom-3 right-3 w-12 h-12 border-b-4 border-r-4 border-yellow-400" />

          <div className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <Image src={NavLogo} alt="Analogue Shifts" className="h-12 w-auto" />
            </div>

            <p className="text-gray-500 text-sm uppercase tracking-widest mb-2 font-semibold">Certificate of Completion</p>
            <div className="w-24 h-0.5 bg-yellow-400 mx-auto mb-8" />

            <p className="text-gray-600 text-lg mb-3">This is to certify that</p>
            <h2 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: "serif" }}>
              {learner?.full_name || "Learner"}
            </h2>
            <p className="text-gray-600 text-lg mb-3">has successfully completed the course</p>
            <h1 className="text-2xl font-bold text-background-darkYellow mb-2">
              {course?.title}
            </h1>
            {course?.difficulty && (
              <p className="text-gray-500 mb-6">Level: {course.difficulty}</p>
            )}

            <div className="w-32 h-0.5 bg-gray-200 mx-auto mb-8" />

            <div className="flex justify-between items-end px-8">
              <div className="text-left">
                <div className="w-40 h-0.5 bg-gray-400 mb-1" />
                <p className="text-sm text-gray-600">Completion Date</p>
                <p className="text-sm font-semibold text-gray-900">{completionDate}</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-1">🏆</div>
                <p className="text-xs text-gray-500">Certificate ID: {enrollment_id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <div className="w-40 h-0.5 bg-gray-400 mb-1 ml-auto" />
                <p className="text-sm text-gray-600">Issued by</p>
                <p className="text-sm font-semibold text-gray-900">Analogue Shifts</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
