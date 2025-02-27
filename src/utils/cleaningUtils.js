// 数据清洗工具类

// 初步清洗：根据字段映射关系整理数据
export const preliminaryCleaning = (data, mappings) => {
  try {
    // 获取标题行（第一行）
    const headers = data[0]
    
    // 创建标准字段数组
    const standardFields = Object.keys(mappings)
    
    // 创建字段索引映射
    const fieldIndexMap = {}
    standardFields.forEach(standardField => {
      const originalFields = mappings[standardField] || []
      originalFields.forEach(originalField => {
        const index = headers.findIndex(h => h === originalField)
        if (index !== -1) {
          if (!fieldIndexMap[standardField]) {
            fieldIndexMap[standardField] = []
          }
          fieldIndexMap[standardField].push(index)
        }
      })
    })
    
    // 处理数据行
    const cleanedData = [standardFields]
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      const newRow = standardFields.map(field => {
        const indices = fieldIndexMap[field] || []
        // 如果有多个原始字段映射到同一个标准字段，使用第一个非空值
        for (const index of indices) {
          if (row[index] && row[index].trim()) {
            return row[index].trim()
          }
        }
        return ''
      })
      cleanedData.push(newRow)
    }
    
    return cleanedData
  } catch (error) {
    console.error('初步清洗失败:', error)
    throw error
  }
}

// 深度清洗：关联开户信息补充数据
export const deepCleaning = (preliminaryData, accountInfo) => {
  try {
    if (!accountInfo || !accountInfo.length) {
      throw new Error('未提供开户信息')
    }
    
    // 获取标题行
    const headers = preliminaryData[0]
    const accountHeaders = accountInfo[0]
    
    // 查找关键字段索引
    const accountIndex = headers.indexOf('本方账号')
    const cardIndex = headers.indexOf('本方卡号')
    const nameIndex = headers.indexOf('本方姓名')
    
    const infoAccountIndex = accountHeaders.indexOf('账号')
    const infoCardIndex = accountHeaders.indexOf('卡号')
    const infoNameIndex = accountHeaders.indexOf('姓名')
    
    if (accountIndex === -1 && cardIndex === -1) {
      throw new Error('未找到账号或卡号字段')
    }
    
    if (infoAccountIndex === -1 && infoCardIndex === -1) {
      throw new Error('开户信息中未找到账号或卡号字段')
    }
    
    // 创建开户信息查找表
    const accountLookup = new Map()
    for (let i = 1; i < accountInfo.length; i++) {
      const row = accountInfo[i]
      const key = row[infoAccountIndex] || row[infoCardIndex]
      if (key) {
        accountLookup.set(key, row)
      }
    }
    
    // 处理每一行数据
    const cleanedData = [headers]
    for (let i = 1; i < preliminaryData.length; i++) {
      const row = [...preliminaryData[i]]
      
      // 如果姓名为空，尝试从开户信息补充
      if (!row[nameIndex]) {
        const key = row[accountIndex] || row[cardIndex]
        const accountRow = accountLookup.get(key)
        if (accountRow) {
          row[nameIndex] = accountRow[infoNameIndex]
        }
      }
      
      cleanedData.push(row)
    }
    
    return cleanedData
  } catch (error) {
    console.error('深度清洗失败:', error)
    throw error
  }
}

// 合并多个清洗结果
export const mergeCleanedData = (dataArray) => {
  if (!dataArray || !dataArray.length) {
    throw new Error('没有数据需要合并')
  }
  
  // 使用第一个数据的标题行
  const headers = dataArray[0][0]
  const mergedData = [headers]
  
  // 合并所有数据行
  dataArray.forEach(data => {
    // 跳过标题行
    for (let i = 1; i < data.length; i++) {
      mergedData.push(data[i])
    }
  })
  
  return mergedData
}

// 导出数据到Excel
export const exportToExcel = (data, filename) => {
  try {
    const XLSX = require('xlsx')
    
    // 创建工作簿
    const wb = XLSX.utils.book_new()
    
    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(data)
    
    // 将工作表添加到工作簿
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    
    // 导出文件
    XLSX.writeFile(wb, filename)
    
    return true
  } catch (error) {
    console.error('导出Excel失败:', error)
    throw error
  }
} 