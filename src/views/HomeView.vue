<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/firebase";

// ✅ 追加する関数ここから！
async function saveSessionToFirestore(type, durationInSeconds) {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return;

  const today = new Date().toISOString().split("T")[0];
  const docRef = doc(db, "users", user.uid, "history", today);
  const docSnap = await getDoc(docRef);

  const prevData = docSnap.exists() ? docSnap.data() : { study: 0, break: 0 };
  const updatedData = {
    ...prevData,
    [type]: (prevData[type] || 0) + durationInSeconds,
  };

  await setDoc(docRef, updatedData);
}

const autoSwitch = ref(true); // 自動切り替えON/OFF
const totalStudyTime = ref(0);
const totalBreakTime = ref(0);


function toggleAutoSwitch() {
  autoSwitch.value = !autoSwitch.value;
}
const toastMessage = ref("");
const showToast = ref(false);

function notify(msg) {
  toastMessage.value = msg;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 2500);
}


// -----------------------
// サウンド関係
// -----------------------
const alarmAudio = new Audio("/alarm.mp3");
alarmAudio.volume = 0.5;

function playAlarm() {
  alarmAudio.currentTime = 0;
  alarmAudio.play();
}

function stopAlarm() {
  alarmAudio.pause();
  alarmAudio.currentTime = 0;
}

const isMuted = ref(false);
function toggleMute() {
  isMuted.value = !isMuted.value;
  alarmAudio.muted = isMuted.value;
}

// -----------------------
// モード切り替え
// -----------------------
const mode = ref("study"); // "study" or "break"
const isStudyMode = computed(() => mode.value === "study");
const todayLabel = computed(() => isStudyMode.value ? "勉強時間" : "休憩時間");

function toggleMode() {
  mode.value = isStudyMode.value ? "break" : "study";
  stopAlarm();
  resetTimer();
  drawRoulette();
  drawProgressCircle();
}

// 背景クラスをbodyに反映
watch(isStudyMode, (newVal) => {
  document.body.classList.remove("bg-study", "bg-break");
  document.body.classList.add(newVal ? "bg-study" : "bg-break");
});

function resizeCanvas() {
  const canvas = canvasRef.value;
  if (canvas) {
    const size = canvas.offsetWidth;
    canvas.width = size;
    canvas.height = size;
    drawRoulette();
    drawProgressCircle();
  }
}

// ✅ onMounted内でresizeCanvasを登録済
onMounted(() => {
  resizeCanvas(); // 初回描画
  document.body.classList.add(isStudyMode.value ? "bg-study" : "bg-break");
  window.addEventListener("resize", resizeCanvas); // ここだけで十分
});




// -----------------------
// ルーレット定義
// -----------------------
const studySectors = [
  { label: "15", color: "#ff6347" },
  { label: "20", color: "#ff6347" },
  { label: "30", color: "#ff6347" },
  { label: "45", color: "#ff6347" }
];

const breakSectors = [
  { label: "3", color: "#1e90ff" },
  { label: "5", color: "#1e90ff" },
  { label: "7", color: "#1e90ff" },
  { label: "10", color: "#1e90ff" }
];

const sectors = computed(() => isStudyMode.value ? studySectors : breakSectors);
const sectorCount = computed(() => sectors.value.length);
const anglePerSector = computed(() => 360 / sectorCount.value);

// -----------------------
// タイマー処理
// -----------------------
const canvasRef = ref(null);
const rotation = ref(0);
const isSpinning = ref(false);
const time_number = ref(null);
const remaining_time = ref(0);
const timer_text_start = "START";
const timer_text_stop = "STOP";
const timer_text = ref(timer_text_start);
const timer = ref(null);
const all_number = ref(0);

const time_number_clock = computed(() => formatTime(remaining_time.value));
const all_clock_time = computed(() => {
  return formatTime(isStudyMode.value ? totalStudyTime.value : totalBreakTime.value);
});


function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function drawRoulette() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const radius = width / 2;
  ctx.clearRect(0, 0, width, width);

  // --- 円グラフ描画のためルーレットだけ回転するように描画 ---
  ctx.save();
  ctx.translate(width / 2, width / 2);
  ctx.rotate((rotation.value * Math.PI) / 180);
  ctx.translate(-width / 2, -width / 2);

  sectors.value.forEach((sector, index) => {
    const startAngle = (index * anglePerSector.value * Math.PI) / 180;
    const endAngle = ((index + 1) * anglePerSector.value * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius, startAngle, endAngle);
    ctx.fillStyle = sector.color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const textAngle = startAngle + (endAngle - startAngle) / 2;
    const textX = radius + Math.cos(textAngle) * (radius * 0.7);
    const textY = radius + Math.sin(textAngle) * (radius * 0.7);
    ctx.translate(textX, textY);
    ctx.rotate(textAngle + Math.PI / 2);
    ctx.fillText(`${sector.label}`, 0, 0);
    ctx.restore();
  });

  ctx.restore();
}

function drawProgressCircle() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const radius = width / 2;

  // Progress circle must NOT rotate → reset transform
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const progressRadius = radius * 0.49; // 🔽 円グラフを小さく

  // Outer ring (background or green if no timer yet)
  ctx.beginPath();
  ctx.arc(radius, radius, progressRadius, 0, 2 * Math.PI);
  ctx.strokeStyle = time_number.value ? "#ddd" : "#61a61b"; // 🔽 スタート前は緑
  ctx.lineWidth = 8;
  ctx.stroke();

  if (time_number.value) {
    const total = time_number.value * 60;
    const progress = remaining_time.value / total;

    // Progress arc
    ctx.beginPath();
    ctx.arc(
      radius,
      radius,
      progressRadius,
      -Math.PI / 2,
      -Math.PI / 2 + progress * 2 * Math.PI
    );
    ctx.strokeStyle = "#61a61b";
    ctx.lineWidth = 8;
    ctx.stroke();
  }

  ctx.restore();
}




function spinRoulette() {
  if (timer_text.value === timer_text_stop || remaining_time.value > 0) {
    startTimer();
    return;
  }
  if (isSpinning.value) return;
  isSpinning.value = true;
  let spinAngle = Math.random() * 360 + 1800;
  let currentAngle = rotation.value;
  let duration = 3000;
  let startTime = null;

  const animate = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = (timestamp - startTime) / duration;
    if (progress < 1) {
      rotation.value = currentAngle + spinAngle * easeOut(progress);
      drawRoulette();
      drawProgressCircle();
      requestAnimationFrame(animate);
    } else {
      rotation.value = (currentAngle + spinAngle) % 360;
      isSpinning.value = false;
      drawRoulette();
      drawProgressCircle();
      showResult();
    }
  };
  requestAnimationFrame(animate);
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function showResult() {
  const normalizedRotation = (rotation.value + 360) % 360;
  const adjustedRotation = (360 - normalizedRotation + 90) % 360;
  const sectorIndex = Math.floor(adjustedRotation / anglePerSector.value) % sectorCount.value;
  time_number.value = parseInt(sectors.value[sectorIndex].label);
  remaining_time.value = time_number.value * 60;
  notify(`${time_number.value}分に決まりました！`);
  startTimer();
}

function startTimer() {
  stopAlarm();
  if (timer.value) {
    clearInterval(timer.value);
    timer.value = null;
    timer_text.value = timer_text_start;
    drawRoulette();
    drawProgressCircle();
  } else {
    timer_text.value = timer_text_stop;
    timer.value = setInterval(() => {
      if (remaining_time.value > 0) {
        remaining_time.value--;
        if (isStudyMode.value) {
          totalStudyTime.value++;
        } else {
          totalBreakTime.value++;
        }

        drawRoulette();
        drawProgressCircle();
      } else {
        clearInterval(timer.value);
        timer.value = null;
        timer_text.value = timer_text_start;
        playAlarm();
        if (isStudyMode.value) {
          saveSessionToFirestore("study", time_number.value * 60);
        }

        if (autoSwitch.value) {
          setTimeout(() => {
            toggleMode();
            spinRoulette(); // 自動で次の時間を選んでスタート
            }, 1000); // アラーム後に少し待って切り替え（1秒）
  }

      }
    }, 1000);
  }
}
function resetTimer() {
  stopAlarm();
  clearInterval(timer.value);
  timer.value = null;
  remaining_time.value = 0;
  timer_text.value = timer_text_start;
  drawRoulette();
  drawProgressCircle();
}
</script>
<template>
  <div class="pb-32 px-4 w-full max-w-md mx-auto text-center">
    <!-- モード切替ボタン -->
    <div class="mt-4 mb-6">
      <button
        @click="toggleMode"
        class="px-6 py-2 rounded-lg text-white text-lg font-semibold transition"
        :class="isStudyMode ? 'bg-red-500 hover:bg-red-400' : 'bg-blue-500 hover:bg-blue-400'"
      >
        {{ isStudyMode ? "勉強モード" : "休憩モード" }}
      </button>
    </div>

    <!-- ルーレットとスタートボタン -->
    <div class="relative aspect-square w-full max-w-xs mx-auto">
      <canvas ref="canvasRef" class="w-full h-full" />
      <button
        @click="spinRoulette"
        class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
               w-40 h-40 max-w-[140px] max-h-[140px] min-w-[100px] min-h-[100px]
               rounded-full bg-green-600 text-white font-bold text-sm flex flex-col items-center justify-center shadow-lg"
      >
        {{ timer_text }} <br /> {{ time_number_clock }}
      </button>
    </div>

    <!-- ルーレットの矢印 -->
    <div class="w-0 h-0 border-l-[15px] border-r-[15px] border-b-[30px] border-transparent border-b-green-600 mx-auto my-4" />

    <!-- ボタン群 -->
    <div class="flex justify-center gap-4 mt-4">
      <button @click="resetTimer" class="bg-green-600 text-white px-4 py-2 rounded-lg">リセット</button>
      <button @click="toggleMute" class="bg-green-600 text-white px-4 py-2 rounded-lg">
        {{ isMuted ? "🔇" : "🔊" }}
      </button>
      <button @click="toggleAutoSwitch" class="bg-green-600 text-white px-4 py-2 rounded-lg">
        {{ autoSwitch ? "手動" : "自動" }}
      </button>
    </div>

    <!-- トースト -->
    <div
      v-if="showToast"
      class="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-black text-white py-2 px-4 rounded shadow-md z-50 text-sm"
    >
      {{ toastMessage }}
    </div>

    <!-- 合計時間表示 -->
    <div
      class="mt-8 p-4 rounded-xl shadow bg-white text-lg font-bold border"
      :class="isStudyMode ? 'text-red-500 border-red-500 bg-red-50' : 'text-blue-500 border-blue-500 bg-blue-50'"
    >
      <div>{{ isStudyMode ? "📚 勉強時間" : "☕ 休憩時間" }}</div>
      <div class="text-2xl mt-1">{{ all_clock_time }}</div>
    </div>
  </div>
</template>
