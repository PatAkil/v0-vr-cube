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

export interface SelectedFace {
  piece: CubePiece
  face: keyof CubePiece['colors']
}

export interface RotatingFace {
  pieces: CubePiece[]
  axis: 'x' | 'y' | 'z'
  angle: number
} 