@echo off
chcp 65001 >nul
title 별이 죽는 속도로 너를 읽는다 — CHRONO-ELEGY : 0.0004Hz
cd /d "%~dp0"
echo ===============================================================
echo   별이 죽는 속도로 너를 읽는다 (CHRONO-ELEGY : 0.0004Hz)
echo   영원관측기구 제0기록보존실 — 게임 서버 구동 중...
echo ===============================================================
start "" "http://localhost:4173"
call npm run preview -- --port 4173 --host
pause
