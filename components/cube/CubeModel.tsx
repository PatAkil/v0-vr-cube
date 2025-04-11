"use client"

import { useState, useRef } from "react"
import { Group } from "three"
import type { CubePiece } from "./types"
import { CubePiece as CubePieceComponent } from "./CubePiece"
import { initializeCubeState } from "@/lib/rubiks-cube-utils"

export function CubeModel() {
  const [cubeState] = useState<CubePiece[]>(() => initializeCubeState())
  const cubeRef = useRef<Group>(null)

  return (
    <group ref={cubeRef}>
      {cubeState.map((piece, index) => (
        <CubePieceComponent key={index} piece={piece} />
      ))}
    </group>
  )
} 