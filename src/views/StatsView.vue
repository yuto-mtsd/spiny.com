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
  <div class="stats-container">
    <div class="goal-card">
      <h2 class="goal-title">🌟 一週間の目標時間</h2>
      <div class="goal-form">
        <input v-model.number="inputGoalHours" type="number" min="0" />
        <button @click="saveGoal">保存</button>
      </div>
      <p v-if="goalSaved" class="goal-saved">✅ 保存しました！</p>
    </div>

    <h2>📊 統計</h2>

    <div v-if="!user">ログインしてください</div>
    <div v-else>
      <div v-if="loading">読み込み中...</div>
      <div v-else>
        <div class="history-list">
          <div class="history-item">
            <h3>{{ getTodayLabel() }}</h3>
            <p>📘 勉強時間: {{ formatTime(getStudyTimeForToday()) }}</p>
          </div>

          <h3>📈 今週の折れ線グラフ</h3>
          <div class="chart-wrapper">
            <Line :data="chartData" :options="chartOptions" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-container {
  padding: 0.8rem;
  font-family: 'Noto Sans JP', sans-serif;
}
.goal-card {
  max-width: 340px;
  margin: 1rem auto;
  background-color: #f4fff0;
  border: 1.5px solid #61a61b;
  border-radius: 12px;
  padding: 1.2rem;
  text-align: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}
.goal-title {
  font-size: 1rem;
  color: #61a61b;
  margin-bottom: 0.3rem;
}
.goal-form {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 0.5rem;
}
.goal-form input {
  width: 80px;
  padding: 6px;
  font-size: 14px;
  border: 1.5px solid #61a61b;
  border-radius: 6px;
  text-align: right;
  transition: border-color 0.3s ease;
}
.goal-form input:focus {
  border-color: #4e8f15;
  outline: none;
}
.goal-form button {
  background-color: #61a61b;
  color: white;
  font-weight: bold;
  font-size: 13px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.goal-form button:hover {
  background-color: #4e8f15;
}
.goal-saved {
  color: #4e8f15;
  font-size: 0.8rem;
  margin-top: 4px;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}
.history-item {
  border: 1px solid #ccc;
  padding: 0.8rem;
  border-radius: 10px;
  background-color: #fafafa;
  font-size: 14px;
}
.chart-wrapper {
  width: 100%;
  max-width: 100%;
  height: 200px;
}
h3 {
  margin-top: 20px;
  margin-bottom: 6px;
  font-size: 1rem;
  font-weight: bold;
  color: #333;
}
.stats-container h2 {
  font-size: 1.2rem;
  color: #444;
  text-align: center;
  margin-top: 2rem;
  margin-bottom: 1rem;
}
</style>
