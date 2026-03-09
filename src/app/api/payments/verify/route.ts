import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { reference, gateway } = await req.json();

    if (!reference || !gateway) {
      return NextResponse.json({ success: false, error: "Missing reference or gateway" }, { status: 400 });
    }

    if (gateway === "paystack") {
      const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecretKey) {
        return NextResponse.json({ success: false, error: "Paystack not configured" }, { status: 500 });
      }

      const res = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (data.status && data.data?.status === "success") {
        return NextResponse.json({
          success: true,
          amount: data.data.amount / 100,
          currency: data.data.currency,
          reference: data.data.reference,
        });
      }

      return NextResponse.json({ success: false, error: "Payment verification failed", data });
    }

    if (gateway === "stripe") {
      const stripe = (await import("stripe")).default;
      const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY!);
      const session = await stripeClient.checkout.sessions.retrieve(reference);

      if (session.payment_status === "paid") {
        return NextResponse.json({
          success: true,
          amount: (session.amount_total ?? 0) / 100,
          currency: session.currency?.toUpperCase() || "USD",
          reference,
        });
      }

      return NextResponse.json({ success: false, error: "Stripe payment not completed" });
    }

    return NextResponse.json({ success: false, error: "Unknown gateway" }, { status: 400 });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
