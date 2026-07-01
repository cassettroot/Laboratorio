@echo off
title Laboratorio ITMA II - Inventario de Laboratorio
echo ==========================================================
echo  Iniciando Laboratorio ITMA II - Inventario de Laboratorio
echo ==========================================================
echo.
echo 1/2: Verificando e instalando dependencias (por favor espera)...
pip install -r requirements.txt

echo.
echo 2/2: Iniciando el servidor local de base de datos e interfaz...
python main.py

echo.
echo El servidor se ha detenido.
pause
