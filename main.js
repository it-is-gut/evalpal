const { menubar } = require('menubar')
const { Notification, ipcMain } = require('electron')
const path = require('path')

// local storage for token
if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}

const AmazonCognitoIdentity = require('amazon-cognito-identity-js')
global.fetch = require('node-fetch')

const request = require('request')

const poolData = {
    UserPoolId: "us-east-2_oOn7RJX94",
    ClientId: "qlp8sr3ohoa53lp5uhoprafha"
};


const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

const mb = menubar({ preloadWindow: true, icon: 'icons/icon.png', tooltip: 'EVALPAL', browserWindow: { height: 800, width: 600, webPreferences: { nodeIntegration: true, contextIsolation: false, enableRemoteModule: true, preload: path.join(__dirname, 'preload.js') } } })

// TODO remove if not used 
// let accessToken
// let refreshToken

// saves aws api token
var idToken

var users = []

let loggedIn = false

// Set up general thins
mb.on('ready', () => {
    console.log('app is ready');
    APIListener('praise')
    GetAllUsers()
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

// React to ipc-Events from buttons
ipcMain.on('signup-message', (event, firstname, name, email, password) => {
    RegisterUser(firstname, name, email, password)
});

ipcMain.on('login-message', (event, email, password) => {
    LogIn(email, password)
});

ipcMain.on('feedback', (event) => {
    var options = {
        method: 'PUT',
        uri: 'https://75rnmqrek8.execute-api.us-east-2.amazonaws.com/hack/messages',
        multipart: [{
                'content-type': 'application/json',
                'Authorization': localStorage.getItem('token'),
                body: JSON.stringify({
                    "type": "feedback",
                    "recipient": "iluvcakeyt@gmail.com",
                    "payload": ""
                })
            },
            { body: 'I am an attachment' },
            { body: fs.createReadStream('image.png') }
        ]
    };

    request(options, function(error, response, body) {
        if (error) {
            console.log(error);
        }
    })
});

ipcMain.on('checkin', (event) => {

});

ipcMain.on('click', (event) => {

});

// Custom functions
function ShowNotification(title, body) {
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
    attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "name", Value: firstname }))
    attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "family_name", Value: name }))
    attributeList.push(new AmazonCognitoIdentity.CognitoUserAttribute({ Name: "email", Value: email }))

    userPool.signUp(email, password, attributeList, null, function(err, result) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('signed up!')
        cognitoUser = result.user;
        ShowNotification("Welcome!", "Please confirm your email before you can login")
        mb.window.loadFile('./index.html')
    });
}

function LogIn(email, password) {
    var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails({
        Username: email,
        Password: password,
    });

    var userData = {
        Username: email,
        Pool: userPool
    };
    var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function(result) {
            loggedIn = true
            console.log('logged in!')
            localStorage.setItem('token', result.getIdToken().getJwtToken());
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
        case "gratitude":
            ShowNotification('HUZZAH! 🎉', 'John sent you a compliment!')
            break;
        case "feedback":
            ShowNotification('Jeez! 😳', 'John sent a feedback about your work!')
            break;
        case "check-in":
            ShowNotification('How are you? 😊', 'John wants to know how your doing!')
            break;
        default:
            break;
    }
}

function UsersCallback(error, response, body) {
    if (!error && response.statusCode == 200) {
        const obj = JSON.parse(body)[1]
        console.log(obj.email)
        users = obj
    }
}

function GetAllUsers() {
    const options = {
        url: 'https://75rnmqrek8.execute-api.us-east-2.amazonaws.com/hack/users',
        headers: {
            'Authorization': 'eyJraWQiOiJ2ZVRGQjJZWVBOZjB6TzBxSStYMFZMVFcxUEpvN2dOdTBjS0dudklpbytFPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJiZGNkYmM4ZS0wNTVjLTQ2NzEtOWQ4MS1hMzQ0OGFjOTU2NjIiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLWVhc3QtMi5hbWF6b25hd3MuY29tXC91cy1lYXN0LTJfb09uN1JKWDk0IiwiY29nbml0bzp1c2VybmFtZSI6ImJkY2RiYzhlLTA1NWMtNDY3MS05ZDgxLWEzNDQ4YWM5NTY2MiIsIm9yaWdpbl9qdGkiOiIwNDkwYzljZi1kNDU1LTQyOTAtYjI0Mi05YjhkNzBhZjc3ZDciLCJhdWQiOiJxbHA4c3Izb2hvYTUzbHA1dWhvcHJhZmhhIiwiZXZlbnRfaWQiOiI1MGFkOGRlNi1jNmE4LTQ5YWItYTRmNC1hYWZkMDc4NDg2NjEiLCJ0b2tlbl91c2UiOiJpZCIsImF1dGhfdGltZSI6MTYzMjU5NjUwNywibmFtZSI6Ik1haWJhY2giLCJleHAiOjE2MzI2MDAxMDcsImlhdCI6MTYzMjU5NjUwNywiZmFtaWx5X25hbWUiOiJUaW1vIiwianRpIjoiOTkwZWYzYjEtZTIzZC00NmVlLTg1ZmEtODVmNjFmOGNjYTgwIiwiZW1haWwiOiJtdGltby5vZmZpY2lhbEBnbWFpbC5jb20ifQ.LruVnV3I2V5V37NoLrab0u2xQPJCRYXGMaSSh2J4SOcC5gVsuWXddnBjfQA6TDqy2_g1P4v6_uW-fVQeDCLj-Stm1k-sk_12H1fOcy7gQnQlcqwWgAoH0-ykwklRRna9zIXthUN9yeqtnIdiZH9ZvN8_GQaw_CEzj3bPO2GSm0-DbMyeQ8nvu32yfAWkkRID8RR0qT91lapiKdYLE0JAvBJmBiKmLwdGguRaezPl5mGS-b9ucvWcRcwDHptLptcdeAtPKCEgFXYzSqG4HMcO_1E0Ch5NoNvVZ7L5oS5w9FN8oVVhMIrn9O7TKgQtzXon8rRhfh8WcVeN0c60K8Bf9Q'
        }
    }

    request(options, UsersCallback)
}