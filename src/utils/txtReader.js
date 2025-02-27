// TXT文件读取工具

// 尝试不同的编码读取文本内容
const readTextWithEncoding = async (buffer) => {
  const encodings = ['UTF-8', 'GBK', 'GB2312', 'GB18030']
  let content = null
  
  for (const encoding of encodings) {
    try {
      const decoder = new TextDecoder(encoding)
      content = decoder.decode(buffer)
      // 如果没有乱码（检查是否包含特殊字符），跳出循环
      if (!/[\uFFFD]/.test(content)) {
        break
      }
    } catch (error) {
      console.warn(`使用 ${encoding} 解码失败:`, error)
    }
  }
  
  if (!content) {
    throw new Error('无法正确识别文件编码')
  }
  
  return content
}

// 识别分隔符
const identifySeparator = (content) => {
  const commonSeparators = ['\t', '|', ',', ';', ' ']
  const lines = content.split(/\r?\n/).filter(line => line.trim())
  
  // 对每个分隔符计算得分
  const scores = commonSeparators.map(separator => {
    let score = 0
    const columnCounts = lines.map(line => line.split(separator).length)
    
    // 计算列数的一致性
    const avgColumns = columnCounts.reduce((a, b) => a + b, 0) / columnCounts.length
    const consistency = columnCounts.every(count => Math.abs(count - avgColumns) <= 1)
    
    // 根据列数和一致性计算得分
    score += avgColumns * (consistency ? 2 : 1)
    
    // 检查是否有空字段
    const emptyFields = lines.reduce((count, line) => {
      return count + line.split(separator).filter(field => !field.trim()).length
    }, 0)
    score -= emptyFields * 0.5
    
    return { separator, score }
  })
  
  // 返回得分最高的分隔符
  scores.sort((a, b) => b.score - a.score)
  return scores[0].separator
}

// 解析TXT文件内容
export const parseTxtContent = async (buffer) => {
  try {
    // 读取文件内容
    const content = await readTextWithEncoding(buffer)
    
    // 识别分隔符
    const separator = identifySeparator(content)
    
    // 按行分割并过滤空行
    const lines = content.split(/\r?\n/).filter(line => line.trim())
    
    // 将每行按分隔符拆分
    const data = lines.map(line => 
      line.split(separator).map(field => field.trim())
    )
    
    // 识别标题行
    const headerRowIndex = findHeaderRow(data)
    if (headerRowIndex === -1) {
      throw new Error('无法识别标题行')
    }
    
    // 重组数据，将标题行作为第一行
    return [
      data[headerRowIndex],
      ...data.slice(0, headerRowIndex),
      ...data.slice(headerRowIndex + 1)
    ]
  } catch (error) {
    console.error('TXT文件解析失败:', error)
    throw error
  }
}

// 识别标题行
const findHeaderRow = (data) => {
  if (!data || data.length === 0) return -1
  
  // 计算每行的特征得分
  const scores = data.map((row, index) => {
    let score = 0
    
    // 检查字段名的特征
    const hasCommonHeaders = row.some(field => {
      const normalized = field.toLowerCase()
      return normalized.includes('日期') ||
             normalized.includes('金额') ||
             normalized.includes('账号') ||
             normalized.includes('姓名') ||
             normalized.includes('余额')
    })
    score += hasCommonHeaders ? 3 : 0
    
    // 检查字段长度的一致性
    const lengths = row.map(field => field.length)
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const lengthConsistency = lengths.every(len => Math.abs(len - avgLength) < 10)
    score += lengthConsistency ? 2 : 0
    
    // 检查是否包含数字（标题行通常不包含数字）
    const hasNumbers = row.some(field => /\d/.test(field))
    score -= hasNumbers ? 1 : 0
    
    // 优先考虑靠前的行
    score -= index * 0.1
    
    return { index, score }
  })
  
  // 返回得分最高的行索引
  scores.sort((a, b) => b.score - a.score)
  return scores[0].index
} 