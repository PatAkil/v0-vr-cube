"use client"

import { useState, useRef, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { Box, OrbitControls } from "@react-three/drei"
import { Vector3, Matrix4, Quaternion } from "three"

// Define the colors for the Rubik's cube faces
const COLORS = {
  white: "#FFFFFF",
  yellow: "#FFFF00",
  red: "#FF0000",
  orange: "#FFA500",
  blue: "#0000FF",
  green: "#00FF00",
  black: "#000000",
}

// Define the cube size and spacing
const CUBE_SIZE = 0.95
const CUBE_SPACING = 1
const CUBE_DIMENSIONS = 3 // 3x3x3 cube

export default function RubiksCube() {
  return (
    <div className="w-full h-full">
      <div className="absolute top-4 left-4 z-10 bg-black/50 text-white p-4 rounded-md">
        <h2 className="text-xl font-bold mb-2">Controls:</h2>
        <p>1. Click on a cube piece to select it</p>
        <p>2. Use arrow keys to rotate the selected face</p>
      </div>

      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <CubeModel />
        <OrbitControls />
      </Canvas>
    </div>
  )
}

function CubeModel() {
  // State to track the current state of the cube
  const [cubeState, setCubeState] = useState(() => initializeCubeState())
  const [selectedFace, setSelectedFace] = useState(null)
  const [rotatingFace, setRotatingFace] = useState(null)
  const cubeRef = useRef()

  // Function to handle cube piece selection
  const handleSelect = (piece, face) => {
    if (rotatingFace) return
    setSelectedFace({ piece, face })
  }

  // Function to handle rotation of a face
  const handleRotate = (direction) => {
    if (!selectedFace || rotatingFace) return

    const { piece, face } = selectedFace
    const axis = getFaceAxis(face)
    const layer = getLayerFromPosition(piece.position, axis)

    setRotatingFace({
      axis,
      layer,
      direction,
      progress: 0,
    })

    // After animation completes, update the cube state
    setTimeout(() => {
      setCubeState(rotateFace(cubeState, axis, layer, direction))
      setRotatingFace(null)
    }, 500)
  }

  // Set up keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedFace) return

      if (e.key === "ArrowRight") {
        handleRotate(1)
      } else if (e.key === "ArrowLeft") {
        handleRotate(-1)
      } else if (e.key === "ArrowUp") {
        handleRotate(1)
      } else if (e.key === "ArrowDown") {
        handleRotate(-1)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedFace])

  return (
    <group ref={cubeRef} position={[0, 0, 0]}>
      {cubeState.map((piece, index) => (
        <CubePiece
          key={index}
          index={index}
          position={piece.position}
          colors={piece.colors}
          onSelect={handleSelect}
          isSelected={selectedFace?.piece === piece}
          rotatingFace={rotatingFace}
        />
      ))}
    </group>
  )
}

function CubePiece({ index, position, colors, onSelect, isSelected, rotatingFace }) {
  const meshRef = useRef()

  // Apply rotation animation if this piece is part of the rotating face
  useEffect(() => {
    if (!rotatingFace || !meshRef.current) return

    const { axis, layer, direction } = rotatingFace
    const piecePosition = new Vector3(...position)

    // Check if this piece is on the rotating layer
    if (Math.abs(piecePosition[axis] - layer) < 0.1) {
      // Apply rotation animation
      const rotationAxis = new Vector3()
      rotationAxis[axis] = 1

      const targetQuaternion = new Quaternion().setFromAxisAngle(rotationAxis, (direction * Math.PI) / 2)

      // Animate rotation
      let startTime = null
      const duration = 500 // ms

      const animate = (time) => {
        if (!startTime) startTime = time
        const elapsed = time - startTime
        const progress = Math.min(elapsed / duration, 1)

        const currentQuaternion = new Quaternion().slerp(targetQuaternion, progress)
        meshRef.current.quaternion.copy(currentQuaternion)

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    }
  }, [rotatingFace, position])

  const handleClick = (e) => {
    e.stopPropagation()
    onSelect({ position, colors }, detectFace(position))
  }

  return (
    <group ref={meshRef} position={position} scale={isSelected ? [1.05, 1.05, 1.05] : [1, 1, 1]} onClick={handleClick}>
      <Box args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]}>
        {/* Generate the 6 faces of the cube piece */}
        {[
          { dir: [0, 0, 1], color: colors.front || COLORS.black }, // Front
          { dir: [0, 0, -1], color: colors.back || COLORS.black }, // Back
          { dir: [0, 1, 0], color: colors.top || COLORS.black }, // Top
          { dir: [0, -1, 0], color: colors.bottom || COLORS.black }, // Bottom
          { dir: [1, 0, 0], color: colors.right || COLORS.black }, // Right
          { dir: [-1, 0, 0], color: colors.left || COLORS.black }, // Left
        ].map((face, i) => (
          <meshStandardMaterial key={i} attach={`material-${i}`} color={face.color} roughness={0.3} metalness={0.2} />
        ))}
      </Box>
    </group>
  )
}

// Helper functions for cube logic
function initializeCubeState() {
  const pieces = []
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

        const position = [(x - offset) * CUBE_SPACING, (y - offset) * CUBE_SPACING, (z - offset) * CUBE_SPACING]

        const colors = {
          right: x === CUBE_DIMENSIONS - 1 ? COLORS.red : null,
          left: x === 0 ? COLORS.orange : null,
          top: y === CUBE_DIMENSIONS - 1 ? COLORS.white : null,
          bottom: y === 0 ? COLORS.yellow : null,
          front: z === CUBE_DIMENSIONS - 1 ? COLORS.blue : null,
          back: z === 0 ? COLORS.green : null,
        }

        pieces.push({ position, colors })
      }
    }
  }

  return pieces
}

function detectFace(position) {
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

function getFaceAxis(face) {
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

function getLayerFromPosition(position, axis) {
  return position[axis]
}

function rotateFace(cubeState, axis, layer, direction) {
  // Create a new state to avoid mutating the original
  const newState = [...cubeState]

  // Find pieces on the rotating layer
  const piecesToRotate = newState.filter((piece) => Math.abs(piece.position[axis] - layer) < 0.1)

  // Apply rotation to each piece
  piecesToRotate.forEach((piece) => {
    // Create rotation matrix
    const rotationMatrix = new Matrix4()
    const rotationAxis = new Vector3()
    rotationAxis[axis] = 1

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
