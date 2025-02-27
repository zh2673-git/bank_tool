// PDF文件读取工具
import * as pdfjs from 'pdfjs-dist'

// 设置PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

/**
 * 从PDF文件中提取文本内容并组织成表格数据
 * @param {ArrayBuffer} arrayBuffer - PDF文件的ArrayBuffer
 * @returns {Promise<Array<Array<string>>>} 返回表格数据，每行是一个字符串数组
 */
export async function readPdfContent(arrayBuffer) {
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    verbosity: 0,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
  })

  const pdf = await loadingTask.promise
  console.log('PDF loaded, pages:', pdf.numPages)
  
  const allPages = await Promise.all(
    Array.from({ length: pdf.numPages }, (_, i) => extractPageContent(pdf, i + 1))
  )
  
  // 合并所有页面的内容
  const allText = allPages.flat()
  
  if (allText.length === 0) {
    throw new Error('未能提取到文本内容')
  }
  
  // 移除可能的页眉页脚
  const contentLines = allText.length > 2 ? allText.slice(1, -1) : allText
  
  // 将文本行转换为表格数据
  const tableData = contentLines
    .map(line => line.split(/[\s,，;；]+/).filter(cell => cell.trim()))
    .filter(row => row.length > 0)
  
  console.log('Table data before processing:', tableData)
  
  // 查找可能的标题行并重组数据
  const headerIndex = findPossibleHeaderRow(tableData)
  const processedData = headerIndex !== -1
    ? [tableData[headerIndex], ...tableData.slice(0, headerIndex), ...tableData.slice(headerIndex + 1)]
    : tableData
  
  // 标准化列数
  const maxColumns = Math.max(...processedData.map(row => row.length))
  return processedData.map(row => {
    const newRow = [...row]
    while (newRow.length < maxColumns) {
      newRow.push('')
    }
    return newRow
  })
}

/**
 * 从单个PDF页面提取文本内容
 * @param {PDFDocumentProxy} pdf - PDF文档对象
 * @param {number} pageNum - 页码
 * @returns {Promise<Array<string>>} 返回提取的文本行数组
 */
async function extractPageContent(pdf, pageNum) {
  const page = await pdf.getPage(pageNum)
  console.log(`Processing page ${pageNum}`)
  
  const textContent = await page.getTextContent({
    normalizeWhitespace: true,
    disableCombineTextItems: false
  })
  
  const viewport = page.getViewport({ scale: 1.0 })
  return organizeTextItems(textContent.items, viewport)
}

/**
 * 将文本项按行组织
 * @param {Array<Object>} textItems - 文本项数组
 * @param {Object} viewport - 页面视口
 * @returns {Array<string>} 返回组织好的文本行数组
 */
function organizeTextItems(textItems, viewport) {
  const lines = {}
  const lineHeight = 15 // 行高容差值
  
  // 按行分组文本项
  for (const item of textItems) {
    const y = Math.round(viewport.height - item.transform[5])
    const lineKey = Math.floor(y / lineHeight) * lineHeight
    
    if (!lines[lineKey]) {
      lines[lineKey] = []
    }
    
    lines[lineKey].push({
      text: item.str,
      x: item.transform[4],
      width: item.width
    })
  }
  
  // 处理每一行
  return Object.keys(lines)
    .sort((a, b) => a - b)
    .map(lineKey => {
      const lineItems = lines[lineKey].sort((a, b) => a.x - b.x)
      return combineLineItems(lineItems)
    })
    .filter(line => line.trim())
}

/**
 * 合并行内的文本项
 * @param {Array<Object>} lineItems - 行内文本项数组
 * @returns {string} 返回合并后的文本行
 */
function combineLineItems(lineItems) {
  let lineText = ''
  let lastItem = null
  
  for (const item of lineItems) {
    if (lastItem) {
      // 根据项目间的距离添加空格
      const gap = item.x - (lastItem.x + lastItem.width)
      if (gap > 5) {
        lineText += ' '.repeat(Math.floor(gap / 5))
      }
    }
    lineText += item.text
    lastItem = item
  }
  
  return lineText
}

/**
 * 查找可能的标题行
 * @param {Array<Array<string>>} tableData - 表格数据
 * @returns {number} 返回可能的标题行索引，如果未找到则返回-1
 */
function findPossibleHeaderRow(tableData) {
  // 标题行特征：
  // 1. 通常在前几行
  // 2. 列数较多
  // 3. 每列都有内容
  // 4. 可能包含特定关键字
  const headerKeywords = ['日期', '金额', '摘要', '余额', '对方', '账号', '交易']
  const maxRowsToCheck = Math.min(5, tableData.length)
  
  let bestScore = -1
  let bestIndex = -1
  
  for (let i = 0; i < maxRowsToCheck; i++) {
    const row = tableData[i]
    let score = 0
    
    // 检查列数
    score += row.length * 2
    
    // 检查空值数量
    const emptyCount = row.filter(cell => !cell.trim()).length
    score -= emptyCount * 3
    
    // 检查关键字
    const keywordCount = row.filter(cell => 
      headerKeywords.some(keyword => cell.includes(keyword))
    ).length
    score += keywordCount * 5
    
    if (score > bestScore) {
      bestScore = score
      bestIndex = i
    }
  }
  
  return bestScore > 0 ? bestIndex : -1
} 