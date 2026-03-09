export const dynamic = "force-dynamic";
import GuestLayout from "@/components/application/layouts/guest";
import Link from "next/link";

export default function InstructorApplySuccessPage() {
  return (
    <GuestLayout>
      <section className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
          <p className="text-gray-500 text-lg mb-8 leading-relaxed">
            Thank you for applying to become an instructor. Our team will review your application and get back to you within 2–3 business days.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/courses"
              className="px-8 py-3 bg-background-darkYellow text-white font-semibold rounded-xl hover:bg-yellow-500 transition-colors"
            >
              Browse Courses
            </Link>
            <Link
              href="/"
              className="px-8 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
