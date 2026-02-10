@echo off
chcp 65001 >NUL
title Tim A&R Manager
cd /d "%~dp0"
npm run launch
