<!-- src/components/StatsChart.vue -->
<template>
    <Bar :data="chartData" :options="chartOptions" />
  </template>
  
  <script setup>
  import { Bar } from 'vue-chartjs'
  import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    BarElement,
    CategoryScale,
    LinearScale,
  } from 'chart.js'
  
  ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)
  
  const props = defineProps({
    history: Object
  })
  
  const chartData = {
    labels: Object.keys(props.history),
    datasets: [
      {
        label: '勉強時間 (分)',
        backgroundColor: '#ff6347',
        data: Object.values(props.history).map(h => Math.floor((h.study || 0) / 60))
      },
      {
        label: '休憩時間 (分)',
        backgroundColor: '#1e90ff',
        data: Object.values(props.history).map(h => Math.floor((h.break || 0) / 60))
      }
    ]
  }
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      }
    }
  }
  </script>
  