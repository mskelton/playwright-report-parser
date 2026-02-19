// see http://www.softwareishard.com/blog/har-12-spec/
export type HARFile = {
  log: Log
}

export type Log = {
  browser?: Browser
  comment?: string
  creator: Creator
  entries: Entry[]
  pages?: Page[]
  version: string
}

export type Creator = {
  comment?: string
  name: string
  version: string
}

export type Browser = {
  comment?: string
  name: string
  version: string
}

export type Page = {
  comment?: string
  id: string
  pageTimings: PageTimings
  startedDateTime: string
  title: string
}

export type PageTimings = {
  comment?: string
  onContentLoad?: number
  onLoad?: number
}

export type Entry = {
  _apiRequest?: boolean
  _frameref?: string
  _monotonicTime?: number
  _securityDetails?: SecurityDetails
  _serverPort?: number
  _wasAborted?: boolean
  _wasContinued?: boolean
  _wasFulfilled?: boolean
  cache: Cache
  connection?: string
  pageref?: string
  request: Request
  response: Response
  serverIPAddress?: string
  startedDateTime: string
  time: number
  timings: Timings
}

export type Request = {
  bodySize: number
  comment?: string
  cookies: Cookie[]
  headers: Header[]
  headersSize: number
  httpVersion: string
  method: string
  postData?: PostData
  queryString: QueryParameter[]
  url: string
}

export type Response = {
  _failureText?: string
  _transferSize?: number
  bodySize: number
  comment?: string
  content: Content
  cookies: Cookie[]
  headers: Header[]
  headersSize: number
  httpVersion: string
  redirectURL: string
  status: number
  statusText: string
}

export type Cookie = {
  comment?: string
  domain?: string
  expires?: string
  httpOnly?: boolean
  name: string
  path?: string
  sameSite?: string
  secure?: boolean
  value: string
}

export type Header = {
  comment?: string
  name: string
  value: string
}

export type QueryParameter = {
  comment?: string
  name: string
  value: string
}

export type PostData = {
  _file?: string
  _sha1?: string
  comment?: string
  mimeType: string
  params: Param[]
  text: string
}

export type Param = {
  comment?: string
  contentType?: string
  fileName?: string
  name: string
  value?: string
}

export type Content = {
  _file?: string
  _sha1?: string
  comment?: string
  compression?: number
  encoding?: string
  mimeType: string
  size: number
  text?: string
}

export type Cache = {
  afterRequest?: CacheState | null
  beforeRequest?: CacheState | null
  comment?: string
}

export type CacheState = {
  comment?: string
  eTag: string
  expires?: string
  hitCount: number
  lastAccess: string
}

export type Timings = {
  blocked?: number
  comment?: string
  connect?: number
  dns?: number
  receive: number
  send: number
  ssl?: number
  wait: number
}

export type SecurityDetails = {
  issuer?: string
  protocol?: string
  subjectName?: string
  validFrom?: number
  validTo?: number
}
