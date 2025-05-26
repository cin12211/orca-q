// Generic response structure for IPC handlers
export interface IpcBaseResponse<T = undefined> {
  success: boolean
  data?: T // Optional, for when you return data
  error?: string // Error message if not success
}

// Request
export interface IpcBaseRequest {
  dbConnectionString: string
}
