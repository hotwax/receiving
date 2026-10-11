# receiving
HotWax Commerce receiving app

# Prerequisite

- Node `v22.12.0` or higher
- `pnpm`


# Build Notes (Users)

This app is developed and run from the [`accxui`](https://github.com/hotwax/accxui) pnpm workspace. It is not started by running commands inside this app folder directly.

1. Open a Terminal window.
2. Clone the workspace using the command: `git clone https://github.com/hotwax/accxui.git`
3. Go to the workspace root using command: `cd accxui`
4. Download the app from the [release](https://github.com/hotwax/receiving/releases) page, extract it, and place it at `apps/receiving`.
5. Create a `.env` file in `apps/receiving` by taking reference from its `.env.example`.
6. Run following command from the `accxui` root to download dependencies  
    `pnpm install`
7. To run the app in browser use the command from the `accxui` root:  
    `pnpm --filter receiving dev`


# Build Notes (Contributors)

1. Open a Terminal window.
2. Clone the workspace using the command: `git clone https://github.com/hotwax/accxui.git`
3. Go to the workspace root using command: `cd accxui`
4. Clone this app under `apps/` using the command:  
    `git clone https://github.com/hotwax/receiving.git apps/receiving`
5. Create a `.env` file in `apps/receiving` by taking reference from its `.env.example`.
6. Run following command from the `accxui` root to download dependencies  
    `pnpm install`
7. To run the app in browser use the command from the `accxui` root:  
    `pnpm --filter receiving dev`
8. To build the app use the command from the `accxui` root:  
    `pnpm --filter receiving build`

Run `pnpm install` from the `accxui` root again whenever you add another app under `apps/`. See the [accxui README](https://github.com/hotwax/accxui/blob/main/README.md) for the full workspace guide.

#### Upload instance specific build

- While adding new configuration, make sure to add them in all of three environments file otherwise it will be missing while building the app for prod or qa instance.
- Improve the environment variables as per the instance before building the app.
- Version must be updated before building the app.
- For dev build, improve the environment variables in environment.ts file and for prod build, improve the environment variables in environment.prod.ts file.
- Run the command `gulp config --channelTag=<dev/prod/qa>`
- After running this command we will have updated environment.ts file and config.xml file as per the updated variables.
- Next we can build the app using `ionic cordova build <android/ios>`
- Upload app on test flight, mention the app release version and what to test under Test Details.

#### Generating artefact documentation

Following command generates the documentation:  
`npm run compodoc`  
Documentation is available in the documentation folder and can be viewed by opening the index.html.  

### Shopify app configuration and installation
- Add API Key, Redirect URI and Scopes to environment.
- For development store, navigate to /shopify page and input shopify store URL
- For demo store, Generate custom link and install 

## Build Issues
### If you face any error while running the app on a local machine, please refer [this](https://stackoverflow.com/questions/58973192/uncaught-typeerror-object-is-not-a-function-when-using-angular-google-maps).
- Run following commands to fix the issue
    `npm uninstall @agm/core`
    `npm i @agm/core@1.0.0-beta.7 --save`

### UIWebView Issue while uploading App on testflight:
- Remove the ios platform using command 
    `ionic cordova platform rm ios`
- Check plugin cordova-plugin-ionic-webview in package.json file, If not included then add plugin using command
    `ionic cordova plugin add cordova-plugin-ionic-webview`
- Add the ios platform with version 5.1.0 using command
    `ionic cordova platform add ios@~5.1.0`
- Check following preference in config file . if not present then add it.
    `<preference name="WKWebViewOnly" value="true" />`
- Run following command
    `npm i`
- Build application for IOS 
    `ionic cordova build ios`

### moment-timezone and Truncate
- If you are getting error `Property 'tz' does not exist on type 'typeof moment'`
    `npm i moment-timezone@0.5.28`
- If you are getting error `A rest parameter must be of an array type.`
    `npm i @yellowspot/ng-truncate@1.5.0`

### Submodule - Theme 
- If you are getting `Sass Error` like `Undefined variable` 
   `git submodule update --recursive --remote`

### Contribution Guideline

`Please do all changes and in your local systems branch and make a pull request to hacktoberfest branch not in master branch of remote repo`

