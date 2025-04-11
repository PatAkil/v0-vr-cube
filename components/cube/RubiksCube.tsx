"use client"

import { Canvas } from "@react-three/fiber"
import { XR, createXRStore, type XRStore } from "@react-three/xr"
import { OrbitControls } from "@react-three/drei"
import { CubeModel } from "./CubeModel"
import { useState, useEffect } from "react"

export function RubiksCube() {
  const [store, setStore] = useState<XRStore | null>(null)

  useEffect(() => {
    // Create store only on client side
    setStore(createXRStore())
  }, [])

  if (!store) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-xl">Loading VR...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <div className="absolute top-4 left-4 z-10 bg-black/50 text-white p-4 rounded-md">
        <h2 className="text-xl font-bold mb-2">Controls:</h2>
        <p>1. Use VR controllers to grab and rotate cube faces</p>
        <p>2. Press trigger to grab a face</p>
        <p>3. Move your hand/controller to rotate the face</p>
        <p>4. Release trigger to complete the rotation</p>
      </div>


      <Canvas>
        <XR store={store}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <group position={[0, 1.6, -3]}>
            <CubeModel />
          </group>
          <OrbitControls />
        </XR>
      </Canvas>
    </div>
  )
} 