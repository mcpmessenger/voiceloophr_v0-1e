"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

const logos = [
  {
    // VoiceLoop brand
    src: "/images/voiceloop-logo.png",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/voiceloop+white+bkg.png",
    alt: "VoiceLoop"
  },
  {
    // OpenAI brand (dark vs light)
    src: "https://automationalien.s3.us-east-1.amazonaws.com/OpenAI.png",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/OpenAI_Logo.svg",
    alt: "OpenAI"
  },
  {
    // ElevenLabs brand (dark vs light)
    src: "https://automationalien.s3.us-east-1.amazonaws.com/elevenlabsblk.png",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/ElevenLabs_logo_white(2022-2024).png",
    alt: "ElevenLabs"
  },
  {
    // Supabase brand (dark vs light)
    src: "https://automationalien.s3.us-east-1.amazonaws.com/supabase-logo-wordmark--dark.svg",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/supabase-logo-wordmark--light.png",
    alt: "Supabase"
  },
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/amazon-textract.webp",
    alt: "AWS Textract"
  }
]

export default function LogoShowcase() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500)
    return () => clearTimeout(timer)
  }, [])

  if (!isVisible) return null

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-background via-muted/20 to-background py-12">
      {/* Gradient overlays for smooth edges */}
      <div className="absolute left-0 top-0 h-full w-48 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />
      <div className="absolute right-0 top-0 h-full w-48 bg-gradient-to-l from-background via-background/80 to-transparent z-10" />
      
      {/* Scrolling container */}
      <div className="flex items-center animate-scroll-x-fast space-x-32 px-16">
        {/* Duplicate logos for seamless loop */}
        {[...logos, ...logos, ...logos, ...logos].map((logo: any, index) => (
          <div
            key={`${logo.alt}-${index}`}
            className="flex items-center justify-center min-w-[200px]"
          >
            <div className="h-24 w-40 flex items-center justify-center">
              {/* Light/dark swap using class-based theme for reliability */}
              <div className="block dark:hidden">
                <Image
                  src={logo.lightSrc || logo.src}
                  alt={logo.alt}
                  width={96}
                  height={96}
                  className="h-full w-full object-contain"
                  sizes="96px"
                  unoptimized
                />
              </div>
              <div className="hidden dark:block">
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={96}
                  height={96}
                  className="h-full w-full object-contain"
                  sizes="96px"
                  unoptimized
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
