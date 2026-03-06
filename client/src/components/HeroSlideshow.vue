<template>
  <section class="relative w-full h-[50vh] md:h-[60vh] overflow-hidden rounded-2xl shadow-lg mb-8">
    <!-- Background images -->
    <div
      v-for="(image, index) in currentImages"
      :key="index"
      class="absolute inset-0 bg-cover bg-center transition-all duration-1000"
      :style="{
        backgroundImage: `url(${image})`,
        opacity: currentIndex === index ? 1 : 0,
        transform: currentIndex === index ? 'scale(1.05)' : 'scale(1)',
      }"
    />

    <!-- Overlay -->
    <div class="absolute inset-0 bg-blue-900 bg-opacity-50" />

    <!-- Content -->
    <div class="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
      <h1 class="text-3xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg mb-4">
        SUNY New Paltz Hackathons
      </h1>
      <p class="text-lg md:text-xl text-white/90 drop-shadow-md mb-6">
        Build. Innovate. Compete.
      </p>
      <div class="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/20 px-4 py-2 text-white backdrop-blur-sm">
        <span>🎯</span>
        <span class="font-medium">Powered by CS Department</span>
      </div>
    </div>

    <!-- Slide indicators -->
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
      <button
        v-for="(_, index) in currentImages"
        :key="index"
        @click="currentIndex = index"
        :class="[
          'w-2 h-2 rounded-full transition-all',
          currentIndex === index
            ? 'bg-white w-4'
            : 'bg-white/50 hover:bg-white/75'
        ]"
        :aria-label="`Go to slide ${index + 1}`"
      />
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

// Import desktop images
import h1 from '@/assets/slideshow/hackathon-1.jpg';
import h2 from '@/assets/slideshow/hackathon-2.jpg';
import h3 from '@/assets/slideshow/hackathon-3.jpg';
import h4 from '@/assets/slideshow/hackathon-4.jpg';
import h5 from '@/assets/slideshow/hackathon-5.jpg';
import h6 from '@/assets/slideshow/hackathon-6.jpg';
import h7 from '@/assets/slideshow/hackathon-7.jpg';
import h8 from '@/assets/slideshow/hackathon-8.jpg';
import h9 from '@/assets/slideshow/hackathon-9.jpg';
import h10 from '@/assets/slideshow/hackathon-10.jpg';
import h11 from '@/assets/slideshow/hackathon-11.jpg';

// Import mobile images
import h1m from '@/assets/slideshow/hackathon-1-mobile.jpg';
import h2m from '@/assets/slideshow/hackathon-2-mobile.jpg';
import h3m from '@/assets/slideshow/hackathon-3-mobile.jpg';
import h4m from '@/assets/slideshow/hackathon-4-mobile.jpg';
import h5m from '@/assets/slideshow/hackathon-5-mobile.jpg';
import h6m from '@/assets/slideshow/hackathon-6-mobile.jpg';
import h7m from '@/assets/slideshow/hackathon-7-mobile.jpg';
import h8m from '@/assets/slideshow/hackathon-8-mobile.jpg';
import h9m from '@/assets/slideshow/hackathon-9-mobile.jpg';
import h10m from '@/assets/slideshow/hackathon-10-mobile.jpg';
import h11m from '@/assets/slideshow/hackathon-11-mobile.jpg';

const desktopImages = [h1, h2, h3, h4, h5, h6, h7, h8, h9, h10, h11];
const mobileImages = [h1m, h2m, h3m, h4m, h5m, h6m, h7m, h8m, h9m, h10m, h11m];

const currentIndex = ref(0);
const isMobile = ref(false);
let intervalId = null;

const currentImages = computed(() => isMobile.value ? mobileImages : desktopImages);

function checkMobile() {
  isMobile.value = window.innerWidth < 768;
}

function nextSlide() {
  currentIndex.value = (currentIndex.value + 1) % currentImages.value.length;
}

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  intervalId = setInterval(nextSlide, 4000);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
  if (intervalId) clearInterval(intervalId);
});
</script>
