# 银行清洗工具

一个基于Vue 3的银行账单数据处理和清洗工具，支持多种格式的银行账单文件处理。

![项目截图](主界面.png)

## 项目简介

本项目是一个专门用于处理和清洗银行账单数据的Web应用工具。它能够处理多种格式的银行账单，包括xlsx、xls、csv，并提供字段映射、数据清洗等功能，最终输出标准化的数据格式。

## 版本信息
- 当前版本：0.2
- 最后更新：2025-02-27
- 状态：持续开发中

## 主要功能

1. 文件处理
   - 支持多种格式：xlsx、xls、csv
   - 批量上传功能
   - 文件预览
   - 自动识别银行账单标题行

2. 字段映射
   - 自动识别原始字段
   - 支持手动映射字段
   - 保存映射关系供后续使用
   - 支持一个标准字段对应多个原始字段

3. 数据清洗
   - 支持单个文件清洗
   - 支持批量清洗
   - 自动补充缺失信息
   - 支持初步清洗和深度清洗

4. 文件管理
   - 文件列表显示
   - 文件预览功能
   - 支持单个和批量删除
   - 文件类型自动识别

## 标准字段说明

### 银行明细标准字段
- 所属银行：银行名称
- 本方姓名：账户持有人姓名
- 本方账号：银行账号
- 本方卡号：银行卡号
- 交易金额：交易发生的金额
- 交易时间：交易发生的时间
- 借贷标志：收入/支出标识
- 币种：交易货币类型
- 余额：交易后账户余额
- 交易方式：交易的具体方式
- 交易摘要：交易的简要说明
- 交易网点：交易发生的网点
- 对方户名：交易对方的名称
- 对方账户：交易对方的账号
- 对方卡号：交易对方的卡号
- 对方开户行：交易对方的开户银行

### 开户信息标准字段
- 姓名：开户人姓名
- 账号：银行账号
- 卡号：银行卡号
- 身份证号：开户人身份证号
- 联系方式：开户人联系电话
- 家庭住址：开户人居住地址

## 快速开始

### 环境要求
- Node.js >= 16
- npm >= 8

### 安装步骤

1. 克隆项目
```bash
git clone [项目地址]
cd bank_clean
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 构建生产版本
```bash
npm run build
```

## 使用说明

1. 上传文件
   - 点击上传区域或将文件拖拽到上传区域
   - 支持同时上传多个文件
   - 上传完成后可以在列表中查看文件

2. 字段映射
   - 点击文件列表中的"字段映射"按钮
   - 在弹出的对话框中选择原始字段与标准字段的对应关系
   - 确认保存映射关系

3. 数据清洗
   - 选择需要清洗的文件
   - 可以选择"初步清洗"或"深度清洗"
   - 等待清洗完成后下载结果

## 技术栈
- Vue 3
- TypeScript
- Vite
- Element Plus
- Pinia
- Vue Router

## 项目结构
```
bank_clean/
├── src/                # 源代码目录
│   ├── components/     # 组件
│   ├── utils/         # 工具函数
│   ├── configs/       # 配置文件
│   ├── constants/     # 常量定义
│   ├── styles/        # 样式文件
│   └── workers/       # Web Workers
├── public/            # 静态资源
└── vite.config.js     # Vite配置
```

## 贡献指南

1. Fork 本仓库
2. 创建您的特性分支 (git checkout -b feature/AmazingFeature)
3. 提交您的更改 (git commit -m 'Add some AmazingFeature')
4. 推送到分支 (git push origin feature/AmazingFeature)
5. 打开一个 Pull Request

## 许可证

[MIT License](LICENSE)

## 联系方式与支持

如果您在使用过程中遇到任何问题，或有任何建议，请通过以下方式联系我们：

- 提交 Issue
- Pull Requests
- 在 Discussions 中发起讨论

我们欢迎任何形式的贡献和反馈！
