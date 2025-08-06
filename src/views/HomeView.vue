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
  <div class="roulette-container">
    <div class="mode-toggle">
      <button @click="toggleMode" :class="['btn_mode', isStudyMode ? 'btn_study' : 'btn_break']">
        {{ isStudyMode ? "勉強モード" : "休憩モード" }}
      </button>
    </div>

    <div class="roulette-wrapper">
      <canvas ref="canvasRef"></canvas> <!-- ✅ width/height は書かない -->
      <button @click="spinRoulette" class="btn_start btn_yellow">
        {{ timer_text }} <br /> {{ time_number_clock }}
      </button>
    </div>

    <div class="arrow"></div>

    <div class="button-row">
      <button @click="resetTimer" class="btn_reset">リセット</button>
      <button @click="toggleMute" class="btn_mute">
        {{ isMuted ? "🔇" : "🔊" }}
      </button>
      <button @click="toggleAutoSwitch" class="btn_auto">
        {{ autoSwitch ? "手動" : "自動" }}
      </button>
    </div>

    <div v-if="showToast" class="toast">
      {{ toastMessage }}
    </div>
    <!-- ⬇️ これで置き換える -->
    <div class="time-display" :class="isStudyMode ? 'study' : 'break'">
        <div class="label">{{ isStudyMode ? "📘 勉強時間" : "☕ 休憩時間" }}</div>
        <div class="time">{{ all_clock_time }}</div>
    </div>

  </div>

</template>

<style scoped>
.roulette-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 0px;
  position: relative;
  padding-top: 0px;
  width: 100%;
  margin-bottom: 0px;
  padding-bottom: 0px;
}
.mode-toggle {
  margin-bottom: 10px;
}
.btn_mode {
  background-color: #61a61b;
  margin-top: 10px;
  color: white;
  padding: 10px 20px;
  border: none;
  outline: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
}
.btn_mode:hover {
  background-color: #61a61b;
}
.roulette-wrapper {
  --circle-size: 80vw;
  max-width: 300px;
  width: var(--circle-size);
  aspect-ratio: 1 / 1;
  position: relative;
}
.btn_start {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40vw;
  height: 40vw;
  max-width: 140px;
  max-height: 140px;
  min-width: 100px;
  min-height: 100px;
  border-radius: 50%;
  font-size: 16px;
  text-align: center;
  background-color: #61a61b;
  color: white;
  border: none;
  z-index: 1;

  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
.btn_reset {
  background-color: #61a61b;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
}
.btn_reset:hover {
  background-color: #61a61b;
}
.arrow {
  margin-top: 0px;
  width: 0;
  height: 0;
  border-left: 15px solid transparent;
  border-right: 15px solid transparent;
  border-bottom: 30px solid #61a61b;
}
.script_up_clock_time {
  text-align: left;
  padding-right: 100px;
  margin-top: 5px;
  font-size: 20px;
  margin-bottom: 0px;
  font-weight: bold;
}
.all_clock_time {
  font-size: 8vw; /* デバイス幅に合わせる */
  font-weight: bold;
  text-align: center;
  margin-top: 0px;
  border: 5px solid;
  padding-bottom: 0px;
  margin-bottom: 0px;

}
.current-mode-label {
  font-weight: bold;
  font-size: 18px;
  margin-bottom: 10px;
  color: #61a61b;
}
.button-row {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
.btn_mute {
  background-color: #61a61b;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
}
.btn_mute:hover {
  background-color: #61a61b;
}
.bg-study {
  background-color: #fff8f0;
}
.bg-break {
  background-color: #f0f8ff;
}
canvas {
  width: 100%;
  height: auto;
  display: block;
}
.btn_study {
  background-color: #ff6347; /* 勉強モード：トマト色 */
}
.btn_study:hover {
  background-color: #ff8267;
}
.btn_break {
  background-color: #1e90ff; /* 休憩モード：青系 */
}
.btn_break:hover {
  background-color: #4eaaff;
}
.btn_auto {
  background-color: #61a61b;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
}
.btn_auto:hover {
  background-color: #61a61b;
}
.toast {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #444;
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  transition: opacity 0.3s ease;
}
html, body, #app {
  height: 100%;
  margin-top: 0px;
  padding-top: 0px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  touch-action: none;
}
.time-display {
  margin-top: 20px;
  padding: 12px 24px;
  border-radius: 14px;
  text-align: center;
  font-weight: bold;
  display: inline-block;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  font-family: 'Noto Sans JP', sans-serif;
}

.time-display.study {
  background-color: #fff0eb;
  color: #ff6347;
  border: 2px solid #ff6347;
}

.time-display.break {
  background-color: #ebf4ff;
  color: #1e90ff;
  border: 2px solid #1e90ff;
}

.time-display .label {
  font-size: 1rem;
  margin-bottom: 5px;
}

.time-display .time {
  font-size: 2rem;
}

</style>

  