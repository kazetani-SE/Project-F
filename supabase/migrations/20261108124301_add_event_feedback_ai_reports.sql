-- ============================================================================
-- Migration: add_event_feedback_ai_reports
-- Lưu trữ báo cáo tổng hợp Feedback được sinh bởi AI Agent kèm Snapshot Watermark
-- (feedback_count_snapshot, latest_feedback_at_snapshot) để tối ưu chi phí AWS Bedrock
-- và tự động phát hiện khi có thêm dữ liệu khảo sát mới (Staleness Detection).
-- ============================================================================

CREATE TABLE event_feedback_ai_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    model_used VARCHAR(100) NOT NULL,
    model_tier VARCHAR(20) NOT NULL CHECK (model_tier IN ('FAST', 'DEEP', 'HEURISTIC')),
    feedback_count_snapshot INT NOT NULL CHECK (feedback_count_snapshot >= 0),
    latest_feedback_at_snapshot TIMESTAMPTZ,
    average_rating_snapshot NUMERIC(4, 2) NOT NULL DEFAULT 0.00,
    executive_summary TEXT NOT NULL,
    sentiment_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    top_highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
    top_improvements JSONB NOT NULL DEFAULT '[]'::jsonb,
    department_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_incidents JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_feedback_ai_reports_event_id ON event_feedback_ai_reports(event_id);
