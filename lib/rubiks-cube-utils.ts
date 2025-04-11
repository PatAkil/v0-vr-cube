import { Vector3, Matrix4, Quaternion } from "three"

// Types
export interface CubePiece {
  position: [number, number, number]
  colors: {
    front?: string
    back?: string
    top?: string
    bottom?: string
    right?: string
    left?: string
  }
}

export interface SelectedFace {
  piece: CubePiece
  face: string
}

export interface GrabbedFace {
  piece: CubePiece
  face: string
}

export interface RotatingFace {
  axis: number
  layer: number
  direction: number
  progress: number
}

// Constants
export const COLORS = {
  white: "#F8F8F8",    // Slightly off-white for better contrast
  yellow: "#FFD700",   // Gold yellow
  red: "#FF3333",      // Bright red
  orange: "#FF8C00",   // Dark orange
  blue: "#0066FF",     // Bright blue
  green: "#00CC00",    // Bright green
  black: "#1A1A1A",    // Dark gray for inner faces
}

export const CUBE_SIZE = 0.95
export const CUBE_SPACING = 1
export const CUBE_DIMENSIONS = 3 // 3x3x3 cube

// Helper functions
export function detectFace(position: [number, number, number]): string {
  const [x, y, z] = position
  const absX = Math.abs(x)
  const absY = Math.abs(y)
  const absZ = Math.abs(z)

  if (absX >= absY && absX >= absZ) {
    return x > 0 ? "right" : "left"
  } else if (absY >= absX && absY >= absZ) {
    return y > 0 ? "top" : "bottom"
  } else {
    return z > 0 ? "front" : "back"
  }
}

export function getFaceAxis(face: string): number {
  switch (face) {
    case "right":
    case "left":
      return 0 // x-axis
    case "top":
    case "bottom":
      return 1 // y-axis
    case "front":
    case "back":
      return 2 // z-axis
    default:
      return 0
  }
}

export function getLayerFromPosition(position: [number, number, number], axis: number): number {
  return position[axis]
}

export function rotateFace(cubeState: CubePiece[], axis: number, layer: number, direction: number): CubePiece[] {
  const newState = [...cubeState]
  const piecesToRotate = newState.filter((piece) => Math.abs(piece.position[axis] - layer) < 0.1)

  piecesToRotate.forEach((piece) => {
    const rotationMatrix = new Matrix4()
    const rotationAxis = new Vector3()
    rotationAxis.setComponent(axis, 1)

    rotationMatrix.makeRotationAxis(rotationAxis, (direction * Math.PI) / 2)

    const position = new Vector3(...piece.position)
    position.applyMatrix4(rotationMatrix)
    piece.position = [position.x, position.y, position.z]

    const { colors } = piece
    const newColors = { ...colors }

    if (axis === 0) {
      if (direction > 0) {
        newColors.top = colors.front
        newColors.back = colors.top
        newColors.bottom = colors.back
        newColors.front = colors.bottom
      } else {
        newColors.front = colors.top
        newColors.top = colors.back
        newColors.back = colors.bottom
        newColors.bottom = colors.front
      }
    } else if (axis === 1) {
      if (direction > 0) {
        newColors.front = colors.right
        newColors.right = colors.back
        newColors.back = colors.left
        newColors.left = colors.front
      } else {
        newColors.right = colors.front
        newColors.back = colors.right
        newColors.left = colors.back
        newColors.front = colors.left
      }
    } else if (axis === 2) {
      if (direction > 0) {
        newColors.top = colors.left
        newColors.right = colors.top
        newColors.bottom = colors.right
        newColors.left = colors.bottom
      } else {
        newColors.left = colors.top
        newColors.top = colors.right
        newColors.right = colors.bottom
        newColors.bottom = colors.left
      }
    }

    piece.colors = newColors
  })

  return newState
}

export function initializeCubeState(): CubePiece[] {
  const pieces: CubePiece[] = []
  const offset = (CUBE_DIMENSIONS - 1) / 2

  // Generate all pieces of the cube
  for (let x = 0; x < CUBE_DIMENSIONS; x++) {
    for (let y = 0; y < CUBE_DIMENSIONS; y++) {
      for (let z = 0; z < CUBE_DIMENSIONS; z++) {
        // Skip internal pieces (not visible)
        if (
          x !== 0 &&
          x !== CUBE_DIMENSIONS - 1 &&
          y !== 0 &&
          y !== CUBE_DIMENSIONS - 1 &&
          z !== 0 &&
          z !== CUBE_DIMENSIONS - 1
        ) {
          continue
        }

        const position: [number, number, number] = [
          (x - offset) * CUBE_SPACING,
          (y - offset) * CUBE_SPACING,
          (z - offset) * CUBE_SPACING
        ]

        const colors: CubePiece['colors'] = {
          right: x === CUBE_DIMENSIONS - 1 ? COLORS.red : COLORS.black,
          left: x === 0 ? COLORS.orange : COLORS.black,
          top: y === CUBE_DIMENSIONS - 1 ? COLORS.white : COLORS.black,
          bottom: y === 0 ? COLORS.yellow : COLORS.black,
          front: z === CUBE_DIMENSIONS - 1 ? COLORS.blue : COLORS.black,
          back: z === 0 ? COLORS.green : COLORS.black,
        }

        pieces.push({ position, colors })
      }
    }
  }

  return pieces
} 