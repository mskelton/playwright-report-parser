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
  ref?: number
  sha1?: string
  url: string
}

export type FrameSnapshot = {
  callId: string
  collectionTime: number
  doctype?: string
  frameId: string
  frameUrl: string
  html: NodeSnapshot
  isMainFrame: boolean
  pageId: string
  resourceOverrides: ResourceOverride[]
  snapshotName?: string
  timestamp: number
  viewport: { height: number; width: number }
  wallTime?: number
}

export type RenderedFrameSnapshot = {
  frameId: string
  html: string
  index: number
  pageId: string
}
