/**
 * ====================================================================
 * MODULE: NỀN VŨ TRỤ, SAO LẤP LÁNH & SAO BĂNG (BG-EFFECTS.JS) - TASK 03
 * ====================================================================
 * Trách nhiệm kỹ thuật:
 * 1. Khởi tạo Canvas 2D nền vũ trụ với hỗ trợ độ phân giải cao (HiDPI / Retina).
 * 2. Vẽ bầu trời sao đa tầng (sao bụi, sao nhấp nháy, sao sáng có quầng).
 * 3. Vẽ hiệu ứng quầng sáng thiên hà / tinh vân tím hồng trung tâm (Cosmic Nebula & Galaxy Ring).
 * 4. Hiệu ứng sao băng rơi (shooting stars) với vệt sáng gradient mượt mà và góc chéo tự nhiên.
 * 5. Tự động điều chỉnh theo kích thước màn hình (Responsive Resize).
 * 6. Tối ưu hiệu năng: Tạm dừng khi ẩn tab (Page Visibility API), tôn trọng prefers-reduced-motion,
 *    không chặn tương tác chuột (pointer-events: none).
 */

(function () {
  'use strict';

  // Biến trạng thái nội bộ của module
  let canvas = null;
  let ctx = null;
  let container = null;
  let animationFrameId = null;
  let isRunning = false;
  let isTabVisible = true;
  let prefersReducedMotion = false;

  // Kích thước logic và kích thước pixel
  let width = 0;
  let height = 0;
  let dpr = 1;

  // Dữ liệu đối tượng đồ họa
  let stars = [];
  let shootingStars = [];
  let lastShootingStarTime = 0;
  let nextShootingStarInterval = 2000; // ms
  let resizeTimeout = null;

  /**
   * Cấu hình tham số đồ họa nền vũ trụ
   */
  const CONFIG = {
    // Mật độ sao trên mỗi 10,000 px² (thích ứng màn hình)
    starDensity: 0.85,
    maxStarsDesktop: 220,
    minStarsMobile: 80,

    // Màu sắc các ngôi sao (trắng, hồng nhạt, tím nhạt, vàng ấm)
    starColors: [
      'rgba(255, 255, 255, ',
      'rgba(255, 220, 235, ',
      'rgba(230, 210, 255, ',
      'rgba(255, 245, 215, ',
    ],

    // Khoảng thời gian xuất hiện sao băng (ms) - tần suất vừa phải, trang nhã
    shootingStarMinInterval: 1400,
    shootingStarMaxInterval: 3200,

    // Tốc độ và chiều dài vệt sao băng
    shootingStarSpeedMin: 8,
    shootingStarSpeedMax: 14,
    shootingStarLengthMin: 100,
    shootingStarLengthMax: 200,
  };

  /**
   * Khởi tạo danh sách các ngôi sao theo kích thước màn hình
   */
  function initStars() {
    stars = [];
    const area = (width * height) / 10000;
    let targetCount = Math.floor(area * CONFIG.starDensity);

    // Giới hạn số lượng sao theo ngưỡng an toàn hiệu năng
    if (width < 768) {
      targetCount = Math.max(35, Math.min(targetCount, 55));
    } else {
      targetCount = Math.max(120, Math.min(targetCount, CONFIG.maxStarsDesktop));
    }

    for (let i = 0; i < targetCount; i++) {
      // Phân chia tầng sao: 70% sao nhỏ, 24% sao vừa, 6% sao sáng đặc biệt
      const tierRand = Math.random();
      let radius = 0.6;
      let isHeroStar = false;

      if (tierRand > 0.94) {
        radius = 1.6 + Math.random() * 0.8; // Sao sáng có hào quang
        isHeroStar = true;
      } else if (tierRand > 0.7) {
        radius = 1.0 + Math.random() * 0.5; // Sao nhấp nháy trung bình
      } else {
        radius = 0.5 + Math.random() * 0.4; // Sao bụi sâu
      }

      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: radius,
        baseAlpha: 0.25 + Math.random() * 0.65,
        alpha: 0.5,
        twinkleSpeed: 0.008 + Math.random() * 0.025,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleAmp: 0.2 + Math.random() * 0.35,
        colorPrefix: CONFIG.starColors[Math.floor(Math.random() * CONFIG.starColors.length)],
        isHeroStar: isHeroStar,
      });
    }
  }

  // Biến luân chuyển vùng phát sinh sao băng (trái -> giữa -> phải)
  let nextSpawnZone = 0; // 0: Trái (0-35%), 1: Giữa (35-70%), 2: Phải (70-100%)

  /**
   * Tạo mới một sao băng xuất hiện ngẫu nhiên rải đều khắp bầu trời
   */
  function spawnShootingStar() {
    if (prefersReducedMotion) return;

    // Luân chuyển vùng phát sinh để đảm bảo sao băng xuất hiện đều cả bên trái, giữa và phải
    const zone = nextSpawnZone;
    nextSpawnZone = (nextSpawnZone + 1) % 3;

    let startX = 0;
    let startY = 0;
    let angle = 0;

    // 75% sao băng rơi chéo sang phải (~40°), 25% sao băng rơi chéo sang trái (~140°)
    const fallTowardsRight = Math.random() < 0.75;

    if (fallTowardsRight) {
      // Góc rơi chéo xuống bên phải: 35° đến 46°
      angle = (Math.PI / 180) * (36 + Math.random() * 10);

      if (zone === 0) {
        // Vùng TRÁI: Xuất phát từ góc trên bên trái hoặc mép trái
        if (Math.random() < 0.5) {
          startX = -30;
          startY = Math.random() * (height * 0.45);
        } else {
          startX = Math.random() * (width * 0.32);
          startY = -20;
        }
      } else if (zone === 1) {
        // Vùng GIỮA: Xuất phát từ phần trên trung tâm bầu trời
        startX = width * (0.28 + Math.random() * 0.38);
        startY = -20 + Math.random() * (height * 0.25);
      } else {
        // Vùng PHẢI: Xuất phát từ phần trên bên phải
        startX = width * (0.60 + Math.random() * 0.35);
        startY = -20 + Math.random() * (height * 0.25);
      }
    } else {
      // Góc rơi chéo xuống bên trái: 134° đến 145°
      angle = (Math.PI / 180) * (134 + Math.random() * 11);

      if (zone === 0) {
        startX = width * (0.25 + Math.random() * 0.3);
        startY = -20 + Math.random() * (height * 0.25);
      } else if (zone === 1) {
        startX = width * (0.45 + Math.random() * 0.3);
        startY = -20 + Math.random() * (height * 0.3);
      } else {
        if (Math.random() < 0.5) {
          startX = width + 30;
          startY = Math.random() * (height * 0.45);
        } else {
          startX = width * (0.7 + Math.random() * 0.25);
          startY = -20;
        }
      }
    }

    const speed = CONFIG.shootingStarSpeedMin + Math.random() * (CONFIG.shootingStarSpeedMax - CONFIG.shootingStarSpeedMin);
    const length = CONFIG.shootingStarLengthMin + Math.random() * (CONFIG.shootingStarLengthMax - CONFIG.shootingStarLengthMin);

    shootingStars.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: length,
      angle: angle,
      life: 0,
      maxLife: 70 + Math.floor(Math.random() * 35), // Vòng đời 70-105 frame (~1.2s - 1.75s)
      opacity: 0,
      size: 1.5 + Math.random() * 0.8,
    });
  }

  /**
   * Cập nhật kích thước Canvas theo kích thước thực của màn hình
   */
  function updateDimensions() {
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    width = rect.width || window.innerWidth;
    height = rect.height || window.innerHeight;

    // Giới hạn dpr tối đa là 1.25 trên mobile để tối ưu tốc độ render và giảm fillrate GPU
    const isMobile = width < 768;
    dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    initStars();
  }

  /**
   * Vẽ quầng sáng tinh vân tím hồng và quầng sáng thiên hà ở trung tâm
   * (Tái tạo không gian chiều sâu huyền bí phù hợp video demo)
   */
  function drawNebulaAndCenterGlow(time) {
    if (!ctx) return;

    const cx = width * 0.5;
    const cy = height * 0.5;
    const pulse = Math.sin(time * 0.0012) * 0.06;

    // 1. Quầng sáng tinh vân rộng mềm mại (Broad Cosmic Haze)
    const outerRadius = Math.max(width, height) * 0.55;
    const nebulaGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, outerRadius);
    nebulaGrad.addColorStop(0, 'rgba(155, 93, 229, ' + (0.09 + pulse) + ')');
    nebulaGrad.addColorStop(0.35, 'rgba(255, 77, 136, ' + (0.05 + pulse * 0.5) + ')');
    nebulaGrad.addColorStop(0.7, 'rgba(12, 6, 26, 0.03)');
    nebulaGrad.addColorStop(1, 'rgba(5, 2, 12, 0)');

    ctx.fillStyle = nebulaGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Quầng sáng elip trung tâm mô phỏng vòng sáng thiên hà (Galaxy Accretion Halo)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, 0.42); // Ép dẹp theo phương ngang tạo đĩa elip không gian

    const haloRadius = Math.min(width, height) * 0.42;
    const haloGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, haloRadius);
    haloGrad.addColorStop(0, 'rgba(255, 117, 151, ' + (0.16 + pulse) + ')');
    haloGrad.addColorStop(0.4, 'rgba(155, 93, 229, ' + (0.08 + pulse * 0.5) + ')');
    haloGrad.addColorStop(0.85, 'rgba(246, 211, 101, 0.02)');
    haloGrad.addColorStop(1, 'rgba(5, 2, 12, 0)');

    ctx.beginPath();
    ctx.arc(0, 0, haloRadius, 0, Math.PI * 2);
    ctx.fillStyle = haloGrad;
    ctx.fill();
    ctx.restore();
  }

  /**
   * Cập nhật và vẽ các ngôi sao lấp lánh
   */
  function drawStars(time) {
    if (!ctx) return;

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];

      // Tính toán độ sáng lấp lánh mềm mại
      let currentAlpha = star.baseAlpha;
      if (!prefersReducedMotion) {
        currentAlpha = star.baseAlpha + Math.sin(time * star.twinkleSpeed + star.twinklePhase) * star.twinkleAmp;
        currentAlpha = Math.max(0.08, Math.min(currentAlpha, 1));
      }

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fillStyle = star.colorPrefix + currentAlpha.toFixed(3) + ')';
      ctx.fill();

      // Nếu là sao sáng đặc biệt (Hero Star), vẽ thêm hào quang tỏa tia nhẹ
      if (star.isHeroStar && currentAlpha > 0.55) {
        const glowRadius = star.radius * 2.8;
        const glowGrad = ctx.createRadialGradient(star.x, star.y, star.radius * 0.3, star.x, star.y, glowRadius);
        glowGrad.addColorStop(0, star.colorPrefix + (currentAlpha * 0.4).toFixed(3) + ')');
        glowGrad.addColorStop(1, star.colorPrefix + '0)');

        ctx.beginPath();
        ctx.arc(star.x, star.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();
      }
    }
  }

  /**
   * Cập nhật và vẽ vệt sáng sao băng
   */
  function drawShootingStars() {
    if (!ctx || shootingStars.length === 0) return;

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i];
      ss.life++;

      // Hiệu ứng mờ dần (Fade in -> Cruise -> Fade out)
      const progress = ss.life / ss.maxLife;
      if (progress < 0.25) {
        ss.opacity = progress / 0.25;
      } else if (progress > 0.65) {
        ss.opacity = (1 - progress) / 0.35;
      } else {
        ss.opacity = 1;
      }
      ss.opacity = Math.max(0, Math.min(ss.opacity, 1));

      // Tọa độ đuôi vệt sáng
      const tailX = ss.x - Math.cos(ss.angle) * ss.length;
      const tailY = ss.y - Math.sin(ss.angle) * ss.length;

      // Vẽ vệt sáng gradient tuyến tính từ đầu sáng về đuôi trong suốt
      const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
      grad.addColorStop(0, 'rgba(255, 180, 205, 0)');
      grad.addColorStop(0.5, 'rgba(255, 117, 151, ' + (ss.opacity * 0.45).toFixed(3) + ')');
      grad.addColorStop(0.85, 'rgba(255, 230, 240, ' + (ss.opacity * 0.85).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(255, 255, 255, ' + ss.opacity.toFixed(3) + ')');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(ss.x, ss.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = ss.size;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Điểm sáng ở đầu sao băng với hiệu ứng hào quang lấp lánh
      const isMobile = width < 768;
      if (!isMobile) {
        ctx.save();
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(255, 133, 162, ' + (ss.opacity * 0.8).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, ss.size * 1.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (ss.opacity * 0.95).toFixed(3) + ')';
        ctx.fill();
        ctx.restore();
      } else {
        // Trên mobile: vẽ hào quang mềm 2 lớp thay vì shadowBlur đắt đỏ
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, ss.size * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 180, 205, ' + (ss.opacity * 0.35).toFixed(3) + ')';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ss.x, ss.y, ss.size * 1.1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (ss.opacity * 0.95).toFixed(3) + ')';
        ctx.fill();
      }

      // Di chuyển sao băng
      ss.x += ss.vx;
      ss.y += ss.vy;

      // Xóa sao băng khi hết vòng đời hoặc vượt khỏi vùng hiển thị (cả mép trái, phải, dưới)
      if (ss.life >= ss.maxLife || ss.x < -150 || ss.x > width + 150 || ss.y > height + 150) {
        shootingStars.splice(i, 1);
      }
    }
  }

  /**
   * Vòng lặp hoạt họa chính qua requestAnimationFrame
   */
  function renderLoop(currentTime) {
    if (!isRunning) return;

    // Nếu tab đang bị ẩn thì dừng rAF hoàn toàn để tiết kiệm tài nguyên
    if (!isTabVisible) {
      animationFrameId = null;
      return;
    }

    // Xóa khung hình trước để vẽ khung hình mới
    ctx.clearRect(0, 0, width, height);

    // 1. Vẽ quầng sáng tinh vân trung tâm
    drawNebulaAndCenterGlow(currentTime);

    // 2. Vẽ bầu trời sao lấp lánh
    drawStars(currentTime);

    // 3. Quản lý phát sinh sao băng theo chu kỳ ngẫu nhiên
    if (!prefersReducedMotion) {
      if (currentTime - lastShootingStarTime > nextShootingStarInterval) {
        spawnShootingStar();
        lastShootingStarTime = currentTime;
        nextShootingStarInterval =
          CONFIG.shootingStarMinInterval +
          Math.random() * (CONFIG.shootingStarMaxInterval - CONFIG.shootingStarMinInterval);
      }

      // 4. Vẽ các sao băng đang bay
      drawShootingStars();
    }

    animationFrameId = requestAnimationFrame(renderLoop);
  }

  /**
   * Lắng nghe và xử lý sự kiện đổi kích thước cửa sổ với debounce
   */
  function handleResize() {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(function () {
      updateDimensions();
    }, 150);
  }

  /**
   * Lắng nghe sự kiện chuyển đổi hiển thị tab trình duyệt
   */
  function handleVisibilityChange() {
    isTabVisible = !document.hidden;
    if (isTabVisible) {
      lastShootingStarTime = performance.now();
      if (isRunning && !animationFrameId) {
        animationFrameId = requestAnimationFrame(renderLoop);
      }
    } else {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }
  }

  /**
   * Kiểm tra thiết lập giảm chuyển động của hệ điều hành
   */
  function checkReducedMotionPreference() {
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = motionMediaQuery.matches;
    motionMediaQuery.addEventListener('change', function (e) {
      prefersReducedMotion = e.matches;
    });
  }

  // ====================================================================
  // PUBLIC API CỦA MODULE BG-EFFECTS
  // ====================================================================
  const BgEffectsModule = {
    name: 'BgEffectsModule',
    isInitialized: false,

    /**
     * Khởi tạo hiệu ứng nền vũ trụ
     * @param {HTMLElement} containerElement - Thẻ chứa #universe-layer
     */
    init: function (containerElement) {
      container = containerElement || document.getElementById('universe-layer');
      if (!container) {
        console.error('[BgEffectsModule] Không tìm thấy phần tử #universe-layer để gắn Canvas.');
        return false;
      }

      // Đảm bảo dừng vòng lặp cũ nếu đã từng khởi tạo trước đó
      this.destroy();

      checkReducedMotionPreference();

      // Tìm hoặc tạo mới Canvas trong container
      canvas = container.querySelector('#universe-canvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'universe-canvas';
        canvas.className = 'universe-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        container.appendChild(canvas);
      }

      ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('[BgEffectsModule] Không thể lấy 2D Context của Canvas.');
        return false;
      }

      // Cập nhật kích thước & khởi tạo các đối tượng sao
      updateDimensions();

      // Đăng ký các sự kiện theo dõi cửa sổ và tab
      window.addEventListener('resize', handleResize);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Bắt đầu vòng lặp hoạt họa 60 FPS
      isRunning = true;
      lastShootingStarTime = performance.now();
      animationFrameId = requestAnimationFrame(renderLoop);

      this.isInitialized = true;
      console.info('[BgEffectsModule] Đã khởi tạo thành công nền vũ trụ sao rơi & thiên hà.');
      return true;
    },

    /**
     * Dọn dẹp tài nguyên và dừng render loop
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

      shootingStars = [];
      stars = [];

      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      this.isInitialized = false;
      console.info('[BgEffectsModule] Đã dừng và giải phóng tài nguyên nền vũ trụ.');
    },

    /**
     * Trả về số lượng sao hiện tại (phục vụ kiểm thử)
     */
    getStats: function () {
      return {
        starCount: stars.length,
        shootingStarCount: shootingStars.length,
        isRunning: isRunning,
        width: width,
        height: height,
        dpr: dpr,
      };
    },
  };

  // Đăng ký module vào không gian tên ứng dụng
  window.BgEffectsModule = BgEffectsModule;
})();
