-- Table: raw_experiences
CREATE TABLE IF NOT EXISTS public.raw_experiences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source VARCHAR(255) NOT NULL, -- e.g., 'reddit', 'rss', 'user_submission'
    source_url TEXT,              -- Link to the original post (if applicable)
    content TEXT NOT NULL,        -- The raw text content of the interview experience
    status VARCHAR(50) DEFAULT 'pending', -- 'pending' or 'processed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index on source_url to quickly check for duplicates during ingestion
CREATE INDEX IF NOT EXISTS idx_raw_experiences_source_url ON public.raw_experiences(source_url);

-- Table: review_queue
CREATE TABLE IF NOT EXISTS public.review_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_experience_id UUID REFERENCES public.raw_experiences(id) ON DELETE SET NULL,
    company VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    round VARCHAR(255),
    question TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: extracted_questions
CREATE TABLE IF NOT EXISTS public.extracted_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    round VARCHAR(255),
    question TEXT NOT NULL,
    occurrence_count INTEGER DEFAULT 1 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Unique constraint to prevent duplicate questions for the same company/role
-- We use this for ON CONFLICT upserting and incrementing the count
ALTER TABLE public.extracted_questions
ADD CONSTRAINT unique_company_role_question UNIQUE (company, role, question);

-- RLS Policies
ALTER TABLE public.raw_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extracted_questions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to extracted_questions (for the practice page later)
CREATE POLICY "Public can read extracted questions"
ON public.extracted_questions FOR SELECT
TO public
USING (true);

-- Allow authenticated users to insert raw experiences (for the Share page)
-- Wait, if it's a completely public share page without login, we can allow anon inserts
CREATE POLICY "Anyone can insert raw experiences"
ON public.raw_experiences FOR INSERT
TO public
WITH CHECK (true);

-- Function to handle UPSERT and count increment from the Admin Review page
CREATE OR REPLACE FUNCTION approve_review_queue_item(
    p_company VARCHAR,
    p_role VARCHAR,
    p_round VARCHAR,
    p_question TEXT,
    p_queue_id UUID
) RETURNS void AS $$
BEGIN
    -- Try to insert the new extracted question.
    -- If it violates the unique constraint on (company, role, question), we just increment occurrence_count.
    INSERT INTO public.extracted_questions (company, role, round, question, occurrence_count)
    VALUES (p_company, p_role, p_round, p_question, 1)
    ON CONFLICT ON CONSTRAINT unique_company_role_question
    DO UPDATE SET 
        occurrence_count = public.extracted_questions.occurrence_count + 1,
        updated_at = now();
        
    -- Finally, remove the item from the review queue
    DELETE FROM public.review_queue WHERE id = p_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
