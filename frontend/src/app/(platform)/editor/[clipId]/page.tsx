'use client';

import { useEffect, useState } from 'react';
import { VideoEditor } from '@/components/platform/VideoEditor';
import { Clip } from '@/lib/database/models/clip.model';

export default function EditorPage({ params }: { params: { clipId: string } }) {
  const [clip, setClip] = useState<Clip | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClip = async () => {
      try {
        const response = await fetch(`/api/get-clip-data/${params.clipId}`);
        if (!response.ok) throw new Error('Failed to fetch clip');
        const data = await response.json();
        setClip(data);
      } catch (error) {
        console.error('Error fetching clip:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClip();
  }, [params.clipId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-n-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-color-1"></div>
      </div>
    );
  }

  if (!clip || !clip.padded_word_timings || !clip.segment_indices) {
    return (
      <div className="h-screen flex items-center justify-center bg-n-8">
        <p className="text-n-1">Clip not found or missing required data</p>
      </div>
    );
  }

  return (
    <VideoEditor
      clipId={params.clipId}
      videoUrl={clip.s3_uri}
      padded_word_timings={clip.padded_word_timings}
      segment_indices={clip.segment_indices}
    />
  );
}
