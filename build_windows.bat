@echo off
echo =============================================================
echo   Compilador para Windows - ITMA II Laboratorio
echo =============================================================

echo.
echo [1/3] Instalando dependencias de escritorio...
pip install -r requirements.txt
pip install -r requirements-desktop.txt

echo.
echo [2/3] Compilando ejecutable nativo con PyInstaller...
pyinstaller --noconfirm --onedir --windowed --add-data "static;static" --name "Laboratorio_ITMA2" desktop.py

echo.
echo [3/3] Compilacion completada con exito.
echo El ejecutable se encuentra en: dist\Laboratorio_ITMA2\Laboratorio_ITMA2.exe
echo =============================================================
pause
