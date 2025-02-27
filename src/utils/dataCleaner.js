/**
 * 数据清洗工具模块
 * @module dataCleaner
 */

import { normalizeDateTime, normalizeAmount } from './fileParser'

/**
 * 初步清洗数据
 * @param {Array} data - 原始数据
 * @param {Object} fieldMappings - 字段映射关系
 * @returns {Array} 清洗后的数据
 */
export const basicClean = (data, fieldMappings) => {
  return data.map(row => {
    const cleanedRow = {}
    
    // 遍历标准字段映射
    for (const [standardField, originalFields] of Object.entries(fieldMappings)) {
      let value = null
      
      // 从原始字段中获取值
      for (const originalField of originalFields) {
        if (row[originalField] !== undefined && row[originalField] !== null) {
          value = row[originalField]
          break
        }
      }
      
      // 根据字段类型进行数据清洗
      cleanedRow[standardField] = cleanFieldValue(standardField, value)
    }
    
    return cleanedRow
  })
}

/**
 * 深度清洗数据
 * @param {Array} basicCleanedData - 初步清洗后的数据
 * @param {Array} accountInfo - 开户信息数据
 * @returns {Array} 深度清洗后的数据
 */
export const deepClean = (basicCleanedData, accountInfo) => {
  // 创建账号-姓名映射
  const accountMap = new Map()
  const cardMap = new Map()
  
  // 构建映射关系
  accountInfo.forEach(info => {
    if (info.账号) accountMap.set(info.账号, info.姓名)
    if (info.卡号) cardMap.set(info.卡号, info.姓名)
  })
  
  // 补充信息
  return basicCleanedData.map(row => {
    const enrichedRow = { ...row }
    
    // 如果本方姓名为空，尝试通过账号或卡号补充
    if (!enrichedRow.本方姓名) {
      if (enrichedRow.本方账号) {
        enrichedRow.本方姓名 = accountMap.get(enrichedRow.本方账号)
      } else if (enrichedRow.本方卡号) {
        enrichedRow.本方姓名 = cardMap.get(enrichedRow.本方卡号)
      }
    }
    
    // 如果对方姓名为空，尝试通过账号或卡号补充
    if (!enrichedRow.对方姓名) {
      if (enrichedRow.对方账号) {
        enrichedRow.对方姓名 = accountMap.get(enrichedRow.对方账号)
      } else if (enrichedRow.对方卡号) {
        enrichedRow.对方姓名 = cardMap.get(enrichedRow.对方卡号)
      }
    }
    
    return enrichedRow
  })
}

/**
 * 清洗单个字段值
 * @param {string} fieldName - 字段名称
 * @param {any} value - 字段值
 * @returns {any} 清洗后的值
 */
const cleanFieldValue = (fieldName, value) => {
  if (value === null || value === undefined) return null
  
  // 移除前后空格
  if (typeof value === 'string') {
    value = value.trim()
  }
  
  // 根据字段类型进行特殊处理
  if (fieldName.includes('时间')) {
    return normalizeDateTime(value)
  }
  
  if (fieldName.includes('金额')) {
    return normalizeAmount(value)
  }
  
  if (fieldName === '借贷标志') {
    return normalizeCreditDebitFlag(value)
  }
  
  return value
}

/**
 * 标准化借贷标志
 * @param {string} flag - 原始借贷标志
 * @returns {string} 标准化的借贷标志
 */
const normalizeCreditDebitFlag = (flag) => {
  if (!flag) return null
  
  const debitKeywords = ['借', '支出', '转出', '支取', '-']
  const creditKeywords = ['贷', '收入', '转入', '存入', '+']
  
  flag = flag.toString().trim()
  
  if (debitKeywords.some(keyword => flag.includes(keyword))) {
    return '借'
  }
  
  if (creditKeywords.some(keyword => flag.includes(keyword))) {
    return '贷'
  }
  
  return flag
}

/**
 * 数据分析：转账分析
 * @param {Array} data - 清洗后的数据
 * @returns {Object} 分析结果
 */
export const analyzeTransfers = (data) => {
  const result = {
    totalTransfers: 0,
    totalAmount: 0,
    frequentContacts: new Map(),
    largeTransfers: []
  }
  
  data.forEach(row => {
    if (!row.交易金额 || !row.对方账号) return
    
    result.totalTransfers++
    result.totalAmount += Math.abs(row.交易金额)
    
    // 统计频繁往来
    const contactKey = `${row.对方账号}-${row.对方姓名 || '未知'}`
    result.frequentContacts.set(
      contactKey,
      (result.frequentContacts.get(contactKey) || 0) + 1
    )
    
    // 记录大额转账
    if (Math.abs(row.交易金额) >= 50000) {
      result.largeTransfers.push(row)
    }
  })
  
  // 转换频繁往来为数组并排序
  result.frequentContacts = Array.from(result.frequentContacts.entries())
    .map(([contact, count]) => ({ contact, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
  
  return result
}

/**
 * 数据分析：现金分析
 * @param {Array} data - 清洗后的数据
 * @returns {Object} 分析结果
 */
export const analyzeCashTransactions = (data) => {
  const result = {
    totalCash: 0,
    cashIn: 0,
    cashOut: 0,
    cashTransactions: []
  }
  
  data.forEach(row => {
    if (!row.交易摘要) return
    
    const isCash = row.交易摘要.includes('现金') || 
                  row.交易摘要.includes('取款') ||
                  row.交易摘要.includes('存款')
    
    if (isCash) {
      const amount = Math.abs(row.交易金额 || 0)
      result.totalCash += amount
      
      if (row.借贷标志 === '借') {
        result.cashOut += amount
      } else {
        result.cashIn += amount
      }
      
      result.cashTransactions.push(row)
    }
  })
  
  return result
} 