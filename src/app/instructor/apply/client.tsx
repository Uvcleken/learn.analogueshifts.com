"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import GuestLayout from "@/components/application/layouts/guest";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import ApplyBg from "/public/apply-bg.svg";

export default function InstructorApplyPageClient() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    expertise: "",
    portfolioUrl: "",
    whyTeach: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Check if the user has an account already; if not, they need to register first
      const { data: { user } } = await supabase.auth.getUser();
      
      let userId = user?.id;
      
      if (!userId) {
        // For public submissions, we'll use email to look up existing user
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", form.email)
          .single();
        
        if (!profile) {
          setError("Please create an account first before applying as an instructor.");
          setLoading(false);
          return;
        }
        userId = profile.id;
      }

      const { error: insertError } = await supabase.from("instructor_applications").insert({
        user_id: userId,
        expertise: form.expertise,
        portfolio_url: form.portfolioUrl,
        why_teach: form.whyTeach,
        status: "pending",
      });

      if (insertError) throw insertError;

      router.push("/instructor/apply/success");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <GuestLayout>
      <section className="w-full min-h-[calc(100vh-80px)] flex items-center justify-center py-16 px-4 relative overflow-hidden">
        <Image
          src={ApplyBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          fill
        />
        <div className="relative z-10 w-full max-w-2xl">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Become an Instructor</h1>
              <p className="text-gray-500 text-base leading-relaxed">
                Share your expertise with learners around the world. Fill out this form and our team will review your application.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    name="fullName"
                    value={form.fullName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Expertise / Topics *</label>
                <input
                  type="text"
                  name="expertise"
                  value={form.expertise}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                  placeholder="e.g. DevOps, React, Data Science"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Portfolio URL</label>
                <input
                  type="url"
                  name="portfolioUrl"
                  value={form.portfolioUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Why do you want to teach here? *
                </label>
                <textarea
                  name="whyTeach"
                  value={form.whyTeach}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm resize-none"
                  placeholder="Tell us about your teaching goals and what you'd like to share with learners..."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-background-darkYellow text-white font-bold rounded-2xl hover:bg-yellow-500 transition-colors disabled:opacity-60 text-base"
              >
                {loading ? "Submitting Application..." : "Submit Application"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
