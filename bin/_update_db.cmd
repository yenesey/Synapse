@echo off
echo Внимание! Конфигурация будет перезаписана!
xcopy /D /E ..\db\synapse.db \\synapse\synapse\db
pause