"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { XR, useXR, useXRControllerButtonEvent } from "@react-three/xr"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { createXRStore } from "@react-three/xr"
import { CubePiece, CubePieceProps, SelectedFace } from "./types"
import { useState, useEffect, useRef } from "react"

const store = createXRStore()

const RubiksCubeModel = () => {
  const groupRef = useRef<THREE.Group>(null)
  const [cubeState, setCubeState] = useState<CubePiece[]>([])
  const [isGrabbing, setIsGrabbing] = useState(false)
  const [grabbedFace, setGrabbedFace] = useState<SelectedFace | null>(null)
  const [lastControllerPosition, setLastControllerPosition] = useState<THREE.Vector3 | null>(null)
  const [rotationInProgress, setRotationInProgress] = useState(false)
  const xr = useXR()

  useEffect(() => {
    // Initialize cube state
    const initialState: CubePiece[] = []
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          initialState.push({
            position: [x, y, z],
            colors: {
              right: x === 1 ? 'red' : undefined,
              left: x === -1 ? 'orange' : undefined,
              top: y === 1 ? 'white' : undefined,
              bottom: y === -1 ? 'yellow' : undefined,
              front: z === 1 ? 'blue' : undefined,
              back: z === -1 ? 'green' : undefined
            }
          })
        }
      }
    }
    setCubeState(initialState)
  }, [])

  const inputSource = xr.session?.inputSources[0]
  useXRControllerButtonEvent(inputSource as any, "xr-standard-trigger" as any, (state: string) => {
    if (state === "default") {
      setIsGrabbing(true)
    } else if (state === "touched") {
      setIsGrabbing(false)
      setGrabbedFace(null)
      setLastControllerPosition(null)
    }
  })

  const handleSelect = (piece: CubePiece) => {
    if (rotationInProgress) return
    
    if (xr.originReferenceSpace && xr.session?.inputSources[0]?.gripSpace) {
      const gripPosition = new THREE.Vector3()
      const referenceSpace = xr.originReferenceSpace
      const gripSpace = xr.session.inputSources[0].gripSpace
      xr.session.requestAnimationFrame((_, frame) => {
        const pose = frame.getPose(gripSpace, referenceSpace)
        if (pose?.transform) {
          gripPosition.setFromMatrixPosition(new THREE.Matrix4().fromArray(pose.transform.matrix))
          setLastControllerPosition(gripPosition)
          
          // Determine which face is being grabbed based on controller position
          const piecePosition = new THREE.Vector3(...piece.position)
          const direction = gripPosition.clone().sub(piecePosition).normalize()
          
          // Find the face with the closest normal to the controller direction
          const faces: { face: keyof CubePiece['colors'], normal: THREE.Vector3 }[] = [
            { face: 'front', normal: new THREE.Vector3(0, 0, 1) },
            { face: 'back', normal: new THREE.Vector3(0, 0, -1) },
            { face: 'right', normal: new THREE.Vector3(1, 0, 0) },
            { face: 'left', normal: new THREE.Vector3(-1, 0, 0) },
            { face: 'top', normal: new THREE.Vector3(0, 1, 0) },
            { face: 'bottom', normal: new THREE.Vector3(0, -1, 0) }
          ]
          
          const closestFace = faces.reduce((prev, curr) => {
            const prevDot = Math.abs(prev.normal.dot(direction))
            const currDot = Math.abs(curr.normal.dot(direction))
            return currDot > prevDot ? curr : prev
          })
          
          setGrabbedFace({ piece, face: closestFace.face })
          setIsGrabbing(true)
        }
      })
    }
  }

  const getLegalMove = (controllerPosition: THREE.Vector3, lastPosition: THREE.Vector3): { axis: 'x' | 'y' | 'z', direction: number, layer: number } | null => {
    if (!grabbedFace) return null

    const movement = controllerPosition.clone().sub(lastPosition)
    const threshold = 0.1 // Minimum movement required to trigger a rotation

    // Determine which face is being grabbed
    const { piece, face } = grabbedFace
    const [x, y, z] = piece.position

    // Calculate movement in each axis
    const xMovement = Math.abs(movement.x)
    const yMovement = Math.abs(movement.y)
    const zMovement = Math.abs(movement.z)

    // Find the dominant movement direction
    const maxMovement = Math.max(xMovement, yMovement, zMovement)
    if (maxMovement < threshold) return null

    // Determine rotation based on the grabbed face
    if (face === 'front' || face === 'back') {
      // For front/back faces, rotate around Z axis
      return {
        axis: 'z',
        direction: movement.x > 0 ? 1 : -1,
        layer: z
      }
    } else if (face === 'right' || face === 'left') {
      // For right/left faces, rotate around X axis
      return {
        axis: 'x',
        direction: movement.y > 0 ? 1 : -1,
        layer: x
      }
    } else {
      // For top/bottom faces, rotate around Y axis
      return {
        axis: 'y',
        direction: movement.x > 0 ? 1 : -1,
        layer: y
      }
    }
  }

  useFrame((_, __, frame) => {
    if (!isGrabbing || !grabbedFace || !xr.session?.inputSources[0]?.gripSpace || !lastControllerPosition || rotationInProgress || !xr.originReferenceSpace || !frame) return

    const currentPosition = new THREE.Vector3()
    const referenceSpace = xr.originReferenceSpace
    const pose = frame.getPose(xr.session.inputSources[0].gripSpace!, referenceSpace)
    if (pose?.transform) {
      currentPosition.setFromMatrixPosition(new THREE.Matrix4().fromArray(pose.transform.matrix))
      const move = getLegalMove(currentPosition, lastControllerPosition)

      if (move) {
        const { axis, direction, layer } = move
        const piecesToRotate = cubeState.filter(piece => {
          const [x, y, z] = piece.position
          if (axis === 'x') return x === layer
          if (axis === 'y') return y === layer
          return z === layer
        })

        if (piecesToRotate.length === 9) {
          setRotationInProgress(true)
          const newState = [...cubeState]
          piecesToRotate.forEach(piece => {
            const index = newState.findIndex(p => 
              p.position[0] === piece.position[0] && 
              p.position[1] === piece.position[1] && 
              p.position[2] === piece.position[2]
            )
            if (index !== -1) {
              const [x, y, z] = piece.position
              let newPosition: [number, number, number]
              let newColors = { ...piece.colors }

              if (axis === 'y') {
                newPosition = [z * direction, y, -x * direction]
                const temp = newColors.front
                newColors.front = newColors.right
                newColors.right = newColors.back
                newColors.back = newColors.left
                newColors.left = temp
              } else if (axis === 'x') {
                newPosition = [x, -z * direction, y * direction]
                const temp = newColors.front
                newColors.front = newColors.bottom
                newColors.bottom = newColors.back
                newColors.back = newColors.top
                newColors.top = temp
              } else {
                newPosition = [-y * direction, x * direction, z]
                const temp = newColors.right
                newColors.right = newColors.top
                newColors.top = newColors.left
                newColors.left = newColors.bottom
                newColors.bottom = temp
              }

              newState[index] = { ...newState[index], position: newPosition, colors: newColors }
            }
          })
          setCubeState(newState)
          setLastControllerPosition(currentPosition.clone())
          setTimeout(() => setRotationInProgress(false), 300)
        }
      }
    }
  })

  const CubePiece = ({ piece, onSelect }: CubePieceProps & { onSelect: (piece: CubePiece) => void }) => {
    const { position, colors } = piece
    const pieceSize = 0.3 // Reduced from 0.5 to make the cube smaller
    const scaledPosition = position.map(p => p * pieceSize * 2) as [number, number, number]

    return (
      <group position={scaledPosition}>
        <group
          onClick={() => {
            setIsGrabbing(true)
            onSelect(piece)
          }}
          onPointerUp={() => {
            setIsGrabbing(false)
            setGrabbedFace(null)
            setLastControllerPosition(null)
          }}
        >
          {/* Front face */}
          <mesh position={[0, 0, pieceSize]}>
            <planeGeometry args={[pieceSize * 1.8, pieceSize * 1.8]} />
            <meshStandardMaterial color={colors.front || 'black'} />
          </mesh>
          {/* Back face */}
          <mesh position={[0, 0, -pieceSize]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[pieceSize * 1.8, pieceSize * 1.8]} />
            <meshStandardMaterial color={colors.back || 'black'} />
          </mesh>
          {/* Right face */}
          <mesh position={[pieceSize, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[pieceSize * 1.8, pieceSize * 1.8]} />
            <meshStandardMaterial color={colors.right || 'black'} />
          </mesh>
          {/* Left face */}
          <mesh position={[-pieceSize, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[pieceSize * 1.8, pieceSize * 1.8]} />
            <meshStandardMaterial color={colors.left || 'black'} />
          </mesh>
          {/* Top face */}
          <mesh position={[0, pieceSize, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[pieceSize * 1.8, pieceSize * 1.8]} />
            <meshStandardMaterial color={colors.top || 'black'} />
          </mesh>
          {/* Bottom face */}
          <mesh position={[0, -pieceSize, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[pieceSize * 1.8, pieceSize * 1.8]} />
            <meshStandardMaterial color={colors.bottom || 'black'} />
          </mesh>
        </group>
      </group>
    )
  }

  return (
    <group ref={groupRef} position={[0, 1.6, -3]} rotation-x={-Math.PI / 8}>
      {cubeState.map((piece, index) => (
        <CubePiece
          key={index}
          piece={piece}
          onSelect={handleSelect}
        />
      ))}
    </group>
  )
}

export function RubiksCube() {
  return (
    <div className="relative w-full h-full">
      <Canvas>
        <XR store={store}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} />
          <RubiksCubeModel />
          <OrbitControls />
        </XR>
      </Canvas>
      <div className="absolute bottom-4 left-4 text-white bg-black/50 p-4 rounded">
        <h2 className="text-xl font-bold mb-2">Controls:</h2>
        <p>1. Use hand pinch gesture or controller trigger to grab faces</p>
        <p>2. Move your hand/controller to rotate the face</p>
        <p>3. Release to complete the rotation</p>
      </div>
    </div>
  )
} 