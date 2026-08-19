#!/bin/bash
set -e

echo "============================================================="
echo "   Compilador y Empaquetador para Linux Debian / Ubuntu      "
echo "        Sistema de Gestión de Laboratorio - ITMA II         "
echo "============================================================="

# 1. Instalar dependencias del sistema requeridas para WebKit y Python en Debian
echo "\n[1/5] Verificando e instalando dependencias nativas de Debian..."
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv python3-gi \
    gir1.2-webkit2-4.1 || sudo apt-get install -y gir1.2-webkit2-4.0 || true

# 2. Configurar entorno virtual de compilación
echo "\n[2/5] Configurando entorno virtual de compilación..."
python3 -m venv venv_build
source venv_build/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
pip install -r requirements-desktop.txt

# 3. Compilar ejecutable binario nativo con PyInstaller
echo "\n[3/5] Compilando ejecutable binario con PyInstaller..."
pyinstaller --noconfirm --onedir --windowed \
    --add-data "static:static" \
    --name "labkeep" \
    desktop.py

# 4. Crear estructura del paquete .deb para Debian
echo "\n[4/5] Ensamblando estructura del paquete instalador .deb..."
PKG_DIR="build_deb_pkg"
rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR/DEBIAN"
mkdir -p "$PKG_DIR/opt/labkeep"
mkdir -p "$PKG_DIR/usr/bin"
mkdir -p "$PKG_DIR/usr/share/applications"

# Copiar archivos compilados a /opt/labkeep
cp -r dist/labkeep/* "$PKG_DIR/opt/labkeep/"

# Crear enlace simbólico ejecutable en /usr/bin/labkeep
cat << 'EOF' > "$PKG_DIR/usr/bin/labkeep"
#!/bin/bash
exec /opt/labkeep/labkeep "$@"
EOF
chmod +x "$PKG_DIR/usr/bin/labkeep"

# Copiar archivo .desktop para el menú de inicio
cp labkeep.desktop "$PKG_DIR/usr/share/applications/"

# Crear archivo de control Debian
cat << 'EOF' > "$PKG_DIR/DEBIAN/control"
Package: laboratorio-itma2
Version: 1.0.0
Section: utils
Priority: optional
Architecture: amd64
Maintainer: ITMA II Laboratorio <soporte@itma2.edu.mx>
Depends: gir1.2-webkit2-4.1 | gir1.2-webkit2-4.0, python3
Description: Sistema de Gestión de Laboratorio Químico e Inventario - ITMA II
 Aplicación de escritorio nativa para el control de reactivos, sustancias, materiales y préstamos.
EOF

# 5. Construir el paquete .deb final
echo "\n[5/5] Generando archivo instalador laboratorio-itma2_1.0.0_amd64.deb..."
dpkg-deb --build "$PKG_DIR" "laboratorio-itma2_1.0.0_amd64.deb"

echo "\n============================================================="
echo "  ¡COMPILACIÓN EXITOSA!                                     "
echo "  Paquete generado:  laboratorio-itma2_1.0.0_amd64.deb      "
echo ""
echo "  Para instalarlo en cualquier Debian / Ubuntu ejecuta:     "
echo "    sudo dpkg -i laboratorio-itma2_1.0.0_amd64.deb          "
echo "============================================================="
