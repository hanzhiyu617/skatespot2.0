# Agent 项目指南

## 概览

- 技术栈：Django 6.1.3 后端 + Vue 3 / Vite 6 前端
- Python：3.14.4，虚拟环境位于项目根目录 `.venv`
- 后台管理：django-simpleui 2026.1.13，默认语言简体中文
- 超级管理员：用户名 `Daniel`（密码不记录在仓库文件中）
- Django 首页已由 Vue SPA 替代，管理后台保留

## 目录结构

```text
.
├── .venv/                  # Python 虚拟环境
├── manage.py
├── myproject/              # Django 项目配置
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
├── myapp/                  # Django 应用
├── frontend/               # Vue 3 + Vite 前端
│   ├── src/
│   ├── dist/               # 构建产物，由 Django 托管
│   ├── package.json
│   └── vite.config.js
└── agnet.md                # 本文件
```

## 环境准备

PowerShell 中激活虚拟环境：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

Node.js v20.18.0 不在系统 PATH 中，执行 npm 命令前需先加入 PATH：

```powershell
$env:PATH = "$env:USERPROFILE\.workbuddy\binaries\node\versions\20.18.0.installing.122512.__extract_temp__\node-v20.18.0-win-x64;$env:PATH"
```

## 常用命令

所有 Python 命令统一使用虚拟环境解释器：

```powershell
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000 --noreload
```

前端安装与构建（位于 `frontend/` 目录）：

```powershell
npm install
npm run build
```

## 路由

- `/`：Vue SPA 首页，由 `frontend/dist/index.html` 渲染
- `/admin/`：Django 管理后台（simpleui 主题，中文界面）

## 关键配置

- `myproject/settings.py`
  - `INSTALLED_APPS` 首位为 `'simpleui'`，须在 `'django.contrib.admin'` 之前
  - `LANGUAGE_CODE = 'zh-hans'`，`TIME_ZONE = 'Asia/Shanghai'`
  - `TEMPLATES.DIRS` 和 `STATICFILES_DIRS` 均包含 `BASE_DIR / 'frontend' / 'dist'`
- `myproject/urls.py`
  - 根路径通过 `TemplateView` 渲染 `index.html`
  - 管理后台路径为 `admin/`
- `frontend/vite.config.js`
  - `base: '/static/'`，使构建产物资源路径与 Django 静态服务匹配

## 前端设计规范

- 布局：极简单列，居中 CTA，大量留白
- 风格：玻璃拟态，背景模糊，细边框与层次阴影
- 配色：主色 `#171717`，强调色 `#D4AF37`，背景 `#FFFFFF`
- 字体：Open Sans（正文）、Poppins（标题）
- 图标：使用内联 SVG 或 Lucide，不使用 emoji 作为图标
- 交互：可点击元素需有 `cursor-pointer`，悬停过渡 150–300ms

## 注意事项

- 修改 `frontend/src` 后必须重新执行 `npm run build`，Django 才会提供更新后的页面
- 不要在仓库文件中写入明文密码
- 重启服务器时使用 `--noreload` 以保持单一进程，便于停止与管理
- 新增 Django 应用需在 `INSTALLED_APPS` 中注册并执行迁移
