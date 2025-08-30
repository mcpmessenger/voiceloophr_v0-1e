import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import VoiceChat from "@/components/voice-chat"

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-thin border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/images/voiceloop-logo.png" alt="VoiceLoop" width={40} height={40} className="rounded-lg" />
              <span className="text-xl font-light text-foreground">VoiceLoop</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="font-light bg-transparent" asChild>
                <Link href="/settings">Settings</Link>
              </Button>
              <Button variant="outline" size="sm" className="font-light bg-transparent" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Content */}
      <section className="py-8 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-light text-foreground mb-2">AI Voice Chat</h1>
            <p className="text-muted-foreground font-light">Have a conversation with AI using voice or text</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <VoiceChat />
          </div>
        </div>
      </section>
    </div>
  )
}
