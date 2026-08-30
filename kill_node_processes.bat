@echo off
REM filepath: d:\web\ebota-erp\kill_node_processes.bat
color 0C
title Node.js Process Killer

echo ================================================
echo        NODE.JS PROCESS KILLER UTILITY
echo ================================================
echo.

echo This utility will kill all running Node.js processes.
echo It's useful when the server gets stuck or before restarting your application.
echo.

echo Checking for running Node.js processes...

REM Check if any node processes are running
tasklist /FI "IMAGENAME eq node.exe" /FO TABLE
if %ERRORLEVEL% EQU 1 (
    echo.
    echo No Node.js processes were found.
    goto CHECK_PORT
)

echo.
echo The following Node.js processes will be terminated:
echo.

REM List all node processes with more details
wmic process where name="node.exe" get ProcessId,CommandLine /format:list | find "CommandLine"

echo.
choice /C YN /M "Do you want to terminate all Node.js processes"
if errorlevel 2 goto CHECK_PORT

echo.
echo Terminating Node.js processes...
taskkill /F /IM node.exe
if %ERRORLEVEL% EQU 0 (
    echo All Node.js processes have been successfully terminated.
) else (
    echo Failed to terminate some Node.js processes. Try running as administrator.
)

:CHECK_PORT
echo.
echo Checking for processes using port 3000...

REM Check for processes using port 3000
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') DO (
    echo Found process %%P using port 3000.
    echo Terminating process %%P...
    taskkill /F /PID %%P
    if %ERRORLEVEL% EQU 0 (
        echo Successfully terminated process %%P.
    ) else (
        echo Failed to terminate process %%P. Try running as administrator.
    )
    goto PORT_CHECK_DONE
)

echo No processes found using port 3000.

:PORT_CHECK_DONE
echo.
echo ================================================

REM Check for .next lock file
if exist ".next\*.lock" (
    echo Found Next.js lock files. Removing...
    del /F /Q ".next\*.lock"
    echo Next.js lock files removed.
)

echo.
echo Process cleaning complete.
echo You can now restart your application.
echo.
pause