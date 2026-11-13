# tp-gsh

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

## Connexion Google avec Firebase

La connexion utilise Firebase Authentication. Dans Firebase Console, ouvre **Authentication** → **Méthodes de connexion**, active **Google**, puis ajoute `localhost` aux domaines autorisés. Les variables de configuration Web sont dans `.env.local` pour le développement local. Pour publier le frontend, configure les mêmes variables `VITE_FIREBASE_*` dans l’environnement de build.
