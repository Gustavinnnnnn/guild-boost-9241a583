INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-images', 'campaign-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view campaign images"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-images');

CREATE POLICY "Users can upload own campaign images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'campaign-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own campaign images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'campaign-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own campaign images"
ON storage.objects FOR DELETE
USING (bucket_id = 'campaign-images' AND auth.uid()::text = (storage.foldername(name))[1]);