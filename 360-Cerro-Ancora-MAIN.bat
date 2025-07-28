@echo off
REM Batch file to run the Patio TIC 360 Flask application

echo Starting 360 CERRO ANCORA application...
echo Please wait for the Flask server to start.
echo Then, open your browser and go to: http://localhost:8299 or http://[YOUR_IP_ADDRESS]:8299

REM Execute the specified Python command
C:/ProgramData/anaconda3/python.exe "d:/360-CERRO-ANCORA/main.py"

echo.
echo Flask application has stopped or encountered an error.
pause