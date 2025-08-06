<!-- src/views/LoginView.vue -->
<template>
    <div class="login-container">
      <h2>ログイン</h2>
  
      <!-- メール & パスワードログイン -->
      <form @submit.prevent="loginWithEmail">
        <input v-model="email" type="email" placeholder="メールアドレス" required />
        <input v-model="password" type="password" placeholder="パスワード" required />
        <button class="btn-main" type="submit">ログイン</button>
      </form>
  
      <button class="btn-sub" @click="signUp">アカウント作成</button>
  
      <hr />
  
      <!-- Googleログイン -->
      <button class="btn-sub" @click="loginWithGoogle">Googleでログイン</button>
  
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </div>
  </template>
  
  <script setup>
  import { ref } from "vue";
  import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
  } from "firebase/auth";
  import { useRouter } from "vue-router";
  import { auth } from "@/firebase";
  
  const email = ref("");
  const password = ref("");
  const errorMessage = ref("");
  const router = useRouter();
  
  const loginWithEmail = async () => {
    try {
      await signInWithEmailAndPassword(auth, email.value, password.value);
      router.push("/");
    } catch (error) {
      errorMessage.value = "ログインに失敗しました";
      console.error(error);
    }
  };
  
  const signUp = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email.value, password.value);
      router.push("/");
    } catch (error) {
      errorMessage.value = "アカウント作成に失敗しました";
      console.error(error);
    }
  };
  
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (error) {
      errorMessage.value = "Googleログインに失敗しました";
      console.error(error);
    }
  };
  </script>
  
  <style scoped>
  .login-container {
    max-width: 400px;
    margin: auto;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }
  input {
    padding: 10px;
    font-size: 16px;
    width: 100%;
    border: 1px solid #ccc;
    border-radius: 8px;
    box-sizing: border-box;
  }
  button {
    padding: 10px;
    font-weight: bold;
    font-size: 16px;
    border-radius: 8px;
    width: 100%;
    cursor: pointer;
  }
  
  /* ✅ 緑背景のログインボタン */
  .btn-main {
    margin-top: 10px;
    background-color: #61a61b;
    color: white;
    border: none;
  }
  .btn-main:hover {
    background-color: #4e8f15;
  }
  
  /* ✅ 白背景＋緑枠のサブボタン */
  .btn-sub {
    background-color: white;
    color: #61a61b;
    border: 2px solid #61a61b;
  }
  .btn-sub:hover {
    background-color: #f4f4f4;
  }
  
  hr {
    margin: 16px 0;
    border: none;
    border-top: 1px solid #ccc;
  }
  
  .error {
    color: red;
    margin-top: 10px;
  }
  </style>
  