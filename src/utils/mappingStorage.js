import { DEFAULT_FIELD_MAPPINGS } from './defaultConfigs'
import { ElMessage } from 'element-plus'

// 存储键名
const FIELD_MAPPING_STORAGE_KEY = 'field_mapping_configs'
const FIELD_MAPPING_VERIFY_KEY = 'field_mapping_verify'
const STORAGE_KEY = 'BANK_MAPPING_CONFIG'
const BANK_TYPE_STORAGE_KEY = 'bank_type_configs'

// 标准字段定义
const STANDARD_FIELDS = {
  BANK_DETAIL: [
    '本方姓名', '本方账号', '本方卡号', '交易金额',
    '交易时间', '借贷标志', '币种', '余额', '交易方式',
    '交易摘要', '交易网点', '对方户名', '对方账户', '对方卡号',
    '对方开户行'
  ],
  ACCOUNT_INFO: [
    '姓名', '账号', '卡号', '身份证号', '联系方式', '家庭住址'
  ]
}

// 保存字段映射配置
export const saveMappingConfig = (bankName, fileType, mappings) => {
  try {
    if (!bankName || !fileType || !mappings) {
      throw new Error('保存映射配置参数不完整')
    }

    // 验证映射字段的合法性
    const standardFields = getStandardFields(fileType)

    for (const field of Object.keys(mappings)) {
      if (!standardFields.includes(field)) {
        throw new Error(`非法的标准字段: ${field}`)
      }
    }

    // 获取现有映射
    const allMappings = getAllMappingConfigs()
    
    // 创建或更新映射
    const key = `${bankName}_${fileType}`
    allMappings[key] = {
      bankName,
      fileType,
      mappings: { ...mappings },
      timestamp: Date.now()
    }
    
    // 保存到 localStorage
    localStorage.setItem(FIELD_MAPPING_STORAGE_KEY, JSON.stringify(allMappings))
    
    // 保存验证信息
    const verifyInfo = {
      timestamp: Date.now(),
      key,
      config: allMappings[key]
    }
    localStorage.setItem(FIELD_MAPPING_VERIFY_KEY, JSON.stringify(verifyInfo))
    
    return true
  } catch (error) {
    console.error('保存字段映射配置失败:', error)
    return false
  }
}

// 获取所有映射配置
export const getAllMappingConfigs = () => {
  try {
    const mappingsStr = localStorage.getItem(FIELD_MAPPING_STORAGE_KEY)
    if (mappingsStr) {
      return JSON.parse(mappingsStr)
    }
    // 如果没有保存的配置，使用默认配置
    localStorage.setItem(FIELD_MAPPING_STORAGE_KEY, JSON.stringify(DEFAULT_FIELD_MAPPINGS))
    return DEFAULT_FIELD_MAPPINGS
  } catch (error) {
    console.error('获取字段映射配置失败:', error)
    return DEFAULT_FIELD_MAPPINGS
  }
}

// 验证字段映射是否已保存
export const verifyMappingConfig = (bankName, fileType) => {
  try {
    const verifyInfo = localStorage.getItem(FIELD_MAPPING_VERIFY_KEY)
    if (!verifyInfo) return false
    
    const { key, timestamp } = JSON.parse(verifyInfo)
    const currentKey = `${bankName}_${fileType}`
    
    // 检查是否是最近保存的映射（5分钟内）
    const isRecent = Date.now() - timestamp < 5 * 60 * 1000
    return key === currentKey && isRecent
  } catch (error) {
    console.error('验证字段映射配置失败:', error)
    return false
  }
}

// 获取特定银行和文件类型的映射
export const getMappingConfig = (bankName, fileType) => {
  try {
    if (!bankName || !fileType) return null
    
    const allMappings = getAllMappingConfigs()
    const key = `${bankName}_${fileType}`
    const config = allMappings[key]
    
    if (config && config.mappings) {
      // 更新验证信息
      const verifyInfo = {
        timestamp: Date.now(),
        key,
        config
      }
      localStorage.setItem(FIELD_MAPPING_VERIFY_KEY, JSON.stringify(verifyInfo))
      return config.mappings
    }
    
    // 如果没有找到配置，返回空对象而不是 null
    return {}
  } catch (error) {
    console.error('获取映射配置失败:', error)
    return {}
  }
}

// 删除映射配置
export const deleteMappingConfig = (bankName, fileType) => {
  try {
    const allMappings = getAllMappingConfigs()
    const key = `${bankName}_${fileType}`
    if (key in allMappings) {
      delete allMappings[key]
      localStorage.setItem(FIELD_MAPPING_STORAGE_KEY, JSON.stringify(allMappings))
      
      // 如果删除的是当前验证的配置，也清除验证信息
      const verifyInfo = localStorage.getItem(FIELD_MAPPING_VERIFY_KEY)
      if (verifyInfo) {
        const { key: verifyKey } = JSON.parse(verifyInfo)
        if (key === verifyKey) {
          localStorage.removeItem(FIELD_MAPPING_VERIFY_KEY)
        }
      }
      
      return true
    }
    return false
  } catch (error) {
    console.error('删除映射配置失败:', error)
    throw error
  }
}

// 根据字段识别银行类型和文件类型
export const identifyBankType = (fields) => {
  try {
    if (!fields || !fields.length) return null
    
    const allMappings = getAllMappingConfigs()
    let bestMatch = null
    let highestScore = 0

    // 对每个映射方案计算匹配分数
    Object.entries(allMappings).forEach(([key, config]) => {
      const [bankName, fileType] = key.split('_')
      const mappings = config.mappings
      
      // 计算匹配分数
      let matchCount = 0
      let totalFields = 0
      
      // 遍历每个标准字段的映射
      Object.entries(mappings).forEach(([standardField, originalFields]) => {
        if (Array.isArray(originalFields)) {
          originalFields.forEach(field => {
            totalFields++
            // 使用模糊匹配来提高识别率
            if (fields.some(f => 
              f && field && 
              (f.toLowerCase().includes(field.toLowerCase()) || 
               field.toLowerCase().includes(f.toLowerCase()))
            )) {
              matchCount++
            }
          })
        }
      })
      
      // 计算匹配率
      const score = totalFields > 0 ? matchCount / totalFields : 0
      
      // 更新最佳匹配
      if (score > highestScore) {
        highestScore = score
        bestMatch = { bankName, fileType, matchRate: score }
      } else if (score === highestScore && bestMatch) {
        // 如果分数相同，选择映射字段更多的配置
        const currentFields = Object.values(mappings).flat().length
        const bestFields = Object.values(allMappings[`${bestMatch.bankName}_${bestMatch.fileType}`]?.mappings || {}).flat().length
        if (currentFields > bestFields) {
          bestMatch = { bankName, fileType, matchRate: score }
        }
      }
    })
    
    // 如果最高匹配率超过阈值，返回对应的配置
    if (bestMatch && bestMatch.matchRate >= 0.3) { // 降低阈值以提高识别率
      console.log('识别结果:', bestMatch)
      return bestMatch
    }
    
    return null
  } catch (error) {
    console.error('识别银行类型失败:', error)
    return null
  }
}

/**
 * 获取所有映射配置
 * @returns {Object} 所有银行的映射配置
 */
function getAllMappings() {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch (error) {
    console.error('读取映射配置失败:', error)
    return {}
  }
}

/**
 * 保存所有映射配置
 * @param {Object} mappings - 所有银行的映射配置
 */
function saveAllMappings(mappings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings))
  } catch (error) {
    console.error('保存映射配置失败:', error)
    throw new Error('保存映射配置失败')
  }
}

// 获取所有已保存的银行列表
export const getSavedBanks = () => {
  const allMappings = getAllMappingConfigs()
  const banks = new Set()
  
  Object.keys(allMappings).forEach(key => {
    const bankName = key.split('_')[0]
    banks.add(bankName)
  })
  
  return Array.from(banks)
}

// 清空所有映射配置
export const clearAllMappings = () => {
  localStorage.removeItem(FIELD_MAPPING_STORAGE_KEY)
}

// 获取标准字段列表
export const getStandardFields = (fileType) => {
  if (fileType === 'account' || fileType.includes('开户信息')) {
    return STANDARD_FIELDS.ACCOUNT_INFO
  }
  return STANDARD_FIELDS.BANK_DETAIL
}

// 导出所有配置
export const exportAllConfigs = () => {
  try {
    // 获取所有已保存的配置
    const fieldMappings = localStorage.getItem(FIELD_MAPPING_STORAGE_KEY)
    const bankTypes = localStorage.getItem(BANK_TYPE_STORAGE_KEY)
    
    // 解析配置
    const fieldMappingsObj = fieldMappings ? JSON.parse(fieldMappings) : {}
    const bankTypesObj = bankTypes ? JSON.parse(bankTypes) : {}
    
    // 检查是否有已保存的配置
    if (Object.keys(fieldMappingsObj).length === 0 && Object.keys(bankTypesObj).length === 0) {
      ElMessage.warning('没有找到已保存的配置')
      return null
    }
    
    // 构建导出对象
    const exportData = {
      fieldMappings: fieldMappingsObj,
      bankTypes: bankTypesObj,
      exportTime: new Date().toISOString(),
      version: '1.0'
    }
    
    return JSON.stringify(exportData, null, 2) // 使用格式化的 JSON
  } catch (error) {
    console.error('导出配置失败:', error)
    return null
  }
}

// 导入配置
export const importConfigs = (configsStr) => {
  try {
    const configs = JSON.parse(configsStr)
    
    // 验证配置格式
    if (!configs.fieldMappings || !configs.bankTypes) {
      throw new Error('配置文件格式不正确')
    }
    
    // 保存字段映射配置
    if (Object.keys(configs.fieldMappings).length > 0) {
      localStorage.setItem(FIELD_MAPPING_STORAGE_KEY, JSON.stringify(configs.fieldMappings))
    }
    
    // 保存银行类型配置
    if (Object.keys(configs.bankTypes).length > 0) {
      localStorage.setItem(BANK_TYPE_STORAGE_KEY, JSON.stringify(configs.bankTypes))
    }
    
    return true
  } catch (error) {
    console.error('导入配置失败:', error)
    return false
  }
} 