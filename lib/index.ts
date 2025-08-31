// Main library exports
export * from './core'
export * from './processors'
export * from './analyzers'

// Legacy exports for backward compatibility
export { default as aiService } from './aiService'
export { default as documentProcessor } from './documentProcessor'
export { default as pdfTextExtractor } from './pdfTextExtractor'
export { default as smartDocumentProcessor } from './smartDocumentProcessor'
export { default as utils } from './utils'

// Smart Parser exports
export * from './smartParser'

// AWS exports
export * from './aws'
