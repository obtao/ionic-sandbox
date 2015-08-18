#Wallabag Ionic Application

This repository hosts the Ionic Application for Wallabag.

##Requirements

Wallabag uses :

- Ionic >=1.6.x (Installation possible with npm : ```npm install -g ionic ```). [View Installation Guide on Ionicframework.com](http://ionicframework.com/docs/guide/installation.html)
- Bower

##Installation / Testing

1. Install cordova plugins (Restore plugins and platforms using package.json file) :
```ionic state restore```

2. Install librairies :
```bower install```

3. Configuration :
Configuration can be done in ```appsetting.js``` file.
For now, username, password and salt must be filled. In the 1.0.0 version, an oauth login screen will prompt user credentials.
```
AppSettings = {
  baseApiUrl: 'http://v2.wallabag.org/api/', //Url to Wallabag Api
  username: 'wallabag', //Username
  password: 'wallabag', //Plain Password
  salt: "9549fda04348bebb47bd9501d17168d3" //Salt as in wallabag database
}
```

4. Serve local application :
```ionic serve```
This command will launch [a local ionic application](http://localhost:8100/).
This application needs to access a remote server. Browsers does not allow external resources access.
We recommend chromium for testing. Use it as a "non-secured" browser.
This command run chromium without security.
```
chromium-browser --disable-web-security http://localhost:8100
```

