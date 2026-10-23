@echo off
chcp 65001 >nul
REM ==========================================================
REM  青年科创峰会小程序 · 云函数一键部署脚本
REM  前置：微信开发者工具已登录，且已在「设置 -> 安全设置」开启服务端口
REM  用法：双击运行，或在命令行传入云环境 ID，例如：deploy.bat cloud1-8gxxxxx
REM ==========================================================

set "CLI=E:\微信web开发者工具\cli.bat"
set "PROJ=C:\Users\xu\WorkBuddy\2026-10-23-13-31-08\summit-miniprogram"

if not exist "%CLI%" (
    echo [错误] 未找到开发者工具 CLI：%CLI%
    echo        请修改脚本顶部的 CLI 变量为你的实际安装路径。
    pause
    exit /b 1
)

echo.
echo ================= 步骤 1/4：打开并编译项目 =================
call "%CLI%" open --project "%PROJ%"
if errorlevel 1 (
    echo [提示] 若此处报「服务端口已关闭」，请先在开发者工具中：
    echo        设置 ^-^> 安全设置 ^-^> 开启「服务端口」，然后重新运行本脚本。
    pause
    exit /b 1
)

echo.
echo ================= 步骤 2/4：查询云环境列表 =================
set "ENV_ID=%~1"
if "%ENV_ID%"=="" (
    echo 未传入环境 ID，下面列出当前可用的云环境：
    call "%CLI%" cloud env list --project "%PROJ%"
    echo.
    echo 请从上表中复制你的环境 ID，然后重新运行：
    echo     deploy.bat ^<你的环境ID^>
    pause
    exit /b 0
)

echo 使用云环境：%ENV_ID%
echo.
echo ================= 步骤 3/4：部署 4 个云函数（云端安装依赖）=================
call "%CLI%" cloud functions deploy --env %ENV_ID% -r --names login activity register admin --project "%PROJ%"
if errorlevel 1 (
    echo [失败] 云函数部署失败，请检查：1 是否已开通云开发 2 环境 ID 是否正确 3 AppID 是否已填写
    pause
    exit /b 1
)

echo.
echo ================= 步骤 4/4：校验部署结果 =================
call "%CLI%" cloud functions list --env %ENV_ID% --project "%PROJ%"

echo.
echo ==========================================================
echo  云函数已部署完成！还差最后 3 步手动操作：
echo   1. 云开发控制台 -> 数据库 -> 新建集合：activities / registrations / users
echo   2. 在云函数 admin 上右键 -> 云端测试，运行 {"action":"initDemo"} 写入示例活动
echo   3. 回到开发者工具编译，即可看到活动列表
echo ==========================================================
pause
