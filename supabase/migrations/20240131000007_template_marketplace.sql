-- Template Marketplace Features
-- Enables community template sharing, ratings, and recommendations

-- User template preferences (for recommendation engine)
CREATE TABLE user_template_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Preference data
    preferred_categories TEXT[] DEFAULT '{}',
    preferred_tags TEXT[] DEFAULT '{}',
    usage_history JSONB NOT NULL DEFAULT '[]',
    ratings JSONB NOT NULL DEFAULT '[]',
    search_history TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Constraints
    UNIQUE(user_id)
);

-- Template usage analytics (for trending and recommendations)
CREATE TABLE template_usage_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    
    -- Usage metrics
    usage_count INTEGER NOT NULL DEFAULT 1,
    completion_rate DECIMAL(3,2) DEFAULT 0.0, -- Percentage of users who completed setup
    average_setup_time INTEGER, -- Average time to complete setup in seconds
    customization_count INTEGER DEFAULT 0, -- Number of customizations made
    
    -- Engagement metrics
    rating_count INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    
    -- Additional metrics
    metrics JSONB NOT NULL DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Indexes moved to end of file
    UNIQUE(template_id, user_id, date)
);

-- Template collections (curated lists of templates)
CREATE TABLE template_collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT NOT NULL UNIQUE,
    
    -- Collection metadata
    cover_image TEXT,
    tags TEXT[] DEFAULT '{}',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_public BOOLEAN NOT NULL DEFAULT true,
    
    -- Ownership
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Indexes moved to end of file
);

-- Template collection items (templates in collections)
CREATE TABLE template_collection_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    collection_id UUID NOT NULL REFERENCES template_collections(id) ON DELETE CASCADE,
    template_id UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
    
    -- Item metadata
    position INTEGER NOT NULL DEFAULT 0,
    description TEXT, -- Custom description for this template in this collection
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Constraints
    UNIQUE(collection_id, template_id),
    
    -- Indexes moved to end of file
);

-- Template forks (track template derivations)
CREATE TABLE template_forks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_template_id UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
    forked_template_id UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
    forked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Fork metadata
    customizations JSONB NOT NULL DEFAULT '{}',
    fork_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Constraints
    UNIQUE(forked_template_id), -- Each template can only be a fork of one original
    
    -- Indexes moved to end of file
);

-- Template downloads/installs tracking
CREATE TABLE template_installations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Installation details
    installation_type TEXT NOT NULL DEFAULT 'direct' CHECK (installation_type IN ('direct', 'fork', 'collection')),
    customizations JSONB NOT NULL DEFAULT '{}',
    setup_completed BOOLEAN NOT NULL DEFAULT false,
    setup_completion_time INTEGER, -- Time taken to complete setup in seconds
    
    -- Usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Constraints
    UNIQUE(template_id, user_id),
    
    -- Indexes moved to end of file
);

-- Template marketplace categories (enhanced categorization)
CREATE TABLE template_marketplace_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Category metadata
    icon TEXT, -- Icon name or URL
    color TEXT, -- Hex color code
    parent_id UUID REFERENCES template_marketplace_categories(id) ON DELETE SET NULL,
    
    -- Display settings
    display_order INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Indexes moved to end of file
);

-- Template tags (normalized tag system)
CREATE TABLE template_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Tag metadata
    usage_count INTEGER NOT NULL DEFAULT 0,
    category TEXT, -- Optional category for the tag
    is_featured BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Indexes moved to end of file
);

-- Template tag associations
CREATE TABLE template_tag_associations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID NOT NULL REFERENCES agent_templates(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES template_tags(id) ON DELETE CASCADE,
    
    -- Association metadata
    relevance_score DECIMAL(3,2) DEFAULT 1.0, -- How relevant this tag is to the template
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    
    -- Constraints
    UNIQUE(template_id, tag_id),
    
    -- Indexes moved to end of file
);

-- Row Level Security (RLS) Policies

-- User template preferences
ALTER TABLE user_template_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own template preferences"
    ON user_template_preferences
    FOR ALL
    USING (auth.uid() = user_id);

-- Template usage analytics
ALTER TABLE template_usage_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template usage analytics"
    ON template_usage_analytics
    FOR SELECT
    USING (true); -- Public read access for analytics

CREATE POLICY "Users can insert their own usage analytics"
    ON template_usage_analytics
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Template collections
ALTER TABLE template_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public template collections"
    ON template_collections
    FOR SELECT
    USING (is_public = true);

CREATE POLICY "Users can manage their own template collections"
    ON template_collections
    FOR ALL
    USING (auth.uid() = created_by);

-- Template collection items
ALTER TABLE template_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view items in public collections"
    ON template_collection_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM template_collections 
            WHERE template_collections.id = template_collection_items.collection_id 
            AND template_collections.is_public = true
        )
    );

CREATE POLICY "Collection owners can manage collection items"
    ON template_collection_items
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM template_collections 
            WHERE template_collections.id = template_collection_items.collection_id 
            AND template_collections.created_by = auth.uid()
        )
    );

-- Template forks
ALTER TABLE template_forks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view template fork relationships"
    ON template_forks
    FOR SELECT
    USING (true);

CREATE POLICY "Users can create forks of public templates"
    ON template_forks
    FOR INSERT
    WITH CHECK (auth.uid() = forked_by);

-- Template installations
ALTER TABLE template_installations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own template installations"
    ON template_installations
    FOR ALL
    USING (auth.uid() = user_id);

-- Template marketplace categories (public read, admin write)
ALTER TABLE template_marketplace_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active marketplace categories"
    ON template_marketplace_categories
    FOR SELECT
    USING (is_active = true);

-- Template tags (public read, community write)
ALTER TABLE template_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view template tags"
    ON template_tags
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create template tags"
    ON template_tags
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Template tag associations
ALTER TABLE template_tag_associations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view template tag associations"
    ON template_tag_associations
    FOR SELECT
    USING (true);

CREATE POLICY "Template owners can manage tag associations"
    ON template_tag_associations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM agent_templates 
            WHERE agent_templates.id = template_tag_associations.template_id 
            AND agent_templates.created_by = auth.uid()
        )
    );

-- Functions for automatic updates

-- Update template usage count when analytics are inserted
CREATE OR REPLACE FUNCTION update_template_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE agent_templates 
    SET usage_count = usage_count + NEW.usage_count
    WHERE id = NEW.template_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_template_usage_count_trigger
    AFTER INSERT ON template_usage_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_template_usage_count();

-- Update tag usage count when associations are created/deleted
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE template_tags 
        SET usage_count = usage_count + 1
        WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE template_tags 
        SET usage_count = usage_count - 1
        WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tag_usage_count_trigger
    AFTER INSERT OR DELETE ON template_tag_associations
    FOR EACH ROW
    EXECUTE FUNCTION update_tag_usage_count();

-- Functions for template ratings (referenced in template-manager.ts)
CREATE OR REPLACE FUNCTION increment_template_usage(template_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE agent_templates 
    SET usage_count = usage_count + 1
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_template_rating(template_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE agent_templates 
    SET rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM template_reviews 
        WHERE template_reviews.template_id = update_template_rating.template_id
    )
    WHERE id = template_id;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX idx_user_preferences_categories ON user_template_preferences USING GIN (preferred_categories);
CREATE INDEX idx_user_preferences_tags ON user_template_preferences USING GIN (preferred_tags);
CREATE INDEX idx_template_analytics_metrics ON template_usage_analytics USING GIN (metrics);
CREATE INDEX idx_template_collections_tags ON template_collections USING GIN (tags);

-- Comments for documentation
COMMENT ON TABLE user_template_preferences IS 'User preferences for template recommendations';
COMMENT ON TABLE template_usage_analytics IS 'Analytics data for template usage and trending';
COMMENT ON TABLE template_collections IS 'Curated collections of templates';
COMMENT ON TABLE template_collection_items IS 'Templates within collections';
COMMENT ON TABLE template_forks IS 'Tracks template derivations and customizations';
COMMENT ON TABLE template_installations IS 'Tracks template downloads and installations';
COMMENT ON TABLE template_marketplace_categories IS 'Enhanced categorization for marketplace';
COMMENT ON TABLE template_tags IS 'Normalized tag system for templates';
COMMENT ON TABLE template_tag_associations IS 'Many-to-many relationship between templates and tags';-- Create 
all indexes for performance
CREATE INDEX IF NOT EXISTS idx_template_analytics_template_date ON template_usage_analytics (template_id, date);
CREATE INDEX IF NOT EXISTS idx_template_analytics_date ON template_usage_analytics (date);
CREATE INDEX IF NOT EXISTS idx_template_analytics_user ON template_usage_analytics (user_id);

CREATE INDEX IF NOT EXISTS idx_template_collections_slug ON template_collections (slug);
CREATE INDEX IF NOT EXISTS idx_template_collections_featured ON template_collections (is_featured);
CREATE INDEX IF NOT EXISTS idx_template_collections_public ON template_collections (is_public);
CREATE INDEX IF NOT EXISTS idx_template_collections_creator ON template_collections (created_by);

CREATE INDEX IF NOT EXISTS idx_collection_items_collection ON template_collection_items (collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_template ON template_collection_items (template_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_position ON template_collection_items (collection_id, position);

CREATE INDEX IF NOT EXISTS idx_template_forks_original ON template_forks (original_template_id);
CREATE INDEX IF NOT EXISTS idx_template_forks_forked ON template_forks (forked_template_id);
CREATE INDEX IF NOT EXISTS idx_template_forks_user ON template_forks (forked_by);

CREATE INDEX IF NOT EXISTS idx_template_installations_template ON template_installations (template_id);
CREATE INDEX IF NOT EXISTS idx_template_installations_user ON template_installations (user_id);
CREATE INDEX IF NOT EXISTS idx_template_installations_date ON template_installations (installed_at);
CREATE INDEX IF NOT EXISTS idx_template_installations_completed ON template_installations (setup_completed);

CREATE INDEX IF NOT EXISTS idx_marketplace_categories_slug ON template_marketplace_categories (slug);
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_parent ON template_marketplace_categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_featured ON template_marketplace_categories (is_featured);
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_active ON template_marketplace_categories (is_active);
CREATE INDEX IF NOT EXISTS idx_marketplace_categories_order ON template_marketplace_categories (display_order);

CREATE INDEX IF NOT EXISTS idx_template_tags_slug ON template_tags (slug);
CREATE INDEX IF NOT EXISTS idx_template_tags_usage ON template_tags (usage_count);
CREATE INDEX IF NOT EXISTS idx_template_tags_featured ON template_tags (is_featured);

CREATE INDEX IF NOT EXISTS idx_template_tag_assoc_template ON template_tag_associations (template_id);
CREATE INDEX IF NOT EXISTS idx_template_tag_assoc_tag ON template_tag_associations (tag_id);
CREATE INDEX IF NOT EXISTS idx_template_tag_assoc_relevance ON template_tag_associations (relevance_score);