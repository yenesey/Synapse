set url=https://kr-ws-tech-02:444/tasks?id=39
set curl=..\XTECH\tools\curl
set cred=ifcbank\bogachev_di:****
set post=%curl% -s --insecure -i --user %cred% --ntlm
rem %put% "{\"$db\":\"tst.db\", \"$table\":\"finrez\" , \"$sql\":\"update finrez set depkoracc=1\"}" %url%

rem -H "Content-Type:multipart/form-data;charset=utf-8" 
rem -F "file128=@D:\�������� �몠 SQL.docx"
rem -X POST -H "Content-Type: text/html; charset=UTF-8" --data-ascii


rem set post=%curl% -X POST -H "Content-Type:text/html;charset=UTF-8" -s --insecure -i --user %cred% --ntlm
%post% -F "file128=@C:\��.jpg" %url%



pause


