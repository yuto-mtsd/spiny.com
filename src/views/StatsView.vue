<script setup>
import { ref, computed, onMounted } from "vue";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";
import { Line } from "vue-chartjs";

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const inputGoalHours = ref(0);
const goalSaved = ref(false);
const weekGoal = ref(0);
const user = ref(null);
const loading = ref(true);
const history = ref({});

async function saveGoal() {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  if (!currentUser) {
    alert("ログインしてください");
    return;
  }
  const seconds = inputGoalHours.value * 3600;
  const userDocRef = doc(db, "users", currentUser.uid);
  await setDoc(userDocRef, { settings: { weekGoal: seconds } }, { merge: true });
  weekGoal.value = seconds;
  goalSaved.value = true;
  setTimeout(() => {
    goalSaved.value = false;
  }, 2000);
}

onMounted(() => {
  const auth = getAuth();
  onAuthStateChanged(auth, async (u) => {
    if (!u) {
      user.value = null;
      loading.value = false;
      return;
    }

    user.value = u;

    try {
      const snapshot = await getDocs(collection(db, "users", u.uid, "history"));
      snapshot.forEach((doc) => {
        history.value[doc.id] = doc.data();
      });

      const userDocSnap = await getDoc(doc(db, "users", u.uid));
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        weekGoal.value = data.settings?.weekGoal || 0;
        inputGoalHours.value = Math.floor(weekGoal.value / 3600);
      }
    } catch (error) {
      console.error("データ取得エラー:", error);
    } finally {
      loading.value = false;
    }
  });
});

function getTodayLabel() {
  const today = new Date();
  return `${today.getMonth() + 1}/${today.getDate()}`;
}

function getStudyTimeForToday() {
  const today = new Date();
  const yyyyMMdd = today.toISOString().split("T")[0];
  const entry = history.value[yyyyMMdd];
  return entry?.study || 0;
}

const chartData = computed(() => {
  const labels = [];
  const data = [];
  const targetLine = [];
  const today = new Date();
  const dailyTarget = weekGoal.value ? +(weekGoal.value / 7 / 3600).toFixed(2) : 0;

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const yyyyMMdd = date.toISOString().split("T")[0];
    const label = `${date.getMonth() + 1}/${date.getDate()}`;
    labels.push(label);
    const entry = history.value[yyyyMMdd];
    const studyTimeHours = entry?.study ? +(entry.study / 3600).toFixed(2) : 0;
    data.push(studyTimeHours);
    targetLine.push(dailyTarget);
  }

  return {
    labels,
    datasets: [
      {
        label: "勉強時間（時間）",
        data,
        borderColor: "#ff6347",
        backgroundColor: "rgba(255,99,71,0.2)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#ff6347"
      },
      {
        label: "目標ライン（1日あたり）",
        data: targetLine,
        borderColor: "#61a61b",
        borderDash: [6, 4],
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      }
    ]
  };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      min: 0,
      max: 16,
      title: {
        display: true,
        text: "時間"
      },
      ticks: {
        stepSize: 2
      }
    },
    x: {
      title: {
        display: true,
        text: "日付"
      }
    }
  },
  plugins: {
    legend: {
      position: "bottom"
    },
    tooltip: {
      callbacks: {
        label: (context) => `${context.parsed.y}時間`
      }
    }
  }
};

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
</script>

<template>
  <div class="h-screen overflow-y-auto">
  <div class="p-4 font-sans">
    <div class="max-w-sm mx-auto bg-green-50 border border-green-500 rounded-xl p-4 text-center shadow-md">
      <h2 class="text-green-600 text-lg font-semibold mb-2">🌟 一週間の目標時間</h2>
      <div class="flex justify-center gap-2 mb-2">
        <input
          v-model.number="inputGoalHours"
          type="number"
          min="0"
          class="w-20 px-2 py-1 text-sm border border-green-500 rounded-md text-right focus:outline-none focus:border-green-700"
        />
        <button
          @click="saveGoal"
          class="bg-green-600 text-white font-bold text-sm px-3 py-1 rounded-md hover:bg-green-700"
        >保存</button>
      </div>
      <p v-if="goalSaved" class="text-green-700 text-sm">✅ 保存しました！</p>
    </div>

    <h2 class="text-xl text-center text-gray-700 mt-8 mb-4">📊 統計</h2>

    <div v-if="!user" class="text-center">ログインしてください</div>
    <div v-else>
      <div v-if="loading" class="text-center">読み込み中...</div>
      <div v-else class="flex flex-col gap-4 mt-6 pb-32">
        <div class="border border-gray-300 p-4 rounded-lg bg-gray-50 text-sm">
          <h3 class="font-semibold text-gray-700">{{ getTodayLabel() }}</h3>
          <p>📘 勉強時間: {{ formatTime(getStudyTimeForToday()) }}</p>
        </div>

        <h3 class="font-semibold text-gray-700 text-base">📈 今週の折れ線グラフ</h3>
        <div class="w-full h-52">
          <Line :data="chartData" :options="chartOptions" />
        </div>
      </div>
    </div>
  </div>
  </div>
</template>


