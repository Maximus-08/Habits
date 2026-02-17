# Firebase Authentication Setup

To enable Google OAuth and email authentication in your Habit Tracker app, follow these steps:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard to create your project

## 2. Register Your Web App

1. In the Firebase Console, click on the web icon (</>) to add a web app
2. Register your app with a nickname (e.g., "Habit Tracker")
3. Firebase will generate configuration values for you

## 3. Enable Authentication Methods

1. In Firebase Console, go to **Build** → **Authentication**
2. Click on the **Sign-in method** tab
3. Enable the following providers:
   - **Email/Password**: Click on it and toggle "Enable"
   - **Google**: Click on it, toggle "Enable", and provide a project support email

## 4. Configure Your App

1. Open `src/config/firebase.js`
2. Replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

You can find these values in:
- Firebase Console → Project Settings → General → Your apps → SDK setup and configuration

## 5. Set Up Authorized Domains

1. In Firebase Console, go to **Authentication** → **Settings** → **Authorized domains**
2. Add your development domain (e.g., `localhost`)
3. Add your production domain when you deploy

## 6. Test Authentication

1. Start your development server: `npm run dev`
2. Navigate to the landing page
3. Try signing up with email/password
4. Try signing in with Google

## Security Notes

- Never commit your Firebase configuration with real values to a public repository
- Consider using environment variables for sensitive configuration
- Set up Firebase Security Rules for your project
- Enable App Check for additional security in production

## Troubleshooting

- **"Firebase: Error (auth/configuration-not-found)"**: Make sure you've replaced the placeholder values in firebase.js
- **"This domain is not authorized"**: Add your domain to Authorized domains in Firebase Console
- **Google sign-in not working**: Verify that Google provider is enabled and you've provided a support email

## Next Steps

After authentication is working:
- Implement user profile storage in Firestore
- Add password reset functionality
- Add email verification
- Set up protected routes
- Store user's habits and identity data
