# ionic-sandbox
Mobile application sandbox based on Ionic/Cordova Framework


##Install
Install ionic and bower, then run bower install. 
```bash
bower install
```

##Serve ionic application 
```bash
ionic serve
```

##Chromium 
This application needs to access a remote server.
Browsers does not allow this access (XMLHttpRequest cannot load http://127.0.0.1:8000/api/categories. No 'Access-Control-Allow-Origin' header is present on the requested resource. Origin 'http://localhost:8100' is therefore not allowed access. in Chrome)

We recommend chromium for testing. Use it as a "non-secured" browser. This command run chromium without security.
```bash
chromium-browser --disable-web-security http://localhost:8100
```

