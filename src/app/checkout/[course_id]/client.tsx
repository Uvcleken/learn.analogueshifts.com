"use client";
import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Course, Profile } from "@/types/database";
import GuestLayout from "@/components/application/layouts/guest";
import Link from "next/link";

export default function CheckoutPageClient({ params }: { params: Promise<{ course_id: string }> }) {
  const { course_id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const reference = searchParams.get("reference") || searchParams.get("trxref");

  const [course, setCourse] = useState<Course | null>(null);
  const [instructor, setInstructor] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    async function loadCheckout() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUserId(user.id);

      const { data: courseData } = await supabase
        .from("courses")
        .select("*")
        .eq("id", course_id)
        .single();
      setCourse(courseData);

      if (courseData?.instructor_id) {
        const { data: instructorData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", courseData.instructor_id)
          .single();
        setInstructor(instructorData);
      }

      // Handle payment callback
      if (status === "success" && reference && user) {
        await verifyAndEnroll(user.id, reference, courseData);
      }

      setLoading(false);
    }
    loadCheckout();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course_id, status, reference]);

  async function verifyAndEnroll(uid: string, ref: string, courseData: Course | null) {
    if (!courseData) return;
    try {
      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: ref, gateway: "paystack", courseId: course_id }),
      });
      const data = await res.json();

      if (data.success) {
        setVerified(true);
        // Create payment record
        const amount = courseData.price || 0;
        const { data: payment } = await supabase.from("payments").insert({
          learner_id: uid,
          course_id,
          instructor_id: courseData.instructor_id,
          amount,
          platform_fee: amount * 0.3,
          instructor_payout: amount * 0.7,
          currency: courseData.currency || "USD",
          gateway: "paystack",
          gateway_reference: ref,
          status: "success",
          paid_at: new Date().toISOString(),
        }).select().single();

        // Create enrollment
        await supabase.from("enrollments").upsert({
          learner_id: uid,
          course_id,
          payment_id: payment?.id,
        });

        setTimeout(() => router.push(`/learn/${course_id}`), 2000);
      } else {
        setError("Payment verification failed. Please contact support.");
      }
    } catch {
      setError("Error verifying payment. Please contact support.");
    }
  }

  async function enrollFree() {
    if (!userId || !course) return;
    setPaymentLoading(true);
    const { error: err } = await supabase.from("enrollments").upsert({
      learner_id: userId,
      course_id,
    });
    if (err) {
      setError(err.message);
    } else {
      router.push(`/learn/${course_id}`);
    }
    setPaymentLoading(false);
  }

  async function payWithPaystack() {
    if (!course || !userId) return;
    setPaymentLoading(true);
    const pubKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!pubKey) {
      setError("Paystack is not configured. Please contact support.");
      setPaymentLoading(false);
      return;
    }
    // Load Paystack inline
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => {
      const handler = (window as unknown as { PaystackPop: { setup: (opts: unknown) => { openIframe: () => void } } }).PaystackPop.setup({
        key: pubKey,
        email: "",
        amount: Math.round(course.price * 100), // In kobo (NGN) or smallest unit
        currency: "NGN",
        ref: `PS-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        callback: (response: { reference: string }) => {
          router.push(`/checkout/${course_id}?status=success&reference=${response.reference}`);
        },
        onClose: () => {
          setPaymentLoading(false);
        },
      });
      handler.openIframe();
    };
    document.head.appendChild(script);
  }

  async function payWithStripe() {
    if (!course || !userId) return;
    setPaymentLoading(true);
    try {
      const res = await fetch("/api/payments/stripe/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course_id, userId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Failed to create Stripe session. Please try again.");
        setPaymentLoading(false);
      }
    } catch {
      setError("Payment initialization failed. Please try again.");
      setPaymentLoading(false);
    }
  }

  if (loading) {
    return (
      <GuestLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="lds-ellipsis"><div></div><div></div><div></div><div></div></div>
        </div>
      </GuestLayout>
    );
  }

  if (verified) {
    return (
      <GuestLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
            <p className="text-gray-500">Redirecting you to the course...</p>
          </div>
        </div>
      </GuestLayout>
    );
  }

  if (status === "failed") {
    return (
      <GuestLayout>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h1>
            <p className="text-gray-500 mb-6">Your payment was not processed. Please try again.</p>
            <button
              onClick={() => router.push(`/checkout/${course_id}`)}
              className="px-8 py-3 bg-background-darkYellow text-white font-semibold rounded-xl hover:bg-yellow-500 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </GuestLayout>
    );
  }

  const isFree = !course?.price || course.price === 0;

  return (
    <GuestLayout>
      <section className="w-full min-h-[calc(100vh-80px)] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Course summary */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-4">Order Summary</h2>
              {course?.thumbnail_url && (
                <div className="h-48 rounded-xl overflow-hidden mb-4 bg-gray-100">
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                </div>
              )}
              <h3 className="font-semibold text-gray-900 text-lg mb-1">{course?.title}</h3>
              <p className="text-sm text-gray-500 mb-1">by {instructor?.full_name || "Analogue Shifts"}</p>
              {course?.difficulty && (
                <span className="inline-block px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full mb-4">
                  {course.difficulty}
                </span>
              )}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {isFree ? "Free" : `$${course?.price.toFixed(2)}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment options */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 mb-6">
                {isFree ? "Enroll Now" : "Select Payment Method"}
              </h2>

              {isFree ? (
                <button
                  onClick={enrollFree}
                  disabled={paymentLoading}
                  className="w-full py-4 bg-background-darkYellow text-white font-bold rounded-2xl hover:bg-yellow-500 transition-colors disabled:opacity-60 text-base"
                >
                  {paymentLoading ? "Enrolling..." : "Enroll for Free"}
                </button>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={payWithPaystack}
                    disabled={paymentLoading}
                    className="w-full flex items-center justify-between py-4 px-5 border-2 border-gray-200 rounded-2xl hover:border-background-darkYellow hover:bg-yellow-50 transition-all disabled:opacity-60"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Pay with Card (NGN)</p>
                      <p className="text-sm text-gray-500">Powered by Paystack</p>
                    </div>
                    <div className="text-background-darkYellow font-bold text-xl">₦</div>
                  </button>

                  <button
                    onClick={payWithStripe}
                    disabled={paymentLoading}
                    className="w-full flex items-center justify-between py-4 px-5 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-60"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Pay with Card (USD)</p>
                      <p className="text-sm text-gray-500">Powered by Stripe</p>
                    </div>
                    <svg className="w-12" viewBox="0 0 60 25" fill="none">
                      <path d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V6.27h3.64l.24 1.04a4.33 4.33 0 0 1 3.11-1.27c3.29 0 5.56 2.87 5.56 7.17 0 4.09-2.25 7.09-5.51 7.09zm-.95-10.68c-.86 0-1.38.27-1.96.68v5.63c.54.39 1.07.65 1.96.65 1.59 0 2.59-1.39 2.59-3.5 0-2.1-1.01-3.46-2.59-3.46zM28.24 5.07c-1.31 0-2.12.87-2.12 2 0 1.14.81 2 2.12 2 1.32 0 2.13-.86 2.13-2 0-1.13-.81-2-2.13-2zm2.07 15.14h-4.12V6.27h4.12v13.94zM21.89 6.27H18.3l-.01 13.94h4.12V9.61c.69-.93 1.86-1.5 3.29-1.5.34 0 .63.03.88.07V5.2a3.62 3.62 0 0 0-.65-.05c-1.55 0-2.87.71-3.69 1.7l-.35-.58zM15.29 6.27V5.2c0-1.08.57-1.61 1.49-1.61.47 0 .87.07 1.24.19V.47A6.6 6.6 0 0 0 15.71 0C13.07 0 11.33 1.54 11.33 4.38v1.89H9.05V9.7h2.28v10.57h4.12V9.7h2.76l.56-3.43h-3.48zM4.4 6.59c0-.92.76-1.28 1.96-1.28 1.56 0 3.47.49 5.02 1.34V3.27A13.3 13.3 0 0 0 6.38 2.5C2.78 2.5 0 4.41 0 7.22c0 4.35 5.96 3.65 5.96 5.49 0 1.08-.94 1.44-2.23 1.44-1.65 0-3.77-.65-5.15-1.59v3.41C-.02 16.68 1.8 17.2 3.73 17.2c3.69 0 6.27-1.82 6.27-4.73 0-4.67-5.96-3.87-5.6-5.88z" fill="#635BFF"/>
                    </svg>
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-400 mt-4 text-center">
                By enrolling, you agree to our{" "}
                <Link href="/terms" className="underline">Terms of Service</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
