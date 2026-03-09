"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Payment, Profile, Course } from "@/types/database";
import GuestLayout from "@/components/application/layouts/guest";
import Link from "next/link";

type PaymentWithDetails = Payment & {
  learner_profile: Profile | null;
  course: Course | null;
};

export default function AdminPaymentsPageClient() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function loadPayments(from?: string, to?: string) {
    let query = supabase
      .from("payments")
      .select("*")
      .eq("status", "success")
      .order("paid_at", { ascending: false });

    if (from) query = query.gte("paid_at", from);
    if (to) query = query.lte("paid_at", to + "T23:59:59");

    const { data: paymentsData } = await query;

    if (paymentsData && paymentsData.length > 0) {
      const learnerIds = Array.from(new Set(paymentsData.map((p) => p.learner_id)));
      const courseIds = Array.from(new Set(paymentsData.map((p) => p.course_id)));

      const [{ data: profiles }, { data: courses }] = await Promise.all([
        supabase.from("profiles").select("*").in("id", learnerIds),
        supabase.from("courses").select("id,title").in("id", courseIds),
      ]);

      const enriched: PaymentWithDetails[] = paymentsData.map((p) => ({
        ...p,
        learner_profile: profiles?.find((prof) => prof.id === p.learner_id) ?? null,
        course: courses?.find((c) => c.id === p.course_id) ?? null,
      }));
      setPayments(enriched);
      setTotalRevenue(paymentsData.reduce((sum, p) => sum + (p.platform_fee || 0), 0));
    } else {
      setPayments([]);
      setTotalRevenue(0);
    }
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/dashboard"); return; }
      await loadPayments();
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <div className="flex items-center gap-4 mb-8">
            <Link href="/admin/dashboard" className="text-gray-500 hover:text-gray-900 text-sm">← Admin Dashboard</Link>
            <h1 className="text-2xl font-bold text-gray-900">Revenue</h1>
          </div>

          {/* Revenue card */}
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl p-8 mb-8 text-white">
            <p className="text-sm font-semibold opacity-80 mb-1">Total Platform Revenue</p>
            <p className="text-4xl font-bold">${totalRevenue.toFixed(2)}</p>
            <p className="text-sm opacity-70 mt-1">{payments.length} successful transactions</p>
          </div>

          {/* Date filter */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => loadPayments(dateFrom, dateTo)}
                className="px-5 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
              >
                Filter
              </button>
            </div>
          </div>

          {/* Payments table */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Learner</th>
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Course</th>
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Platform Fee</th>
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Instructor Payout</th>
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Gateway</th>
                    <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-gray-50">
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-gray-900">{payment.learner_profile?.full_name}</p>
                        <p className="text-xs text-gray-500">{payment.learner_profile?.email}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 max-w-xs truncate">{payment.course?.title}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">${payment.amount.toFixed(2)}</td>
                      <td className="px-5 py-4 text-sm text-green-600 font-medium">${payment.platform_fee.toFixed(2)}</td>
                      <td className="px-5 py-4 text-sm text-blue-600 font-medium">${payment.instructor_payout.toFixed(2)}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${payment.gateway === "stripe" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {payment.gateway}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500">
                        {payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && (
                <div className="text-center py-16 text-gray-400">No payments found</div>
              )}
            </div>
          </div>
        </div>
      </section>
    </GuestLayout>
  );
}
