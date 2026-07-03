-- Link try-on requests to preview generations and track VTON job ids
ALTER TABLE try_on_requests
    ADD COLUMN preview_generation_id UUID REFERENCES preview_generations(id);

ALTER TABLE preview_generations
    ADD COLUMN vton_job_id TEXT;

CREATE INDEX idx_preview_generations_vton_job ON preview_generations(vton_job_id)
    WHERE vton_job_id IS NOT NULL;

CREATE INDEX idx_try_on_preview_generation ON try_on_requests(preview_generation_id)
    WHERE preview_generation_id IS NOT NULL;
