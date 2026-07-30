@echo off
chcp 65001 >nul
title GencTek durdurucu
REM Mantik dagitim\yerel-durdur.ps1 icinde; bu dosya yalnizca sarmalayici.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dagitim\yerel-durdur.ps1"
pause
