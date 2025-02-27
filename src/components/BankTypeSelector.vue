<template>
  <div class="bank-type-selector">
    <div class="selector-group">
      <el-select
        v-model="selectedBank"
        filterable
        allow-create
        placeholder="请选择所属银行"
        @change="handleBankChange"
      >
        <el-option
          v-for="bank in bankList"
          :key="bank"
          :label="bank"
          :value="bank"
        />
      </el-select>

      <el-select
        v-model="currentFileType"
        placeholder="请选择文件类型"
        @change="handleFileTypeChange"
      >
        <el-option label="储蓄卡明细" value="debit" />
        <el-option label="信用卡明细" value="credit" />
        <el-option label="开户信息" value="account" />
      </el-select>
    </div>

    <el-button type="primary" @click="handleSave" :disabled="!canSave">
      保存设置
    </el-button>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { saveBankTypeMapping, getBankTypeMappings } from '../utils/bankTypeStorage'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  fileType: {
    type: String,
    default: ''
  },
  initialBank: {
    type: String,
    default: ''
  },
  fields: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue', 'update:fileType', 'save'])

// 已保存的银行列表
const bankList = ref([])

// 当前选择的银行和文件类型
const selectedBank = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const currentFileType = computed({
  get: () => props.fileType,
  set: (val) => emit('update:fileType', val)
})

// 是否可以保存
const canSave = computed(() => {
  return selectedBank.value && currentFileType.value && props.fields.length > 0
})

// 加载已保存的银行列表
const loadBankList = () => {
  const mappings = getBankTypeMappings()
  const banks = new Set()
  Object.values(mappings).forEach(mapping => {
    if (mapping.bankName) {
      banks.add(mapping.bankName)
    }
  })
  bankList.value = Array.from(banks)
}

// 处理银行变化
const handleBankChange = (value) => {
  if (value && !bankList.value.includes(value)) {
    bankList.value.push(value)
  }
}

// 处理文件类型变化
const handleFileTypeChange = (value) => {
  // 可以在这里添加额外的处理逻辑
}

// 保存设置
const handleSave = () => {
  if (!canSave.value) {
    ElMessage.warning('请先选择银行和文件类型')
    return
  }

  saveBankTypeMapping(
    selectedBank.value,
    currentFileType.value,
    props.fields
  )
  
  ElMessage.success('设置已保存')
  emit('save', {
    bankName: selectedBank.value,
    fileType: currentFileType.value
  })
}

// 监听初始银行变化
watch(() => props.initialBank, (newValue) => {
  if (newValue && !selectedBank.value) {
    selectedBank.value = newValue
  }
}, { immediate: true })

// 组件挂载时加载银行列表
loadBankList()
</script>

<style scoped>
.bank-type-selector {
  display: flex;
  gap: 16px;
  align-items: center;
}

.selector-group {
  display: flex;
  gap: 16px;
  flex: 1;
}

:deep(.el-select) {
  flex: 1;
}

.el-button {
  flex-shrink: 0;
}
</style> 