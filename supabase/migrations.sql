-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('admin', 'instructor', 'learner')),
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courses table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT CHECK (category IN ('Frontend', 'Backend', 'UI/UX', 'DevOps', 'Data', 'Other')),
  difficulty TEXT CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  duration_hours NUMERIC,
  price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  instructor_id UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lessons table
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  embed_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 1,
  is_free_preview BOOLEAN NOT NULL DEFAULT false,
  duration_minutes INTEGER
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  learner_id UUID NOT NULL REFERENCES public.profiles(id),
  course_id UUID NOT NULL REFERENCES public.courses(id),
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  payment_id UUID,
  UNIQUE(learner_id, course_id)
);

-- Lesson progress table
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  learner_id UUID NOT NULL REFERENCES public.profiles(id),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(learner_id, lesson_id)
);

-- Payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  learner_id UUID NOT NULL REFERENCES public.profiles(id),
  course_id UUID NOT NULL REFERENCES public.courses(id),
  instructor_id UUID REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  instructor_payout NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  gateway TEXT NOT NULL CHECK (gateway IN ('paystack', 'stripe')),
  gateway_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  paid_at TIMESTAMPTZ
);

-- Instructor applications table
CREATE TABLE IF NOT EXISTS public.instructor_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  expertise TEXT,
  portfolio_url TEXT,
  why_teach TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  admin_note TEXT
);

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  learner_id UUID NOT NULL REFERENCES public.profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, learner_id)
);

-- Add foreign key for enrollments.payment_id after payments table created
ALTER TABLE public.enrollments 
  ADD CONSTRAINT enrollments_payment_id_fkey 
  FOREIGN KEY (payment_id) REFERENCES public.payments(id);

-- Trigger to auto-update updated_at on courses
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    'learner'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();

-- Row Level Security

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Courses policies
CREATE POLICY "Published courses are viewable by everyone" ON public.courses
  FOR SELECT USING (status = 'published' OR instructor_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Instructors can insert their own courses" ON public.courses
  FOR INSERT WITH CHECK (
    instructor_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('instructor', 'admin'))
  );

CREATE POLICY "Instructors can update their own draft/rejected courses" ON public.courses
  FOR UPDATE USING (
    (instructor_id = auth.uid() AND status IN ('draft', 'rejected')) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lessons policies
CREATE POLICY "Lessons are viewable based on course access" ON public.lessons
  FOR SELECT USING (
    is_free_preview = true OR
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND (
      status = 'published' OR instructor_id = auth.uid()
    )) OR
    EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = lessons.course_id AND learner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Instructors can manage lessons of their courses" ON public.lessons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses WHERE id = course_id AND instructor_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Enrollments policies
CREATE POLICY "Learners can view their own enrollments" ON public.enrollments
  FOR SELECT USING (learner_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Learners can insert their own enrollments" ON public.enrollments
  FOR INSERT WITH CHECK (learner_id = auth.uid());

CREATE POLICY "Admins can update enrollments" ON public.enrollments
  FOR UPDATE USING (learner_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Lesson progress policies
CREATE POLICY "Learners can manage their own lesson progress" ON public.lesson_progress
  FOR ALL USING (learner_id = auth.uid());

-- Payments policies
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (
    learner_id = auth.uid() OR instructor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "System can insert payments" ON public.payments
  FOR INSERT WITH CHECK (learner_id = auth.uid());

-- Instructor applications policies
CREATE POLICY "Users can view their own applications" ON public.instructor_applications
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert their own applications" ON public.instructor_applications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update applications" ON public.instructor_applications
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Reviews policies
CREATE POLICY "Reviews are publicly viewable" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "Enrolled learners can insert reviews" ON public.reviews
  FOR INSERT WITH CHECK (
    learner_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.enrollments WHERE course_id = reviews.course_id AND learner_id = auth.uid())
  );

CREATE POLICY "Learners can update their own reviews" ON public.reviews
  FOR UPDATE USING (learner_id = auth.uid());
