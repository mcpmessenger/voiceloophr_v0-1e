"use client"

import Image from "next/image"
import { useEffect, useState, useCallback } from "react"
import useEmblaCarousel from "embla-carousel-react"
import AutoScroll from "embla-carousel-auto-scroll"

const logos = [
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/OpenAI-white-wordmark.svg",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/OpenAI-black-wordmark.svg",
    alt: "OpenAI"
  },
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/elevenlabs-logo-white.svg",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/elevenlabs-logo-black.svg",
    alt: "ElevenLabs"
  },
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/supabase-logo-wordmark--dark.svg",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/supabase-logo-wordmark--light.png",
    alt: "Supabase"
  },
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/Google_Calendar_icon_(2020).svg",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/Google_Calendar_icon_(2020).svg",
    alt: "Google Calendar"
  },
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/Google_Drive_icon_(2020)+(1).svg",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/Google_Drive_icon_(2020)+(1).svg",
    alt: "Google Drive"
  },
  {
    src: "https://automationalien.s3.us-east-1.amazonaws.com/Outlook.com_icon_(2012-2019).svg",
    lightSrc: "https://automationalien.s3.us-east-1.amazonaws.com/Outlook.com_icon_(2012-2019).svg",
    alt: "Outlook"
  },
]

export default function LogoShowcase() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "start", dragFree: false, containScroll: false },
    [AutoScroll({ speed: 1.2, startDelay: 0, stopOnInteraction: false })]
  )

  // Ensure AutoScroll keeps playing on init and after any interaction
  useEffect(() => {
    if (!emblaApi) return
    const auto = (emblaApi.plugins() as any)?.autoScroll
    const play = () => {
      try { auto?.play?.() } catch {}
    }
    play()
    emblaApi.on('reInit', play).on('select', play).on('pointerUp', play)
    return () => {
      try {
        emblaApi.off('reInit', play)
        emblaApi.off('select', play)
        emblaApi.off('pointerUp', play)
      } catch {}
    }
  }, [emblaApi])

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-background via-muted/20 to-background py-12">
      <div className="absolute left-0 top-0 h-full w-48 bg-gradient-to-r from-background via-background/80 to-transparent z-10" />
      <div className="absolute right-0 top-0 h-full w-48 bg-gradient-to-l from-background via-background/80 to-transparent z-10" />

      <div className="embla" ref={emblaRef}>
        <div className="embla__container flex gap-32">
          {logos.map((logo: any, index) => {
            const afterSpacing = logo.alt === 'Outlook' ? 'mr-24' : ''
            return (
            <div key={`${logo.alt}-${index}`} className={`embla__slide flex-[0_0_auto] px-2 ${afterSpacing}`}>
              <div className={`h-24 ${(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook') ? 'w-24' : 'w-36'} flex items-center justify-center rounded-md`}
                   style={{ zIndex: 1 }}>
                <div className="block dark:hidden">
                  <Image
                    src={logo.lightSrc || logo.src}
                    alt={logo.alt}
                    width={(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook') ? 60 : 80}
                    height={(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook') ? 60 : 80}
                    className="h-full w-full object-contain drop-shadow-sm"
                    sizes="84px"
                    unoptimized
                  />
                </div>
                <div className="hidden dark:block">
                  <Image
                    src={logo.src}
                    alt={logo.alt}
                    width={(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook') ? 60 : 80}
                    height={(logo.alt === 'Google Calendar' || logo.alt === 'Google Drive' || logo.alt === 'Outlook') ? 60 : 80}
                    className="h-full w-full object-contain drop-shadow-sm"
                    sizes="84px"
                    unoptimized
                  />
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  )
}
