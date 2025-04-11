"use client"

import { useState, useRef, useEffect } from "react"
import { Canvas, useThree } from "@react-three/fiber"
import { Box, OrbitControls, Text } from "@react-three/drei"
import { Vector3, Matrix4, Quaternion, Group, WebGLRenderer } from "three"
import { XR, VRButton, useXR, createXRStore, Interactive, RayGrab } from "@react-three/xr"

// Define types
interface CubePiece {
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

interface SelectedFace {
  piece: CubePiece
  face: string
}

interface RotatingFace {
  axis: number
  layer: number
  direction: number
  progress: number
}

interface EnterVREvent extends CustomEvent {
  detail: {
    session: any // Using any for XRSession as it's not exported from three
  }
}

// Define the standard Rubik's cube colors
const COLORS = {
  white: "#FFFFFF", // Top
  yellow: "#FFFF00", // Bottom
  red: "#FF0000", // Right
  orange: "#FFA500", // Left
  blue: "#0000FF", // Front
  green: "#00FF00", // Back
  black: "#1A1A1A", // For inner faces
}

// Define the cube size and spacing
const CUBE_SIZE = 0.95
const CUBE_SPACING = 1
const CUBE_DIMENSIONS = 3 // 3x3x3 cube

export default function RubiksCube() {
  const store = createXRStore()

  return (
    <div className="w-full h-full">
      <div className="absolute top-4 left-4 z-10 bg-black/50 text-white p-4 rounded-md">
        <h2 className="text-xl font-bold mb-2">Controls:</h2>
        <p>1. Use VR controllers to grab and rotate cube faces</p>
        <p>2. Press trigger to grab a face</p>
        <p>3. Move your hand/controller to rotate the face</p>
        <p>4. Release trigger to complete the rotation</p>
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <VRButton store={store} />
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

function CubeModel() {
  const [cubeState, setCubeState] = useState<CubePiece[]>(() => initializeCubeState())
  const [selectedFace, setSelectedFace] = useState<SelectedFace | null>(null)
  const [rotatingFace, setRotatingFace] = useState<RotatingFace | null>(null)
  const [grabbedFace, setGrabbedFace] = useState<SelectedFace | null>(null)
  const cubeRef = useRef<Group>(null)

  const handleSelect = (piece: CubePiece, face: string) => {
    if (rotatingFace) return
    setSelectedFace({ piece, face })
  }

  const handleGrab = (piece: CubePiece, face: string) => {
    setGrabbedFace({ piece, face })
  }

  const handleRelease = () => {
    setGrabbedFace(null)
  }

  return (
    <group ref={cubeRef} position={[0, 0, 0]}>
      {cubeState.map((piece, index) => (
        <CubePiece
          key={index}
          index={index}
          position={piece.position}
          colors={piece.colors}
          onSelect={handleSelect}
          onGrab={handleGrab}
          onRelease={handleRelease}
          isSelected={selectedFace?.piece === piece}
          isGrabbed={grabbedFace?.piece === piece}
          rotatingFace={rotatingFace}
        />
      ))}
    </group>
  )
}

interface CubePieceProps {
  index: number
  position: [number, number, number]
  colors: CubePiece['colors']
  onSelect: (piece: CubePiece, face: string) => void
  onGrab: (piece: CubePiece, face: string) => void
  onRelease: () => void
  isSelected: boolean
  isGrabbed: boolean
  rotatingFace: RotatingFace | null
}

function CubePiece({ index, position, colors, onSelect, onGrab, onRelease, isSelected, isGrabbed, rotatingFace }: CubePieceProps) {
  const meshRef = useRef<Group>(null)

  useEffect(() => {
    if (!rotatingFace || !meshRef.current) return

    const { axis, layer, direction } = rotatingFace
    const piecePosition = new Vector3(...position)

    if (Math.abs(piecePosition.getComponent(axis) - layer) < 0.1) {
      const rotationAxis = new Vector3()
      rotationAxis.setComponent(axis, 1)

      const targetQuaternion = new Quaternion().setFromAxisAngle(rotationAxis, (direction * Math.PI) / 2)

      let startTime: number | null = null
      const duration = 300 // ms

      const animate = (time: number) => {
        if (!startTime) startTime = time
        const elapsed = time - startTime
        const progress = Math.min(elapsed / duration, 1)

        const currentQuaternion = new Quaternion().slerp(targetQuaternion, progress)
        meshRef.current!.quaternion.copy(currentQuaternion)

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    }
  }, [rotatingFace, position])

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect({ position, colors }, detectFace(position))
  }

  return (
    <Interactive onSelect={() => onGrab({ position, colors }, detectFace(position))}>
      <RayGrab>
        <group 
          ref={meshRef} 
          position={position} 
          scale={isSelected || isGrabbed ? [1.05, 1.05, 1.05] : [1, 1, 1]}
        >
          <Box args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]}>
            <meshStandardMaterial attach="material-0" color={colors.front || COLORS.black} roughness={0.3} metalness={0.2} />
            <meshStandardMaterial attach="material-1" color={colors.back || COLORS.black} roughness={0.3} metalness={0.2} />
            <meshStandardMaterial attach="material-2" color={colors.top || COLORS.black} roughness={0.3} metalness={0.2} />
            <meshStandardMaterial attach="material-3" color={colors.bottom || COLORS.black} roughness={0.3} metalness={0.2} />
            <meshStandardMaterial attach="material-4" color={colors.right || COLORS.black} roughness={0.3} metalness={0.2} />
            <meshStandardMaterial attach="material-5" color={colors.left || COLORS.black} roughness={0.3} metalness={0.2} />
          </Box>
        </group>
      </RayGrab>
    </Interactive>
  )
}

function detectFace(position: [number, number, number]): string {
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

function getFaceAxis(face: string): number {
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

function getLayerFromPosition(position: [number, number, number], axis: number): number {
  return position[axis]
}

function rotateFace(cubeState: CubePiece[], axis: number, layer: number, direction: number): CubePiece[] {
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

function initializeCubeState(): CubePiece[] {
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
