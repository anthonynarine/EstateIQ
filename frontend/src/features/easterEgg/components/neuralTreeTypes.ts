// # Filename: src/features/fun/components/neuralTreeTypes.ts
// ✅ New Code

export type NeuralNodeType =
  | "root"
  | "hook"
  | "section"
  | "form"
  | "modal"
  | "leaf";

export interface NeuralTreeNode {
  id: string;
  type: NeuralNodeType;
  children: NeuralTreeNode[];
}

export interface PositionedNeuralTreeNode extends NeuralTreeNode {
  depth: number;
  parent: PositionedNeuralTreeNode | null;
  px: number;
  py: number;
  _x: number;
  children: PositionedNeuralTreeNode[];
}

export interface NeuralParticle {
  t: number;
  speed: number;
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
  color: string;
  onArrive: (() => void) | null;
  arrived: boolean;
  trail: Array<{ x: number; y: number }>;
}

export interface NodeEntry {
  node: PositionedNeuralTreeNode;
  el: HTMLDivElement;
  hex: string;
}

export interface NeuralStats {
  totalFires: number;
  activeCount: number;
  volleys: number;
  nodes: number;
}