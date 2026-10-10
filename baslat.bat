@echo off
rem Ikiz'i tek komutla calistirir (Windows): baslat.bat
setlocal
cd /d "%~dp0"

set "PY="
py -3 -c "import sys; sys.exit(sys.version_info < (3, 10))" >nul 2>nul && set "PY=py -3"
if not defined PY python -c "import sys; sys.exit(sys.version_info < (3, 10))" >nul 2>nul && set "PY=python"
if not defined PY goto python_yok

if not exist ".venv\Scripts\python.exe" (
  echo Sanal ortam kuruluyor...
  %PY% -m venv .venv
)
echo Paketler kontrol ediliyor...
".venv\Scripts\python" -m pip install -q --disable-pip-version-check -r requirements.txt
if errorlevel 1 goto hata

findstr /r /c:"^LLM_API_KEY=..*" /c:"^ANTHROPIC_API_KEY=..*" .env >nul 2>nul
if not errorlevel 1 goto anahtar_var
echo.
echo Ajanlarin gercek dil modeliyle calismasi icin ucretsiz bir Groq anahtari gerekir: https://console.groq.com/keys
set /p "IKIZ_ANAHTAR=Anahtari yapistir ve Enter'a bas (bos birakirsan demo modunda acilir): "
".venv\Scripts\python" anahtar_yaz.py
set "IKIZ_ANAHTAR="
:anahtar_var

echo Model baglantisi sinaniyor...
".venv\Scripts\python" llm_kontrol.py
if errorlevel 1 echo (Model baglantisi kurulamadi; uygulama yine acilir, ajanlar hazir icerige duser.)

echo.
echo Ikiz aciliyor: http://127.0.0.1:8000   (kapatmak icin Ctrl+C)
start "" http://127.0.0.1:8000
".venv\Scripts\python" -m uvicorn server:app --port 8000
goto :eof

:python_yok
echo Python 3.10 ya da ustu bulunamadi. https://www.python.org/downloads/ adresinden kur.
echo Kurulumda "Add python.exe to PATH" kutusunu isaretle, sonra bu dosyayi tekrar calistir.
pause
exit /b 1

:hata
echo Paketler kurulamadi. Internet baglantini kontrol edip tekrar dene.
pause
exit /b 1
