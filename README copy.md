# Receiving
This is an ionic desktop application for receiving items in warehouse

# Receiving component depends on

| Component Name    | Release            |
|:-----------------:|:------------------:|
| api               |    v2.3.0          |

# Build Notes

### Prerequisites

- You must have HotWax Git access to check out code for your local build.
- You must installed the [node](https://nodejs.org/en/), use LTS version of node
- You must installed [ionic](https://ionicframework.com/docs/intro/cli)
- The Ionic version should be 5.0.0 and the node version should be v10.13.0.
- Check node version using node --version, check ionic version using ionic --info
- You should know how to navigate to file directories on your machine via the terminal window. Feel free to ask the Indore team for help.

### Clone the repository (code)

- Open a Terminal window
- Clone Receiving

git clone -b develop 
https://git.hotwax.co/plugins/mobile-sdk/ionic/receiving

- Go to receiving directory
- cd receiving
- Run npm i

### Start App

- To test the app in browser: ionic serve


## Shopify App 

### Setup

- Create an app from partner dashboard  
https://partners.shopify.com/

- Get API and Secret Key from your app page and set it in environment file along with the redirect URI. Redirect URI is the address the user will be redirected to with CODE when the app is installed. The request will be first verified with HMAC and then the CODE will be further used to generate the access token to make API calls further.

- Set App URL and Allowed redirection URL(s) in App Setup.
App URL will be the reference to your app and allowed redirection URL will be the URLs that are allowed as redirectURI parameter.  

- Navigate to Extension and enable embedded app for shopify and Point of Sale if we are building POS embedded app.

### Working

- The code resides in app.component and shopify-install component
- In app.component, we handle app initialisation and authorisation while with shopify-install we handle installation
- We have various methods in shopify-provider to handle the operations namely initialise(), install(), createApp(), getAccessToken(), generateAppURL() and verifyHMAC()
- initialise() get the app bridge js file using scriptjs and initialise shopify credentials
- install() redirects to permission URL where the user install app into shopify shop granting apt permissions
- createApp() initialised the app bridge object making it a shopify app
- getAccessToken() gets access token from shopify to access it's APIs. Currently we getting it through backend server.
- generateAppURL() once installation is completed, generate app URL and redirect to it
- verifyHMAC() verify the request using HMAC sha256 verification using crypto-es library
- The request is authorisation when the CODE is available with the paramaeters
