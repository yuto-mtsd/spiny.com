<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-sm p-6 bg-white rounded-xl shadow-md space-y-6 text-center">
      <h2 class="text-2xl font-bold text-gray-800">ログイン</h2>

      <form @submit.prevent="loginWithEmail" class="space-y-4">
        <input
          v-model="email"
          type="email"
          placeholder="メールアドレス"
          required
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <input
          v-model="password"
          type="password"
          placeholder="パスワード"
          required
          class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="submit"
          class="w-full py-2 font-bold text-white bg-green-600 hover:bg-green-700 rounded-md"
        >
          ログイン
        </button>
      </form>

      <button
        @click="signUp"
        class="w-full py-2 font-bold text-green-600 bg-white border-2 border-green-600 rounded-md hover:bg-gray-100"
      >
        アカウント作成
      </button>

      <hr class="border-t" />

      <button
        @click="loginWithGoogle"
        class="w-full py-2 font-bold text-green-600 bg-white border-2 border-green-600 rounded-md hover:bg-gray-100"
      >
        Googleでログイン
      </button>

      <p v-if="errorMessage" class="text-red-600 text-sm mt-2">{{ errorMessage }}</p>
    </div>
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

