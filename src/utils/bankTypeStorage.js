// 存储键名
const BANK_TYPE_STORAGE_KEY = 'bank_type_mappings'
const BANK_TYPE_VERIFY_KEY = 'bank_type_verify'

// 保存银行类型映射
export const saveBankTypeMapping = (bankName, fileType, fields) => {
  try {
    // 获取现有映射
    const mappings = getBankTypeMappings()
    const fieldsHash = getFieldsHash(fields)
    
    // 创建或更新映射
    const mapping = {
      bankName,
      fileType,
      fields,
      timestamp: Date.now()
    }
    
    mappings[fieldsHash] = mapping
    
    // 保存到 localStorage
    localStorage.setItem(BANK_TYPE_STORAGE_KEY, JSON.stringify(mappings))
    
    // 保存验证信息
    const verifyInfo = {
      timestamp: Date.now(),
      hash: fieldsHash
    }
    localStorage.setItem(BANK_TYPE_VERIFY_KEY, JSON.stringify(verifyInfo))
    
    return true
  } catch (error) {
    console.error('保存银行类型映射失败:', error)
    return false
  }
}

// 获取所有银行类型映射
export const getBankTypeMappings = () => {
  try {
    const mappings = localStorage.getItem(BANK_TYPE_STORAGE_KEY)
    return mappings ? JSON.parse(mappings) : {}
  } catch (error) {
    console.error('获取银行类型映射失败:', error)
    return {}
  }
}

// 验证银行类型映射是否已保存
export const verifyBankTypeMapping = (fields) => {
  try {
    const verifyInfo = localStorage.getItem(BANK_TYPE_VERIFY_KEY)
    if (!verifyInfo) return false
    
    const { hash, timestamp } = JSON.parse(verifyInfo)
    const currentHash = getFieldsHash(fields)
    
    // 检查是否是最近保存的映射（5分钟内）
    const isRecent = Date.now() - timestamp < 5 * 60 * 1000
    return hash === currentHash && isRecent
  } catch (error) {
    console.error('验证银行类型映射失败:', error)
    return false
  }
}

// 根据字段识别银行类型
export const identifyBankType = (fields) => {
  try {
    const mappings = getBankTypeMappings()
    const fieldsHash = getFieldsHash(fields)
    const mapping = mappings[fieldsHash]
    
    // 如果找到映射，更新验证信息
    if (mapping) {
      const verifyInfo = {
        timestamp: Date.now(),
        hash: fieldsHash
      }
      localStorage.setItem(BANK_TYPE_VERIFY_KEY, JSON.stringify(verifyInfo))
    }
    
    return mapping || null
  } catch (error) {
    console.error('识别银行类型失败:', error)
    return null
  }
}

// 生成字段的唯一标识
const getFieldsHash = (fields) => {
  // 对字段名进行排序，以确保相同字段集合生成相同的哈希
  const sortedFields = [...fields].sort()
  return sortedFields.join('|')
} 