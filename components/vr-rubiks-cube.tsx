"use client"

import { useState, useRef, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { VRButton, XR, Interactive, useXR } from "@react-three/xr"
import { Box, Text, OrbitControls } from "@react-three/drei"
import { Vector3, Matrix4, Quaternion, Group, Color } from "three"

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

interface GrabbedFace {
  piece: CubePiece
  face: string
}

// Define the colors for the Rubik's cube faces
const COLORS = {
  white: "#F8F8F8",    // Slightly off-white for better contrast
  yellow: "#FFD700",   // Gold yellow
  red: "#FF3333",      // Bright red
  orange: "#FF8C00",   // Dark orange
  blue: "#0066FF",     // Bright blue
  green: "#00CC00",    // Bright green
  black: "#1A1A1A",    // Dark gray for inner faces
}

// Define the cube size and spacing
const CUBE_SIZE = 0.95
const CUBE_SPACING = 1
const CUBE_DIMENSIONS = 3 // 3x3x3 cube

export default function VRRubiksCube() {
  const { store } = useXR()

  const handleEnterVR = () => {
    store.enterVR()
  }

  return (
    <>
      <button
        onClick={handleEnterVR}
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-blue-600 text-white px-4 py-2 rounded-md"
      >
        Enter VR
      </button>
      <Canvas>
        <XR>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <RubiksCube />
          <EnvironmentSetup />
        </XR>
        <OrbitControls />
      </Canvas>
    </>
  )
}

function EnvironmentSetup() {
  return (
    <>
      {/* Instructions text */}
      <Text position={[0, 2, -3]} fontSize={0.2} color="white" anchorX="center" anchorY="middle">
        VR Rubik's Cube
      </Text>
      <Text position={[0, 1.7, -3]} fontSize={0.1} color="white" anchorX="center" anchorY="middle">
        Grab and rotate cube faces with controllers
      </Text>

      {/* Simple environment */}
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </>
  )
}

function RubiksCube() {
  const [cubeState, setCubeState] = useState<CubePiece[]>(() => initializeCubeState())
  const [grabbedFace, setGrabbedFace] = useState<GrabbedFace | null>(null)
  const [rotationProgress, setRotationProgress] = useState(0)
  const cubeRef = useRef<Group>(null)
  const controllerRef = useRef<Group>(null)
  const lastControllerPosition = useRef<Vector3>(new Vector3())
  const rotationStart = useRef<Quaternion>(new Quaternion())

  // Function to handle face grabbing
  const handleGrab = (piece: CubePiece, face: string) => {
    if (grabbedFace) return
    setGrabbedFace({ piece, face })
    if (controllerRef.current) {
      rotationStart.current.copy(controllerRef.current.quaternion)
    }
  }

  // Function to handle face release
  const handleRelease = () => {
    if (!grabbedFace) return

    // Snap to nearest 90-degree rotation
    const currentRotation = controllerRef.current?.quaternion || new Quaternion()
    const rotationDiff = currentRotation.angleTo(rotationStart.current)
    const snapAngle = Math.round(rotationDiff / (Math.PI / 2)) * (Math.PI / 2)
    
    if (Math.abs(snapAngle) > 0.1) {
      const { piece, face } = grabbedFace
      const axis = getFaceAxis(face)
      const layer = getLayerFromPosition(piece.position, axis)
      const direction = Math.sign(snapAngle)
      
      setCubeState(rotateFace(cubeState, axis, layer, direction))
    }

    setGrabbedFace(null)
    setRotationProgress(0)
  }

  // Update rotation during grab
  useEffect(() => {
    if (!grabbedFace || !controllerRef.current) return

    const animate = () => {
      if (!grabbedFace || !controllerRef.current) return

      const currentRotation = controllerRef.current.quaternion
      const rotationDiff = currentRotation.angleTo(rotationStart.current)
      setRotationProgress(Math.min(Math.abs(rotationDiff) / (Math.PI / 2), 1))

      requestAnimationFrame(animate)
    }

    animate()
  }, [grabbedFace])

  return (
    <group ref={cubeRef} position={[0, 0, -3]}>
      {cubeState.map((piece, index) => (
        <CubePiece
          key={index}
          position={piece.position}
          colors={piece.colors}
          onGrab={handleGrab}
          onRelease={handleRelease}
          isGrabbed={grabbedFace?.piece === piece}
          rotationProgress={rotationProgress}
        />
      ))}
      <group ref={controllerRef} />
    </group>
  )
}

function CubePiece({ 
  position, 
  colors, 
  onGrab, 
  onRelease, 
  isGrabbed, 
  rotationProgress 
}: { 
  position: [number, number, number]
  colors: CubePiece['colors']
  onGrab: (piece: CubePiece, face: string) => void
  onRelease: () => void
  isGrabbed: boolean
  rotationProgress: number
}) {
  const meshRef = useRef<Group>(null)

  return (
    <Interactive
      onSelect={() => onGrab({ position, colors }, detectFace(position))}
      onSelectEnd={onRelease}
    >
      <group
        ref={meshRef}
        position={position}
        scale={isGrabbed ? [1.1, 1.1, 1.1] : [1, 1, 1]}
      >
        <Box args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]}>
          {[
            { dir: [0, 0, 1], color: colors.front || COLORS.black },
            { dir: [0, 0, -1], color: colors.back || COLORS.black },
            { dir: [0, 1, 0], color: colors.top || COLORS.black },
            { dir: [0, -1, 0], color: colors.bottom || COLORS.black },
            { dir: [1, 0, 0], color: colors.right || COLORS.black },
            { dir: [-1, 0, 0], color: colors.left || COLORS.black },
          ].map((face, i) => (
            <meshStandardMaterial
              key={i}
              attach={`material-${i}`}
              color={face.color}
              roughness={0.3}
              metalness={0.2}
              opacity={isGrabbed ? 0.8 : 1}
              transparent={isGrabbed}
            />
          ))}
        </Box>
      </group>
    </Interactive>
  )
}

// Helper functions for cube logic
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

        // Determine which faces are visible for this piece
        const colors: CubePiece['colors'] = {}
        
        // Front face (z = max)
        if (z === CUBE_DIMENSIONS - 1) colors.front = COLORS.blue
        // Back face (z = 0)
        if (z === 0) colors.back = COLORS.green
        // Top face (y = max)
        if (y === CUBE_DIMENSIONS - 1) colors.top = COLORS.white
        // Bottom face (y = 0)
        if (y === 0) colors.bottom = COLORS.yellow
        // Right face (x = max)
        if (x === CUBE_DIMENSIONS - 1) colors.right = COLORS.red
        // Left face (x = 0)
        if (x === 0) colors.left = COLORS.orange

        // For edge and corner pieces, ensure all visible faces have colors
        const isEdge = (x === 0 || x === CUBE_DIMENSIONS - 1) && 
                      (y === 0 || y === CUBE_DIMENSIONS - 1) && 
                      (z !== 0 && z !== CUBE_DIMENSIONS - 1) ||
                      (x === 0 || x === CUBE_DIMENSIONS - 1) && 
                      (z === 0 || z === CUBE_DIMENSIONS - 1) && 
                      (y !== 0 && y !== CUBE_DIMENSIONS - 1) ||
                      (y === 0 || y === CUBE_DIMENSIONS - 1) && 
                      (z === 0 || z === CUBE_DIMENSIONS - 1) && 
                      (x !== 0 && x !== CUBE_DIMENSIONS - 1)

        const isCorner = (x === 0 || x === CUBE_DIMENSIONS - 1) && 
                        (y === 0 || y === CUBE_DIMENSIONS - 1) && 
                        (z === 0 || z === CUBE_DIMENSIONS - 1)

        if (isEdge || isCorner) {
          // Ensure all visible faces have colors
          if (!colors.front && z === CUBE_DIMENSIONS - 1) colors.front = COLORS.blue
          if (!colors.back && z === 0) colors.back = COLORS.green
          if (!colors.top && y === CUBE_DIMENSIONS - 1) colors.top = COLORS.white
          if (!colors.bottom && y === 0) colors.bottom = COLORS.yellow
          if (!colors.right && x === CUBE_DIMENSIONS - 1) colors.right = COLORS.red
          if (!colors.left && x === 0) colors.left = COLORS.orange
        }

        pieces.push({ position, colors })
      }
    }
  }

  return pieces
}

function detectFace(position: [number, number, number]): string {
  const [x, y, z] = position
  const absX = Math.abs(x)
  const absY = Math.abs(y)
  const absZ = Math.abs(z)

  // Determine which face this piece is on based on its position
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
  // Create a new state to avoid mutating the original
  const newState = [...cubeState]

  // Find pieces on the rotating layer
  const piecesToRotate = newState.filter((piece) => Math.abs(piece.position[axis] - layer) < 0.1)

  // Apply rotation to each piece
  piecesToRotate.forEach((piece) => {
    // Create rotation matrix
    const rotationMatrix = new Matrix4()
    const rotationAxis = new Vector3()
    rotationAxis.setComponent(axis, 1)

    rotationMatrix.makeRotationAxis(rotationAxis, (direction * Math.PI) / 2)

    // Rotate position
    const position = new Vector3(...piece.position)
    position.applyMatrix4(rotationMatrix)
    piece.position = [position.x, position.y, position.z]

    // Rotate colors
    const { colors } = piece
    const newColors = { ...colors }

    // Rotate colors based on axis
    if (axis === 0) {
      // x-axis
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
      // y-axis
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
      // z-axis
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
