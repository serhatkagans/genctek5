@echo off
chcp 65001 >nul
title GencTek baslatici
REM Mantik dagitim\yerel-baslat.ps1 icinde; bu dosya yalnizca sarmalayici.
REM Klasor adinda Turkce karakter oldugu icin sabit yol degil %~dp0 kullanilir.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dagitim\yerel-baslat.ps1"
pause
