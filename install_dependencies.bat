@echo off
echo ========================================
echo INSTALLATION DES DEPENDANCES
echo ========================================
echo.

echo Installation de requests...
py -m pip install requests
echo.

echo Installation de beautifulsoup4...
py -m pip install beautifulsoup4
echo.

echo Installation de lxml...
py -m pip install lxml
echo.

echo ========================================
echo VERIFICATION DES PACKAGES
echo ========================================
echo.

py -c "import requests; print('✓ requests installe')"
py -c "import bs4; print('✓ beautifulsoup4 installe')"
py -c "import lxml; print('✓ lxml installe')"

echo.
echo ========================================
echo INSTALLATION TERMINEE
echo ========================================
echo.
echo Vous pouvez maintenant lancer le bot avec: py tdb.py
echo.
pause
