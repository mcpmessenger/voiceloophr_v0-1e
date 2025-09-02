// Global storage utility to ensure consistent file storage across API routes

declare global {
  var uploadedFiles: Map<string, any>
}

export function initializeGlobalStorage() {
  if (!global.uploadedFiles) {
    global.uploadedFiles = new Map()
    console.log('🔧 Global storage initialized')
  }
  return global.uploadedFiles
}

export function getGlobalStorage() {
  return global.uploadedFiles || new Map()
}

export function setFileInGlobalStorage(fileId: string, fileData: any) {
  const storage = initializeGlobalStorage()
  storage.set(fileId, fileData)
  console.log(`✅ File stored in global memory: ${fileId} (${fileData.name})`)
  console.log(`📊 Total files in global storage: ${storage.size}`)
}

export function getFileFromGlobalStorage(fileId: string) {
  const storage = getGlobalStorage()
  return storage.get(fileId)
}
