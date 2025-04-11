export interface CubePiece {
  position: [number, number, number]
  colors: {
    right?: string
    left?: string
    top?: string
    bottom?: string
    front?: string
    back?: string
  }
}

export interface CubePieceProps {
  piece: CubePiece
} 