/**
 * 文件解析工具模块
 * @module fileParser
 */

import * as XLSX from 'xlsx'
import * as pdfjsLib from 'pdfjs-dist'

/**
 * 读取PDF文件内容
 * @param {File} file - PDF文件对象
 * @returns {Promise<Array>} 解析后的数据数组
 */
export const readPdfFile = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const numPages = pdf.numPages
  let result = []

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map(item => item.str).join(' ')
    result.push(pageText)
  }

  return result
}

/**
 * 识别表格标题行
 * @param {Array} data - 表格数据
 * @returns {Object} 包含标题行索引和字段信息
 */
export const identifyHeaderRow = (data) => {
  // 查找可能的标题行（通常在前5行内）
  const potentialHeaders = data.slice(0, 5)
  let headerIndex = 0
  let maxScore = 0

  potentialHeaders.forEach((row, index) => {
    const score = evaluateHeaderRow(row)
    if (score > maxScore) {
      maxScore = score
      headerIndex = index
    }
  })

  return {
    headerIndex,
    fields: data[headerIndex]
  }
}

/**
 * 评估行是否为标题行
 * @param {Array} row - 表格行数据
 * @returns {number} 评分结果
 */
const evaluateHeaderRow = (row) => {
  let score = 0
  const commonHeaders = [
    '日期', '时间', '金额', '账号', '姓名', '余额',
    '交易', '摘要', '借', '贷', '对方', '备注'
  ]

  // 检查是否包含常见的标题字段
  row.forEach(cell => {
    if (typeof cell === 'string') {
      const cellText = cell.trim()
      if (commonHeaders.some(header => cellText.includes(header))) {
        score += 1
      }
    }
  })

  return score
}

/**
 * 自动识别银行类型
 * @param {Array} headers - 表格标题行
 * @param {Array} data - 表格数据
 * @returns {string} 银行类型
 */
export const identifyBankType = (headers, data) => {
  // 根据表头特征识别银行类型
  const headerStr = headers.join(',')
  
  if (headerStr.includes('信用卡') || headerStr.includes('还款')) {
    return '信用卡明细'
  } else if (headerStr.includes('储蓄') || headerStr.includes('活期')) {
    return '储蓄卡明细'
  } else if (headerStr.includes('开户') || headerStr.includes('身份证')) {
    return '开户信息'
  }
  
  return '未知类型'
}

/**
 * 标准化日期时间格式
 * @param {string} dateStr - 原始日期字符串
 * @returns {string} 标准化的日期时间字符串
 */
export const normalizeDateTime = (dateStr) => {
  try {
    const date = new Date(dateStr)
    return date.toISOString().split('T')[0]
  } catch {
    return dateStr
  }
}

/**
 * 标准化金额格式
 * @param {string|number} amount - 原始金额
 * @returns {number} 标准化的金额数值
 */
export const normalizeAmount = (amount) => {
  if (typeof amount === 'string') {
    // 移除货币符号和千位分隔符
    return parseFloat(amount.replace(/[¥,]/g, ''))
  }
  return amount
} 