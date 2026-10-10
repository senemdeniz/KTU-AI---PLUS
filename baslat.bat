@echo off
rem Ikiz'i tek komutla calistirir (Windows): baslat.bat dosyasina cift tikla ya da komut isteminde "baslat.bat" yaz.
rem Ilk calistirmada sanal ortam kurar, paketleri yukler ve Groq anahtarini sorar. Sonraki calistirmalarda dogrudan acilir.
setlocal
cd /d "%~dp0"
set "PYTHONUTF8=1"
set "PYTHONIOENCODING=utf-8"
chcp 65001 >nul

set "PY="
py -3 -c "import sys; sys.exit(sys.version_info < (3, 10))" >nul 2>nul && set "PY=py -3"
if not defined PY python -c "import sys; sys.exit(sys.version_info < (3, 10))" >nul 2>nul && set "PY=python"
if not defined PY goto python_yok

if not exist ".venv\Scripts\python.exe" (
  echo Sanal ortam kuruluyor...
  %PY% -m venv .venv
  if errorlevel 1 goto hata
)
echo Paketler kontrol ediliyor (ilk seferde birkac dakika surebilir)...
".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check -r requirements.txt
if errorlevel 1 goto hata

findstr /r /c:"^LLM_API_KEY=..*" /c:"^ANTHROPIC_API_KEY=..*" .env >nul 2>nul
if not errorlevel 1 goto anahtar_var
echo.
echo Ajanlarin gercek dil modeliyle calismasi icin ucretsiz bir Groq anahtari gerekir: https://console.groq.com/keys
echo Yapistirmak icin sag tikla ya da Ctrl+V kullan, sonra Enter'a bas. Bos birakirsan demo modunda acilir.
set "IKIZ_ANAHTAR="
set /p "IKIZ_ANAHTAR=Groq anahtari: "
".venv\Scripts\python.exe" anahtar_yaz.py
set "IKIZ_ANAHTAR="
cls
:anahtar_var

echo Model baglantisi sinaniyor...
".venv\Scripts\python.exe" llm_kontrol.py
if errorlevel 1 echo (Model baglantisi kurulamadi; uygulama yine acilir, ajanlar hazir icerige duser.)

echo.
echo Ikiz aciliyor: http://127.0.0.1:8000
echo Kapatmak icin bu pencerede Ctrl+C'ye bas ya da pencereyi kapat.
rem Tarayici, sunucu kalktiktan sonra acilsin diye 3 saniye bekler
start "" /min cmd /c "ping -n 4 127.0.0.1 >nul & start http://127.0.0.1:8000"
".venv\Scripts\python.exe" -m uvicorn server:app --port 8000
pause
goto :eof

:python_yok
echo Python 3.10 ya da ustu bulunamadi.
echo https://www.python.org/downloads/ adresinden kur. Kurulumun ilk ekraninda "Add python.exe to PATH" kutusunu isaretle.
echo Sonra bu dosyayi tekrar calistir.
pause
exit /b 1

:hata
echo Kurulum tamamlanamadi. Internet baglantini kontrol edip tekrar dene; sorun surerse yukaridaki hatayi paylas.
pause
exit /b 1
