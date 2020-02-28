@echo off
echo [core]
xcopy /D /E /Y .\core \\synapse\synapse\core
echo [client]
xcopy /D /E /Y .\client \\synapse\synapse\client
echo [tasks]
xcopy /D /E /Y .\tasks \\synapse\synapse\tasks
pause