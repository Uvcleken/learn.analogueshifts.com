export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          role: "admin" | "instructor" | "learner";
          bio: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          role?: "admin" | "instructor" | "learner";
          bio?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          role?: "admin" | "instructor" | "learner";
          bio?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          thumbnail_url: string | null;
          category: string | null;
          difficulty: string | null;
          duration_hours: number | null;
          price: number;
          currency: string;
          instructor_id: string | null;
          status: "draft" | "pending_review" | "published" | "rejected" | "archived";
          is_featured: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          thumbnail_url?: string | null;
          category?: string | null;
          difficulty?: string | null;
          duration_hours?: number | null;
          price?: number;
          currency?: string;
          instructor_id?: string | null;
          status?: "draft" | "pending_review" | "published" | "rejected" | "archived";
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          thumbnail_url?: string | null;
          category?: string | null;
          difficulty?: string | null;
          duration_hours?: number | null;
          price?: number;
          currency?: string;
          instructor_id?: string | null;
          status?: "draft" | "pending_review" | "published" | "rejected" | "archived";
          is_featured?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      lessons: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          description: string | null;
          embed_url: string | null;
          order_index: number;
          is_free_preview: boolean;
          duration_minutes: number | null;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          description?: string | null;
          embed_url?: string | null;
          order_index?: number;
          is_free_preview?: boolean;
          duration_minutes?: number | null;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          description?: string | null;
          embed_url?: string | null;
          order_index?: number;
          is_free_preview?: boolean;
          duration_minutes?: number | null;
        };
      };
      enrollments: {
        Row: {
          id: string;
          learner_id: string;
          course_id: string;
          enrolled_at: string;
          completed_at: string | null;
          payment_id: string | null;
        };
        Insert: {
          id?: string;
          learner_id: string;
          course_id: string;
          enrolled_at?: string;
          completed_at?: string | null;
          payment_id?: string | null;
        };
        Update: {
          id?: string;
          learner_id?: string;
          course_id?: string;
          enrolled_at?: string;
          completed_at?: string | null;
          payment_id?: string | null;
        };
      };
      lesson_progress: {
        Row: {
          id: string;
          learner_id: string;
          lesson_id: string;
          course_id: string;
          completed: boolean;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          learner_id: string;
          lesson_id: string;
          course_id: string;
          completed?: boolean;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          learner_id?: string;
          lesson_id?: string;
          course_id?: string;
          completed?: boolean;
          completed_at?: string | null;
        };
      };
      payments: {
        Row: {
          id: string;
          learner_id: string;
          course_id: string;
          instructor_id: string | null;
          amount: number;
          platform_fee: number;
          instructor_payout: number;
          currency: string;
          gateway: "paystack" | "stripe";
          gateway_reference: string | null;
          status: "pending" | "success" | "failed" | "refunded";
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          learner_id: string;
          course_id: string;
          instructor_id?: string | null;
          amount: number;
          platform_fee?: number;
          instructor_payout?: number;
          currency?: string;
          gateway: "paystack" | "stripe";
          gateway_reference?: string | null;
          status?: "pending" | "success" | "failed" | "refunded";
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          learner_id?: string;
          course_id?: string;
          instructor_id?: string | null;
          amount?: number;
          platform_fee?: number;
          instructor_payout?: number;
          currency?: string;
          gateway?: "paystack" | "stripe";
          gateway_reference?: string | null;
          status?: "pending" | "success" | "failed" | "refunded";
          paid_at?: string | null;
        };
      };
      instructor_applications: {
        Row: {
          id: string;
          user_id: string;
          expertise: string | null;
          portfolio_url: string | null;
          why_teach: string | null;
          status: "pending" | "approved" | "rejected";
          reviewed_at: string | null;
          admin_note: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          expertise?: string | null;
          portfolio_url?: string | null;
          why_teach?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewed_at?: string | null;
          admin_note?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          expertise?: string | null;
          portfolio_url?: string | null;
          why_teach?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewed_at?: string | null;
          admin_note?: string | null;
        };
      };
      reviews: {
        Row: {
          id: string;
          course_id: string;
          learner_id: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          learner_id: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          learner_id?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type Enrollment = Database["public"]["Tables"]["enrollments"]["Row"];
export type LessonProgress = Database["public"]["Tables"]["lesson_progress"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type InstructorApplication = Database["public"]["Tables"]["instructor_applications"]["Row"];
export type Review = Database["public"]["Tables"]["reviews"]["Row"];
