# AI in Action

一个基于 Next.js 15 和 WebRTC 的智能社交平台，支持实时视频通话、AI 情感分析、虚拟空间等功能。

## 快速启动

### 一键启动（推荐）

```bash
# 双击运行启动脚本
start.bat
```

脚本会自动：
- 检测并安装前后端依赖
- 并行启动前后端服务器

### 使用 npm 脚本

```bash
# 1. 安装依赖并设置后端环境
npm run setup:backend

# 2. 同时启动前后端
npm run dev:full
```

## 访问地址

- **前端应用**: http://localhost:3000
- **后端 API**: http://localhost:8000  
- **API 文档**: http://localhost:8000/docs

## 主要功能

- **实时视频通话** - 基于 WebRTC 的高质量视频通话
- **AI 情感分析** - 智能识别用户情感状态
- **虚拟空间** - 多样化的互动场景
- **智能聊天** - AI 助手对话功能
- **社区交流** - 用户社区与互动

## 技术栈

**前端**：
- Next.js 15 (App Router)
- TypeScript
- TailwindCSS
- WebRTC
- Socket.IO

**后端**：
- FastAPI (Python)
- WebSocket
- PyTorch (情感分析)
- Uvicorn

## 项目结构

```
web-ai-in-action-frontend/
├── src/                    # 前端源码
│   ├── app/               # Next.js 页面
│   ├── components/        # React 组件
│   └── utils/            # 工具函数
├── backend/               # 后端源码
│   ├── websocket_server.py # WebSocket 服务器
│   ├── main.py           # REST API 服务器
│   ├── emotion_api/      # 情感分析 API
│   └── requirements*.txt # Python 依赖
├── start.bat             # 一键启动脚本
└── package.json          # 前端依赖和脚本
```

## 功能验证

1. 打开 http://localhost:3000
2. 点击右下角的蓝色浮动视频按钮
3. 允许浏览器访问摄像头和麦克风
4. 输入用户名并开始视频通话
5. 在另一个浏览器窗口中重复操作，使用相同房间号进行通话

## 手动设置指南

如果自动脚本遇到问题，可按以下步骤手动设置：

### 步骤 1: 设置后端环境

```bash
# 1. 进入后端目录
cd backend

# 2. 创建 Python 虚拟环境
python -m venv venv

# 3. 激活虚拟环境
# Windows Command Prompt:
venv\Scripts\activate.bat
# Windows PowerShell:
venv\Scripts\Activate.ps1
# Git Bash:
source venv/Scripts/activate

# 4. 安装依赖
pip install -r requirements.txt
```

### 步骤 2: 启动后端服务

```bash
# 在 backend 目录中，确保虚拟环境已激活
python -m uvicorn websocket_server:app --host 0.0.0.0 --port 8000 --reload
```

### 步骤 3: 启动前端（新终端）

```bash
# 回到项目根目录
cd ..

# 安装前端依赖
npm install

# 启动前端开发服务器
npm run dev
```

## 故障排除

### 后端启动失败
- 确保 Python 3.8+ 已安装
- 检查虚拟环境是否正确激活
- 确认端口 8000 未被占用

### 前端启动失败  
- 确保 Node.js 16+ 已安装
- 删除 `node_modules` 和 `package-lock.json`，重新 `npm install`
- 确认端口 3000 未被占用

### 视频通话连接失败
- 确保后端服务器正在运行
- 检查浏览器控制台是否有错误信息
- 允许浏览器访问摄像头和麦克风权限

### 常见问题

**问题 1: `No module named uvicorn`**
```bash
# 确保激活了虚拟环境
cd backend
venv\Scripts\activate
pip install uvicorn
```

**问题 2: Python 虚拟环境创建失败**
```bash
# 尝试使用完整路径
python.exe -m venv venv
# 或者指定 Python 版本
py -3 -m venv venv
```

**问题 3: 权限问题（Windows PowerShell）**
```bash
# 临时允许脚本执行
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**问题 4: 端口被占用**
```bash
# 检查端口使用情况
netstat -ano | findstr :8000

# 使用其他端口
python -m uvicorn websocket_server:app --host 0.0.0.0 --port 8001 --reload
```


## 开发说明

### 环境要求
- Node.js 16+
- Python 3.8+
- 现代浏览器（支持 WebRTC）

### 开发脚本
```bash
npm run dev          # 仅启动前端
npm run dev:backend  # 仅启动后端
npm run dev:full     # 同时启动前后端
npm run setup:backend # 设置后端环境
npm run build        # 构建生产版本
```

### 代码规范
- 使用 ESLint 进行代码检查
- 使用 TypeScript 确保类型安全
- 遵循 Next.js 15 App Router 规范

