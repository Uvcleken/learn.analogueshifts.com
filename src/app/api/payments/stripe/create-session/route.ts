import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { courseId, userId } = await req.json();

    if (!courseId || !userId) {
      return NextResponse.json({ error: "Missing courseId or userId" }, { status: 400 });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    // Fetch course details from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const courseRes = await fetch(`${supabaseUrl}/rest/v1/courses?id=eq.${courseId}&select=title,price,currency`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });
    const courses = await courseRes.json();
    const course = courses[0];

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const stripe = (await import("stripe")).default;
    const stripeClient = new stripe(stripeSecretKey);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await stripeClient.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: course.title,
            },
            unit_amount: Math.round(course.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${appUrl}/checkout/${courseId}?status=success&reference={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout/${courseId}?status=failed`,
      metadata: {
        courseId,
        userId,
      },
    });

    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error("Stripe session creation error:", error);
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
