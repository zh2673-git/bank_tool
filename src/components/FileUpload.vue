```vue
<template>
  <div class="upload-container">
    <el-upload
      class="upload-area"
      drag
      multiple
      :auto-upload="false"
      :show-file-list="false"
      :on-change="handleFileChange"
      accept=".xlsx,.xls,.csv,.txt,.pdf"
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">
        将文件拖到此处，或<em>点击上传</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">
          支持上传 Excel、CSV、PDF 格式文件，单个文件不超过20MB
        </div>
      </template>
    </el-upload>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import * as pdfjs from 'pdfjs-dist'
import { parseTxtContent } from '../utils/txtReader'
import { readPdfContent } from '../utils/pdfReader'

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

const emit = defineEmits(['files-uploaded'])

// 处理文件变化
const handleFileChange = async (file) => {
  try {
    if (!validateFile(file)) {
      return
    }

    const data = await readFile(file.raw)
    if (!data || (Array.isArray(data) && data.length === 0)) {
      ElMessage.error('文件内容为空')
      return
    }

    // 如果是Excel文件，data是一个包含多个sheet的数组
    const fileType = getFileType(file.name)
    if (fileType === 'excel') {
      emit('files-uploaded', [{
        name: file.name,
        size: file.size,
        type: fileType,
        sheets: data,
        currentSheet: data[0].name,
        data: data[0].data
      }])
    } else {
      emit('files-uploaded', [{
        name: file.name,
        size: file.size,
        type: fileType,
        data: data
      }])
    }
  } catch (error) {
    console.error('文件处理错误:', error)
    ElMessage.error('文件处理失败：' + error.message)
  }
}

// 验证文件
const validateFile = (file) => {
  // 检查文件类型
  const validTypes = ['xlsx', 'xls', 'csv', 'txt', 'pdf']
  const extension = file.name.split('.').pop().toLowerCase()
  if (!validTypes.includes(extension)) {
    ElMessage.error('不支持的文件类型')
    return false
  }

  // 检查文件大小（20MB）
  const maxSize = 20 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过20MB')
    return false
  }

  return true
}

// 读取文件内容
const readFile = async (file) => {
  const extension = file.name.split('.').pop().toLowerCase()
  
  switch (extension) {
    case 'pdf':
      return await readPdfFile(file)
    case 'txt':
      return await readTxtFile(file)
    case 'csv':
      return await readCsvFile(file)
    default:
      return await readExcelFile(file)
  }
}

// 读取 Excel 文件
const readExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // 读取所有sheet
        const sheets = workbook.SheetNames.map(sheetName => {
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            raw: false,
            defval: ''
          })
          
          // 过滤掉完全为空的行
          const filteredData = jsonData.filter(row => row.some(cell => cell !== ''))
          
          // 识别标题行
          const headerRowIndex = findHeaderRow(filteredData)
          if (headerRowIndex === -1) {
            throw new Error(`无法识别${sheetName}的标题行`)
          }
          
          // 重组数据
          return {
            name: sheetName,
            data: [
              filteredData[headerRowIndex],
              ...filteredData.slice(0, headerRowIndex),
              ...filteredData.slice(headerRowIndex + 1)
            ]
          }
        })
        
        resolve(sheets)
      } catch (error) {
        reject(new Error('Excel文件解析失败：' + error.message))
      }
    }
    
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// 读取 CSV 文件
const readCsvFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const content = await readTextWithEncoding(e.target.result)
        const separator = identifySeparator(content)
        const lines = content.split(/\r?\n/).filter(line => line.trim())
        const data = lines.map(line => line.split(separator).map(cell => cell.trim()))
        
        // 识别标题行
        const headerRowIndex = findHeaderRow(data)
        if (headerRowIndex === -1) {
          throw new Error('无法识别标题行')
        }
        
        // 重组数据
        const result = [
          data[headerRowIndex],
          ...data.slice(0, headerRowIndex),
          ...data.slice(headerRowIndex + 1)
        ]
        
        resolve(result)
      } catch (error) {
        reject(new Error('CSV文件解析失败：' + error.message))
      }
    }
    
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

// 读取 TXT 文件
const readTxtFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = async (e) => {
      try {
        const content = await readTextWithEncoding(e.target.result)
        const separator = identifySeparator(content)
        const lines = content.split(/\r?\n/).filter(line => line.trim())
        const data = lines.map(line => line.split(separator).map(cell => cell.trim()))
        
        // 识别标题行
        const headerRowIndex = findHeaderRow(data)
        if (headerRowIndex === -1) {
          throw new Error('无法识别标题行')
        }
        
        // 重组数据
        const result = [
          data[headerRowIndex],
          ...data.slice(0, headerRowIndex),
          ...data.slice(headerRowIndex + 1)
        ]
        
        resolve(result)
      } catch (error) {
        reject(new Error('TXT文件解析失败：' + error.message))
      }
    }
    
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(file)
  })
}

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

// 读取 PDF 文件
const readPdfFile = (file) => {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const data = await readPdfContent(arrayBuffer)
      resolve(data)
    } catch (error) {
      console.error('PDF解析详细错误:', error)
      reject(new Error('PDF文件解析失败：' + error.message))
    }
  })
}

// 查找可能的标题行
const findPossibleHeaderRow = (rows) => {
  const headerKeywords = [
    '交易日期', '交易时间', '摘要', '金额', '余额', '对方户名',
    '账号', '卡号', '交易类型', '交易金额', '借贷', '交易账号',
    '交易摘要', '交易方向', '收支', '支出', '收入', '交易描述',
    '交易用途', '备注', '流水号', '凭证号', '手续费', '日期',
    '时间', '借方', '贷方', '余额', '用途', '对方账号'
  ]

  let bestMatch = -1
  let maxMatches = 0

  // 只检查前10行
  const rowsToCheck = Math.min(10, rows.length)
  
  for (let i = 0; i < rowsToCheck; i++) {
    const row = rows[i]
    let matches = 0
    
    for (const cell of row) {
      const cellText = cell.toLowerCase()
      for (const keyword of headerKeywords) {
        if (cellText.includes(keyword.toLowerCase())) {
          matches++
          break // 一个单元格只计算一次匹配
        }
      }
    }

    if (matches > maxMatches) {
      maxMatches = matches
      bestMatch = i
    }
  }

  // 至少要匹配2个关键字才认为是标题行
  return maxMatches >= 2 ? bestMatch : -1
}

// 将文本行转换为表格数据
const convertTextLinesToTable = (lines) => {
  if (!lines || lines.length === 0) return []

  // 移除空行
  lines = lines.filter(line => line.trim() !== '')

  // 查找可能的标题行
  let headerIndex = -1
  const headerKeywords = [
    '交易日期', '交易时间', '摘要', '金额', '余额', '对方户名',
    '账号', '卡号', '交易类型', '交易金额', '借贷', '交易账号',
    '交易摘要', '交易方向', '收支', '支出', '收入', '交易描述',
    '交易用途', '备注', '流水号', '凭证号', '手续费'
  ]

  // 在前15行中查找标题行
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i].toLowerCase()
    const matches = headerKeywords.filter(keyword => 
      line.includes(keyword.toLowerCase())
    ).length

    if (matches >= 2) {
      headerIndex = i
      break
    }
  }

  if (headerIndex === -1) {
    // 如果没有找到标题行，尝试查找日期行
    const datePattern = /\d{4}[-/年]\d{1,2}[-/月]\d{1,2}/
    const dataLines = lines.filter(line => datePattern.test(line))
    
    if (dataLines.length > 0) {
      // 使用第一行作为标题行
      return [lines[0].split(/\s+/), ...dataLines.map(line => line.split(/\s+/))]
    }
    
    // 如果还是没有找到，返回所有非空行
    return lines.map(line => line.split(/\s+/))
  }

  // 提取标题行和数据行
  const headerRow = lines[headerIndex].split(/\s+/)
  const dataRows = lines
    .slice(headerIndex + 1)
    .map(line => line.split(/\s+/))
    .filter(row => row.length >= Math.max(2, Math.floor(headerRow.length * 0.5)))

  // 标准化数据
  const maxColumns = Math.max(
    headerRow.length,
    ...dataRows.map(row => row.length)
  )

  const standardizedData = [
    headerRow,
    ...dataRows
  ].map(row => {
    while (row.length < maxColumns) {
      row.push('')
    }
    return row.slice(0, maxColumns)
  })

  return standardizedData
}

// 识别标题行
const findHeaderRow = (data) => {
  // 常见的标题行关键字
  const headerKeywords = [
    '交易日期', '交易时间', '摘要', '金额', '余额', '对方户名',
    '账号', '卡号', '交易类型', '交易金额', '借贷', '交易账号',
    '交易摘要', '交易方向', '收支', '支出', '收入'
  ]

  // 遍历前10行（或更少如果数据行数小于10）
  const rowsToCheck = Math.min(10, data.length)
  let bestMatchRow = -1
  let maxMatches = 0

  for (let i = 0; i < rowsToCheck; i++) {
    const row = data[i]
    let matches = 0

    // 计算当前行包含多少个关键字
    for (const cell of row) {
      if (!cell) continue
      const cellStr = cell.toString().toLowerCase()
      matches += headerKeywords.some(keyword => 
        cellStr.includes(keyword.toLowerCase())
      ) ? 1 : 0
    }

    // 更新最佳匹配行
    if (matches > maxMatches) {
      maxMatches = matches
      bestMatchRow = i
    }
  }

  // 如果没有找到任何匹配，返回第一行
  return bestMatchRow === -1 ? 0 : bestMatchRow
}

// 获取文件类型
const getFileType = (filename) => {
  const extension = filename.split('.').pop().toLowerCase()
  if (['xlsx', 'xls'].includes(extension)) {
    return 'excel'
  }
  return extension
}
</script>

<style scoped>
.upload-container {
  width: 100%;
}

.upload-area {
  width: 100%;
  border: 2px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration);
  padding: 10px;
}

.upload-area:hover {
  border-color: var(--el-color-primary);
}

.el-upload__text {
  color: var(--el-text-color-regular);
  font-size: 14px;
  text-align: center;
  margin: 5px 0;
}

.el-upload__text em {
  color: var(--el-color-primary);
  font-style: normal;
}

.el-upload__tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 5px;
}

:deep(.el-upload-dragger) {
  width: 100%;
  height: 120px;
  padding: 10px;
}

:deep(.el-icon--upload) {
  font-size: 32px;
  color: var(--el-text-color-secondary);
  margin: 10px 0;
  line-height: 32px;
}

/* 调整拖拽区域的内边距 */
:deep(.el-upload-dragger .el-upload__text) {
  margin: 5px 0;
}

/* 使整体更紧凑 */
:deep(.el-upload) {
  width: 100%;
  display: block;
}

:deep(.el-upload-dragger:hover) {
  border-color: var(--el-color-primary);
}
</style>
``` 
``` 