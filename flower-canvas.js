/**
 * ====================================================================
 * MODULE: HOA NĂNG LƯỢNG & HẠT SÁNG VŨ TRỤ (FLOWER-CANVAS.JS)
 * ====================================================================
 * Kịch bản chuyển động 4 giai đoạn chuẩn ảnh tham chiếu:
 *   - Giai đoạn A (0.0s - 1.8s): Không gian thức tỉnh (Space Awakens)
 *   - Giai đoạn B (1.8s - 4.2s): Hạt sáng hội tụ xoáy về tâm (Convergence Vortex)
 *   - Giai đoạn C (4.2s - 7.2s): Hoa năng lượng bung nở lộng lẫy (Energy Flower Bloom)
 *   - Giai đoạn D (7.2s - 10s+): Duy trì sống động, thở nhịp nhàng (Sustained Living State)
 * Hỗ trợ hiệu ứng nổ bung ly tâm (Centrifugal Explosion) khi chuyển cảnh.
 */

(function () {
  'use strict';

  // Biến phần tử DOM & Canvas
  let canvas = null;
  let ctx = null;
  let container = null;
  let animationFrameId = null;

  // Biến trạng thái & thời gian
  let isRunning = false;
  let isTabVisible = true;
  let prefersReducedMotion = false;
  let resizeTimeout = null;
  let state = 'RUNNING'; // 'RUNNING' -> 'EXPLODING' -> 'DONE'
  let onExplodeCompleteCallback = null;
  let onFormedCallback = null;
  let hasTriggeredFormed = false;

  let startTime = 0;
  let lastTimestamp = 0;
  let globalRotation = 0;

  // Kích thước logic & tỷ lệ pixel
  let width = 0;
  let height = 0;
  let dpr = 1;
  let centerX = 0;
  let centerY = 0;
  let maxRadius = 210;
  let isMobile = false;

  // Cấu hình thời lượng các giai đoạn (miligiây)
  const TIMELINE = {
    PHASE_A_END: 1800,  // 0 -> 1.8s: Không gian thức tỉnh
    PHASE_B_END: 4200,  // 1.8s -> 4.2s: Hạt sáng hội tụ xoáy về tâm
    PHASE_C_END: 7200,  // 4.2s -> 7.2s: Hoa năng lượng bung nở
    // 7.2s trở đi: Giai đoạn D - Duy trì sống động
  };

  // Mảng dữ liệu hiệu ứng
  let ambientParticles = [];
  let orbitalRings = [];
  let detachedPetals = [];
  let coreParticles = [];
  let explosionElements = [];

  // Bảng màu chuẩn ảnh tham chiếu (Hồng tím năng lượng vũ trụ)
  const THEME = {
    coreWhite: '#ffffff',
    coreGold: 'rgba(255, 246, 214, 0.95)',
    coreGoldHalo: 'rgba(255, 225, 140, 0.8)',
    hotPink: '#ff2d87',
    magenta: '#d926a9',
    lavender: '#b872ff',
    electricPurple: '#8a2be2',
    deepCosmic: '#4c1d95',
    stardustCyan: '#c4f1f9',
    stardustWhite: '#ffffff',
  };

  /**
   * Hàm làm mượt (Easing)
   */
  function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  function easeOutCubic(t) {
    const inv = 1 - t;
    return 1 - inv * inv * inv;
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }

  /**
   * Tính toán kích thước màn hình và tâm hoa
   */
  function calculateDimensions() {
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    width = rect.width || window.innerWidth;
    height = rect.height || window.innerHeight;

    isMobile = width < 768;
    // Tối ưu hiệu năng mobile: giới hạn DPR tối đa 1.25 trên màn hình hẹp để giảm fillrate GPU
    dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    centerX = width * 0.5;
    centerY = height * 0.5;

    // Bán kính hoa theo kích thước màn hình
    const minDim = Math.min(width, height);
    if (width < 480) {
      maxRadius = Math.max(130, Math.min(160, minDim * 0.36));
    } else if (width < 768) {
      maxRadius = Math.max(160, Math.min(190, minDim * 0.36));
    } else {
      maxRadius = Math.max(200, Math.min(235, minDim * 0.28));
    }
  }

  /**
   * Khởi tạo hệ thống hạt không gian & hội tụ
   */
  function initAmbientParticles() {
    ambientParticles = [];
    const count = isMobile ? 70 : 260;

    for (let i = 0; i < count; i++) {
      // Vị trí phân bố tự nhiên khắp màn hình (chủ yếu bán kính từ 0.3*R đến 2.6*R)
      const angle = Math.random() * Math.PI * 2;
      const distRatio = 0.25 + Math.pow(Math.random(), 0.65) * 2.2;
      const baseDist = maxRadius * distRatio;

      const px = centerX + Math.cos(angle) * baseDist;
      const py = centerY + Math.sin(angle) * baseDist;

      // Màu sắc hạt: trắng, vàng nhạt, hồng phấn, tím lavender, magenta
      const colors = [
        { c: '#ffffff', g: 'rgba(255,255,255,0.9)', size: 1.0 },
        { c: '#fff6d6', g: 'rgba(255,246,214,0.85)', size: 1.2 },
        { c: '#ff85c0', g: 'rgba(255,133,192,0.8)', size: 1.4 },
        { c: '#ff2d87', g: 'rgba(255,45,135,0.75)', size: 1.3 },
        { c: '#d946ef', g: 'rgba(217,70,239,0.75)', size: 1.2 },
        { c: '#c084fc', g: 'rgba(192,132,252,0.7)', size: 1.1 },
        { c: '#a5f3fc', g: 'rgba(165,243,252,0.8)', size: 0.9 },
      ];
      const col = colors[Math.floor(Math.random() * colors.length)];

      ambientParticles.push({
        // Tọa độ ban đầu và hiện tại
        x: px,
        y: py,
        initialX: px,
        initialY: py,
        initialAngle: angle,
        initialDist: baseDist,

        // Vận tốc trôi nhẹ ban đầu (Giai đoạn A)
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,

        // Thông số hội tụ (Giai đoạn B): độ lệch pha, tốc độ xoáy, bán kính đích
        targetDist: 10 + Math.random() * (maxRadius * 0.85),
        targetAngleOffset: (1.5 + Math.random() * 3.5) * (Math.random() < 0.65 ? 1 : -1),
        phaseDelay: Math.random() * 0.35, // Độ trễ lệch pha để hạt không chuyển động đồng loạt
        convergeSpeed: 0.8 + Math.random() * 0.5,

        // Đặc tính hiển thị
        size: col.size * (0.8 + Math.random() * 0.6),
        color: col.c,
        glow: col.g,
        alpha: 0.3 + Math.random() * 0.6,
        baseAlpha: 0.3 + Math.random() * 0.6,
        twinkleSpeed: 0.002 + Math.random() * 0.005,
        twinklePhase: Math.random() * Math.PI * 2,

        // Lịch sử đường đi để vẽ vệt sáng mảnh khi hội tụ
        history: [],
        maxHistory: isMobile ? 3 : 5,
      });
    }
  }

  /**
   * Khởi tạo các vòng quỹ đạo ánh sáng elip nghiêng 3D
   */
  function initOrbitalRings() {
    orbitalRings = [];

    // 5 vòng quỹ đạo nghiêng góc khác nhau bao quanh đóa hoa như ảnh tham chiếu
    const configs = [
      { tilt: -0.45, aScale: 1.48, bScale: 0.55, speed: 0.0012, width: 1.4, color: 'rgba(255, 105, 180, ' },
      { tilt: 0.65, aScale: 1.38, bScale: 0.60, speed: -0.0015, width: 1.3, color: 'rgba(186, 104, 255, ' },
      { tilt: -1.15, aScale: 1.62, bScale: 0.46, speed: 0.0009, width: 1.5, color: 'rgba(255, 64, 160, ' },
      { tilt: 1.25, aScale: 1.52, bScale: 0.50, speed: -0.0011, width: 1.2, color: 'rgba(216, 140, 255, ' },
      { tilt: 0.22, aScale: 1.22, bScale: 0.68, speed: 0.0018, width: 1.6, color: 'rgba(255, 180, 220, ' },
    ];

    for (let k = 0; k < configs.length; k++) {
      const cfg = configs[k];
      const particlesOnRing = [];
      const beadCount = isMobile ? 4 : 10;

      for (let b = 0; b < beadCount; b++) {
        particlesOnRing.push({
          phi: (b / beadCount) * Math.PI * 2 + Math.random() * 0.2,
          speed: (0.006 + Math.random() * 0.004) * (cfg.speed > 0 ? 1 : -1),
          size: 1.2 + Math.random() * 1.6,
          isSparkle: Math.random() < 0.35,
          color: Math.random() < 0.4 ? '#ffffff' : Math.random() < 0.7 ? '#ffe4f0' : '#d8b4fe',
        });
      }

      orbitalRings.push({
        tilt: cfg.tilt,
        currentRot: 0,
        aScale: cfg.aScale,
        bScale: cfg.bScale,
        speed: cfg.speed,
        lineWidth: cfg.width,
        colorPrefix: cfg.color,
        particles: particlesOnRing,
      });
    }
  }

  /**
   * Khởi tạo cánh hoa rời trôi bồng bềnh trong không gian (Detached Petals)
   * Tạo chiều sâu 3D nhờ kích thước, độ mờ và hiệu ứng quay lơ lửng
   */
  function initDetachedPetals() {
    detachedPetals = [];
    const count = isMobile ? 6 : 16;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      // Tầng độ sâu Z: 0.4 (xa, nhỏ, mờ) -> 1.3 (gần camera, to, bokeh)
      const zDepth = 0.45 + Math.random() * 0.85;

      const dist = maxRadius * (0.85 + Math.random() * 1.55);

      detachedPetals.push({
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        initialDist: dist,
        angle: angle,
        zDepth: zDepth,
        length: (18 + Math.random() * 18) * zDepth,
        width: (8 + Math.random() * 10) * zDepth,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (0.002 + Math.random() * 0.004) * (Math.random() < 0.5 ? 1 : -1),
        wobblePhase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.0015 + Math.random() * 0.0025,
        driftSpeed: (0.15 + Math.random() * 0.3) * zDepth,
        driftAngle: angle + (Math.random() * 0.6 - 0.3),
        alpha: (0.35 + Math.random() * 0.55) * Math.min(1, zDepth),
        bloomAppearTime: 4200 + Math.random() * 2400, // Xuất hiện dần ở Giai đoạn C
      });
    }
  }

  /**
   * Khởi tạo các hạt năng lượng xoáy nhanh tại nhụy hoa trung tâm
   */
  function initCoreParticles() {
    coreParticles = [];
    const count = isMobile ? 22 : 75;

    for (let i = 0; i < count; i++) {
      coreParticles.push({
        r: 4 + Math.random() * 42,
        angle: Math.random() * Math.PI * 2,
        speed: (0.018 + Math.random() * 0.035) * (Math.random() < 0.6 ? 1 : -1),
        radialSpeed: (Math.random() - 0.5) * 0.2,
        size: 0.9 + Math.random() * 1.8,
        color: Math.random() < 0.5 ? '#ffffff' : Math.random() < 0.8 ? '#ffe680' : '#ff73b6',
        alpha: 0.6 + Math.random() * 0.4,
      });
    }
  }

  /**
   * Khởi tạo toàn bộ dữ liệu đồ họa
   */
  function setupScene() {
    calculateDimensions();
    initAmbientParticles();
    initOrbitalRings();
    initDetachedPetals();
    initCoreParticles();
  }

  // ====================================================================
  // CÁC HÀM VẼ CHI TIẾT (RENDER PIPELINE)
  // ====================================================================

  /**
   * 1. Vẽ quầng sáng tinh vân vũ trụ trung tâm (Cosmic Ambient Glow)
   */
  function drawCosmicCenterHaze(elapsed, phase) {
    if (!ctx) return;

    let baseIntensity = 0.25;
    let radiusFactor = 1.0;

    if (phase === 'AWAKEN') {
      const p = elapsed / TIMELINE.PHASE_A_END;
      baseIntensity = 0.05 + 0.25 * easeOutCubic(p);
      radiusFactor = 0.6 + 0.4 * p;
    } else if (phase === 'CONVERGE') {
      const p = (elapsed - TIMELINE.PHASE_A_END) / (TIMELINE.PHASE_B_END - TIMELINE.PHASE_A_END);
      baseIntensity = 0.3 + 0.35 * easeInOutQuad(p);
      radiusFactor = 1.0 + 0.15 * Math.sin(p * Math.PI);
    } else {
      // Bloom & Sustained
      const breathe = Math.sin(elapsed * 0.0018) * 0.05;
      baseIntensity = 0.65 + breathe;
      radiusFactor = 1.15;
    }

    const outerR = maxRadius * 1.8 * radiusFactor;
    const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, outerR);
    grad.addColorStop(0, `rgba(255, 120, 185, ${(0.45 * baseIntensity).toFixed(3)})`);
    grad.addColorStop(0.2, `rgba(217, 38, 169, ${(0.32 * baseIntensity).toFixed(3)})`);
    grad.addColorStop(0.48, `rgba(138, 43, 226, ${(0.18 * baseIntensity).toFixed(3)})`);
    grad.addColorStop(0.78, `rgba(76, 29, 149, ${(0.06 * baseIntensity).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(5, 2, 12, 0)');

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerR, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  /**
   * 2. Cập nhật và vẽ hệ thống hạt không gian & hội tụ (Giai đoạn A & B)
   */
  function drawAmbientAndConvergingParticles(elapsed, phase) {
    if (!ctx) return;

    const isAwaken = phase === 'AWAKEN';
    const isConverge = phase === 'CONVERGE';
    const isFullBloom = phase === 'BLOOM' || phase === 'SUSTAINED';

    const convergeNorm = isConverge
      ? (elapsed - TIMELINE.PHASE_A_END) / (TIMELINE.PHASE_B_END - TIMELINE.PHASE_A_END)
      : isFullBloom ? 1 : 0;

    for (let i = 0; i < ambientParticles.length; i++) {
      const p = ambientParticles[i];

      if (isAwaken) {
        // Giai đoạn A: Hạt trôi nhẹ tự do, nhấp nháy
        if (!prefersReducedMotion) {
          p.x += p.vx;
          p.y += p.vy;
        }

        // Nhấp nháy nhẹ nhàng
        const tw = Math.sin(elapsed * p.twinkleSpeed + p.twinklePhase) * 0.25;
        p.alpha = Math.max(0.15, Math.min(1, p.baseAlpha + tw));
      } else if (isConverge) {
        // Giai đoạn B: Hạt hội tụ theo đường cong xoáy vào tâm với độ lệch pha
        const delayedProgress = Math.max(0, Math.min(1, (convergeNorm - p.phaseDelay) / (1 - p.phaseDelay)));
        const easedP = easeInOutCubic(delayedProgress);

        // Bán kính xoáy co dần về targetDist
        const currentR = p.initialDist * (1 - easedP) + p.targetDist * easedP;
        // Góc quay xoáy tăng dần
        const currentA = p.initialAngle + p.targetAngleOffset * easedP * Math.PI;

        p.x = centerX + Math.cos(currentA) * currentR;
        p.y = centerY + Math.sin(currentA) * currentR;

        // Lưu vết lịch sử để vẽ vệt sáng mảnh khi tăng tốc về tâm
        p.history.push({ x: p.x, y: p.y });
        if (p.history.length > p.maxHistory) p.history.shift();

        // Độ sáng tăng khi hội tụ lại gần tâm
        p.alpha = Math.min(1, p.baseAlpha + easedP * 0.4);
      } else {
        // Giai đoạn C & D: Các hạt tiếp tục trôi xoay chậm theo trường năng lượng
        if (!prefersReducedMotion) {
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const currentR = Math.hypot(dx, dy) || 1;
          let currentA = Math.atan2(dy, dx);

          // Tốc độ góc chậm, hạt gần tâm xoay nhanh hơn hạt ở xa
          currentA += 0.003 * (maxRadius / Math.max(currentR, 40));
          p.x = centerX + Math.cos(currentA) * currentR;
          p.y = centerY + Math.sin(currentA) * currentR;
        }

        const tw = Math.sin(elapsed * p.twinkleSpeed + p.twinklePhase) * 0.22;
        p.alpha = Math.max(0.15, Math.min(0.85, p.baseAlpha + tw));
      }

      // Vẽ vệt sáng chuyển động nếu có lịch sử (chủ yếu trong giai đoạn B)
      if (p.history.length > 1 && isConverge) {
        ctx.beginPath();
        ctx.moveTo(p.history[0].x, p.history[0].y);
        for (let h = 1; h < p.history.length; h++) {
          ctx.lineTo(p.history[h].x, p.history[h].y);
        }
        ctx.strokeStyle = p.glow;
        ctx.lineWidth = p.size * 0.55;
        ctx.stroke();
      }

      // Vẽ hạt sáng
      ctx.save();
      if (!isMobile) {
        ctx.shadowBlur = 4;
        ctx.shadowColor = p.glow;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * 3. Vẽ một cánh hoa năng lượng dạng cong tham số hữu cơ (Translucent Energy Petal)
   */
  function drawCurvedEnergyPetal(angle, length, widthRatio, curlFactor, petalTheme, alpha, spineGlow, prebuiltGrad) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);

    const rBase = 12;
    const tipX = length;
    const tipY = curlFactor * length * 0.16;
    const maxWidth = length * widthRatio;

    // Đường cong Bezier tạo hình dáng cánh hoa mềm mại, viền cong tự nhiên
    const cp1x = rBase + length * 0.32;
    const cp1y = -maxWidth * 0.68;
    const cp2x = rBase + length * 0.76;
    const cp2y = -maxWidth * 0.62 + tipY * 0.5;

    const cp3x = rBase + length * 0.76;
    const cp3y = maxWidth * 0.62 + tipY * 0.5;
    const cp4x = rBase + length * 0.32;
    const cp4y = maxWidth * 0.68;

    ctx.beginPath();
    ctx.moveTo(rBase, 0);
    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, tipX, tipY);
    ctx.bezierCurveTo(cp3x, cp3y, cp4x, cp4y, rBase, 0);
    ctx.closePath();

    // Gradient thân cánh hoa: dùng prebuiltGrad nếu có để tránh cấp phát 16 lần/frame
    if (prebuiltGrad) {
      ctx.fillStyle = prebuiltGrad;
    } else {
      const grad = ctx.createLinearGradient(rBase, 0, tipX, tipY);
      grad.addColorStop(0.0, petalTheme.base);
      grad.addColorStop(0.38, petalTheme.mid);
      grad.addColorStop(0.78, petalTheme.edge);
      grad.addColorStop(1.0, petalTheme.tip);
      ctx.fillStyle = grad;
    }

    ctx.globalAlpha = alpha;
    ctx.fill();

    // Viền sáng cánh hoa (Luminous Rim Highlight)
    ctx.strokeStyle = petalTheme.rim;
    ctx.lineWidth = isMobile ? 1.0 : 1.4;
    ctx.stroke();

    // Sống gân sáng chạy dọc giữa cánh hoa (Luminous Spine)
    if (spineGlow > 0.1) {
      ctx.beginPath();
      ctx.moveTo(rBase + 6, 0);
      ctx.quadraticCurveTo(rBase + length * 0.52, tipY * 0.35, tipX - 5, tipY);
      ctx.strokeStyle = petalTheme.spine;
      ctx.lineWidth = isMobile ? 0.9 : 1.3;
      ctx.globalAlpha = alpha * spineGlow;
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * 4. Vẽ toàn bộ các tầng cánh hoa bung nở (Giai đoạn C & D)
   */
  function drawEnergyFlowerPetals(elapsed, phase) {
    if (phase === 'AWAKEN' || phase === 'CONVERGE') {
      return; // Cánh hoa chưa bung nở ở giai đoạn A và B
    }

    let bloomScale = 1.0;
    let bloomAlpha = 1.0;
    let unfurlRotation = 0;

    if (phase === 'BLOOM') {
      const p = (elapsed - TIMELINE.PHASE_B_END) / (TIMELINE.PHASE_C_END - TIMELINE.PHASE_B_END);
      bloomScale = easeOutCubic(p);
      bloomAlpha = Math.min(1, p * 1.35);
      unfurlRotation = (1 - bloomScale) * 0.45; // Xoay nhẹ khi hé mở
    } else {
      // Giai đoạn D: Thở nhịp nhàng
      const breathe = Math.sin(elapsed * 0.0016) * 0.024;
      bloomScale = 1.0 + breathe;
      bloomAlpha = 0.95 + Math.sin(elapsed * 0.0022) * 0.05;
    }

    // Bật chế độ hòa trộn Additive Lighter để cánh hoa phát sáng rực rỡ khi xếp chồng
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // A. TẦNG CÁNH HOA BÊN NGOÀI (8 cánh hoa lớn vươn xa, cong uyển chuyển)
    const outerPetalCount = 8;
    const outerPetalLength = maxRadius * bloomScale;
    const outerTheme = {
      base: 'rgba(255, 45, 135, 0.42)',
      mid: 'rgba(217, 38, 169, 0.30)',
      edge: 'rgba(168, 85, 247, 0.22)',
      tip: 'rgba(255, 200, 235, 0.45)',
      rim: 'rgba(255, 215, 240, 0.75)',
      spine: 'rgba(255, 245, 255, 0.85)',
    };

    // Tạo gradient một lần cho cả tầng cánh hoa ngoài
    const outerGrad = ctx.createLinearGradient(12, 0, outerPetalLength, 0);
    outerGrad.addColorStop(0.0, outerTheme.base);
    outerGrad.addColorStop(0.38, outerTheme.mid);
    outerGrad.addColorStop(0.78, outerTheme.edge);
    outerGrad.addColorStop(1.0, outerTheme.tip);

    for (let i = 0; i < outerPetalCount; i++) {
      const baseAngle = (i / outerPetalCount) * Math.PI * 2 + globalRotation + unfurlRotation;
      const curl = (i % 2 === 0 ? 1 : -1) * 0.85;
      const lengthJitter = 1.0 + (i % 2 === 0 ? 0.04 : -0.04);

      drawCurvedEnergyPetal(
        baseAngle,
        outerPetalLength * lengthJitter,
        0.36,
        curl,
        outerTheme,
        bloomAlpha * 0.82,
        0.85,
        outerGrad
      );
    }

    // B. TẦNG CÁNH HOA BÊN TRONG (8 cánh hoa nhụy sáng rực rỡ, so le 22.5 độ)
    const innerPetalCount = 8;
    const innerPetalLength = maxRadius * 0.58 * Math.min(1, bloomScale * 1.25);
    const innerTheme = {
      base: 'rgba(255, 255, 255, 0.65)',
      mid: 'rgba(255, 110, 180, 0.52)',
      edge: 'rgba(217, 70, 239, 0.38)',
      tip: 'rgba(255, 235, 245, 0.70)',
      rim: 'rgba(255, 255, 255, 0.90)',
      spine: 'rgba(255, 255, 255, 0.95)',
    };

    // Tạo gradient một lần cho cả tầng cánh hoa trong
    const innerGrad = ctx.createLinearGradient(12, 0, innerPetalLength, 0);
    innerGrad.addColorStop(0.0, innerTheme.base);
    innerGrad.addColorStop(0.38, innerTheme.mid);
    innerGrad.addColorStop(0.78, innerTheme.edge);
    innerGrad.addColorStop(1.0, innerTheme.tip);

    for (let j = 0; j < innerPetalCount; j++) {
      const baseAngle = (j / innerPetalCount) * Math.PI * 2 + (Math.PI / innerPetalCount) + globalRotation - unfurlRotation * 0.7;
      const curl = (j % 2 === 0 ? -1 : 1) * 0.6;

      drawCurvedEnergyPetal(
        baseAngle,
        innerPetalLength,
        0.42,
        curl,
        innerTheme,
        bloomAlpha * 0.92,
        0.95,
        innerGrad
      );
    }

    ctx.restore();
  }

  /**
   * 5. Vẽ các vòng quỹ đạo ánh sáng uốn lượn và các hạt chạy dọc quỹ đạo (Orbits)
   */
  function drawOrbitalLightRings(elapsed, phase) {
    if (!ctx) return;

    let ringAlpha = 0;
    let ringScale = 1.0;

    if (phase === 'AWAKEN') {
      return; // Chưa xuất hiện ở giai đoạn thức tỉnh
    } else if (phase === 'CONVERGE') {
      const p = (elapsed - TIMELINE.PHASE_A_END) / (TIMELINE.PHASE_B_END - TIMELINE.PHASE_A_END);
      ringAlpha = p * 0.55;
      ringScale = 0.7 + 0.3 * p;
    } else if (phase === 'BLOOM') {
      const p = (elapsed - TIMELINE.PHASE_B_END) / (TIMELINE.PHASE_C_END - TIMELINE.PHASE_B_END);
      ringAlpha = 0.55 + 0.45 * easeOutCubic(p);
      ringScale = 1.0;
    } else {
      ringAlpha = 0.95;
      ringScale = 1.0;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let k = 0; k < orbitalRings.length; k++) {
      const ring = orbitalRings[k];

      if (!prefersReducedMotion) {
        ring.currentRot += ring.speed;
      }

      const totalTilt = ring.tilt + globalRotation * 0.4 + ring.currentRot;
      const a = maxRadius * ring.aScale * ringScale;
      const b = a * ring.bScale;

      // Vẽ đường cong elip phát sáng mềm mại
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(totalTilt);

      ctx.beginPath();
      ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
      ctx.strokeStyle = ring.colorPrefix + (ringAlpha * 0.75).toFixed(3) + ')';
      ctx.lineWidth = isMobile ? ring.lineWidth * 0.8 : ring.lineWidth;
      ctx.stroke();

      // Vẽ các hạt sáng di chuyển dọc theo quỹ đạo
      for (let m = 0; m < ring.particles.length; m++) {
        const bead = ring.particles[m];
        if (!prefersReducedMotion) {
          bead.phi += bead.speed;
        }

        const bx = a * Math.cos(bead.phi);
        const by = b * Math.sin(bead.phi);

        ctx.beginPath();
        ctx.arc(bx, by, bead.size, 0, Math.PI * 2);
        ctx.fillStyle = bead.color;
        ctx.globalAlpha = ringAlpha * 0.9;
        ctx.fill();

        // Ngôi sao 4 cánh phát sáng nhẹ trên một số hạt đặc biệt
        if (bead.isSparkle && !isMobile) {
          ctx.beginPath();
          ctx.moveTo(bx - 5, by);
          ctx.lineTo(bx + 5, by);
          ctx.moveTo(bx, by - 5);
          ctx.lineTo(bx, by + 5);
          ctx.strokeStyle = 'rgba(255, 255, 255, ' + (ringAlpha * 0.75).toFixed(3) + ')';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 6. Cập nhật và vẽ các cánh hoa rời trôi bồng bềnh (Detached Petals with 3D Depth)
   */
  function drawDetachedFloatingPetals(elapsed, phase) {
    if (phase === 'AWAKEN' || phase === 'CONVERGE') {
      return; // Cánh hoa chỉ tách ra và trôi từ giai đoạn C trở đi
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < detachedPetals.length; i++) {
      const dp = detachedPetals[i];

      if (elapsed < dp.bloomAppearTime) continue;
      const appearProgress = Math.min(1, (elapsed - dp.bloomAppearTime) / 1800);

      // Cập nhật tọa độ trôi chậm theo hướng ly tâm
      if (!prefersReducedMotion) {
        dp.x += Math.cos(dp.driftAngle) * dp.driftSpeed;
        dp.y += Math.sin(dp.driftAngle) * dp.driftSpeed;
        dp.rotation += dp.rotSpeed;
      }

      // Giữ cánh hoa trong phạm vi màn hình mở rộng
      if (dp.x < -80) dp.x = width + 80;
      if (dp.x > width + 80) dp.x = -80;
      if (dp.y < -80) dp.y = height + 80;
      if (dp.y > height + 80) dp.y = -80;

      // Mô phỏng góc quay lộn 3D trong không gian bằng scaleY
      const wobble = Math.cos(elapsed * dp.wobbleSpeed + dp.wobblePhase);

      ctx.save();
      ctx.translate(dp.x, dp.y);
      ctx.rotate(dp.rotation);
      ctx.scale(1, wobble);

      // Vẽ cánh hoa rời mềm mại
      const pl = dp.length;
      const pw = dp.width;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(pl * 0.35, -pw, pl * 0.75, -pw * 0.7, pl, 0);
      ctx.bezierCurveTo(pl * 0.75, pw * 0.7, pl * 0.35, pw, 0, 0);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, pl, 0);
      grad.addColorStop(0, 'rgba(255, 90, 160, 0.75)');
      grad.addColorStop(0.5, 'rgba(217, 38, 169, 0.55)');
      grad.addColorStop(1, 'rgba(255, 210, 240, 0.85)');

      ctx.fillStyle = grad;
      ctx.globalAlpha = dp.alpha * appearProgress;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 230, 250, 0.7)';
      ctx.lineWidth = 0.9;
      ctx.stroke();

      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 7. Vẽ tâm sáng rực rỡ (Intense Radiant Core & Starburst Flares)
   */
  function drawIntenseCenterCore(elapsed, phase) {
    if (!ctx) return;

    let coreScale = 1.0;
    let coreBrightness = 1.0;

    if (phase === 'AWAKEN') {
      const p = elapsed / TIMELINE.PHASE_A_END;
      coreBrightness = p * 0.45;
      coreScale = 0.5 + 0.3 * p;
    } else if (phase === 'CONVERGE') {
      const p = (elapsed - TIMELINE.PHASE_A_END) / (TIMELINE.PHASE_B_END - TIMELINE.PHASE_A_END);
      coreBrightness = 0.45 + 0.55 * easeInOutQuad(p);
      coreScale = 0.8 + 0.4 * p;
    } else {
      // Bloom & Sustained
      const pulse = Math.sin(elapsed * 0.0035) * 0.08;
      coreBrightness = 1.0 + pulse;
      coreScale = 1.15 + pulse * 0.5;
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // A. Quầng sáng đa tầng rực rỡ (Multi-layer Radial Corona)
    const haloR = 48 * coreScale;
    const haloGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, haloR);
    haloGrad.addColorStop(0, `rgba(255, 255, 255, ${(1.0 * coreBrightness).toFixed(3)})`);
    haloGrad.addColorStop(0.18, `rgba(255, 244, 214, ${(0.92 * coreBrightness).toFixed(3)})`);
    haloGrad.addColorStop(0.42, `rgba(255, 95, 175, ${(0.65 * coreBrightness).toFixed(3)})`);
    haloGrad.addColorStop(0.72, `rgba(184, 114, 255, ${(0.28 * coreBrightness).toFixed(3)})`);
    haloGrad.addColorStop(1, 'rgba(5, 2, 12, 0)');

    ctx.beginPath();
    ctx.arc(centerX, centerY, haloR, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();

    // B. Các hạt năng lượng xoáy nhanh tại nhụy hoa
    for (let j = 0; j < coreParticles.length; j++) {
      const cp = coreParticles[j];
      if (!prefersReducedMotion) {
        cp.angle += cp.speed;
        cp.r += cp.radialSpeed;
        if (cp.r < 3) cp.radialSpeed = Math.abs(cp.radialSpeed);
        if (cp.r > 38) cp.radialSpeed = -Math.abs(cp.radialSpeed);
      }

      const cpx = centerX + Math.cos(cp.angle + globalRotation * 2) * cp.r * coreScale;
      const cpy = centerY + Math.sin(cp.angle + globalRotation * 2) * cp.r * coreScale;

      ctx.beginPath();
      ctx.arc(cpx, cpy, cp.size * coreScale, 0, Math.PI * 2);
      ctx.fillStyle = cp.color;
      ctx.globalAlpha = Math.min(1, cp.alpha * coreBrightness);
      ctx.fill();
    }

    // C. Tia sáng chữ thập / Anamorphic Flare lấp lánh ở tâm
    if (coreBrightness > 0.6) {
      const flareLen = (isMobile ? 65 : 110) * coreScale;
      const flareWidth = isMobile ? 2.5 : 3.8;

      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(globalRotation * 0.5);

      // Tia ngang chính
      const flareGradH = ctx.createLinearGradient(-flareLen, 0, flareLen, 0);
      flareGradH.addColorStop(0, 'rgba(255, 255, 255, 0)');
      flareGradH.addColorStop(0.5, `rgba(255, 255, 255, ${(0.95 * coreBrightness).toFixed(3)})`);
      flareGradH.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(-flareLen, 0);
      ctx.lineTo(0, -flareWidth);
      ctx.lineTo(flareLen, 0);
      ctx.lineTo(0, flareWidth);
      ctx.closePath();
      ctx.fillStyle = flareGradH;
      ctx.fill();

      // Tia dọc chính
      ctx.beginPath();
      ctx.moveTo(0, -flareLen * 0.7);
      ctx.lineTo(-flareWidth * 0.7, 0);
      ctx.lineTo(0, flareLen * 0.7);
      ctx.lineTo(flareWidth * 0.7, 0);
      ctx.closePath();
      ctx.fillStyle = flareGradH;
      ctx.fill();

      ctx.restore();
    }

    // D. Điểm sáng chói lõi trung tâm
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5 * coreScale, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 1.0;
    ctx.fill();

    ctx.restore();
  }

  /**
   * 8. Vẽ hiệu ứng nổ bung ly tâm khi chuyển cảnh (Centrifugal Explosion)
   */
  function drawCentrifugalExplosion() {
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    let activeCount = 0;
    for (let i = 0; i < explosionElements.length; i++) {
      const ep = explosionElements[i];
      if (ep.alpha > 0.01) {
        activeCount++;
        ep.x += ep.vx;
        ep.y += ep.vy;
        ep.vx *= 0.96;
        ep.vy *= 0.96;
        ep.alpha -= ep.fadeSpeed;

        ctx.beginPath();
        ctx.arc(ep.x, ep.y, ep.size, 0, Math.PI * 2);
        ctx.fillStyle = ep.color;
        ctx.globalAlpha = Math.max(0, ep.alpha);
        ctx.fill();
      }
    }

    ctx.restore();

    if (activeCount === 0 && state === 'EXPLODING') {
      state = 'DONE';
      console.info('[FlowerCanvasModule] Vụ nổ hạt hoa neon ly tâm đã hoàn tất.');
      if (typeof onExplodeCompleteCallback === 'function') {
        onExplodeCompleteCallback();
        onExplodeCompleteCallback = null;
      }
    }
  }

  // ====================================================================
  // VÒNG LẶP ANIMATION CHÍNH (MAIN RENDER LOOP)
  // ====================================================================

  /**
   * Cập nhật và điều phối khung hình theo thời gian
   */
  function renderFrame(timestamp) {
    if (!isRunning) return;

    if (!isTabVisible) {
      // Dừng rAF khi tab bị ẩn để giải phóng 100% CPU/GPU trên điện thoại
      animationFrameId = null;
      return;
    }

    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    // Xóa toàn bộ canvas để chuẩn bị vẽ khung hình mới
    ctx.clearRect(0, 0, width, height);

    if (state === 'RUNNING') {
      // Xác định giai đoạn hiện tại theo thời gian trôi qua
      let currentPhase = 'AWAKEN';
      if (elapsed < TIMELINE.PHASE_A_END) {
        currentPhase = 'AWAKEN';
      } else if (elapsed < TIMELINE.PHASE_B_END) {
        currentPhase = 'CONVERGE';
      } else if (elapsed < TIMELINE.PHASE_C_END) {
        currentPhase = 'BLOOM';
      } else {
        currentPhase = 'SUSTAINED';
      }

      // Phát tín hiệu khi hoa trung tâm đã tạo hình hoàn tất 100%
      if (!hasTriggeredFormed && elapsed >= TIMELINE.PHASE_C_END) {
        hasTriggeredFormed = true;
        console.info('[FlowerCanvasModule] Đóa hoa hạt năng lượng trung tâm đã hoàn thành tạo hình 100%.');
        if (typeof onFormedCallback === 'function') {
          onFormedCallback();
        }
        if (typeof CustomEvent === 'function') {
          const evt = new CustomEvent('flower:formed', { bubbles: true });
          if (container) container.dispatchEvent(evt);
          if (typeof window !== 'undefined') window.dispatchEvent(evt);
        }
      }

      // Tự xoay chậm toàn bộ đóa hoa quanh tâm (~0.0012 rad/frame)
      if (!prefersReducedMotion) {
        globalRotation += 0.0012;
      }

      // 1. Quầng sáng tinh vân vũ trụ trung tâm
      drawCosmicCenterHaze(elapsed, currentPhase);

      // 2. Vòng quỹ đạo ánh sáng elip uốn lượn
      drawOrbitalLightRings(elapsed, currentPhase);

      // 3. Đóa hoa năng lượng bung nở các tầng cánh
      drawEnergyFlowerPetals(elapsed, currentPhase);

      // 4. Các cánh hoa rời trôi bồng bềnh
      drawDetachedFloatingPetals(elapsed, currentPhase);

      // 5. Hạt sáng không gian và vệt sáng hội tụ
      drawAmbientAndConvergingParticles(elapsed, currentPhase);

      // 6. Tâm sáng rực rỡ và tia hào quang
      drawIntenseCenterCore(elapsed, currentPhase);

    } else if (state === 'EXPLODING') {
      drawCentrifugalExplosion();
    }

    animationFrameId = requestAnimationFrame(renderFrame);
  }

  /**
   * Xử lý resize cửa sổ mượt mà có debounce
   */
  function handleResize() {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function () {
      setupScene();
    }, 150);
  }

  /**
   * Tạm dừng hoặc tiếp tục khi chuyển tab
   */
  function handleVisibilityChange() {
    isTabVisible = !document.hidden;
    if (isTabVisible) {
      if (isRunning && state !== 'DONE' && !animationFrameId) {
        animationFrameId = requestAnimationFrame(renderFrame);
      }
    } else {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }
  }

  /**
   * Kiểm tra thiết lập giảm chuyển động của người dùng
   */
  function checkReducedMotionPreference() {
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = motionMediaQuery.matches;
    motionMediaQuery.addEventListener('change', function (e) {
      prefersReducedMotion = e.matches;
    });
  }

  // ====================================================================
  // PUBLIC API CỦA MODULE FLOWER-CANVAS
  // ====================================================================
  const FlowerCanvasModule = {
    name: 'FlowerCanvasModule',
    isInitialized: false,

    /**
     * Khởi tạo đóa hoa năng lượng và hạt sáng
     * @param {HTMLElement} containerElement - Thẻ chứa #flower-canvas-layer
     * @returns {boolean} True nếu khởi tạo thành công
     */
    init: function (containerElement, onFormed) {
      container = containerElement || document.getElementById('flower-canvas-layer');
      if (!container) {
        console.error('[FlowerCanvasModule] Không tìm thấy container #flower-canvas-layer.');
        return false;
      }

      onFormedCallback = typeof onFormed === 'function' ? onFormed : null;
      hasTriggeredFormed = false;

      this.destroy();
      checkReducedMotionPreference();

      canvas = container.querySelector('#flower-canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'flower-canvas';
        canvas.className = 'flower-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        container.insertBefore(canvas, container.firstChild);
      }

      ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[FlowerCanvasModule] Không thể lấy 2D context của Canvas.');
        return false;
      }

      state = 'RUNNING';
      startTime = 0;
      globalRotation = 0;

      setupScene();

      window.addEventListener('resize', handleResize);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      isRunning = true;
      animationFrameId = requestAnimationFrame(renderFrame);

      this.isInitialized = true;
      console.info(
        `%c[FlowerCanvasModule] Đóa hoa năng lượng vũ trụ đã khởi tạo thành công (Kịch bản 4 giai đoạn A->B->C->D).`,
        'color: #ff2a85; font-weight: bold;'
      );
      return true;
    },

    /**
     * Kích hoạt hiệu ứng nổ bung hạt ly tâm (gắn với sự kiện chạm nút "Tiếp tục")
     * @param {Function} callback - Hàm gọi sau khi nổ hoàn tất
     */
    explode: function (callback) {
      if (state !== 'RUNNING') return;

      if (!isRunning) {
        isRunning = true;
        animationFrameId = requestAnimationFrame(renderFrame);
      }

      state = 'EXPLODING';
      onExplodeCompleteCallback = callback || null;
      explosionElements = [];

      // Chuyển toàn bộ hạt sáng, hạt nhụy và cánh hoa thành các hạt bay ly tâm
      const allParticles = [...ambientParticles, ...coreParticles];
      for (let i = 0; i < allParticles.length; i++) {
        const p = allParticles[i];
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const dist = Math.hypot(dx, dy) || 1;
        const speed = 7 + Math.random() * 16;

        explosionElements.push({
          x: p.x,
          y: p.y,
          vx: (dx / dist) * speed + (Math.random() - 0.5) * 4,
          vy: (dy / dist) * speed + (Math.random() - 0.5) * 4,
          size: p.size * 1.3,
          color: p.color,
          alpha: p.alpha || 0.8,
          fadeSpeed: 0.018 + Math.random() * 0.02,
        });
      }

      // Thêm các vụ nổ hào quang từ cánh hoa
      for (let k = 0; k < 60; k++) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * maxRadius;
        const speed = 8 + Math.random() * 15;

        explosionElements.push({
          x: centerX + Math.cos(angle) * r,
          y: centerY + Math.sin(angle) * r,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2.0 + Math.random() * 3.0,
          color: Math.random() < 0.5 ? '#ffffff' : '#ff4da6',
          alpha: 1.0,
          fadeSpeed: 0.02 + Math.random() * 0.02,
        });
      }

      console.info('[FlowerCanvasModule] Kích hoạt hiệu ứng phát nổ hạt ánh sáng ly tâm.');
    },

    /**
     * Tạm dừng render loop
     */
    pause: function () {
      if (!isRunning) return;
      isRunning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      console.info('[FlowerCanvasModule] Tạm dừng render loop hoa năng lượng.');
    },

    /**
     * Khôi phục render loop
     */
    resume: function () {
      if (isRunning || state === 'DONE') return;
      isRunning = true;
      animationFrameId = requestAnimationFrame(renderFrame);
      console.info('[FlowerCanvasModule] Khôi phục render loop hoa năng lượng.');
    },

    /**
     * Dọn dẹp tài nguyên
     */
    destroy: function () {
      isRunning = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
        resizeTimeout = null;
      }

      ambientParticles = [];
      orbitalRings = [];
      detachedPetals = [];
      coreParticles = [];
      explosionElements = [];

      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      state = 'RUNNING';
      this.isInitialized = false;
    },

    /**
     * Kiểm tra xem đóa hoa trung tâm đã hoàn thành tạo hình 100% chưa
     * @returns {boolean} True nếu hoa đã tạo hình xong
     */
    isFormed: function () {
      return hasTriggeredFormed;
    },

    /**
     * Trả về thông tin trạng thái hoạt động (phục vụ kiểm thử)
     */
    getStats: function () {
      return {
        isInitialized: this.isInitialized,
        isRunning: isRunning,
        isFormed: hasTriggeredFormed,
        state: state,
        ambientCount: ambientParticles.length,
        orbitalCount: orbitalRings.length,
        detachedPetalsCount: detachedPetals.length,
        coreCount: coreParticles.length,
        totalParticles: ambientParticles.length + coreParticles.length,
        maxRadius: maxRadius,
        centerX: centerX,
        centerY: centerY,
        globalRotation: globalRotation,
      };
    },
  };

  window.FlowerCanvasModule = FlowerCanvasModule;
})();
