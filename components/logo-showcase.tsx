"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

const logos = [
  {
    src: "/images/voiceloop-logo.png",
    alt: "VoiceLoop"
  },
  {
    src: "/images/OpenAI.png",
    alt: "OpenAI"
  },
  {
    src: "/images/elevenlabsblk.png",
    alt: "ElevenLabs"
  },
  {
    src: "/images/supabase-logo-wordmark--dark.svg",
    alt: "Supabase"
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
      <div className="flex animate-scroll-x space-x-32 px-16">
        {/* Duplicate logos for seamless loop */}
        {[...logos, ...logos, ...logos, ...logos].map((logo, index) => (
          <div
            key={`${logo.alt}-${index}`}
            className="flex items-center justify-center min-w-[200px] group"
          >
            <div className="h-24 w-24 transition-transform duration-500 group-hover:scale-110">
              <Image
                src={logo.src}
                alt={logo.alt}
                width={96}
                height={96}
                className="h-full w-full object-contain"
                sizes="96px"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
