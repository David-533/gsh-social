<template>
  <AuthScreen mode="login" />
</template>

<script setup>
import AuthScreen from "./AuthScreen.vue";
</script>





<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Roboto', sans-serif;
}
html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.neon-background {
  position: fixed;
  top: 60px;
  left: 0;
  width: 100%;
  height: calc(100vh - 60px);
  background: linear-gradient(135deg, #FF4DA6, #C27AFF, #4DD2FF, #FFAA6B, #FFF16B);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #fff;
  background-size: cover;
  background-position: center;
}

.navbar {
  width: 100%;
  height: 60px;
  background-color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
}

.title {
  font-size: 1.5rem;
  color: #fff;
}

.login-form {
  width: 450px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 25px 30px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff;
  margin-top: 60px;
}

.form-title {
  color: #fff;
  font-size: 24px;
  text-align: center;
}

.login-form label {
  color: #fff;
  font-weight: bold;
}

.login-form input {
  width: 100%;
  padding: 8px 0;
  border: none;
  border-bottom: 2px solid #fff;
  background: transparent;
  color: #fff;
  font-size: 14px;
  outline: none;
}

.login-form input:focus {
  border-bottom: 2px solid #ff00ff;
}

button {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 5px;
  background: rgba(255,255,255,0.05);
  color: #fff;
  font-size: 15px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  transition: 0.3s all;
}

button:hover {
  background: rgba(255,0,255,0.2);
  transform: scale(1.05);
}
</style>


