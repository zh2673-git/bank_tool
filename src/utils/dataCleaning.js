import { getMappingConfig, getStandardFields } from './mappingStorage'

/**
 * 预处理招商银行数据
 * @param {Array} data - 原始数据
 * @returns {Array} 处理后的数据数组
 */
function preprocessCMBData(data) {
  // 如果不是招商银行的特殊格式，直接返回原数据
  if (!data || !Array.isArray(data) || data.length === 0) return data;
  
  // 检查是否是招商银行的特殊格式（第一行是一个很长的字符串）
  const firstRow = data[0];
  if (!firstRow || typeof firstRow[0] !== 'string' || firstRow[0].length < 100) return data;
  
  try {
    // 定义招商银行数据的固定长度
    const fieldLengths = {
      '交易日期': 8,      // YYYYMMDD
      '交易时间': 6,      // HHMMSS
      '交易金额': 15,     // 金额
      '账户余额': 15,     // 余额
      '借贷标志': 1,      // 借贷标志
      '交易类型': 4,      // 交易类型代码
      '本方账号': 20,     // 本方账号
      '对方账号': 32,     // 对方账号
      '对方户名': 60,     // 对方户名
      '交易摘要': 100,    // 交易摘要
      '交易流水号': 20    // 流水号
    };

    // 处理每一行数据
    const processedData = data.map(row => {
      if (!row || !row[0]) return null;
      
      const rawStr = row[0].toString();
      let position = 0;
      const fields = {};

      // 按照固定长度分割字段
      for (const [field, length] of Object.entries(fieldLengths)) {
        fields[field] = rawStr.substr(position, length).trim();
        position += length;
      }

      return fields;
    }).filter(row => row !== null);

    // 构建新的数据数组，第一行是表头
    const headers = Object.keys(fieldLengths);
    const rows = processedData.map(fields => headers.map(header => fields[header]));
    
    return [headers, ...rows];
  } catch (error) {
    console.error('处理招商银行数据失败:', error);
    return data;
  }
}

/**
 * 处理固定长度格式的数据
 * @param {Array} data - 原始数据
 * @returns {Array} 处理后的数据数组
 */
function processFixedLengthData(data) {
  if (!data || !Array.isArray(data) || data.length === 0) return data;
  
  try {
    console.log('开始处理固定长度格式数据...');
    console.log('原始数据第一行:', data[0]);
    
    // 定义字段长度（根据实际数据调整）
    const fieldDefinitions = [
      { name: '司法编号', length: 20 },
      { name: '原因号', length: 20 },
      { name: '交易日期', length: 8 },
      { name: '交易时间', length: 6 },
      { name: '客户号', length: 20 },
      { name: '客户名称', length: 60 },
      { name: '交易卡号', length: 20 },
      { name: '交易流水', length: 20 },
      { name: '交易类号', length: 4 },
      { name: '交易机构', length: 20 },
      { name: '交易代码', length: 6 },
      { name: '交易方向', length: 1 },
      { name: '币种名称', length: 3 },
      { name: '交易金额', length: 15 },
      { name: '账户余额', length: 15 },
      { name: '摘要名称', length: 60 },
      { name: '交易渠道', length: 2 },
      { name: '补补账标记', length: 1 },
      { name: '经办柜员', length: 7 },
      { name: '对方账号', length: 32 },
      { name: '对方名称', length: 60 },
      { name: '对方开户行', length: 60 }
    ];

    // 处理每一行数据
    const processedData = data.map((row, index) => {
      if (!row || !row[0]) {
        console.log(`跳过空行: ${index}`);
        return null;
      }
      
      const rawStr = row[0].toString();
      console.log(`处理第 ${index + 1} 行, 长度: ${rawStr.length}`);
      
      let position = 0;
      const fields = {};

      // 按照固定长度分割字段
      for (const field of fieldDefinitions) {
        const value = rawStr.substr(position, field.length).trim();
        fields[field.name] = value;
        position += field.length;
        
        // 记录每个字段的提取结果（仅记录第一行作为示例）
        if (index === 0) {
          console.log(`字段 ${field.name}: [${value}], 长度: ${value.length}`);
        }
      }

      return fields;
    }).filter(row => row !== null);

    // 构建新的数据数组，第一行是表头
    const headers = fieldDefinitions.map(f => f.name);
    const rows = processedData.map(fields => headers.map(header => fields[header]));
    
    console.log('处理结果:');
    console.log('表头:', headers);
    console.log('第一行数据:', rows[0]);
    console.log('总行数:', rows.length);
    
    return [headers, ...rows];
  } catch (error) {
    console.error('处理固定长度格式数据失败:', error);
    console.error('错误详情:', error.stack);
    return data;
  }
}

/**
 * 预处理CSV格式数据
 * @param {Array} data - 原始数据
 * @returns {Array} 处理后的数据数组
 */
function preprocessCSVData(data) {
  if (!data || !Array.isArray(data) || data.length === 0) return data;
  
  try {
    console.log('开始处理CSV数据...');
    console.log('原始数据第一行:', data[0]);

    // 处理每一行数据
    const processedData = data.map((row, index) => {
      if (!row || (!Array.isArray(row) && !row[0])) return [];
      
      // 获取原始字符串
      const line = Array.isArray(row) ? row[0] : row.toString();
      console.log(`处理第 ${index + 1} 行:`, line);
      
      // 使用更复杂的CSV解析逻辑
      const fields = [];
      let field = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // 处理双引号转义
            field += '"';
            i++;
          } else {
            // 切换引号状态
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          // 遇到分隔符且不在引号内，保存字段
          fields.push(field.trim());
          field = '';
        } else {
          field += char;
        }
      }
      
      // 添加最后一个字段
      fields.push(field.trim());
      
      if (index === 0) {
        console.log('解析后的表头:', fields);
      }
      
      return fields;
    }).filter(row => row.length > 0);

    console.log('CSV处理完成，总行数:', processedData.length);
    if (processedData.length > 0) {
      console.log('表头:', processedData[0]);
      console.log('第一行数据:', processedData[1]);
    }

    return processedData;
  } catch (error) {
    console.error('预处理CSV数据失败:', error);
    console.error('错误堆栈:', error.stack);
    return data;
  }
}

/**
 * 预处理Excel格式数据
 * @param {Array} data - 原始数据
 * @returns {Array} 处理后的数据数组
 */
function preprocessExcelData(data) {
  if (!data || !Array.isArray(data) || data.length === 0) return data;
  
  try {
    console.log('开始处理Excel数据...');
    console.log('数据类型:', typeof data);
    console.log('数据长度:', data.length);
    console.log('第一行类型:', typeof data[0]);
    console.log('第一行内容:', data[0]);

    // 如果数据已经是正确的数组格式，直接返回
    if (data.every(row => Array.isArray(row) && row.length > 1)) {
      console.log('数据已经是正确的表格格式');
      return data.map(row => row.map(cell => 
        cell === null || cell === undefined ? '' : cell.toString().trim()
      ));
    }

    // 如果每行是一个长字符串，尝试按固定宽度分割
    if (data.every(row => typeof row === 'string' || (Array.isArray(row) && row.length === 1))) {
      console.log('检测到字符串格式，尝试按固定宽度分割...');
      const processedData = data.map(row => {
        const str = Array.isArray(row) ? row[0] : row;
        // 尝试按制表符分割
        if (str.includes('\t')) {
          return str.split('\t').map(s => s.trim());
        }
        // 尝试按逗号分割
        if (str.includes(',')) {
          return str.split(',').map(s => s.trim());
        }
        return [str];
      });
      return processedData;
    }

    // 如果是对象数组，转换为二维数组
    if (data.every(row => typeof row === 'object' && !Array.isArray(row))) {
      console.log('检测到对象数组格式，转换为二维数组...');
      const headers = Object.keys(data[0]);
      const rows = data.map(row => headers.map(header => row[header] || ''));
      return [headers, ...rows];
    }

    console.log('无法识别的数据格式，返回原始数据');
    return data;
  } catch (error) {
    console.error('处理Excel数据失败:', error);
    console.error('错误堆栈:', error.stack);
    return data;
  }
}

/**
 * 初步清洗数据
 * @param {Array} data - 原始数据
 * @param {string} bankName - 银行名称
 * @param {string} fileType - 文件类型
 * @returns {Array} 清洗后的数据
 */
export async function preliminaryCleaning(data, bankName, fileType) {
  if (!data || !bankName || !fileType) {
    throw new Error('数据、银行名称和文件类型都不能为空')
  }

  console.log('开始预处理数据:', {
    bankName,
    fileType,
    dataLength: data?.length,
    dataType: typeof data,
    isArray: Array.isArray(data),
    firstRowType: data?.[0] ? typeof data[0] : 'undefined',
    firstRowLength: data?.[0]?.length,
    firstRowContent: data?.[0]
  });

  // 检查数据格式
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('数据格式错误或为空')
  }

  // 根据文件类型选择预处理方法
  let processedData = data;
  
  if (fileType.toLowerCase().includes('xls')) {
    console.log('检测到Excel格式，进行预处理...');
    processedData = preprocessExcelData(data);
  } else if (fileType.toLowerCase() === 'csv') {
    console.log('检测到CSV格式，进行预处理...');
    processedData = preprocessCSVData(data);
  }

  // 检查处理后的数据
  console.log('预处理后的数据:', {
    长度: processedData.length,
    第一行: processedData[0],
    第一行类型: typeof processedData[0],
    第一行长度: processedData[0]?.length
  });

  // 获取映射配置
  const mapping = await getMappingConfig(bankName, fileType)
  if (!mapping) {
    throw new Error('未找到对应的字段映射配置')
  }

  // 获取标准字段列表
  const standardFields = getStandardFields(fileType)
  if (!standardFields || standardFields.length === 0) {
    throw new Error('未找到标准字段配置')
  }

  // 创建结果数组
  const cleanedData = []

  // 处理表头行
  const headers = processedData[0]
  console.log('原始表头:', headers)

  // 获取原始字段的索引映射
  const fieldIndexMap = {}
  standardFields.forEach(standardField => {
    const originalFields = mapping[standardField] || []
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

  console.log('字段映射关系:', fieldIndexMap)

  // 从第二行开始处理数据（跳过标题行）
  for (let i = 1; i < processedData.length; i++) {
    const row = processedData[i]
    const cleanedRow = {}

    // 遍历标准字段，根据映射关系填充数据
    standardFields.forEach(field => {
      const indices = fieldIndexMap[field] || []
      let values = []
      // 收集所有非空的映射值
      for (const index of indices) {
        if (row[index] && row[index].toString().trim()) {
          values.push(formatValue(row[index].toString().trim(), field))
        }
      }
      // 根据字段类型选择不同的连接方式
      if (values.length > 0) {
        if (isNumericField(field)) {
          // 数字类字段使用换行符分隔
          cleanedRow[field] = values.join('\n')
        } else {
          // 其他字段继续使用分号分隔
          cleanedRow[field] = values.join('; ')
        }
      } else {
        cleanedRow[field] = ''
      }
    })

    // 自动填写所属银行
    cleanedRow['所属银行'] = bankName

    cleanedData.push(cleanedRow)
  }

  return cleanedData
}

// 判断是否为数字类型字段
function isNumericField(fieldName) {
  const numericFields = [
    '本方账号', '对方账号', '本方卡号', '对方卡号', 
    '信用卡卡号', '账号', '卡号', '交易金额', '余额'
  ]
  return numericFields.includes(fieldName)
}

/**
 * 深度清洗数据
 * @param {Array} cleanedData - 初步清洗后的数据
 * @param {Array} accountInfo - 开户信息数据数组（可以来自多个文件）
 * @returns {Array} 深度清洗后的数据
 */
export async function deepCleaning(cleanedData, accountInfo) {
  if (!cleanedData || !Array.isArray(cleanedData)) {
    throw new Error('请先进行初步清洗')
  }

  // 获取当前银行名称
  const bankName = cleanedData[0]?.['所属银行']
  if (!bankName) {
    console.warn('未找到所属银行信息')
    return cleanedData
  }

  console.log('开始深度清洗:', {
    bankName,
    accountInfoCount: accountInfo?.length || 0,
    needMatchCount: cleanedData.filter(row => !row['本方姓名']).length
  })

  // 创建账号信息映射表
  const accountInfoMap = new Map()
  const accountSourceMap = new Map() // 记录账号信息来源，用于调试

  // 处理账号信息的函数
  const processAccountInfo = (info, source) => {
    // 检查是否是同一银行的信息
    if (info['所属银行'] && info['所属银行'] !== bankName) {
      return
    }

    // 获取姓名
    const name = info['姓名'] || info['本方姓名']
    if (!name) {
      return
    }

    // 获取并清理账号和卡号
    const accountFields = ['账号', '本方账号']
    const cardFields = ['卡号', '本方卡号']
    
    // 处理所有可能的账号字段
    for (const field of accountFields) {
      const rawAccountNum = info[field] ? info[field].toString().trim() : ''
      if (rawAccountNum) {
        // 保存原始格式
        accountInfoMap.set(rawAccountNum, name)
        accountSourceMap.set(rawAccountNum, `${source}-${field}`)
        
        // 保存清理后的格式（只保留数字）
        const cleanedAccountNum = rawAccountNum.replace(/[^\d]/g, '')
        if (cleanedAccountNum !== rawAccountNum) {
          accountInfoMap.set(cleanedAccountNum, name)
          accountSourceMap.set(cleanedAccountNum, `${source}-${field}(清理后)`)
        }

        // 保存最后N位（用于部分匹配）
        if (cleanedAccountNum.length > 8) {
          const lastDigits = cleanedAccountNum.slice(-8)
          accountInfoMap.set(lastDigits, name)
          accountSourceMap.set(lastDigits, `${source}-${field}(后8位)`)
        }
      }
    }
    
    // 处理所有可能的卡号字段
    for (const field of cardFields) {
      const rawCardNum = info[field] ? info[field].toString().trim() : ''
      if (rawCardNum) {
        // 保存原始格式
        accountInfoMap.set(rawCardNum, name)
        accountSourceMap.set(rawCardNum, `${source}-${field}`)
        
        // 保存清理后的格式（只保留数字）
        const cleanedCardNum = rawCardNum.replace(/[^\d]/g, '')
        if (cleanedCardNum !== rawCardNum) {
          accountInfoMap.set(cleanedCardNum, name)
          accountSourceMap.set(cleanedCardNum, `${source}-${field}(清理后)`)
        }

        // 保存最后N位（用于部分匹配）
        if (cleanedCardNum.length > 8) {
          const lastDigits = cleanedCardNum.slice(-8)
          accountInfoMap.set(lastDigits, name)
          accountSourceMap.set(lastDigits, `${source}-${field}(后8位)`)
        }
      }
    }
  }

  // 首先处理开户信息
  if (accountInfo && Array.isArray(accountInfo)) {
    accountInfo.forEach((info, index) => {
      processAccountInfo(info, `开户信息-${index}`)
    })
  }

  // 创建已知账号-姓名映射
  const knownAccountNames = new Map()

  // 第一轮：处理已有本方姓名的记录，建立账号-姓名映射
  cleanedData.forEach((row, index) => {
    if (row['本方姓名']) {
      // 保存账号-姓名映射
      const accountNum = row['本方账号']?.toString().trim()
      const cardNum = row['本方卡号']?.toString().trim()
      
      if (accountNum) {
        knownAccountNames.set(accountNum, row['本方姓名'])
        knownAccountNames.set(accountNum.replace(/[^\d]/g, ''), row['本方姓名'])
      }
      if (cardNum) {
        knownAccountNames.set(cardNum, row['本方姓名'])
        knownAccountNames.set(cardNum.replace(/[^\d]/g, ''), row['本方姓名'])
      }
    }
  })

  // 第二轮：填充缺失的本方姓名
  const result = cleanedData.map((row, index) => {
    const cleanedRow = { ...row }

    // 如果本方姓名为空，尝试匹配
    if (!cleanedRow['本方姓名']) {
      // 获取账号和卡号
      const rawAccountNum = cleanedRow['本方账号']?.toString().trim() || ''
      const rawCardNum = cleanedRow['本方卡号']?.toString().trim() || ''
      const cleanedAccountNum = rawAccountNum.replace(/[^\d]/g, '')
      const cleanedCardNum = rawCardNum.replace(/[^\d]/g, '')

      // 1. 首先尝试从已知的账号-姓名映射中查找
      let foundName = knownAccountNames.get(rawAccountNum) || 
                     knownAccountNames.get(cleanedAccountNum) ||
                     knownAccountNames.get(rawCardNum) ||
                     knownAccountNames.get(cleanedCardNum)

      // 2. 如果没找到，尝试从账号信息映射表中查找
      if (!foundName) {
        const matchAttempts = [
          { value: rawAccountNum, type: '原始账号' },
          { value: cleanedAccountNum, type: '清理后账号' },
          { value: rawCardNum, type: '原始卡号' },
          { value: cleanedCardNum, type: '清理后卡号' }
        ]

        // 添加后8位匹配
        if (cleanedAccountNum.length > 8) {
          matchAttempts.push({ 
            value: cleanedAccountNum.slice(-8), 
            type: '账号后8位' 
          })
        }
        if (cleanedCardNum.length > 8) {
          matchAttempts.push({ 
            value: cleanedCardNum.slice(-8), 
            type: '卡号后8位' 
          })
        }

        for (const attempt of matchAttempts) {
          if (attempt.value && accountInfoMap.has(attempt.value)) {
            foundName = accountInfoMap.get(attempt.value)
            console.log(`${attempt.type}匹配成功: ${attempt.value} -> ${foundName} (来源: ${accountSourceMap.get(attempt.value)})`)
            break
          }
        }
      }

      if (foundName) {
        cleanedRow['本方姓名'] = foundName
        // 将新找到的映射添加到已知映射中
        if (rawAccountNum) knownAccountNames.set(rawAccountNum, foundName)
        if (cleanedAccountNum) knownAccountNames.set(cleanedAccountNum, foundName)
        if (rawCardNum) knownAccountNames.set(rawCardNum, foundName)
        if (cleanedCardNum) knownAccountNames.set(cleanedCardNum, foundName)
      }
    }

    return cleanedRow
  })

  // 第三轮：再次检查，确保相同账号/卡号的记录都有相同的本方姓名
  const finalResult = result.map((row, index) => {
    if (!row['本方姓名']) {
      const accountNum = row['本方账号']?.toString().trim()
      const cardNum = row['本方卡号']?.toString().trim()
      
      if (accountNum) {
        const foundName = knownAccountNames.get(accountNum) || 
                         knownAccountNames.get(accountNum.replace(/[^\d]/g, ''))
        if (foundName) {
          row['本方姓名'] = foundName
        }
      }
      
      if (!row['本方姓名'] && cardNum) {
        const foundName = knownAccountNames.get(cardNum) || 
                         knownAccountNames.get(cardNum.replace(/[^\d]/g, ''))
        if (foundName) {
          row['本方姓名'] = foundName
        }
      }
    }
    return row
  })

  const matchedCount = finalResult.filter(row => row['本方姓名']).length
  const totalCount = finalResult.length
  console.log('深度清洗完成:', {
    总记录数: totalCount,
    匹配成功数: matchedCount,
    匹配率: `${((matchedCount / totalCount) * 100).toFixed(2)}%`
  })

  return finalResult
}

/**
 * 导出数据到Excel
 * @param {Array} data - 要导出的数据
 * @param {string} filename - 文件名
 */
export async function exportToExcel(data, filename) {
  if (!data || !data.length) {
    throw new Error('没有可导出的数据')
  }
  
  try {
    const XLSX = await import('xlsx')
    
    // 准备数据
    const headers = Object.keys(data[0])
    const rows = data.map(row => headers.map(header => row[header]))
    
    // 创建工作簿和工作表
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
    
    // 导出文件
    XLSX.writeFile(wb, filename)
  } catch (error) {
    console.error('导出Excel失败:', error)
    throw error
  }
}

/**
 * 批量合并导出
 * @param {Array<Array>} dataArray - 多个数据数组
 * @param {string} filename - 导出文件名
 */
export async function batchExport(dataArray, filename) {
  if (!dataArray || !dataArray.length) {
    throw new Error('没有可导出的数据')
  }
  
  try {
    // 合并数据
    const mergedData = mergeCleanedData(dataArray)
    
    // 导出合并后的数据
    await exportToExcel(mergedData, filename)
  } catch (error) {
    console.error('批量导出失败:', error)
    throw error
  }
}

/**
 * 合并清洗后的数据
 * @param {Array<Array>} dataArray - 多个清洗后的数据数组
 * @returns {Array} 合并后的数据
 */
export function mergeCleanedData(dataArray) {
  if (!dataArray.length) return []
  
  // 获取所有字段
  const allFields = new Set()
  dataArray.forEach(data => {
    data.forEach(row => {
      Object.keys(row).forEach(field => allFields.add(field))
    })
  })
  
  // 合并数据
  return dataArray.flat().map(row => {
    const mergedRow = {}
    allFields.forEach(field => {
      mergedRow[field] = row[field] || ''
    })
    return mergedRow
  })
}

/**
 * 格式化字段值
 * @param {string} value - 原始值
 * @param {string} fieldType - 字段类型
 * @returns {string} 格式化后的值
 */
function formatValue(value, fieldType) {
  if (!value) return ''
  
  // 移除多余的空格
  value = value.toString().trim()
  
  // 账号类字段 - 保持原始格式
  const accountFields = [
    '本方账号', '对方账号', '本方卡号', '对方卡号', 
    '信用卡卡号', '账号', '卡号', '子账号序号'
  ]
  if (accountFields.includes(fieldType)) {
    return value.replace(/\s+/g, '')  // 只移除空格
  }
  
  // 金额类字段 - 保持原始格式，不转换为数字
  const amountFields = ['交易金额', '余额']
  if (amountFields.includes(fieldType)) {
    return value.replace(/[,，\s]/g, '')
  }
  
  // 日期类字段
  const dateFields = ['交易日期', '交易时间', '入账时间']
  if (dateFields.includes(fieldType)) {
    return formatDate(value)
  }
  
  // 借贷标志
  if (fieldType === '借贷标志') {
    return normalizeLoanFlag(value)
  }
  
  // 其他字段保持原样
  return value
}

/**
 * 格式化日期
 * @param {string} dateStr - 原始日期字符串
 * @returns {string} 格式化后的日期
 */
function formatDate(dateStr) {
  try {
    // 如果已经是标准格式，直接返回
    if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(dateStr)) {
      return dateStr
    }
    
    // 处理常见的日期格式
    const datePatterns = [
      // YYYYMMDD
      { pattern: /^(\d{4})(\d{2})(\d{2})$/, format: '$1-$2-$3' },
      // YYYY-MM-DD
      { pattern: /^(\d{4})-(\d{1,2})-(\d{1,2})$/, format: '$1-$2-$3' },
      // YYYY/MM/DD
      { pattern: /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, format: '$1-$2-$3' },
      // DD/MM/YYYY
      { pattern: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, format: '$3-$2-$1' },
      // YYYY年MM月DD日
      { pattern: /^(\d{4})年(\d{1,2})月(\d{1,2})日$/, format: '$1-$2-$3' }
    ]
    
    for (const { pattern, format } of datePatterns) {
      if (pattern.test(dateStr)) {
        return dateStr.replace(pattern, format)
      }
    }
    
    // 如果没有匹配的格式，尝试提取数字
    const numbers = dateStr.replace(/\D/g, '')
    if (numbers.length >= 8) {
      const year = numbers.slice(0, 4)
      const month = numbers.slice(4, 6).padStart(2, '0')
      const day = numbers.slice(6, 8).padStart(2, '0')
      
      // 添加时间部分（如果有）
      let time = ''
      if (numbers.length >= 12) {
        const hour = numbers.slice(8, 10).padStart(2, '0')
        const minute = numbers.slice(10, 12).padStart(2, '0')
        const second = numbers.length >= 14 ? numbers.slice(12, 14).padStart(2, '0') : '00'
        time = ` ${hour}:${minute}:${second}`
      }
      
      return `${year}-${month}-${day}${time}`
    }
    
    return dateStr
  } catch (error) {
    console.warn('日期格式化失败:', error)
    return dateStr
  }
}

/**
 * 统一借贷标志
 * @param {string} flag - 原始借贷标志
 * @returns {string} 统一后的借贷标志
 */
function normalizeLoanFlag(flag) {
  if (!flag) return ''
  
  flag = flag.toString().toLowerCase()
  
  // 支出/借方
  if (/借|支|出|付|支出|借方|-/.test(flag)) {
    return '借'
  }
  
  // 收入/贷方
  if (/贷|收|入|存|收入|贷方|\+/.test(flag)) {
    return '贷'
  }
  
  return flag
}

/**
 * 初步清洗数据
 * @param {Array} data - 原始数据
 * @param {Object} mapping - 字段映射配置
 * @returns {Array} 清洗后的数据
 */
export async function initialCleaning(data, mapping) {
  if (!data || !Array.isArray(data)) {
    throw new Error('数据格式错误')
  }

  if (!mapping || typeof mapping !== 'object') {
    throw new Error('映射配置错误')
  }

  // 创建字段映射的反向查找表
  const reverseMapping = {}
  Object.entries(mapping).forEach(([standard, custom]) => {
    if (custom) {
      reverseMapping[custom] = standard
    }
  })

  // 清洗数据
  return data.map(row => {
    const cleanedRow = {}
    
    // 遍历原始数据的每个字段
    Object.entries(row).forEach(([key, value]) => {
      // 获取标准字段名
      const standardKey = reverseMapping[key]
      if (!standardKey) return // 如果没有对应的标准字段，跳过

      // 根据字段类型进行特殊处理
      let cleanedValue = value
      
      // 处理金额相关字段
      if (['交易金额', '借方发生额', '贷方发生额'].includes(standardKey)) {
        cleanedValue = parseFloat(value) || 0
      }
      
      // 处理余额字段 - 确保使用正确的余额值
      if (standardKey === '余额') {
        cleanedValue = parseFloat(value) || 0
      }
      
      // 处理日期时间字段
      if (['交易日期', '记账日期', '交易时间'].includes(standardKey)) {
        cleanedValue = value ? value.toString().trim() : ''
      }

      // 处理文本字段
      if (['交易摘要', '本方账号', '本方卡号', '本方姓名', '对方账号', '对方户名', '对方开户行'].includes(standardKey)) {
        cleanedValue = value ? value.toString().trim() : ''
      }

      cleanedRow[standardKey] = cleanedValue
    })

    return cleanedRow
  })
} 