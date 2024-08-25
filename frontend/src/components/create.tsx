'use client';

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

import ProcessedVideoCard from '@/components/ProcessedVideoCard';
import ProcessingBar from "@/components/ProcessingBar";

import lunarisLogo from "@/assets/lunaris_solid.svg";

interface Clip {
  video_url: string;
  metadata: {
    title: string;
    description: string;
    score: number;
    hook: string;
    flow: string;
    engagement: string;
    trend: string;
  };
}

export function Create() {
  const router = useRouter(); 
  const [videoLink, setVideoLink] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [processing, setProcessing] = useState(false);
  const [clipLength, setClipLength] = useState("Auto (0m~3m)");
  const [processedClips, setProcessedClips] = useState<Clip[]>([]);
  const [progress, setProgress] = useState(0);
  // const [addCaption, setAddCaption] = useState(false);
  const [genre, setGenre] = useState("Auto");
  const [videoQuality, setVideoQuality] = useState("Auto");
  const [processingTimeframe, setProcessingTimeframe] = useState(50);
  const [keywords, setKeywords] = useState("");

  const backend_url = "" || "http://127.0.0.1:5001";

  const handleProcessClick = async () => {
    setProcessing(true);
    const response = await fetch(`${backend_url}/api/process-video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ link: videoLink, 
        genre,
        videoQuality,
        processingTimeframe,
        clipLength,
        keywords }),
    });

    if (response.ok) {
      const data = await response.json();
      pollVideoStatus(data.video_id);
    } else {
      setProcessing(false);
      // Handle error
    }
  };

  const pollVideoStatus = async (videoId: string) => {
    const interval = setInterval(async () => {
      const response = await fetch(`${backend_url}/api/video-status/${videoId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'completed') {
          clearInterval(interval);
          setProcessing(false);
          setProgress(100);
          fetchProcessedClips(videoId);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setProcessing(false);
          // Handle error
        } else {
          setProgress((prev) => (prev < 90 ? prev + 10 : prev));
        }
      }
    }, 3000);
  };

  const fetchProcessedClips = async (videoId: string) => {
    const response = await fetch(`${backend_url}/api/get-video/${videoId}`);
    if (response.ok) {
      const data = await response.json();
      setProcessedClips(data.clips);
    }
  };

  const handleClipLengthClick = (length: string) => {
    setClipLength(length);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <header className="flex items-center justify-between py-4">
        <div className="flex items-center space-x-4">
          <img src={lunarisLogo.src} width={45} height={45} alt="Lunaris" />
          <span className="ml-2 text-white text-2xl font-bold">Lunaris</span>
        </div>
        <nav className="flex items-center space-x-4"></nav>
        <div className="flex items-center space-x-4"></div>
      </header>
      <main className="flex flex-col items-center space-y-8">
        <div className="flex items-center w-full max-w-2xl space-x-4">
          <Input
            placeholder="Drop a YouTube link"
            className="flex-1 bg-gray-800 text-white"
            value={videoLink}
            onChange={(e) => setVideoLink(e.target.value)}
          />
          <Button className="bg-blue-500" onClick={handleProcessClick} disabled={processing}>
            {processing ? "Processing..." : "Get viral clips"}
          </Button>
        </div>
        {/* <div className="flex items-center w-full max-w-2xl space-x-4 border border-gray-600 rounded-lg p-4">
          <span>Choose a file (mp4, mov, mkv, webm), or drag it here</span>
          <UploadIcon className="w-6 h-6 text-gray-400" />
        </div> */}
        <div className="w-full max-w-2xl bg-gray-800 p-4 rounded-lg">
          {/* <h2 className="text-lg font-bold">Only add caption without clipping?</h2>
          <div className="flex justify-between items-center mb-4">
            <input 
              type="checkbox" 
              className="toggle-checkbox" 
              checked={addCaption}
              onChange={(e) => setAddCaption(e.target.checked)}
            />
          </div> */}
          <h2 className="text-lg font-bold">Genre of video </h2>
          <select 
            className="w-full bg-gray-800 text-white rounded-md p-2 mb-4"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            <option>Auto</option>
            <option>Podcast</option>
            <option>Anime</option>
            {/* <option>Gaming</option> */}
            <option>TV shows</option>
          </select>
          <h2 className="text-lg font-bold">Video Quality</h2>
          <select 
            className="w-full bg-gray-800 text-white rounded-md p-2 mb-4"
            value={videoQuality}
            onChange={(e) => setVideoQuality(e.target.value)}
          >
            <option>1080p</option>
            <option>720p</option>
            <option>480p</option>
            <option>360p</option>
          </select>
          <h2 className="text-lg font-bold">Processing timeframe</h2>
          <div className="w-full mb-4">
            <input 
              type="range" 
              min="0" 
              max="100" 
              className="slider"
              value={processingTimeframe}
              onChange={(e) => setProcessingTimeframe(Number(e.target.value))}
            />
          </div>
          <h2 className="text-lg font-bold">Preferred clip length</h2>
          <div className="flex space-x-2 mb-4">
            <button
              className={`rounded-md px-2 py-1 ${clipLength === "Auto (0m~3m)" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"}`}
              onClick={() => handleClipLengthClick("Auto (0m~3m)")}>
              Auto (0m~1m)
            </button>
            <button
              className={`rounded-md px-2 py-1 ${clipLength === "<30s" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"}`}
              onClick={() => handleClipLengthClick("<30s")}>
              &lt;30s
            </button>
            <button
              className={`rounded-md px-2 py-1 ${clipLength === "30s~60s" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"}`}
              onClick={() => handleClipLengthClick("30s~60s")}
            >
              30s~60s
            </button>
            <button
              className={`rounded-md px-2 py-1 ${clipLength === "60s~90s" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"}`}
              onClick={() => handleClipLengthClick("60s~90s")}
            >
              60s~90s
            </button>
            <button
              className={`rounded-md px-2 py-1 ${clipLength === "90s~3m" ? "bg-blue-500 text-white" : "bg-gray-600 text-white"}`}
              onClick={() => handleClipLengthClick("90s~3m")}
            >
              90s~3m
            </button>
          </div>
          <h2 className="text-lg font-bold">Topic filter by keywords (optional)</h2>
          <input 
            type="text" 
            className="w-full bg-gray-800 text-white rounded-md p-2 mb-4" 
            placeholder="Add keywords, comma-separated"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
        </div>
        {processing && <ProcessingBar progress={progress} />}
        {processedClips.map((clip, index) => (
          <ProcessedVideoCard key={index} videoUrl={clip.video_url} metadata={clip.metadata} />
        ))}
      </main>
    </div>
  );
}
