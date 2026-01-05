import type { Entry as HAREntry } from './har'

export type ResourceSnapshot = HAREntry

// Text node.
export type TextNodeSnapshot = string
// Subtree reference, "x snapshots ago, node #y". Could point to a text node.
// Only nodes that are not references are counted, starting from zero, using post-order traversal.
export type SubtreeReferenceSnapshot = [[number, number]]
// Node name, and optional attributes and child nodes.
export type NodeNameAttributesChildNodesSnapshot =
  | [string]
  | [string, Record<string, string>, ...NodeSnapshot[]]

export type NodeSnapshot =
  | TextNodeSnapshot
  | SubtreeReferenceSnapshot
  | NodeNameAttributesChildNodesSnapshot

export type ResourceOverride = {
  url: string
  sha1?: string
  ref?: number
}

export type FrameSnapshot = {
  snapshotName?: string
  callId: string
  pageId: string
  frameId: string
  frameUrl: string
  timestamp: number
  wallTime?: number
  collectionTime: number
  doctype?: string
  html: NodeSnapshot
  resourceOverrides: ResourceOverride[]
  viewport: { width: number; height: number }
  isMainFrame: boolean
}

export type RenderedFrameSnapshot = {
  html: string
  pageId: string
  frameId: string
  index: number
}
