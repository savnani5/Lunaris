'use client'

import { curve, heroBackground, hero_video } from "@/components/landing/assets"; 
import Button from "./Button";
import Section from "./Section";
import { useRef } from "react";
import CompanyLogos from "./CompanyLogos";
import Image from "next/image";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

const Hero = () => {
  const parallaxRef = useRef(null);
  const { isSignedIn } = useUser();

  return (
    <Section
      className="pt-[8rem] -mt-[5.25rem]"
      crosses
      crossesOffset="lg:translate-y-[5.25rem]"
      customPaddings
      id="hero"
    >
      <div className="container relative" ref={parallaxRef}>
        <div className="relative z-30 max-w-[50rem] mx-auto text-center mb-[2.25rem] md:mb-[3.25rem] lg:mb-[2.25rem]">
          <h1 className="h2 mb-3 font-bold">
            Create Viral Social Media&nbsp;Clips&nbsp;with {` `}
            <span className="inline-block relative">
              Lunaris{" "}
              <Image
                src={curve}
                className="absolute top-full left-0 w-full xl:-mt-2"
                width={624}
                height={28}
                alt="Curve"
              />
            </span>
          </h1>
          <p className="body-1 max-w-3xl mx-auto mb-6 text-n-2 lg:mb-10">
            Go viral with AI generated short videos with automatic captions, reframing and background music. 
          </p>
          {!isSignedIn && (
            <Link href="/sign-up">
              <Button white>
                &nbsp;Get Free Credits&nbsp;
              </Button>
            </Link>
          )}
        </div>
        <div className="relative max-w-[23rem] mx-auto md:max-w-6xl xl:mb-24">
          <div className="relative z-20 p-0.5 rounded-2xl bg-conic-gradient">
            <div className="relative bg-n-8 rounded-[1rem]">
              <div className="h-[1.4rem] bg-n-10 rounded-t-[0.9rem]" />
              {/* <div className="relative aspect-[50/40] rounded-[30px] overflow-hidden z-30 md:aspect-[688/490] lg:aspect-[1024/590]"> */}
              <div className="relative aspect-[50/40] overflow-hidden z-30 md:aspect-[688/490] lg:aspect-[1024/590]">
                <video
                  src={hero_video}
                  // className="w-full scale-[1.2] rounded-[30px] translate-y-[15%] md:scale-[1] md:-translate-y-[-10%] lg:-translate-y-[-1%] lg:-translate-x-[0%]"
                  className="w-full scale-[1.0] translate-y-[17%] md:scale-[1] md:-translate-y-[-10%] lg:-translate-y-[-1%] lg:-translate-x-[0%]"
                  width={1024}
                  height={590}
                  alt="AI"
                  muted
                  autoPlay
                  loop
                  playsInline
                />
              </div>
            </div>
          </div>

          <div className="absolute -top-[80%] left-1/2 w-[125%] -translate-x-1/2 md:-top-[50%] md:w-[88%] lg:-top-[65%] z-10">
            {/* <Image
              src={heroBackground}
              className="w-full"
              width={1440}
              height={1800}
              alt="hero"
            /> */}
          </div>
        </div>
        <CompanyLogos className="hidden relative z-20 mt-20 lg:block" />
      </div>

      {/* <BottomLine /> */}
    </Section>
  );
};

export default Hero;
