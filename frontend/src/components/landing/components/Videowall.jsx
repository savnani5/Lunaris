'use client'

import React from 'react';
import Heading from "./Heading";
import Section from "./Section";


const chrisVideo = '/assets/caption_styles/chris.mp4';
const elonVideo = '/assets/caption_styles/elon_wall.mp4';
const imanVideo = '/assets/caption_styles/iman_gadzi.mp4';
const sadiaVideo = '/assets/caption_styles/sadia.mp4';
const jakeVideo = '/assets/caption_styles/jake.mp4';
const mattVideo = '/assets/caption_styles/matt.mp4';
const bigBangVideo = '/assets/caption_styles/big_bang.mp4';
const ycVideo = '/assets/caption_styles/yc.mp4';

const videos = [
  { src: chrisVideo },
  { src: elonVideo },
  { src: imanVideo },
  { src: sadiaVideo },
  { src: mattVideo },
  { src: jakeVideo },
  { src: bigBangVideo },
  { src: ycVideo },
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