"use client"

import dynamic from "next/dynamic"

// Import the Rubik's cube component dynamically to avoid SSR issues
const RubiksCube = dynamic(() => import("@/components/rubiks-cube"), {
  ssr: false,
  loading: () => <div className="flex h-screen items-center justify-center">Loading 3D Scene...</div>,
})

export default function Home() {
  return (
    <main className="w-full h-screen">
      <RubiksCube />
    </main>
  )
}
