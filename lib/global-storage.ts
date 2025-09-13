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
  // Always initialize once and return the shared map
  return initializeGlobalStorage()
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

export function clearGlobalStorage() {
  const storage = getGlobalStorage()
  storage.clear()
  console.log('🧹 Global storage cleared')
}

export function clearUserFilesFromGlobalStorage(userId: string) {
  const storage = getGlobalStorage()
  let clearedCount = 0
  
  for (const [fileId, fileData] of storage.entries()) {
    if (fileData.userId === userId) {
      storage.delete(fileId)
      clearedCount++
    }
  }
  
  console.log(`🧹 Cleared ${clearedCount} files for user ${userId} from global storage`)
}
