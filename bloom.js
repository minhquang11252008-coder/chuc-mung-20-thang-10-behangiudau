/**
 * ====================================================================
 * MODULE: HOA BUNG NỞ PHỦ MÀN HÌNH (BLOOM.JS)
 * ====================================================================
 * Thuật toán & Kịch bản chuyển động:
 * 1. Phân bố vị trí phủ kín toàn diện (Screen-Adaptive Staggered Grid with Jitter):
 *    - Chia màn hình thành mạng lưới so le phủ kín 100% diện tích, mở rộng qua cả 4 mép và 4 góc.
 *    - Thêm độ lệch ngẫu nhiên (Jitter) trên cả trục X, Y và góc xoay tự nhiên để hoa đan xen hữu cơ.
 *    - Độ chồng lấp đạt 45-60% kết hợp kích thước lớn (280-380px trên desktop, 200-300px trên mobile)
 *      bảo đảm che kín 100% nền phía sau, không để lại bất kỳ khe trống nào.
 * 2. Lan tỏa nối tiếp liên tục (Continuous Radial Wavefront):
 *    - Độ trễ delay của từng bông hoa là một hàm liên tục theo khoảng cách Euclidean từ tâm.
 *    - Bông hoa đầu tiên nở ngay tại tâm (delay 0ms).
 *    - Các bông hoa tiếp theo nối tiếp nhau bung nở lan tỏa 360 độ từ trong ra ngoài (0 - 7.4s).
 * 3. GIAI ĐOẠN DUY TRÌ CHUYỂN ĐỘNG VƯỜN HOA 3D CÓ QUY LUẬT (SUSTAINED 3D GARDEN MOTION):
 *    - Sau khi hoa bung nở phủ gần kín màn hình, chuyển sang chuyển động liên tục, uyển chuyển bằng requestAnimationFrame.
 *    - Phân chia hoa thành 4 Cụm chuyển động đan xen:
 *      + Cụm 1: Chuyển động chậm theo quỹ đạo vòng cung lớn.
 *      + Cụm 2: Trôi theo quỹ đạo cong ngược chiều với Cụm 1.
 *      + Cụm 3: Xoay nhẹ và dịch chuyển theo quỹ đạo elip nghiêng.
 *      + Cụm 4: Chuyển động nhẹ theo chiều sâu 3D (Lissajous figure-8, biến thiên scale và độ mờ nhẹ gần - xa).
 *    - Xoay nhẹ từng đóa hoa quanh tâm chính nó (self-rotation) với góc xoay nhỏ tự nhiên.
 *    - Phân lớp chiều sâu: Lớp trước chuyển động rõ hơn, lớp nền chuyển động đầm hơn để luôn giữ kín 100% màn hình.
 * 4. Rơi tự nhiên khi nhấn "Tiếp tục" (FALLING PHASE):
 *    - Khi người dùng nhấn Tiếp tục, dừng chu trình chuyển động, hoa rơi tự do và mờ dần vào không gian vũ trụ.
 */

(function () {
  'use strict';

  // 6 loài hoa chất lượng cao tách nền trong suốt
  const DEFAULT_FLOWER_IMAGES = [
    'images/flowers/flower-01.webp', // Mẫu đơn hồng
    'images/flowers/flower-02.webp', // Hồng trắng kem
    'images/flowers/flower-03.webp', // Thược dược đỏ nhung
    'images/flowers/flower-04.webp', // Cẩm chướng tím pastel
    'images/flowers/flower-05.webp', // Hồng phấn Anh quốc
    'images/flowers/flower-06.webp', // Mẫu đơn trắng phớt vàng
  ];

  let container = null;
  let flowerElements = [];
  let flowerMotionData = []; // Dữ liệu quỹ đạo chuyển động có quy luật cho từng bông hoa
  let isBloomed = false;
  let prefersReducedMotion = false;
  let resizeTimeout = null;
  let maxFallEndTime = 2.6; // Lưu thời gian kết thúc của bông hoa rơi trễ nhất (s)
  let slowestFlowerElement = null; // Bông hoa kết thúc trễ nhất để lắng nghe transitionend khi rơi
  let maxBloomEndTime = 7400; // Lưu thời gian kết thúc của bông hoa bung nở trễ nhất (ms)
  let slowestBloomFlowerElement = null; // Bông hoa bung nở trễ nhất để lắng nghe transitionend khi hoa nở phủ kín


  // Biến điều khiển chu trình chuyển động có quy luật (requestAnimationFrame)
  let sustainedMotionRafId = null;
  let sustainedMotionStartTime = null;
  let isSustainedMotionActive = false;

  // Biến điều khiển hiệu ứng rơi hoa tự do (Free-Falling Flowers Transition)
  let isFallingTransitioning = false;
  let fallingTransitionStartTime = null;
  let onFallRevealedCallback = null;
  let onFallCompleteCallback = null;
  let hasFallRevealedTriggered = false;
  let hasFallCompleted = false;
  let cachedCenterX = 0;
  let cachedCenterY = 0;
  let cachedMaxDistance = 1000;

  const FlowerBloomModule = {
    name: 'FlowerBloomModule',
    isInitialized: false,

    /**
     * Khởi tạo module hoa bung nở
     * @param {HTMLElement} containerElement - Thẻ chứa #bloom-layer
     * @param {Array<string>} [customImages] - Danh sách ảnh hoa tùy chọn
     */
    init: function (containerElement, customImages) {
      if (!containerElement) {
        console.error('[FlowerBloomModule] Không tìm thấy container #bloom-layer');
        return;
      }

      container = containerElement;
      container.innerHTML = '';
      flowerElements = [];
      flowerMotionData = [];
      isBloomed = false;
      maxBloomEndTime = 7400;
      slowestBloomFlowerElement = null;
      maxFallEndTime = 2.4;
      slowestFlowerElement = null;

      if (sustainedMotionRafId) {
        cancelAnimationFrame(sustainedMotionRafId);
        sustainedMotionRafId = null;
      }
      isSustainedMotionActive = false;

      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      prefersReducedMotion = mediaQuery.matches;

      const flowerImages = (customImages && customImages.length > 0) ? customImages : DEFAULT_FLOWER_IMAGES;

      // Sinh toàn bộ hoa theo mạng lưới phủ kín 100%
      this.generateFullCoverageFlowers(flowerImages);

      // Lắng nghe resize cửa sổ để tự thích ứng kích thước
      window.removeEventListener('resize', this.onResize);
      this.onResize = this.handleResize.bind(this, flowerImages);
      window.addEventListener('resize', this.onResize);

      this.isInitialized = true;
      console.info(`[FlowerBloomModule] Đã khởi tạo hoàn tất ${flowerElements.length} bông hoa phủ kín 100% màn hình.`);
    },

    /**
     * Thuật toán phân bố hoa phủ kín 100% diện tích và tạo thời gian trễ liên tục
     */
    generateFullCoverageFlowers: function (images) {
      if (!container) return;

      container.innerHTML = '';
      flowerElements = [];
      flowerMotionData = [];

      const width = window.innerWidth;
      const height = window.innerHeight;
      const centerX = width * 0.5;
      const centerY = height * 0.5;

      const isMobile = width < 768;

      // Khoảng cách bước lưới so le và dải kích thước theo thiết bị
      // Mobile: tinh chỉnh mật độ DOM (~22-26 bông) và tăng nhẹ kích thước để phủ kín 100% không giật lag
      const stepX = isMobile ? 160 : 175;
      const stepY = isMobile ? 145 : 150;
      const minSize = isMobile ? 260 : 300;
      const maxSize = isMobile ? 320 : 380;
      const padding = isMobile ? 50 : 80; // Vượt ra ngoài mép màn hình để 4 cạnh và 4 góc luôn kín đặc

      // Bán kính lớn nhất đến góc xa nhất của vùng đệm
      const maxDistance = Math.hypot(width * 0.5 + padding, height * 0.5 + padding);

      // Lưu lại tọa độ tâm và khoảng cách tối đa để điều phối chuyển cảnh phép thuật
      cachedCenterX = centerX;
      cachedCenterY = centerY;
      cachedMaxDistance = maxDistance;

      const rawFlowers = [];

      // 1. Phân bố hoa tại các ô lưới so le (Hexagonal / Staggered Jittered Grid)
      let rowIndex = 0;
      for (let y = -padding; y <= height + padding; y += stepY) {
        rowIndex++;
        // So le một nửa bước X ở các hàng chẵn
        const offsetX = (rowIndex % 2 === 1) ? 0 : stepX * 0.5;

        for (let x = -padding + offsetX; x <= width + padding; x += stepX) {
          // Độ lệch ngẫu nhiên tự nhiên để phá vỡ tính hình học cứng nhắc
          const jitterX = (Math.random() - 0.5) * (stepX * 0.3);
          const jitterY = (Math.random() - 0.5) * (stepY * 0.3);

          const posX = x + jitterX;
          const posY = y + jitterY;

          const dist = Math.hypot(posX - centerX, posY - centerY);
          const normDist = Math.min(1, dist / maxDistance);

          // Kích thước hoa với độ biến thiên ngẫu nhiên
          const size = minSize + Math.random() * (maxSize - minSize);

          // Hoa lưới: nở tiếp nối liền mạch từ tâm ra ngoài (delay từ 650ms đến 5000ms)
          const minGridDelay = 650;
          const maxGridDelay = 5000;
          const delay = minGridDelay + Math.pow(normDist, 0.82) * (maxGridDelay - minGridDelay) + (Math.random() - 0.5) * 120;

          rawFlowers.push({
            x: posX,
            y: posY,
            size: size,
            dist: dist,
            normDist: normDist,
            delay: Math.max(minGridDelay * 0.75, delay),
            rotateDeg: Math.floor(Math.random() * 360),
            zIndexTier: Math.floor(normDist * 10), // Tầng z-index theo khoảng cách từ tâm
          });
        }
      }

      // 2. BÔNG HOA SỐ 1 DUY NHẤT: Nở chính xác tại tâm màn hình (Trùng tâm đóa hoa hạt)
      rawFlowers.push({
        x: centerX,
        y: centerY,
        size: minSize * 1.15, // Đóa hoa tâm nở rộ đầy đặn, rực rỡ
        dist: 0,
        normDist: 0,
        delay: 0, // TUYỆT ĐỐI 0.0ms: Bông hoa đầu tiên nở ngay tại tâm
        rotateDeg: 0,
        zIndexTier: 1,
      });

      // 3. Cụm hoa lân cận tâm nở nối tiếp theo sau đóa tâm (Wave 1: từ 320ms đến 780ms)
      const nearCenterCount = isMobile ? 3 : 5;
      for (let c = 0; c < nearCenterCount; c++) {
        const cAngle = (c * (Math.PI * 2) / nearCenterCount) + (Math.random() - 0.5) * 0.25;
        const cDist = 28 + Math.random() * 30; // Cách tâm 28-58px
        const posX = centerX + cDist * Math.cos(cAngle);
        const posY = centerY + cDist * Math.sin(cAngle);
        const size = minSize * 0.98 + Math.random() * (maxSize - minSize) * 0.5;

        rawFlowers.push({
          x: posX,
          y: posY,
          size: size,
          dist: cDist,
          normDist: 0.05,
          delay: 320 + c * 100 + (Math.random() - 0.5) * 40, // Nở nối tiếp ngay sau đóa tâm
          rotateDeg: Math.floor(Math.random() * 360),
          zIndexTier: 2,
        });
      }

      // Sắp xếp các bông hoa theo thứ tự độ trễ nở để tạo cấu trúc DOM tuần tự
      rawFlowers.sort((a, b) => a.delay - b.delay);

      // Reset các biến theo dõi bông hoa hoàn tất trễ nhất cho lần sinh hoa này
      maxBloomEndTime = 0;
      slowestBloomFlowerElement = null;
      maxFallEndTime = 2.4;
      slowestFlowerElement = null;

      // Tạo các phần tử DOM hoa qua DocumentFragment để tối ưu hiệu năng render (tránh layout thrashing)
      const fragment = (typeof document.createDocumentFragment === 'function')
        ? document.createDocumentFragment()
        : container;

      rawFlowers.forEach((f, idx) => {
        const imgSrc = images[idx % images.length];

        const item = document.createElement('div');
        item.className = 'bloom-flower-item';
        item.style.width = f.size.toFixed(0) + 'px';
        item.style.height = f.size.toFixed(0) + 'px';

        // Tọa độ đích cuối cùng
        const finalLeft = (f.x - f.size * 0.5);
        const finalTop = (f.y - f.size * 0.5);
        item.style.left = finalLeft.toFixed(1) + 'px';
        item.style.top = finalTop.toFixed(1) + 'px';

        // Tọa độ lệch lúc xuất phát (hướng nhẹ từ tâm tỏa ra)
        const angleFromCenter = Math.atan2(f.y - centerY, f.x - centerX);
        const driftDist = Math.min(180, f.dist * 0.28);
        const startOffsetX = -Math.cos(angleFromCenter) * driftDist;
        const startOffsetY = -Math.sin(angleFromCenter) * driftDist;

        // Xếp lớp z-index xác định: bông nở sau xếp đè lên bông trước, tạo thứ tự trước - sau rõ ràng
        item.style.zIndex = 10 + idx;

        // Biến CSS tùy biến cho từng bông hoa
        item.style.setProperty('--start-offset-x', startOffsetX.toFixed(1) + 'px');
        item.style.setProperty('--start-offset-y', startOffsetY.toFixed(1) + 'px');
        item.style.setProperty('--target-rotate', f.rotateDeg + 'deg');
        item.style.setProperty('--bloom-delay', (f.delay / 1000).toFixed(2) + 's');
        item.style.setProperty('--float-duration', (5.5 + Math.random() * 3.5).toFixed(1) + 's');
        item.style.setProperty('--float-delay', (Math.random() * 3.0).toFixed(1) + 's');

        // ------------------------------------------------------------
        // HIỆU ỨNG BIỂN HOA TÁCH RỜI & RƠI TỰ DO TRONG KHÔNG GIAN VŨ TRỤ TÍM KHI NHẤN TIẾP TỤC
        // ------------------------------------------------------------
        const totalHeightSpan = height + padding * 2;
        const normY = Math.max(0, Math.min(1, (f.y + padding) / totalHeightSpan));

        // Hàm băm giả ngẫu nhiên xác định (Deterministic PRNG) dựa trên tọa độ & index
        const seed = Math.round(f.x * 43.1 + f.y * 79.3 + idx * 19.7);
        const stableHash = function (s) {
          const val = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
          return val - Math.floor(val);
        };

        const h1 = stableHash(seed + 11);
        const vTendency = normY * 0.14;
        const organicDetach = h1 * 0.28;
        const spatialHarmonic = Math.sin((f.x + f.y) * 0.006) * 0.05;
        const fallDelayVal = Math.max(0, Math.min(0.46, vTendency + organicDetach + spatialHarmonic));

        const h3 = stableHash(seed + 41);
        const fallDistYVal = 500 + h3 * 320; // 500px đến 820px

        const h4 = stableHash(seed + 67);
        const driftSign = stableHash(seed + 73) > 0.5 ? 1 : -1;
        const driftMagnitude = Math.pow(h4, 1.2) * 75;
        const fallDriftXVal = driftSign * driftMagnitude;

        const rotDir = stableHash(seed + 83) > 0.5 ? 1 : -1;
        const rotType = stableHash(seed + 89);
        let fallRotVal = 0;
        if (rotType < 0.30) {
          fallRotVal = rotDir * (2 + stableHash(seed + 97) * 7);
        } else if (rotType < 0.78) {
          fallRotVal = rotDir * (10 + stableHash(seed + 101) * 15);
        } else {
          fallRotVal = rotDir * (26 + stableHash(seed + 107) * 16);
        }

        const h6 = stableHash(seed + 113);
        const fallDurationVal = 1.45 + h6 * 0.40;

        const easeType = stableHash(seed + 127);
        let fallEaseVal = 'cubic-bezier(0.35, 0, 0.65, 0.98)';
        if (easeType < 0.35) {
          fallEaseVal = 'cubic-bezier(0.42, 0, 0.75, 1)';
        } else if (easeType < 0.70) {
          fallEaseVal = 'cubic-bezier(0.28, 0, 0.48, 0.96)';
        }

        const h7 = stableHash(seed + 137);
        const fallScaleVal = 0.84 + h7 * 0.12;

        const bloomDurationVal = 1900 + stableHash(seed + 149) * 350;
        // Lưu vết bông hoa bung nở kết thúc trễ nhất
        const itemBloomEndTime = f.delay + bloomDurationVal;
        if (itemBloomEndTime > maxBloomEndTime) {
          maxBloomEndTime = itemBloomEndTime;
          slowestBloomFlowerElement = item;
        }

        const totalItemTime = fallDelayVal + fallDurationVal;
        if (totalItemTime > maxFallEndTime) {
          maxFallEndTime = totalItemTime;
          slowestFlowerElement = item;
        }

        item.style.setProperty('--fall-delay', fallDelayVal.toFixed(3) + 's');
        item.style.setProperty('--fall-dist-y', fallDistYVal.toFixed(1) + 'px');
        item.style.setProperty('--fall-drift-x', fallDriftXVal.toFixed(1) + 'px');
        item.style.setProperty('--fall-rot', fallRotVal.toFixed(1) + 'deg');
        item.style.setProperty('--fall-scale', fallScaleVal.toFixed(2));
        item.style.setProperty('--fall-duration', fallDurationVal.toFixed(3) + 's');
        item.style.setProperty('--fall-ease', fallEaseVal);

        // Khởi tạo trạng thái ban đầu: ẩn và thu nhỏ tại startOffset
        item.style.opacity = '0';
        item.style.transform = `translate3d(${startOffsetX.toFixed(1)}px, ${startOffsetY.toFixed(1)}px, 0) scale(0.04) rotate(0deg)`;
        item.style.willChange = 'transform, opacity';

        // ------------------------------------------------------------
        // CẤU HÌNH THÔNG SỐ CHUYỂN ĐỘNG CÓ QUY LUẬT (SUSTAINED 3D MOTION)
        // ------------------------------------------------------------
        // Phân chia 4 Cụm chuyển động đan xen tuần tự:
        // Cụm 0: Vòng cung lớn (Large Arc Flow)
        // Cụm 1: Vòng cung ngược chiều (Counter-Curved Flow)
        // Cụm 2: Quỹ đạo elip nghiêng (Tilted Elliptical Orbit)
        // Cụm 3: Chiều sâu 3D (3D Depth & Lissajous Near-Far)
        const clusterId = idx % 4;

        // Biên độ quỹ đạo theo thiết bị:
        // Desktop: 18px - 28px X, 12px - 20px Y
        // Mobile: thu hẹp nhẹ hệ số 0.72x để bảo toàn độ phủ kín trên màn hình hẹp
        const ampScale = isMobile ? 0.72 : 1.0;
        const orbitAmpX = (18 + stableHash(seed + 151) * 10) * ampScale;
        const orbitAmpY = (12 + stableHash(seed + 157) * 8) * ampScale;

        // Tốc độ góc (chu kỳ lướt êm ái 8.5s - 12s)
        const orbitSpeed = 0.85 + stableHash(seed + 163) * 0.35;
        const orbitPhase = stableHash(seed + 167) * Math.PI * 2;

        // Góc nghiêng elip của Cụm 2 (25° đến 60°)
        const tiltAngle = (25 + stableHash(seed + 173) * 35) * (Math.PI / 180);

        // Xoay nhẹ từng đóa hoa quanh tâm chính nó (self-rotation):
        // Chọn ~60% số đóa hoa có xoay nhẹ (±3.5° đến ±7°), 40% đứng góc tĩnh làm bệ đỡ
        const hasSelfRot = stableHash(seed + 179) < 0.60;
        const rotSign = stableHash(seed + 183) > 0.5 ? 1 : -1;
        const rotAmp = rotSign * (3.5 + stableHash(seed + 187) * 3.5);
        const rotSpeed = 0.75 + stableHash(seed + 191) * 0.45;
        const rotPhase = stableHash(seed + 197) * Math.PI * 2;

        // Chiều sâu (scale dao động 2.5% đến 4.8%)
        const depthAmp = 0.025 + stableHash(seed + 211) * 0.023;

        // Hệ số phân lớp: hoa lớp ngoài/nền (0.82x đầm hơn để giữ kín mép), hoa trước/tâm (1.15x phóng khoáng hơn)
        const depthTierMult = f.normDist > 0.65 ? 0.82 : (f.normDist < 0.28 ? 1.15 : 1.0);

        flowerMotionData.push({
          element: item,
          x: f.x,
          y: f.y,
          dist: f.dist,
          normDist: f.normDist,
          delay: f.delay,
          bloomDuration: bloomDurationVal,
          startOffsetX: startOffsetX,
          startOffsetY: startOffsetY,
          hasAppeared: false,
          baseRotate: f.rotateDeg,
          cluster: clusterId,
          orbitAmpX: orbitAmpX,
          orbitAmpY: orbitAmpY,
          orbitSpeed: orbitSpeed,
          orbitPhase: orbitPhase,
          tiltAngle: tiltAngle,
          hasSelfRot: hasSelfRot,
          rotAmp: rotAmp,
          rotSpeed: rotSpeed,
          rotPhase: rotPhase,
          depthAmp: depthAmp,
          depthTierMult: depthTierMult,
          seed: seed,
          lastTransX: 0,
          lastTransY: 0,
          lastTransRot: f.rotateDeg,
          lastTransScale: 1.0,
          lastTransOpacity: 1.0,
        });

        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = 'Đóa hoa bung nở 20/10';
        img.className = 'bloom-flower-img';
        img.loading = 'eager';
        img.decoding = 'async';

        item.appendChild(img);
        fragment.appendChild(item);
        flowerElements.push(item);
      });

      if (fragment !== container) {
        container.appendChild(fragment);
      }
    },

    /**
     * Kích hoạt sóng hoa nở liên tục từ tâm phủ kín màn hình
     * Đồng bộ hiển thị nút "Tiếp tục →" ngay lập tức khi hoa cuối cùng nở xong
     * @param {Function} [onComplete] - Callback sau khi toàn bộ màn hình đã phủ kín hoa
     */
    startBloom: function (onComplete) {
      if (!container || flowerElements.length === 0) {
        console.warn('[FlowerBloomModule] Chưa có phần tử hoa để kích hoạt');
        return;
      }

      console.info('[FlowerBloomModule] Kích hoạt dòng sóng hoa bung nở và chuyển động liên tục từ tâm...');
      isBloomed = true;
      container.classList.add('blooming');

      // Khởi chạy ngay lập tức chu trình chuyển động liên tục từ khung hình đầu tiên
      this.startSustainedMotion(onComplete);
    },

    /**
     * Chu trình chuyển động liên tục, mượt mà từ lúc hoa hé nở đến khi phủ kín màn hình và duy trì sau đó
     * Vận hành bằng requestAnimationFrame mượt mà 60fps
     * 4 Cụm chuyển động theo các quỹ đạo cong đan xen có lệch pha
     */
    startSustainedMotion: function (onComplete) {
      if (isSustainedMotionActive || flowerMotionData.length === 0) return;
      isSustainedMotionActive = true;
      sustainedMotionStartTime = performance.now();
      let hasTriggeredBloomComplete = false;

      console.info(
        `[FlowerBloomModule] Khởi động chuyển động liên tục 60fps cho ${flowerMotionData.length} đóa hoa từ tâm tỏa ra.`
      );

      const animate = (timestamp) => {
        if (!isSustainedMotionActive) return;

        const elapsedMs = (timestamp - sustainedMotionStartTime);
        const elapsedSec = elapsedMs / 1000;
        const isReduced = prefersReducedMotion ||
          (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const motionScale = isReduced ? 0.2 : 1.0;

        // Khi hoa đã lan tỏa phủ kín toàn bộ màn hình (xuất hiện sớm hơn ~2.4s ngay khi hoa vừa phủ đầy)
        const bloomCompleteThreshold = Math.min(maxBloomEndTime, Math.max(4500, maxBloomEndTime - 2400));
        if (!hasTriggeredBloomComplete && elapsedMs >= bloomCompleteThreshold) {
          hasTriggeredBloomComplete = true;
          container.classList.add('fully-bloomed');
          console.info('[FlowerBloomModule] 100% diện tích màn hình đã được phủ kín bởi biển hoa. Hiển thị chữ gợi ý tiếp tục.');

          if (typeof CustomEvent === 'function') {
            const event = new CustomEvent('bloom:complete', {
              bubbles: true,
              detail: { totalDuration: elapsedMs, flowerCount: flowerElements.length }
            });
            if (container && typeof container.dispatchEvent === 'function') {
              container.dispatchEvent(event);
            }
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
              window.dispatchEvent(event);
            }
          }

          // Báo cho main.js hiển thị chữ "Chạm vào để tiếp tục" ngay khi hoa vừa phủ kín
          if (typeof onComplete === 'function') {
            onComplete();
          }
        }

        const len = flowerMotionData.length;
        for (let i = 0; i < len; i++) {
          const f = flowerMotionData[i];
          if (!f.element) continue;

          // Nếu chưa đến thời điểm hé nở của bông hoa này thì giữ ẩn
          if (elapsedMs < f.delay) {
            if (f.hasAppeared) {
              f.element.style.opacity = '0';
              f.hasAppeared = false;
            }
            continue;
          }

          f.hasAppeared = true;

          // Tiến trình hé mở cánh hoa tự nhiên (0 -> 1)
          const timeSinceFlowerStart = elapsedMs - f.delay;
          const bloomNorm = Math.min(1.0, timeSinceFlowerStart / f.bloomDuration);
          const bloomEase = 1.0 - Math.pow(1.0 - bloomNorm, 3); // easeOutCubic

          const scaleBloom = 0.04 + 0.96 * bloomEase;
          // Độ đục tự nhiên: nhanh chóng đạt 100% trong 150ms đầu nở để hoa đặc ruột, không bị bóng ma
          const opacityBloom = Math.min(1.0, timeSinceFlowerStart / 150);

          // Tọa độ dịch chuyển mở rộng từ tâm ra vị trí đích
          const emergeX = f.startOffsetX * (1.0 - bloomEase);
          const emergeY = f.startOffsetY * (1.0 - bloomEase);
          const emergeRot = (1.0 - bloomEase) * (-15 * Math.sin(f.baseRotate));

          // Hòa quyện chuyển động quỹ đạo ngay khi hé mở (motionBlend)
          const motionBlend = bloomEase * motionScale;

          let dx = 0;
          let dy = 0;
          let dRot = 0;
          let dScale = 1.0;

          // Phân bổ chuyển động theo 4 Cụm quỹ đạo cong đan xen
          switch (f.cluster) {
            case 0: {
              // CỤM 1: Chuyển động chậm theo quỹ đạo vòng cung lớn
              const theta = (elapsedSec * 0.58 * f.orbitSpeed) + f.orbitPhase;
              dx = f.orbitAmpX * Math.cos(theta);
              dy = f.orbitAmpY * Math.sin(theta);
              dx += (f.orbitAmpX * 0.22) * Math.cos(theta * 2.0 + 0.85);
              dy += (f.orbitAmpY * 0.22) * Math.sin(theta * 2.0 + 0.85);
              if (f.hasSelfRot) {
                dRot = f.rotAmp * Math.sin(elapsedSec * f.rotSpeed + f.rotPhase);
              }
              break;
            }

            case 1: {
              // CỤM 2: Trôi theo quỹ đạo cong ngược chiều với Cụm 1
              const theta = -(elapsedSec * 0.62 * f.orbitSpeed) + f.orbitPhase;
              dx = f.orbitAmpX * Math.cos(theta);
              dy = f.orbitAmpY * Math.sin(theta);
              dx += (f.orbitAmpX * 0.25) * Math.sin(theta * 1.8 + 1.25);
              dy += (f.orbitAmpY * 0.25) * Math.cos(theta * 1.8 + 1.25);
              if (f.hasSelfRot) {
                dRot = f.rotAmp * Math.sin(-elapsedSec * f.rotSpeed + f.rotPhase);
              }
              break;
            }

            case 2: {
              // CỤM 3: Xoay nhẹ và dịch chuyển theo quỹ đạo elip nghiêng
              const theta = (elapsedSec * 0.70 * f.orbitSpeed) + f.orbitPhase;
              const u = f.orbitAmpX * Math.cos(theta);
              const v = f.orbitAmpY * Math.sin(theta);
              const cosA = Math.cos(f.tiltAngle);
              const sinA = Math.sin(f.tiltAngle);
              dx = u * cosA - v * sinA;
              dy = u * sinA + v * cosA;
              if (f.hasSelfRot) {
                dRot = f.rotAmp * Math.cos(elapsedSec * f.rotSpeed + f.rotPhase);
              }
              break;
            }

            case 3:
            default: {
              // CỤM 4: Chuyển động nhẹ theo chiều sâu (3D Depth), tạo cảm giác gần - xa (chỉ biến thiên scale, giữ nguyên độ đục 100%)
              const theta = (elapsedSec * 0.65 * f.orbitSpeed) + f.orbitPhase;
              dx = f.orbitAmpX * Math.sin(theta);
              dy = f.orbitAmpY * Math.sin(theta * 2.0 + 0.785);
              dScale = 1.0 + f.depthAmp * Math.sin(theta);
              if (f.hasSelfRot) {
                dRot = f.rotAmp * Math.sin(elapsedSec * f.rotSpeed + f.rotPhase);
              }
              break;
            }
          }

          // Tổng hợp biến đổi không gian cơ bản
          const finalX = emergeX + (dx * f.depthTierMult * motionBlend);
          const finalY = emergeY + (dy * f.depthTierMult * motionBlend);
          const finalRot = f.baseRotate + emergeRot + (dRot * motionBlend);
          const finalScale = scaleBloom * (1.0 + (dScale - 1.0) * motionBlend);
          let transX = finalX;
          let transY = finalY;
          let transRot = finalRot;
          let transScale = finalScale;
          // Hoa ở trạng thái hiển thị luôn đạt độ đục 100% như hoa thật, không nhìn xuyên qua nhau
          let transOpacity = opacityBloom;

          // Ghi nhận vị trí hiện tại để khi chuyển sang hiệu ứng rơi tự do sẽ liền mạch 100%
          if (!isFallingTransitioning) {
            f.lastTransX = transX;
            f.lastTransY = transY;
            f.lastTransRot = transRot;
            f.lastTransScale = transScale;
            f.lastTransOpacity = transOpacity;
          }

          // ------------------------------------------------------------
          // ĐIỀU PHỐI HIỆU ỨNG RƠI HOA TỰ DO (FREE-FALLING TRANSITION)
          // ------------------------------------------------------------
          if (isFallingTransitioning && fallingTransitionStartTime) {
            const fallElapsed = timestamp - fallingTransitionStartTime;

            if (fallElapsed < f.fallStaggerDelay) {
              // Chưa đến thời điểm tách rơi của bông này: tiếp tục đung đưa tự nhiên
            } else {
              // Đã tách rời và bắt đầu rơi tự do theo gia tốc trọng trường
              const tFall = fallElapsed - f.fallStaggerDelay;
              const p = Math.min(1.0, tFall / f.fallDuration);

              // Gia tốc trọng trường tự nhiên: bắt đầu êm từ 0, tăng tốc dần khi rơi xuống
              const gravityEase = Math.pow(p, 1.82);
              const dropY = f.fallGravityDist * gravityEase;

              // Lướt gió ngang hình sin mềm mại tự nhiên
              const swaySec = tFall / 1000;
              const driftX = Math.sin(swaySec * f.fallDriftFreq + f.fallDriftPhase) * f.fallDriftAmp * (1.0 - p * 0.25);

              // Xoay nhẹ theo chiều gió
              const addRot = f.fallRotSpeed * swaySec + Math.sin(swaySec * 3.0) * 10;

              // Co nhẹ theo chiều sâu không gian
              const scaleFactor = 1.0 - p * 0.16;

              // Lúc rơi ở trên phải mờ dần đi:
              // f.normY đi từ 0 (đỉnh màn hình) đến 1 (đáy màn hình)
              // Hoa ở trên cao bắt đầu mờ dần ngay khi tách rơi (từ 5% quãng đường),
              // tạo hiệu ứng mờ dần từ trên xuống dưới hé lộ nền vũ trụ
              const fadeStartP = 0.04 + (f.normY !== undefined ? f.normY : 0.5) * 0.32;
              let alphaFactor = 1.0;
              if (p > fadeStartP) {
                alphaFactor = Math.max(0, 1.0 - Math.pow((p - fadeStartP) / (1.0 - fadeStartP), 1.15));
              }

              transX = f.fallOriginX + driftX;
              transY = f.fallOriginY + dropY;
              transRot = f.fallOriginRot + addRot;
              transScale = f.fallOriginScale * scaleFactor;
              transOpacity = f.fallOriginOpacity * alphaFactor;
            }

            // Khi hoa ở trên đã rơi và mờ dần hé lộ không gian trung tâm (~1350ms): Kích hoạt hiển thị màn hình tiếp theo
            if (fallElapsed >= 1350 && !hasFallRevealedTriggered) {
              hasFallRevealedTriggered = true;
              if (typeof onFallRevealedCallback === 'function') {
                try { onFallRevealedCallback(); } catch (err) { console.error(err); }
              }
            }

            // Hoàn tất toàn bộ khi toàn bộ hoa đã rơi khỏi đáy màn hình (~2450ms)
            if (fallElapsed >= 2450 && !hasFallCompleted) {
              hasFallCompleted = true;
              isFallingTransitioning = false;
              this.stopSustainedMotion();
              if (container) {
                container.style.display = 'none';
                container.classList.remove('blooming', 'fully-bloomed');
              }
              if (typeof onFallCompleteCallback === 'function') {
                try { onFallCompleteCallback(); } catch (err) { console.error(err); }
              }
              return;
            }
          }

          // Tối ưu chuỗi biến đổi DOM nhanh hơn trên thiết bị cấu hình thấp
          const rX = Math.round(transX * 10) / 10;
          const rY = Math.round(transY * 10) / 10;
          const rScale = Math.round(transScale * 1000) / 1000;
          const rRot = Math.round(transRot * 10) / 10;
          const rOp = Math.max(0, Math.min(1, Math.round(transOpacity * 100) / 100));

          f.element.style.transform = `translate3d(${rX}px, ${rY}px, 0) scale(${rScale}) rotate(${rRot}deg)`;
          f.element.style.opacity = rOp;
        }

        if (document.hidden) {
          sustainedMotionRafId = null;
          return;
        }

        sustainedMotionRafId = requestAnimationFrame(animate);
      };

      if (!document.hidden) {
        sustainedMotionRafId = requestAnimationFrame(animate);
      }

      // Đăng ký xử lý khi chuyển đổi tab
      if (!this._hasBoundVisibility) {
        this._hasBoundVisibility = true;
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden && isSustainedMotionActive && !sustainedMotionRafId) {
            sustainedMotionRafId = requestAnimationFrame(animate);
          } else if (document.hidden && sustainedMotionRafId) {
            cancelAnimationFrame(sustainedMotionRafId);
            sustainedMotionRafId = null;
          }
        });
      }
    },

    /**
     * Dừng chu trình chuyển động có quy luật và giải phóng tài nguyên
     */
    stopSustainedMotion: function () {
      if (sustainedMotionRafId) {
        cancelAnimationFrame(sustainedMotionRafId);
        sustainedMotionRafId = null;
      }
      isSustainedMotionActive = false;

      // Xóa bỏ transform inline để CSS transition rơi (falling) nhận được giá trị chuẩn
      flowerElements.forEach(item => {
        if (item) {
          item.style.transform = '';
          item.style.opacity = '';
        }
      });
    },

    /**
     * Xử lý resize cửa sổ với debounce
     */
    handleResize: function (images) {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!container) return;
        const currentBloomed = isBloomed;
        this.stopSustainedMotion();
        this.generateFullCoverageFlowers(images);
        if (currentBloomed) {
          container.classList.add('blooming', 'fully-bloomed');
          this.startSustainedMotion();
        }
      }, 250);
    },

    /**
     * Kích hoạt hiệu ứng hoa rơi tự do: Các đóa hoa tách rời và rơi tự do theo gia tốc trọng trường
     * kết hợp lượn sóng ngang, xoay 3D và mờ dần để chuyển sang màn hình tiếp theo
     * @param {Function} [onRevealed] - Gọi khi hoa đã rơi hé lộ khoảng không trung tâm (~1100ms) để hiện màn hình tiếp theo
     * @param {Function} [onFullyComplete] - Gọi khi toàn bộ hoa đã rơi xong (~2250ms)
     */
    transitionFreeFall: function (onRevealed, onComplete) {
      if (!container || !isBloomed) {
        if (typeof onRevealed === 'function') onRevealed();
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      console.info('[FlowerBloomModule] Bắt đầu hiệu ứng rơi hoa tự do để chuyển tiếp màn hình...');
      isFallingTransitioning = true;
      fallingTransitionStartTime = performance.now();
      onFallRevealedCallback = onRevealed;
      onFallCompleteCallback = onComplete;
      hasFallRevealedTriggered = false;
      hasFallCompleted = false;

      const viewportH = window.innerHeight || 800;

      // Khởi tạo các thông số rơi tự do riêng biệt cho từng đóa hoa
      flowerMotionData.forEach((f, idx) => {
        f.fallOriginX = f.lastTransX !== undefined ? f.lastTransX : 0;
        f.fallOriginY = f.lastTransY !== undefined ? f.lastTransY : 0;
        f.fallOriginRot = f.lastTransRot !== undefined ? f.lastTransRot : f.baseRotate;
        f.fallOriginScale = f.lastTransScale !== undefined ? f.lastTransScale : 1.0;
        f.fallOriginOpacity = f.lastTransOpacity !== undefined ? f.lastTransOpacity : 1.0;

        // Tính độ trễ tách rơi hữu cơ (Organic Staggered Detach):
        // Hoa ở mép trên cùng (f.y nhỏ nhất) tách rơi ngay lập tức (delay ~0ms),
        // lần lượt lan dần xuống phía dưới theo trục Y
        const normY = Math.max(0, Math.min(1, (f.y + 60) / Math.max(1, viewportH + 120)));
        f.normY = normY;
        const seedVal = f.seed || (idx * 31);
        const randHash = (Math.sin(seedVal * 12.9898 + 78.233) * 43758.5453) % 1;
        const jitter = Math.abs(randHash);

        // Hoa trên đỉnh rơi ngay trong 0 - 60ms, hoa dưới rơi muộn hơn (đến ~380ms)
        f.fallStaggerDelay = (normY * 260) + (jitter * 100); 
        f.fallDuration = 1750 + jitter * 450; // 1.75s - 2.2s

        // Quãng đường rơi tự do vượt khỏi đáy màn hình
        f.fallGravityDist = viewportH * 1.25 + 400 + jitter * 220;

        // Biên độ lượn gió ngang hình sin
        const driftSign = ((idx + Math.round(f.x)) % 2 === 0) ? 1 : -1;
        f.fallDriftAmp = driftSign * (35 + jitter * 65);
        f.fallDriftFreq = 1.9 + jitter * 1.4;
        f.fallDriftPhase = jitter * Math.PI * 2;

        // Vận tốc xoay nhẹ khi bay trong không trung
        const rotSign = (idx % 2 === 0) ? 1 : -1;
        f.fallRotSpeed = rotSign * (22 + jitter * 38);
      });
    },

    /**
     * Hoàn tất ngay lập tức hiệu ứng rơi hoa khi người dùng chạm màn hình trong lúc hoa đang rơi
     */
    fastForwardFallingTransition: function () {
      if (!isFallingTransitioning && hasFallCompleted) return;
      console.info('[FlowerBloomModule] Nhận tín hiệu tua nhanh hiệu ứng rơi hoa -> Hoàn tất ngay lập tức.');
      isFallingTransitioning = false;
      hasFallCompleted = true;
      this.stopSustainedMotion();
      if (container) {
        container.style.display = 'none';
        container.classList.remove('blooming', 'fully-bloomed');
      }
      if (!hasFallRevealedTriggered) {
        hasFallRevealedTriggered = true;
        if (typeof onFallRevealedCallback === 'function') {
          try { onFallRevealedCallback(); } catch (err) { console.error(err); }
        }
      }
      if (typeof onFallCompleteCallback === 'function') {
        const cb = onFallCompleteCallback;
        onFallCompleteCallback = null;
        try { cb(); } catch (err) { console.error(err); }
      }
    },

    // Giữ tương thích ngược với các tên hàm chuyển cảnh cũ
    transitionMagicPortal: function (onVeilCovered, onFullyComplete) {
      return this.transitionFreeFall(onVeilCovered, onFullyComplete);
    },

    fastForwardPortalTransition: function () {
      return this.fastForwardFallingTransition();
    },

    /**
     * Kích hoạt hiệu ứng hoa mờ dần từ trên xuống dưới kết hợp rơi tự nhiên khi người dùng nhấn Tiếp tục (Dự phòng)
     * @param {Function} [onComplete] - Callback sau khi toàn bộ hoa đã mờ và biến mất
     */
    fadeOut: function (onComplete) {
      if (!container) {
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      console.info('[FlowerBloomModule] Bắt đầu hiệu ứng hoa mờ dần từ trên xuống dưới kết hợp rơi tự nhiên...');
      isBloomed = false;

      // 1. Dừng ngay chuyển động duy trì và giải phóng inline styles để CSS falling hoạt động
      this.stopSustainedMotion();

      // 2. Dừng đung đưa và kích hoạt class rơi từ trên xuống
      container.classList.remove('fully-bloomed');
      container.classList.add('falling');

      // 3. Tính toán tổng thời gian animation an toàn
      const isReduced = prefersReducedMotion ||
        (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

      const totalFallTimeMs = isReduced ? 600 : Math.ceil(Math.max(2.4, maxFallEndTime) * 1000);

      let hasFinished = false;
      const finishFalling = function () {
        if (hasFinished) return;
        hasFinished = true;

        console.info('[FlowerBloomModule] Toàn bộ hoa đã mờ dần và rơi xong. Ẩn hoàn toàn lớp hoa và chuyển giai đoạn.');
        container.classList.remove('blooming', 'falling');
        container.classList.add('fade-out');
        container.style.display = 'none'; // Ẩn hoàn toàn khỏi luồng hiển thị

        if (typeof onComplete === 'function') {
          onComplete();
        }
      };

      // 4. Đồng bộ qua transitionend của bông hoa kết thúc trễ nhất
      const targetFlower = slowestFlowerElement || (flowerElements.length > 0 ? flowerElements[flowerElements.length - 1] : null);
      if (targetFlower && typeof targetFlower.addEventListener === 'function') {
        const onTransitionEnd = function (e) {
          if (e.target === targetFlower && (e.propertyName === 'opacity' || e.propertyName === 'transform')) {
            targetFlower.removeEventListener('transitionend', onTransitionEnd);
            finishFalling();
          }
        };
        targetFlower.addEventListener('transitionend', onTransitionEnd);
      }

      // 5. Cơ chế dự phòng an toàn (Safeguard Timer) tránh bị kẹt nếu sự kiện không được phát
      setTimeout(finishFalling, totalFallTimeMs + 100);
    },

    /**
     * Đặt lại trạng thái ban đầu
     */
    reset: function () {
      if (!container) return;
      this.stopSustainedMotion();
      flowerMotionData = [];
      container.classList.remove('blooming', 'fully-bloomed', 'falling', 'fade-out');
      container.style.display = '';
      isBloomed = false;
      isFallingTransitioning = false;
      hasFallRevealedTriggered = false;
      hasFallCompleted = false;
      fallingTransitionStartTime = null;
      onFallRevealedCallback = null;
      onFallCompleteCallback = null;
      slowestBloomFlowerElement = null;
      slowestFlowerElement = null;
    },

    /**
     * Trả về thông tin kiểm thử
     */
    getStats: function () {
      return {
        isInitialized: this.isInitialized,
        isBloomed: isBloomed,
        isSustainedMotionActive: isSustainedMotionActive,
        flowerCount: flowerElements.length,
        hasContainer: !!container,
      };
    },
  };

  // Xuất module ra phạm vi toàn cục
  window.FlowerBloomModule = FlowerBloomModule;
})();
