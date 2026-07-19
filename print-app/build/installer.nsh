; Custom NSIS behaviour for the Vista Print Station installer.
;
; The app lives in the system tray and stays running, so a normal update can't
; replace the .exe while it's open — that's the "Vista Print Station cannot be
; closed. Please close it manually and click Retry" dialog. Override the
; running-app check to quietly force-close it first, so updates are seamless.

!macro customCheckAppRunning
  nsExec::Exec 'taskkill /f /t /im "${APP_EXECUTABLE_FILENAME}"'
  Sleep 1200
!macroend
