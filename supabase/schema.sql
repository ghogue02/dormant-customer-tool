-- Dormant Customer Analysis Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create analysis jobs table
CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Analysis configuration
  analysis_date DATE DEFAULT CURRENT_DATE,
  dormant_threshold_days INTEGER DEFAULT 45,
  analysis_period_months INTEGER DEFAULT 6,
  
  -- File information
  sales_filename TEXT,
  planning_filename TEXT,
  
  -- Results summary
  total_customers_analyzed INTEGER,
  dormant_customers_count INTEGER,
  total_value_at_risk DECIMAL(15,2),
  data_accuracy_score DECIMAL(5,4),
  
  -- Data quality metrics
  total_records INTEGER,
  valid_records INTEGER,
  data_completeness_score DECIMAL(5,4)
);

-- Create dormant customers table
CREATE TABLE IF NOT EXISTS dormant_customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  
  -- Customer information
  customer_name TEXT NOT NULL,
  salesperson TEXT NOT NULL,
  last_order_date DATE NOT NULL,
  days_since_order INTEGER NOT NULL,
  
  -- Financial metrics
  total_6_month_value DECIMAL(15,2) NOT NULL,
  order_count_6_months INTEGER NOT NULL,
  average_order_value DECIMAL(15,2) NOT NULL,
  customer_lifetime_value DECIMAL(15,2),
  
  -- Analytics
  churn_risk_score DECIMAL(5,4) NOT NULL,
  seasonal_pattern TEXT,
  preferred_products JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create salesperson summaries table
CREATE TABLE IF NOT EXISTS salesperson_summaries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  
  salesperson TEXT NOT NULL,
  dormant_customer_count INTEGER NOT NULL,
  total_value_at_risk DECIMAL(15,2) NOT NULL,
  high_value_dormant_count INTEGER DEFAULT 0,
  quick_win_count INTEGER DEFAULT 0,
  average_churn_risk DECIMAL(5,4) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create insights table
CREATE TABLE IF NOT EXISTS analysis_insights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  
  insight_type TEXT NOT NULL,
  insight_text TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create file storage table for tracking uploaded files
CREATE TABLE IF NOT EXISTS uploaded_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  job_id UUID REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('sales', 'planning')),
  file_size INTEGER,
  storage_path TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_user_id ON analysis_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_dormant_customers_job_id ON dormant_customers(job_id);
CREATE INDEX IF NOT EXISTS idx_dormant_customers_churn_risk ON dormant_customers(churn_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_salesperson_summaries_job_id ON salesperson_summaries(job_id);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dormant_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesperson_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own analysis jobs" ON analysis_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analysis jobs" ON analysis_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own analysis jobs" ON analysis_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view dormant customers from own jobs" ON dormant_customers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analysis_jobs 
      WHERE analysis_jobs.id = dormant_customers.job_id 
      AND analysis_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert dormant customers for own jobs" ON dormant_customers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_jobs 
      WHERE analysis_jobs.id = dormant_customers.job_id 
      AND analysis_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view salesperson summaries from own jobs" ON salesperson_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analysis_jobs 
      WHERE analysis_jobs.id = salesperson_summaries.job_id 
      AND analysis_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert salesperson summaries for own jobs" ON salesperson_summaries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_jobs 
      WHERE analysis_jobs.id = salesperson_summaries.job_id 
      AND analysis_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view insights from own jobs" ON analysis_insights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analysis_jobs 
      WHERE analysis_jobs.id = analysis_insights.job_id 
      AND analysis_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert insights for own jobs" ON analysis_insights
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_jobs 
      WHERE analysis_jobs.id = analysis_insights.job_id 
      AND analysis_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view uploaded files from own jobs" ON uploaded_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM analysis_jobs 
      WHERE analysis_jobs.id = uploaded_files.job_id 
      AND analysis_jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert uploaded files for own jobs" ON uploaded_files
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_jobs 
      WHERE analysis_jobs.id = uploaded_files.job_id 
      AND analysis_jobs.user_id = auth.uid()
    )
  );

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_analysis_jobs_updated_at BEFORE UPDATE ON analysis_jobs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();