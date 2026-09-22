@echo off
rem Registers a scheduled task that starts the Company Dashboard backend at logon.
schtasks /create /tn "CompanyDashboardBackend" /tr "\"C:\Users\sahil\OneDrive\Desktop\dashboard-company-style\backend\start-backend.bat\"" /sc onlogon /f