-- Create news_articles table
CREATE TABLE IF NOT EXISTS public.news_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    category TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pinned BOOLEAN DEFAULT FALSE,
    pinned_order INTEGER,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create user_news_status table to track read status
CREATE TABLE IF NOT EXISTS public.user_news_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON public.news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_articles_pinned ON public.news_articles(pinned, pinned_order);
CREATE INDEX IF NOT EXISTS idx_user_news_status_user ON public.user_news_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_news_status_article ON public.user_news_status(article_id);

-- Row Level Security (RLS) policies
-- Enable RLS on the tables
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_news_status ENABLE ROW LEVEL SECURITY;

-- News articles are readable by all authenticated users
CREATE POLICY "News articles are viewable by all authenticated users"
    ON public.news_articles
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can insert, update or delete news articles
CREATE POLICY "Only admins can insert news articles"
    ON public.news_articles
    FOR INSERT
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can update news articles"
    ON public.news_articles
    FOR UPDATE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Only admins can delete news articles"
    ON public.news_articles
    FOR DELETE
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- Users can view their own read status
CREATE POLICY "Users can view their own read status"
    ON public.user_news_status
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can insert their own read status
CREATE POLICY "Users can insert their own read status"
    ON public.user_news_status
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own read status
CREATE POLICY "Users can update their own read status"
    ON public.user_news_status
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
