import type { Point, SerializedError, StackFrame } from './channels'
import type { Language } from './locatorGenerators'
import type { FrameSnapshot, ResourceSnapshot } from './snapshot'

export type Size = { height: number; width: number }

// Make sure you add _modernize_N_to_N1(event: any) to traceModernizer.ts.
export type VERSION = 8

export type BrowserContextEventOptions = {
  baseURL?: string
  deviceScaleFactor?: number
  isMobile?: boolean
  userAgent?: string
  viewport?: Size
}

export type ContextCreatedTraceEvent = {
  browserName: string
  channel?: string
  contextId?: string
  monotonicTime: number
  options: BrowserContextEventOptions
  origin: 'library' | 'testRunner'
  platform: string
  sdkLanguage?: Language
  testIdAttributeName?: string
  title?: string
  type: 'context-options'
  version: number
  wallTime: number
}

export type ScreencastFrameTraceEvent = {
  frameSwapWallTime?: number
  height: number
  pageId: string
  sha1: string
  timestamp: number
  type: 'screencast-frame'
  width: number
}

export type BeforeActionTraceEvent = {
  beforeSnapshot?: string
  callId: string
  class: string
  group?: string
  method: string
  pageId?: string
  params: Record<string, any>
  parentId?: string
  stack?: StackFrame[]
  startTime: number
  stepId?: string
  title?: string
  type: 'before'
}

export type InputActionTraceEvent = {
  callId: string
  inputSnapshot?: string
  point?: Point
  type: 'input'
}

export type AfterActionTraceEventAttachment = {
  base64?: string
  contentType: string
  name: string
  path?: string
  sha1?: string
}

export type AfterActionTraceEventAnnotation = {
  description?: string
  type: string
}

export type AfterActionTraceEvent = {
  afterSnapshot?: string
  annotations?: AfterActionTraceEventAnnotation[]
  attachments?: AfterActionTraceEventAttachment[]
  callId: string
  endTime: number
  error?: SerializedError['error']
  point?: Point
  result?: any
  type: 'after'
}

export type LogTraceEvent = {
  callId: string
  message: string
  time: number
  type: 'log'
}

export type EventTraceEvent = {
  class: string
  method: string
  pageId?: string
  params: any
  time: number
  type: 'event'
}

export type ConsoleMessageTraceEvent = {
  args?: { preview: string; value: any }[]
  location: {
    columnNumber: number
    lineNumber: number
    url: string
  }
  messageType: string
  pageId?: string
  text: string
  time: number
  type: 'console'
}

export type ResourceSnapshotTraceEvent = {
  snapshot: ResourceSnapshot
  type: 'resource-snapshot'
}

export type FrameSnapshotTraceEvent = {
  snapshot: FrameSnapshot
  type: 'frame-snapshot'
}

export type ActionTraceEvent = {
  type: 'action'
} & Omit<BeforeActionTraceEvent, 'type'> &
  Omit<AfterActionTraceEvent, 'type'> &
  Omit<InputActionTraceEvent, 'type'>

export type StdioTraceEvent = {
  base64?: string
  text?: string
  timestamp: number
  type: 'stderr' | 'stdout'
}

export type ErrorTraceEvent = {
  message: string
  stack?: StackFrame[]
  type: 'error'
}

export type TraceEvent =
  | ContextCreatedTraceEvent
  | ScreencastFrameTraceEvent
  | ActionTraceEvent
  | BeforeActionTraceEvent
  | InputActionTraceEvent
  | AfterActionTraceEvent
  | EventTraceEvent
  | LogTraceEvent
  | ConsoleMessageTraceEvent
  | ResourceSnapshotTraceEvent
  | FrameSnapshotTraceEvent
  | StdioTraceEvent
  | ErrorTraceEvent
