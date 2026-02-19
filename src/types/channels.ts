export type Binary = Buffer

export type Point = {
  x: number
  y: number
}

export type StackFrame = {
  column: number
  file: string
  function?: string
  line: number
}

export type SerializedError = {
  error?: {
    message: string
    name: string
    stack?: string
  }
  value?: SerializedValue
}

export type SerializedValue = {
  a?: SerializedValue[]
  b?: boolean
  bi?: string
  d?: string
  e?: {
    m: string
    n: string
    s: string
  }
  h?: number
  id?: number
  n?: number
  o?: {
    k: string
    v: SerializedValue
  }[]
  r?: {
    f: string
    p: string
  }
  ref?: number
  s?: string
  ta?: {
    b: Binary
    k: 'bi64' | 'bui64' | 'f32' | 'f64' | 'i8' | 'i16' | 'i32' | 'ui8' | 'ui8c' | 'ui16' | 'ui32'
  }
  u?: string
  v?: '-0' | '-Infinity' | 'Infinity' | 'NaN' | 'null' | 'undefined'
}
