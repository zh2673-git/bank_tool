/**
 * 银行数据格式配置
 */
export const BANK_FORMATS = {
  // CSV格式配置
  CSV: {
    // 分隔符配置
    delimiters: {
      '招商银行': ',',
      '工商银行': ',',
      '建设银行': ',',
      '农业银行': ',',
      // 可以添加更多银行的分隔符配置
    },
    
    // 编码配置
    encoding: {
      '招商银行': 'utf-8',
      '工商银行': 'gbk',
      '建设银行': 'gbk',
      '农业银行': 'gbk',
      // 可以添加更多银行的编码配置
    },
    
    // 是否包含表头
    hasHeader: {
      '招商银行': true,
      '工商银行': true,
      '建设银行': true,
      '农业银行': true,
      // 可以添加更多银行的表头配置
    }
  },
  
  // Excel格式配置
  EXCEL: {
    // Sheet配置
    sheet: {
      '招商银行': 0, // 第一个sheet
      '工商银行': 0,
      '建设银行': 0,
      '农业银行': 0,
      // 可以添加更多银行的sheet配置
    },
    
    // 数据起始行配置（1表示第一行）
    dataStartRow: {
      '招商银行': 1,
      '工商银行': 2,
      '建设银行': 1,
      '农业银行': 1,
      // 可以添加更多银行的起始行配置
    }
  }
}

/**
 * 获取银行数据格式配置
 * @param {string} bankName - 银行名称
 * @param {string} format - 文件格式 (CSV/EXCEL)
 * @returns {Object} 格式配置
 */
export function getBankFormatConfig(bankName, format) {
  if (!BANK_FORMATS[format]) {
    throw new Error(`不支持的文件格式: ${format}`)
  }
  
  const config = BANK_FORMATS[format]
  return {
    delimiter: config.delimiters?.[bankName],
    encoding: config.encoding?.[bankName],
    hasHeader: config.hasHeader?.[bankName],
    sheet: config.sheet?.[bankName],
    dataStartRow: config.dataStartRow?.[bankName]
  }
} 