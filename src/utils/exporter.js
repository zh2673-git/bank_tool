/**
 * 数据导出工具模块
 * @module exporter
 */

import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

/**
 * 导出数据到Excel文件
 * @param {Array} data - 要导出的数据
 * @param {string} filename - 文件名
 * @param {Object} options - 导出选项
 */
export const exportToExcel = (data, filename, options = {}) => {
  const {
    sheetName = 'Sheet1',
    dateFormat = 'YYYY-MM-DD',
    numberFormat = '#,##0.00',
    mergeFiles = false
  } = options

  // 创建工作簿
  const wb = XLSX.utils.book_new()
  
  if (mergeFiles && Array.isArray(data[0])) {
    // 合并多个文件的数据
    data.forEach((fileData, index) => {
      const ws = createWorksheet(fileData, dateFormat, numberFormat)
      XLSX.utils.book_append_sheet(wb, ws, `Sheet${index + 1}`)
    })
  } else {
    // 单个文件的数据
    const ws = createWorksheet(data, dateFormat, numberFormat)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  // 导出文件
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${filename}.xlsx`)
}

/**
 * 创建工作表
 * @param {Array} data - 表格数据
 * @param {string} dateFormat - 日期格式
 * @param {string} numberFormat - 数字格式
 * @returns {Object} 工作表对象
 */
const createWorksheet = (data, dateFormat, numberFormat) => {
  if (!data || data.length === 0) return null

  // 获取所有列
  const columns = Object.keys(data[0])
  
  // 创建表头行
  const headerRow = columns.map(col => ({ v: col, t: 's' }))
  
  // 创建数据行
  const rows = data.map(row => {
    return columns.map(col => {
      const value = row[col]
      
      // 根据数据类型设置单元格格式
      if (value instanceof Date) {
        return { v: value, t: 'd', z: dateFormat }
      }
      
      if (typeof value === 'number') {
        return { v: value, t: 'n', z: numberFormat }
      }
      
      return { v: value || '', t: 's' }
    })
  })

  // 合并表头和数据
  const wsData = [headerRow, ...rows]
  
  // 计算单元格范围
  const range = {
    s: { c: 0, r: 0 },
    e: { c: columns.length - 1, r: wsData.length - 1 }
  }

  // 创建工作表对象
  const ws = {}
  
  // 填充单元格数据
  wsData.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })
      ws[cellRef] = cell
    })
  })

  // 设置工作表范围
  ws['!ref'] = XLSX.utils.encode_range(range)
  
  // 设置列宽
  ws['!cols'] = columns.map(() => ({ wch: 15 }))

  return ws
}

/**
 * 导出分析结果
 * @param {Object} analysisResult - 分析结果数据
 * @param {string} analysisType - 分析类型
 * @param {string} filename - 文件名
 */
export const exportAnalysisResult = (analysisResult, analysisType, filename) => {
  let data = []
  
  if (analysisType === 'transfer') {
    // 转账分析结果
    data = [
      {
        '分析项目': '总转账笔数',
        '分析结果': analysisResult.totalTransfers
      },
      {
        '分析项目': '总转账金额',
        '分析结果': analysisResult.totalAmount
      },
      { '分析项目': '频繁往来对象', '分析结果': '' },
      ...analysisResult.frequentContacts.map(({ contact, count }) => ({
        '分析项目': contact,
        '分析结果': `${count}次`
      })),
      { '分析项目': '大额转账记录', '分析结果': '' },
      ...analysisResult.largeTransfers.map(transfer => ({
        '分析项目': `${transfer.交易时间} ${transfer.对方姓名 || '未知'}`,
        '分析结果': transfer.交易金额
      }))
    ]
  } else if (analysisType === 'cash') {
    // 现金分析结果
    data = [
      {
        '分析项目': '总现金交易金额',
        '分析结果': analysisResult.totalCash
      },
      {
        '分析项目': '现金存入金额',
        '分析结果': analysisResult.cashIn
      },
      {
        '分析项目': '现金支出金额',
        '分析结果': analysisResult.cashOut
      },
      { '分析项目': '现金交易明细', '分析结果': '' },
      ...analysisResult.cashTransactions.map(transaction => ({
        '分析项目': transaction.交易时间,
        '分析结果': `${transaction.交易金额} (${transaction.交易摘要})`
      }))
    ]
  }

  exportToExcel(data, filename)
} 