"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { InstructorApplication, Profile } from "@/types/database";
import GuestLayout from "@/components/application/layouts/guest";
import Link from "next/link";

type ApplicationWithProfile = InstructorApplication & { profiles: Profile | null };

export default function AdminInstructorsPageClient() {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApplicationWithProfile | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (profile?.role !== "admin") { router.push("/dashboard"); return; }

      const { data } = await supabase
        .from("instructor_applications")
        .select("*, profiles(*)")
        .order("reviewed_at", { ascending: true, nullsFirst: true })
        .order("created_at" as never, { ascending: false });
      setApplications((data || []) as ApplicationWithProfile[]);
      setLoading(false);
    }
    load();
  }, [router]);

  async function approve(app: ApplicationWithProfile) {
    setProcessing(app.id);
    await Promise.all([
      supabase.from("instructor_applications").update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
      }).eq("id", app.id),
      supabase.from("profiles").update({ role: "instructor" }).eq("id", app.user_id),
    ]);
    setApplications((prev) => prev.map((a) => a.id === app.id ? { ...a, status: "approved" } : a));
    setProcessing(null);
    setSelected(null);
  }

  async function reject(app: ApplicationWithProfile, note: string) {
    setProcessing(app.id);
    await supabase.from("instructor_applications").update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      admin_note: note,
    }).eq("id", app.id);
    setApplications((prev) => prev.map((a) => a.id === app.id ? { ...a, status: "rejected" } : a));
    setProcessing(null);
    setSelected(null);
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

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
            <h1 className="text-2xl font-bold text-gray-900">Instructor Applications</h1>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Applicant</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Expertise</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-5 py-4 text-xs font-semibold text-gray-500 uppercase">Applied</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(app)}>
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{app.profiles?.full_name || "Unknown"}</p>
                        <p className="text-xs text-gray-500">{app.profiles?.email}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{app.expertise}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${statusColors[app.status] || "bg-gray-100 text-gray-600"}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {app.reviewed_at ? new Date(app.reviewed_at).toLocaleDateString() : "Pending"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-background-darkYellow font-medium hover:underline">View</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {applications.length === 0 && (
              <div className="text-center py-16 text-gray-400">No applications found</div>
            )}
          </div>
        </div>
      </section>

      {/* Application detail modal */}
      {selected && (
        <ApplicationModal
          app={selected}
          onClose={() => setSelected(null)}
          onApprove={() => approve(selected)}
          onReject={(note) => reject(selected, note)}
          processing={processing === selected.id}
        />
      )}
    </GuestLayout>
  );
}

function ApplicationModal({
  app,
  onClose,
  onApprove,
  onReject,
  processing,
}: {
  app: ApplicationWithProfile;
  onClose: () => void;
  onApprove: () => void;
  onReject: (note: string) => void;
  processing: boolean;
}) {
  const [rejectNote, setRejectNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h3 className="font-bold text-gray-900 text-lg">Application Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Applicant</p>
            <p className="font-medium text-gray-900">{app.profiles?.full_name}</p>
            <p className="text-sm text-gray-500">{app.profiles?.email}</p>
          </div>
          {app.expertise && (
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Expertise</p>
              <p className="text-sm text-gray-800">{app.expertise}</p>
            </div>
          )}
          {app.portfolio_url && (
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Portfolio</p>
              <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">{app.portfolio_url}</a>
            </div>
          )}
          {app.why_teach && (
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Why they want to teach</p>
              <p className="text-sm text-gray-800 leading-relaxed">{app.why_teach}</p>
            </div>
          )}
        </div>

        {app.status === "pending" && (
          <div className="space-y-3">
            {!showRejectForm ? (
              <>
                <button onClick={onApprove} disabled={processing}
                  className="w-full py-2.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-60">
                  {processing ? "Approving..." : "✓ Approve"}
                </button>
                <button onClick={() => setShowRejectForm(true)}
                  className="w-full py-2.5 border-2 border-red-300 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors">
                  ✗ Reject
                </button>
              </>
            ) : (
              <>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  rows={3}
                  placeholder="Reason for rejection..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
                <div className="flex gap-3">
                  <button onClick={() => onReject(rejectNote)} disabled={!rejectNote.trim() || processing}
                    className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60">
                    Reject
                  </button>
                  <button onClick={() => setShowRejectForm(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
