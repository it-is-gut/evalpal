const { menubar } = require('menubar')
const { Notification, ipcMain } = require('electron')
const path = require('path')

const AmazonCognitoIdentity = require('amazon-cognito-identity-js')
global.fetch = require('node-fetch')

const poolData = {    
  UserPoolId : "us-east-2_oOn7RJX94", 
  ClientId : "qlp8sr3ohoa53lp5uhoprafha"
  };

const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

const mb = menubar({preloadWindow: true, icon: 'icons/icon.png', tooltip: 'EVALPAL', browserWindow: { height: 800, width: 600, webPreferences: { nodeIntegration: true, contextIsolation: false, enableRemoteModule: true, preload: path.join(__dirname, 'preload.js')}}})

let accessToken
let idToken
let refreshToken

let loggedIn = false

mb.on('ready', () => {
    //mb.window.webContents.openDevTools()
    console.log('app is ready');
    APIListener('praise')
  });

mb.on('hide', () => {
  console.log('window closed')
  mb.window.loadFile('index.html')
})

mb.on('show', () => {
  console.log('window opened')
  if (loggedIn) {
    mb.window.loadFile('pages/home.html')
  }
})

ipcMain.on('signup-message', (event, firstname, name, email, password) => {
  RegisterUser(firstname, name, email, password)
  });

ipcMain.on('login-message', (event, email, password) => {
  LogIn(email, password)
  });

  function showNotification (title, body) {
    var notification = new Notification({ title: title, body: body, icon: 'icons/icon-big.png' })
    notification.on('click', () => {
      mb.window.loadFile('pages/popups/thanks.html')
      notification.removeAllListeners(['click'])
      mb.showWindow()
    })
    notification.show()
  }

  function RegisterUser(name, firstname, email, password) {
    var attributeList = [];
    attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"name",Value:firstname}))
    attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"family_name",Value:name}))
    attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({Name:"email",Value:email}))

    userPool.signUp(email, password, attributeList, null, function(err, result){
        if (err) {
            console.log(err);
            return;
        }
        console.log('signed up!')
        cognitoUser = result.user;
        showNotification("Welcome!", "Please confirm your email before you can login")
        mb.window.loadFile('./index.html')
    });
  }

  function LogIn(email, password) {
    var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
      Username : email,
      Password : password,
    });

    var userData = {
      Username : email,
      Pool : userPool
    };
    var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: function (result) {
        loggedIn = true
        console.log('logged in!')
        accessToken = result.getAccessToken().getJwtToken();
        idToken = result.getIdToken().getJwtToken();
        refreshToken = result.getRefreshToken().getToken();
        mb.window.loadFile('pages/home.html')
      },
      onFailure: function(err) {
          console.log(err);
      },
    });
  }

  function APIListener(dto1) {
    var dto = dto1

    switch (dto) {
      case "praise":
        showNotification('HUZZAH! 🎉', 'John sent you a compliment!')
        break;
      case "feedback":
        showNotification('Jeez! 😳', 'John sent a feedback about your work!')
        break;
      case "check":
        showNotification('How are you? 😊', 'John wants to know how your doing!')
        break;
      default:
        break;
    }
  }