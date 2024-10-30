'use client'

import React from 'react';
import Heading from "./Heading";
import Section from "./Section";
import { big_bang, chris_williamson, jake_paul, matt_rife, dbz, imanGadzi, yc, naruto, elon } from "@/components/landing/assets";

const videos = [
  { src: chris_williamson },
  { src: big_bang },
  // { src: dbz },
  {src: elon},
  { src: matt_rife },
  { src: jake_paul },
  { src: imanGadzi },
  { src: yc },
  { src: naruto }
];

const VideoCard = ({ src }) => {
  const [error, setError] = React.useState(false);

  if (error) {
    return <div className="relative overflow-hidden rounded-2xl shadow-lg w-50 h-90 mx-3 bg-gray-200 flex items-center justify-center">Video unavailable</div>;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-lg w-50 h-90 mx-3">
      <video
        src={src}
        className="w-full h-full object-cover"
        muted
        autoPlay
        loop
        playsInline
        onError={() => setError(true)}
      />
    </div>
  );
};

const VideoWall = () => {
  return (
    <Section id="showcase">
      <div className="container relative z-2 text-center">
        <Heading
          className="md:max-w-md lg:max-w-2xl"
          title="Content creators &nbsp;❤️&nbsp; our platform"
        />
        <div className="py-2 lg:py-2 xl:py-2 px-4 sm:px-6 md:px-8 md:py-2 lg:px-12">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {videos.map((video, index) => (
              <VideoCard key={index} src={video.src} />
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
};

export default VideoWall;