"use client"

import { useRef } from "react"
import { Box } from "@react-three/drei"
import { Group } from "three"
import type { CubePiece } from "./types"
import { COLORS, CUBE_SIZE } from "@/lib/rubiks-cube-utils"

interface CubePieceProps {
  piece: CubePiece
}

export function CubePiece({ piece }: CubePieceProps) {
  const meshRef = useRef<Group>(null)

  return (
    <group ref={meshRef} position={piece.position}>
      <Box args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]}>
        {[
          { dir: [0, 0, 1], color: piece.colors.front ?? COLORS.black },
          { dir: [0, 0, -1], color: piece.colors.back ?? COLORS.black },
          { dir: [0, 1, 0], color: piece.colors.top ?? COLORS.black },
          { dir: [0, -1, 0], color: piece.colors.bottom ?? COLORS.black },
          { dir: [1, 0, 0], color: piece.colors.right ?? COLORS.black },
          { dir: [-1, 0, 0], color: piece.colors.left ?? COLORS.black },
        ].map((face, i) => (
          <meshStandardMaterial
            key={i}
            attach={`material-${i}`}
            color={face.color}
            roughness={0.3}
            metalness={0.2}
          />
        ))}
      </Box>
    </group>
  )
} 