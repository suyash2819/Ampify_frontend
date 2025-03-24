# Ampify_backend

Spotify Like App.


<h2> functional requirements - Features </h2>

1. user should be able to see the home page without sign up, but they should not be able to listen to any music
2. user should be able to sign up, redirect to sign in after sign up
3. user should be able to sign in
    3.a. User should be able to fill a survey on what he/she likes to listen (choose artist)
4. user should see the home page with the preferred choice in 3.a
5. user should be able to click on that choice and play the music
6. user should be able to search for a music
7. user can create playlists
8. user can like the songs
9. user can play from liked songs
10. Add songs into queue while playing the songs

non functional req - not needed rn
scalability - support 1L users
availability - music should be available, availability > consistency here

<h2>System Design</h2>

Include Redis, Messaging Queue / Pub Sub, Load Balancer/API Gateway as needed

![image](https://github.com/user-attachments/assets/99390391-8a9a-42d9-bc92-67e2b1891603)

<h2>Apis</h2>

/user/signup - POST <br/>
/user/signin - POST <br/>
/getStaticData - GET <br/>
/userMusicData - POST, GET <br/>

<h2>Tables</h2>

![image](https://github.com/user-attachments/assets/1ed29a1b-4613-4f2f-b445-b7aa5f46abec)


# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
