@echo off
REM Script d'installation automatique pour le Bot de Trading Telegram (Windows)
REM Usage: install.bat [optimized|minimal|dev]

SETLOCAL EnableDelayedExpansion

REM Couleurs via caractères spéciaux (limité sur Windows)
echo.
echo ╔══════════════════════════════════════════════╗
echo ║   BOT DE TRADING TELEGRAM - INSTALLATION    ║
echo ╚══════════════════════════════════════════════╝
echo.

REM Vérifier Python
echo [INFO] Verification de Python...
py --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas installe ou pas dans le PATH
    echo Telechargez Python sur: https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('py --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [OK] Python %PYTHON_VERSION% detecte

REM Vérifier pip
echo [INFO] Verification de pip...
py -m pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] pip n'est pas installe
    pause
    exit /b 1
)
echo [OK] pip detecte

REM Choisir le fichier requirements
set REQUIREMENTS_FILE=requirements-optimized.txt
if "%1"=="minimal" (
    set REQUIREMENTS_FILE=requirements-minimal.txt
    echo [INFO] Installation MINIMALE selectionnee ~100MB
) else if "%1"=="dev" (
    set REQUIREMENTS_FILE=requirements-dev.txt
    echo [INFO] Installation DEVELOPPEMENT selectionnee ~350MB
) else (
    echo [INFO] Installation OPTIMISEE selectionnee ~250MB
)
echo [INFO] Utilisation de: %REQUIREMENTS_FILE%
echo.

REM Vérifier si le fichier existe
if not exist "%REQUIREMENTS_FILE%" (
    echo [ERREUR] Fichier %REQUIREMENTS_FILE% non trouve
    pause
    exit /b 1
)

REM Proposer environnement virtuel
if not exist "venv\" (
    echo [ATTENTION] Aucun environnement virtuel detecte
    set /p CREATE_VENV="Creer un environnement virtuel ? (recommande) [O/n]: "
    if /i not "!CREATE_VENV!"=="n" (
        echo [INFO] Creation de l'environnement virtuel...
        py -m venv venv
        if %errorlevel% neq 0 (
            echo [ERREUR] Impossible de creer l'environnement virtuel
            pause
            exit /b 1
        )
        echo [OK] Environnement virtuel cree

        echo [INFO] Activation de l'environnement virtuel...
        call venv\Scripts\activate.bat
        echo [OK] Environnement virtuel active
    )
) else (
    echo [OK] Environnement virtuel detecte
    echo [INFO] Activation de l'environnement virtuel...
    call venv\Scripts\activate.bat
)

REM Mettre à jour pip
echo.
echo [INFO] Mise a jour de pip...
py -m pip install --upgrade pip --quiet
if %errorlevel% neq 0 (
    echo [ATTENTION] Impossible de mettre a jour pip (non critique)
) else (
    echo [OK] pip mis a jour
)

REM Installer les dépendances
echo.
echo ========================================
echo INSTALLATION DES DEPENDANCES
echo ========================================
echo.
echo [INFO] Installation en cours...
echo [INFO] Cela peut prendre plusieurs minutes...
echo.

py -m pip install -r "%REQUIREMENTS_FILE%"
if %errorlevel% neq 0 (
    echo.
    echo [ERREUR] Erreur lors de l'installation des dependances
    echo [INFO] Consultez les messages d'erreur ci-dessus
    pause
    exit /b 1
)

echo.
echo [OK] Dependances installees avec succes

REM Vérifier les packages critiques
echo.
echo ========================================
echo VERIFICATION DES PACKAGES
echo ========================================
echo.

py -c "import yfinance; print('[OK] yfinance installe')" 2>nul || echo [ERREUR] yfinance manquant
py -c "import pandas; print('[OK] pandas installe')" 2>nul || echo [ERREUR] pandas manquant
py -c "import numpy; print('[OK] numpy installe')" 2>nul || echo [ERREUR] numpy manquant
py -c "import telegram; print('[OK] python-telegram-bot installe')" 2>nul || echo [ERREUR] telegram manquant
py -c "import requests; print('[OK] requests installe')" 2>nul || echo [ERREUR] requests manquant
py -c "import bs4; print('[OK] beautifulsoup4 installe')" 2>nul || echo [ERREUR] beautifulsoup4 manquant

REM Audit de sécurité (optionnel)
echo.
set /p RUN_AUDIT="Lancer un audit de securite ? [o/N]: "
if /i "!RUN_AUDIT!"=="o" (
    echo [INFO] Installation de pip-audit...
    py -m pip install pip-audit --quiet

    echo [INFO] Audit de securite en cours...
    py -m pip_audit
    if %errorlevel% neq 0 (
        echo [ATTENTION] Des vulnerabilites ont ete detectees
        echo [INFO] Consultez le rapport ci-dessus
    ) else (
        echo [OK] Aucune vulnerabilite detectee
    )
)

REM Résumé
echo.
echo ╔══════════════════════════════════════════════╗
echo ║         INSTALLATION TERMINEE ! ✓            ║
echo ╚══════════════════════════════════════════════╝
echo.
echo [INFO] Pour activer l'environnement virtuel:
echo        venv\Scripts\activate
echo.
echo [INFO] Pour lancer le bot:
echo        py tdb.py
echo.
echo [INFO] Pour plus d'informations:
echo        type INSTALLATION.md
echo        type AUDIT_DEPENDANCES.md
echo.

REM Sauvegarder les versions installées
echo [INFO] Sauvegarde des versions installees...
py -m pip freeze > requirements-installed-%date:~-4,4%%date:~-7,2%%date:~-10,2%.txt
echo [OK] Versions sauvegardees

echo.
pause
