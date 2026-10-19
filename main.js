/**
 * ====================================================================
 * WEBSITE CHÚC MỪNG 20/10 - JAVASCRIPT KHỞI TẠO NỀN TẢNG (TASK 02)
 * ====================================================================
 * Mục đích:
 * 1. Đảm bảo cấu trúc DOM đã sẵn sàng trước khi nạp tài nguyên.
 * 2. Xác thực sự tồn tại của 5 lớp container nền tảng theo kịch bản.
 * 3. Chuẩn bị đối tượng cấu hình và trạng thái ứng dụng cho các task sau.
 *
 * Lưu ý: TASK 02 không triển khai animation, thuật toán hạt, Three.js
 * hoặc logic mở phong thư (sẽ thực hiện tuần tự trong TASK 03 - 09).
 */

(function () {
  'use strict';

  // Bắt sớm tương tác người dùng nếu có tương tác trước khi DOM hoàn tất khởi tạo
  let earlyUserGestureDetected = false;
  function handleEarlyUserGesture() {
    earlyUserGestureDetected = true;
  }
  window.addEventListener('pointerdown', handleEarlyUserGesture, { capture: true, once: true, passive: true });
  window.addEventListener('click', handleEarlyUserGesture, { capture: true, once: true, passive: true });
  window.addEventListener('keydown', handleEarlyUserGesture, { capture: true, once: true, passive: true });

  /**
   * Đối tượng quản lý các phần tử DOM nền tảng
   */
  const AppDOM = {
    universeLayer: null,
    sphereLayer: null,
    flowerCanvasLayer: null,
    bloomLayer: null,
    endingLayer: null,
    uiLayer: null,
    startHint: null,
    cosmicCenterHint: null,
    cosmicPortalLayer: null,
    cosmicPortalCanvas: null,
    bgMusic: null,
  };

  /**
   * Cấu hình và trạng thái khởi tạo ban đầu của ứng dụng
   */
  const AppState = {
    isInitialized: false,
    currentPhase: 'BOOTSTRAP', // BOOTSTRAP -> FORMING -> HOLD -> SPREADING -> ENDING
  };

  /**
   * Danh sách ID của các container bắt buộc cần kiểm tra
   */
  const REQUIRED_CONTAINERS = [
    { id: 'universe-layer', name: 'Lớp 1: Nền vũ trụ (TASK 03)' },
    { id: 'sphere-layer', name: 'Lớp 2: Quả cầu 3D (TASK 04)' },
    { id: 'flower-canvas-layer', name: 'Lớp 3: Hoa hạt Canvas (TASK 05)' },
    { id: 'bloom-layer', name: 'Lớp 4: Hoa bung nở (TASK 06)' },
    { id: 'ending-layer', name: 'Lớp 5: Khung tranh & Phong thư (TASK 07-08)' },
  ];

  /**
   * Hàm kiểm tra tính toàn vẹn của các container trong DOM
   * @returns {boolean} True nếu tất cả container đều tồn tại
   */
  function verifyDOMStructure() {
    let allValid = true;
    const missingContainers = [];

    REQUIRED_CONTAINERS.forEach((item) => {
      const element = document.getElementById(item.id);
      if (!element) {
        allValid = false;
        missingContainers.push(item);
      }
    });

    if (!allValid) {
      console.error(
        '[20/10 App] Lỗi khởi tạo: Thiếu các container bắt buộc trong DOM:',
        missingContainers
      );
      return false;
    }

    AppDOM.universeLayer = document.getElementById('universe-layer');
    AppDOM.sphereLayer = document.getElementById('sphere-layer');
    AppDOM.flowerCanvasLayer = document.getElementById('flower-canvas-layer');
    AppDOM.bloomLayer = document.getElementById('bloom-layer');
    AppDOM.endingLayer = document.getElementById('ending-layer');
    AppDOM.uiLayer = document.getElementById('ui-layer');
    AppDOM.startHint = document.getElementById('start-hint');
    AppDOM.cosmicCenterHint = document.getElementById('cosmic-center-hint');
    AppDOM.cosmicPortalLayer = document.getElementById('cosmic-portal-layer');
    AppDOM.cosmicPortalCanvas = document.getElementById('cosmic-portal-canvas');
    AppDOM.bgMusic = document.getElementById('bg-music');

    return true;
  }

  /**
   * =========================================================================
   * QUẢN LÝ NHẠC NỀN DUY NHẤT CHO TOÀN BỘ VÒNG ĐỜI WEBSITE (TASK 09)
   * =========================================================================
   * - Chỉ dùng 1 phần tử <audio id="bg-music"> duy nhất.
   * - Tự động lặp lại (loop).
   * - Tuân thủ Autoplay Policy của trình duyệt: Bắt đầu phát ngay sau tương tác
   *   đầu tiên của người dùng (pointerdown, click, touchstart, keydown).
   * - Bắt Promise rejection để không gây gián đoạn các hiệu ứng/chức năng khác.
   * - Tuyệt đối không tạo mới audio, không reset currentTime và không pause()
   *   trong suốt quá trình chuyển cảnh: Hoa nở -> Lịch -> Quả cầu 3D -> Bức thư.
   */
  const BackgroundAudio = {
    audioElement: null,
    isPlaying: false,
    hasBoundListeners: false,
    _boundHandler: null,
    _autoplayTimer: null,

    init() {
      this.audioElement = AppDOM.bgMusic || document.getElementById('bg-music');
      if (this.audioElement) {
        this.audioElement.loop = true;
        this.audioElement.volume = 0.4; // Đặt âm lượng ban đầu 40% theo yêu cầu

        // Nếu trình duyệt đã phát trước đó
        if (!this.audioElement.paused && this.audioElement.currentTime > 0) {
          this.isPlaying = true;
          return;
        }

        this.audioElement.addEventListener('play', () => {
          this.isPlaying = true;
          this.removeInteractionListeners();
        });
      }

      // Luôn gắn sẵn các bộ lắng nghe tương tác đầu tiên làm cơ chế dự phòng
      this.setupInteractionListeners();

      // Thử phát nhạc sau 3 giây kể từ khi mở website theo yêu cầu
      this._autoplayTimer = setTimeout(() => {
        this.play(true);
      }, 3000);
    },

    setupInteractionListeners() {
      if (this.hasBoundListeners || this.isPlaying) return;
      this.hasBoundListeners = true;

      const self = this;
      this._boundHandler = function () {
        self.play(false);
      };

      const options = { capture: true, passive: true };
      window.addEventListener('pointerdown', this._boundHandler, options);
      window.addEventListener('touchstart', this._boundHandler, options);
      window.addEventListener('click', this._boundHandler, options);
      window.addEventListener('keydown', this._boundHandler, options);

      // Ưu tiên thao tác chạm vào bông hoa trung tâm đã có sẵn
      const flowerCanvas = document.getElementById('flower-canvas');
      if (flowerCanvas) {
        flowerCanvas.addEventListener('pointerdown', this._boundHandler, options);
        flowerCanvas.addEventListener('click', this._boundHandler, options);
      }
    },

    removeInteractionListeners() {
      if (this._autoplayTimer) {
        clearTimeout(this._autoplayTimer);
        this._autoplayTimer = null;
      }
      if (this._boundHandler) {
        const options = { capture: true, passive: true };
        window.removeEventListener('pointerdown', this._boundHandler, options);
        window.removeEventListener('touchstart', this._boundHandler, options);
        window.removeEventListener('click', this._boundHandler, options);
        window.removeEventListener('keydown', this._boundHandler, options);

        const flowerCanvas = document.getElementById('flower-canvas');
        if (flowerCanvas) {
          flowerCanvas.removeEventListener('pointerdown', this._boundHandler, options);
          flowerCanvas.removeEventListener('click', this._boundHandler, options);
        }

        this._boundHandler = null;
        this.hasBoundListeners = false;
      }
    },

    play(isAutoplayAttempt = false) {
      if (!this.audioElement) {
        this.audioElement = document.getElementById('bg-music');
      }
      if (!this.audioElement || this.isPlaying) return;

      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            this.removeInteractionListeners();
            if (isAutoplayAttempt) {
              console.info('[20/10 App] Autoplay thành công: Nhạc nền background.mp3 đã tự động phát ngay khi mở website!');
            } else {
              console.info('[20/10 App] Nhạc nền background.mp3 đã bắt đầu phát (loop: true) thành công sau tương tác!');
            }
          })
          .catch((error) => {
            // Trình duyệt chặn phát có tiếng theo Autoplay Policy
            // Ghi thông báo rõ ràng vào Console, không làm gián đoạn website
            if (isAutoplayAttempt) {
              console.warn(
                '[20/10 App] Trình duyệt chặn tự phát âm thanh có tiếng khi mở trang (' +
                (error && error.message ? error.message : error) +
                '). Nhạc sẽ tự động phát ngay ở lần chạm/nhấn màn hình đầu tiên của người dùng.'
              );
            } else {
              console.warn(
                '[20/10 App] Trình duyệt chưa cho phép phát âm thanh tự động, sẽ kích hoạt ở tương tác tiếp theo:',
                error && error.message ? error.message : error
              );
            }
            // Giữ lại interaction listeners để phát ngay khi có thao tác chạm
          });
      }
    },
  };

  /**
   * Khởi tạo bộ khung ứng dụng và các module nền tảng
   */
  function initApp() {
    console.info('[20/10 App] Bắt đầu khởi tạo bộ khung giao diện...');

    const isValid = verifyDOMStructure();
    if (!isValid) {
      return;
    }

    AppState.isInitialized = true;

    // TASK 09: Khởi tạo và kích hoạt lắng nghe nhạc nền xuyên suốt toàn bộ vòng đời
    BackgroundAudio.init();

    // TASK 03: Khởi tạo hiệu ứng nền vũ trụ nếu module đã sẵn sàng
    if (window.BgEffectsModule && AppDOM.universeLayer) {
      window.BgEffectsModule.init(AppDOM.universeLayer);
    }

    // TASK 04: Trì hoãn khởi tạo Quả cầu 3D Three.js cho tới giai đoạn SPHERE
    // để không lãng phí tài nguyên CPU/GPU và không chạy loop ngầm lúc hoa đang nở.

    // =========================================================================
    // QUẢN LÝ 3 GIAI ĐOẠN ĐỘC LẬP: FORMING -> HOLD (CHỜ CHẠM BẤT KỲ) -> SPREADING
    // =========================================================================
    AppState.currentPhase = 'FORMING';
    AppState.flowerFormed = false;
    document.body.classList.add('phase-forming');

    let hasTransitionedToSpreading = false;
    const holdEventOptions = { capture: true, passive: true };

    function setupHoldListeners() {
      window.addEventListener('pointerdown', handleScreenSkip, holdEventOptions);
      window.addEventListener('touchstart', handleScreenSkip, holdEventOptions);
      window.addEventListener('click', handleScreenSkip, holdEventOptions);
      window.addEventListener('keydown', handleKeySkip, holdEventOptions);
    }

    function cleanupHoldListeners() {
      window.removeEventListener('pointerdown', handleScreenSkip, holdEventOptions);
      window.removeEventListener('touchstart', handleScreenSkip, holdEventOptions);
      window.removeEventListener('click', handleScreenSkip, holdEventOptions);
      window.removeEventListener('keydown', handleKeySkip, holdEventOptions);
    }

    // Xử lý khi người dùng nhấn/chạm bất kỳ vị trí nào trên toàn màn hình sau khi hoa đã hiện đầy đủ
    function handleScreenSkip(e) {
      // 1. Kiểm tra điều kiện: chỉ cho phép chuyển tiếp sau khi hoa đã tạo hình hoàn tất 100%
      if (!AppState.flowerFormed || AppState.currentPhase !== 'HOLD') {
        console.info('[20/10 App] Hoa vẫn đang trong quá trình tạo hình, không chuyển giai đoạn sớm.');
        return;
      }

      // 2. Ngăn chuyển giai đoạn nhiều lần khi người dùng nhấn liên tục
      if (hasTransitionedToSpreading) {
        return;
      }

      console.info('[20/10 App] Đã nhận thao tác chạm/nhấn trên toàn màn hình sau khi hoa hoàn tất -> Chuyển sang hiệu ứng hoa lan tỏa (SPREADING).');
      transitionToSpreading();
    }

    function handleKeySkip(e) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        handleScreenSkip(e);
      }
    }

    // Chuyển sang Giai đoạn 3: Hoa lan tỏa ra khắp màn hình (SPREADING)
    function transitionToSpreading() {
      if (hasTransitionedToSpreading) return;
      hasTransitionedToSpreading = true;

      // Hủy bỏ lắng nghe sự kiện chạm màn hình ngay khi chuyển sang SPREADING
      cleanupHoldListeners();

      console.info('[20/10 App] Chuyển sang Giai đoạn 3: Hoa lan tỏa ra khắp màn hình (SPREADING).');
      AppState.currentPhase = 'SPREADING';
      document.body.classList.remove('phase-forming', 'phase-hold');
      document.body.classList.add('phase-spreading', 'phase-bloom');

      // Làm dịu nhẹ hoa hạt ở nền để hoa bung nở trào ra hòa hợp, không biến mất đột ngột
      if (AppDOM.flowerCanvasLayer) {
        AppDOM.flowerCanvasLayer.classList.add('softened');
      }

      // Khởi chạy hiệu ứng hoa lan tỏa
      if (window.FlowerBloomModule && AppDOM.bloomLayer) {
        let hasProcessedBloomComplete = false;
        window.FlowerBloomModule.startBloom(function onBloomComplete() {
          if (hasProcessedBloomComplete) return;
          hasProcessedBloomComplete = true;

          console.info('[20/10 App] Toàn màn hình đã được phủ kín bởi biển hoa 20/10 rực rỡ.');
          AppState.currentPhase = 'FULL_BLOOM_HOLD';

          // Khi hoa bung nở đã phủ kín toàn màn hình, tạm dừng FlowerCanvasModule ngầm bên dưới
          if (window.FlowerCanvasModule && typeof window.FlowerCanvasModule.pause === 'function') {
            window.FlowerCanvasModule.pause();
          }

          // Hiển thị chữ "Chạm vào để tiếp tục" nhỏ nhỏ, không khung ở giữa màn hình
          if (AppDOM.cosmicCenterHint) {
            AppDOM.cosmicCenterHint.classList.add('visible');
            AppDOM.cosmicCenterHint.removeAttribute('aria-hidden');
          }

          let hasTriggeredUserTap = false;
          function handleScreenTapToTransition(e) {
            if (hasTriggeredUserTap) return;
            if (AppState.currentPhase === 'FULL_BLOOM_HOLD') {
              hasTriggeredUserTap = true;
              if (autoTransitionTimer) {
                clearTimeout(autoTransitionTimer);
                autoTransitionTimer = null;
              }
              cleanupBloomHoldListeners();
              console.info('[20/10 App] Người dùng chạm bất kỳ trên màn hình -> Bắt đầu hiệu ứng chuyển tiếp ma thuật.');
              startCosmicTransition();
            }
          }

          function handleKeyToTransition(e) {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
              handleScreenTapToTransition(e);
            }
          }

          function cleanupBloomHoldListeners() {
            window.removeEventListener('pointerdown', handleScreenTapToTransition);
            window.removeEventListener('click', handleScreenTapToTransition);
            window.removeEventListener('keydown', handleKeyToTransition);
          }

          // Nhấn bất kỳ vị trí nào trên màn hình sẽ đến hiệu ứng chuyển tiếp
          window.addEventListener('pointerdown', handleScreenTapToTransition, { passive: true });
          window.addEventListener('click', handleScreenTapToTransition, { passive: true });
          window.addEventListener('keydown', handleKeyToTransition, { passive: true });

          // Hẹn giờ chuyển tự động dự phòng sau 5s nếu người dùng không tương tác
          let autoTransitionTimer = setTimeout(function () {
            if (AppState.currentPhase === 'FULL_BLOOM_HOLD' && !hasTriggeredUserTap) {
              hasTriggeredUserTap = true;
              cleanupBloomHoldListeners();
              console.info('[20/10 App] Hết thời gian chờ hoa -> Tự động kích hoạt chuyển tiếp ma thuật.');
              startCosmicTransition();
            }
          }, 5000);
        });
      }
    }

    // Callback khi Giai đoạn 1 (FORMING) hoàn tất thực sự từ FlowerCanvasModule
    function onFlowerFormed() {
      if (AppState.currentPhase !== 'FORMING' || AppState.flowerFormed) return;

      console.info('[20/10 App] Bông hoa trung tâm đã hoàn thành tạo hình 100% -> Chuyển sang Giai đoạn 2: HOLD (chờ người dùng chạm bất kỳ đâu trên màn hình để lan tỏa).');
      AppState.flowerFormed = true;
      AppState.currentPhase = 'HOLD';
      document.body.classList.remove('phase-forming');
      document.body.classList.add('phase-hold');

      // Đăng ký sự kiện lắng nghe chạm / click trên toàn bộ màn hình (bắt ở capture phase để không bị layer nào chặn)
      setupHoldListeners();
    }

    // GIAI ĐOẠN 1 (FORMING): Khởi tạo và chỉ chạy hiệu ứng các hạt sáng tạo hoa trung tâm
    if (window.FlowerCanvasModule && AppDOM.flowerCanvasLayer) {
      window.FlowerCanvasModule.init(AppDOM.flowerCanvasLayer, onFlowerFormed);
    }

    // Khởi tạo cấu trúc DOM của FlowerBloomModule nhưng CHƯA bung nở (chờ đến SPREADING)
    if (window.FlowerBloomModule && AppDOM.bloomLayer) {
      window.FlowerBloomModule.init(AppDOM.bloomLayer);
    }

    // =========================================================================
    // QUẢN LÝ CHUYỂN CẢNH PHÉP THUẬT: HOA CUỘN THÀNH VÒNG SÁNG TÍM HỒNG
    // =========================================================================
    let portalRafId = null;
    let hasStartedTransition = false;
    let hasCompletedCalendarReveal = false;

    // Hàm vẽ vòng sáng phép thuật và bụi sao trên Canvas chuyển cảnh
    function runCosmicPortalCanvasAnimation() {
      const portalLayer = AppDOM.cosmicPortalLayer;
      const canvas = AppDOM.cosmicPortalCanvas;
      if (!portalLayer || !canvas) return;

      portalLayer.style.display = 'block';
      portalLayer.classList.add('active');
      portalLayer.removeAttribute('aria-hidden');

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const isMobile = window.innerWidth < 768;
      const dpr = Math.min(isMobile ? 1.25 : 2, window.devicePixelRatio || 1);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);

      // Sinh danh sách cánh hoa nhỏ và hạt bụi sao lấp lánh rơi tự do từ trên xuống
      const petalCount = isMobile ? 26 : 85;
      const fallingPetals = [];
      const petalColors = [
        'rgba(255, 182, 217, 0.90)',
        'rgba(255, 133, 162, 0.92)',
        'rgba(247, 37, 133, 0.78)',
        'rgba(255, 214, 238, 0.88)',
        'rgba(255, 255, 255, 0.95)',
        'rgba(255, 209, 102, 0.82)',
        'rgba(181, 23, 158, 0.75)',
      ];

      for (let i = 0; i < petalCount; i++) {
        fallingPetals.push({
          x: Math.random() * width,
          y: Math.random() * (height * 0.75) - 40,
          speedY: 2.2 + Math.random() * 3.6,
          swayAmp: 25 + Math.random() * 40,
          swayFreq: 1.8 + Math.random() * 1.8,
          swayPhase: Math.random() * Math.PI * 2,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.05,
          radiusX: 4 + Math.random() * 6,
          radiusY: 7 + Math.random() * 10,
          color: petalColors[i % petalColors.length],
          alpha: 0.6 + Math.random() * 0.4,
          isSparkle: Math.random() < 0.35,
          sparkleSize: 1.2 + Math.random() * 2.2,
        });
      }

      const animStartTime = performance.now();
      const totalDuration = 2300;

      const renderPortalFrame = function (now) {
        const elapsed = now - animStartTime;
        if (elapsed > totalDuration) {
          ctx.clearRect(0, 0, width, height);
          finishPortalLayer();
          return;
        }

        ctx.clearRect(0, 0, width, height);

        // Hệ số mờ dần từ 1200ms đến 2300ms
        let overallAlpha = 1.0;
        if (elapsed > 1200) {
          overallAlpha = Math.max(0, 1.0 - (elapsed - 1200) / 1100);
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        const tSec = elapsed / 1000;

        for (let i = 0; i < fallingPetals.length; i++) {
          const p = fallingPetals[i];
          const currY = p.y + p.speedY * (tSec * 60) * (0.8 + (tSec * 0.45));
          const currX = p.x + Math.sin(tSec * p.swayFreq + p.swayPhase) * p.swayAmp;
          const currRot = p.rot + p.rotSpeed * (tSec * 60);

          if (currY >= -30 && currY <= height + 60 && currX >= -50 && currX <= width + 50) {
            ctx.save();
            ctx.translate(currX, currY);
            ctx.rotate(currRot);
            ctx.globalAlpha = p.alpha * overallAlpha;
            ctx.fillStyle = p.color;

            if (p.isSparkle) {
              // Hạt sao lấp lánh
              ctx.beginPath();
              ctx.arc(0, 0, p.sparkleSize, 0, Math.PI * 2);
              ctx.fill();
            } else {
              // Cánh hoa mềm rơi bay lượn
              ctx.beginPath();
              ctx.ellipse(0, 0, p.radiusX, p.radiusY, 0, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        }

        ctx.restore();
        portalRafId = requestAnimationFrame(renderPortalFrame);
      };

      portalRafId = requestAnimationFrame(renderPortalFrame);
    }

    function stopCosmicPortalCanvasAnimation() {
      if (portalRafId) {
        cancelAnimationFrame(portalRafId);
        portalRafId = null;
      }
      if (AppDOM.cosmicPortalCanvas) {
        const ctx = AppDOM.cosmicPortalCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, AppDOM.cosmicPortalCanvas.width, AppDOM.cosmicPortalCanvas.height);
        }
      }
    }

    // Bắt đầu chuyển cảnh ma thuật
    function startCosmicTransition() {
      if (hasStartedTransition) return;
      hasStartedTransition = true;
      AppState.currentPhase = 'TRANSITIONING';

      console.info('[20/10 App] Bắt đầu hiệu ứng rơi hoa tự do: Các đóa hoa tách rời, rơi tự do và bay lượn xuống dưới.');

      // Ẩn ngay dòng chữ gợi ý ở giữa màn hình một cách êm ái
      if (AppDOM.cosmicCenterHint) {
        AppDOM.cosmicCenterHint.classList.remove('visible');
        AppDOM.cosmicCenterHint.classList.add('hidden');
        AppDOM.cosmicCenterHint.setAttribute('aria-hidden', 'true');
      }

      // Chỉ kích hoạt khả năng chạm để tua nhanh sau 800ms khi hoa đã rơi rõ ràng,
      // tuyệt đối tránh việc sự kiện click của cùng lần chạm ban đầu kích hoạt tua nhanh sớm!
      const transitionStartTime = performance.now();
      let fastForwardCleanupTimer = null;

      function handleFastForward(e) {
        if (performance.now() - transitionStartTime < 800) return;
        if (AppState.currentPhase === 'TRANSITIONING' && !hasCompletedCalendarReveal) {
          window.removeEventListener('pointerdown', handleFastForward);
          window.removeEventListener('click', handleFastForward);
          window.removeEventListener('keydown', handleFastForwardKey);
          console.info('[20/10 App] Người dùng nhấn màn hình khi hoa đang rơi -> Hoàn tất chuyển cảnh ngay lập tức.');
          fastForwardTransition();
        }
      }

      function handleFastForwardKey(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          handleFastForward(e);
        }
      }

      setTimeout(function () {
        if (AppState.currentPhase === 'TRANSITIONING' && !hasCompletedCalendarReveal) {
          window.addEventListener('pointerdown', handleFastForward, { passive: true });
          window.addEventListener('click', handleFastForward, { passive: true });
          window.addEventListener('keydown', handleFastForwardKey, { passive: true });
        }
      }, 800);

      // Khởi chạy vẽ mưa cánh hoa lấp lánh trên canvas
      runCosmicPortalCanvasAnimation();

      // Kích hoạt hiệu ứng hoa rơi tự do trong FlowerBloomModule
      if (window.FlowerBloomModule && typeof window.FlowerBloomModule.transitionFreeFall === 'function') {
        window.FlowerBloomModule.transitionFreeFall(
          function onFlowersFallingRevealed() {
            // Khi hoa ở trên đã rơi và mờ dần hé lộ không gian trung tâm (~1350ms) -> Hiển thị Màn hình Lịch
            revealCalendarPhase();
          },
          function onFallingComplete() {
            // Khi toàn bộ hoa đã rơi khỏi đáy màn hình (~2450ms)
            finishPortalLayer();
          }
        );
      } else if (window.FlowerBloomModule && typeof window.FlowerBloomModule.transitionMagicPortal === 'function') {
        window.FlowerBloomModule.transitionMagicPortal(revealCalendarPhase, finishPortalLayer);
      } else {
        setTimeout(revealCalendarPhase, 1350);
        setTimeout(finishPortalLayer, 2450);
      }
    }

    // Tua nhanh chuyển cảnh khi chạm trong lúc đang rơi hoa
    function fastForwardTransition() {
      if (window.FlowerBloomModule) {
        if (typeof window.FlowerBloomModule.fastForwardFallingTransition === 'function') {
          window.FlowerBloomModule.fastForwardFallingTransition();
        } else if (typeof window.FlowerBloomModule.fastForwardPortalTransition === 'function') {
          window.FlowerBloomModule.fastForwardPortalTransition();
        }
      }
      revealCalendarPhase();
      finishPortalLayer();
    }

    function finishPortalLayer() {
      stopCosmicPortalCanvasAnimation();
      if (AppDOM.cosmicPortalLayer) {
        AppDOM.cosmicPortalLayer.classList.remove('active');
        AppDOM.cosmicPortalLayer.style.display = 'none';
      }
      if (AppDOM.bloomLayer) {
        AppDOM.bloomLayer.style.display = 'none';
      }
      // Dừng triệt để chu trình sustained motion và dọn dẹp các phần tử hoa DOM
      if (window.FlowerBloomModule && typeof window.FlowerBloomModule.stopSustainedMotion === 'function') {
        window.FlowerBloomModule.stopSustainedMotion();
      }
    }

    // Hiển thị Màn hình Lịch & Puzzle
    function revealCalendarPhase() {
      if (hasCompletedCalendarReveal) return;
      hasCompletedCalendarReveal = true;

      console.info('[20/10 App] Hoa rơi tự do đã hé lộ không gian. Hiển thị Màn hình Lịch & Tranh Puzzle.');

      // Tạm dừng và ẩn triệt để lớp hoa hạt sáng để giải phóng CPU/GPU
      if (window.FlowerCanvasModule && typeof window.FlowerCanvasModule.pause === 'function') {
        window.FlowerCanvasModule.pause();
      }
      if (AppDOM.flowerCanvasLayer) {
        AppDOM.flowerCanvasLayer.classList.add('fade-out');
        setTimeout(function () {
          if (AppDOM.flowerCanvasLayer) AppDOM.flowerCanvasLayer.style.display = 'none';
        }, 200);
      }

      // Kích hoạt Màn hình Lịch & Puzzle
      AppState.currentPhase = 'CALENDAR';
      if (AppDOM.endingLayer) {
        AppDOM.endingLayer.removeAttribute('aria-hidden');
        AppDOM.endingLayer.style.pointerEvents = 'auto';
      }

      // Khởi tạo trước (pre-init) Quả Cầu 3D trong nền để cây DOM sẵn sàng, sau đó pause ngay để không tốn GPU/CPU
      if (window.Sphere3DModule && AppDOM.sphereLayer && !window.Sphere3DModule.isInitialized) {
        window.Sphere3DModule.init(AppDOM.sphereLayer);
        if (typeof window.Sphere3DModule.pause === 'function') {
          window.Sphere3DModule.pause();
        }
      }

      let hasTransitionedToSphere = false;
      function transitionCalendarToSphere() {
        if (hasTransitionedToSphere) return;
        hasTransitionedToSphere = true;

        console.info('[20/10 App] Bắt đầu chuỗi chuyển cảnh mượt mà từ Lịch sang Quả Cầu 3D...');

        // 1. Kích hoạt ánh sáng hồng kem dịu và hạt lấp lánh làm cầu nối tinh tế
        const auraEl = document.getElementById('calendar-to-sphere-aura');
        if (auraEl) {
          auraEl.classList.remove('fading');
          auraEl.classList.add('active');
        }

        // 2. Kích hoạt renderLoop của Quả cầu 3D Three.js
        if (window.Sphere3DModule && AppDOM.sphereLayer) {
          if (!window.Sphere3DModule.isInitialized) {
            window.Sphere3DModule.init(AppDOM.sphereLayer);
          } else if (typeof window.Sphere3DModule.resume === 'function') {
            window.Sphere3DModule.resume();
          }
        }

        // 3. Giai đoạn Giao thoa (T = 220ms): Quả cầu 3D hiện dần từ tâm, phóng lớn nhẹ
        setTimeout(function () {
          AppState.currentPhase = 'SPHERE';

          if (AppDOM.sphereLayer) {
            AppDOM.sphereLayer.style.display = '';
            AppDOM.sphereLayer.classList.remove('fade-out', 'is-transitioning-out');
            AppDOM.sphereLayer.classList.add('active', 'is-entering');
            AppDOM.sphereLayer.setAttribute('aria-hidden', 'false');
            console.info('[20/10 App] Quả cầu 3D đang xuất hiện mềm mại từ tâm màn hình.');
          }

          const sphereActionBar = document.getElementById('sphere-action-bar');
          const openLetterBtn = document.getElementById('open-letter-btn');

          if (sphereActionBar && openLetterBtn) {
            setTimeout(function () {
              sphereActionBar.classList.add('visible');
              sphereActionBar.removeAttribute('aria-hidden');
            }, 750);

            let hasOpenedLetter = false;
            const handleTransitionToLetter = function () {
              if (hasOpenedLetter) return;
              hasOpenedLetter = true;

              console.info('[20/10 App] Bắt đầu chuyển cảnh mềm mại từ Quả Cầu 3D sang Phong Bì Thiệp 20/10...');

              // 1. Khóa nút bấm và cho thanh điều khiển thu nhỏ/mờ êm dịu
              openLetterBtn.disabled = true;
              sphereActionBar.classList.add('hiding');

              // 2. GIỮ NGUYÊN HOẠT ẢNH: Quả cầu 3D tiếp tục xoay êm ái, tuyệt đối KHÔNG pause() ngay lập tức
              if (window.Sphere3DModule && typeof window.Sphere3DModule.transitionOut === 'function') {
                window.Sphere3DModule.transitionOut(1.35);
              }

              // 3. Quả cầu từ từ thu nhỏ nhẹ và mờ dần bằng CSS transition mượt mà
              if (AppDOM.sphereLayer) {
                AppDOM.sphereLayer.classList.add('is-transitioning-out');
                AppDOM.sphereLayer.style.pointerEvents = 'none';
              }

              // 4. Kích hoạt quầng sáng hào quang mềm mại kết nối hai giai đoạn
              const auraEl = document.getElementById('sphere-to-letter-aura');
              if (auraEl) {
                auraEl.classList.add('glowing');
              }

              // 5. Giai đoạn Cross-fade (T = 320ms): Quả cầu đang mờ nhẹ (~65%), phong bì bắt đầu trượt vào
              setTimeout(function () {
                if (auraEl) {
                  auraEl.classList.remove('glowing');
                  auraEl.classList.add('fading');
                }

                AppState.currentPhase = 'LETTER';
                if (AppDOM.endingLayer) {
                  AppDOM.endingLayer.removeAttribute('aria-hidden');
                  AppDOM.endingLayer.style.pointerEvents = 'auto';
                }

                // Hiển thị phong bì với hiệu ứng xuất hiện từ từ (fade-in + trượt nhẹ từ dưới lên)
                if (window.LetterModule && typeof window.LetterModule.show === 'function') {
                  window.LetterModule.show({ entering: true });
                }
              }, 320);

              // 6. Giai đoạn Hoàn tất (T = 1050ms): Phong bì đã hiện trọn vẹn, quả cầu đã mờ hẳn
              // Lúc này mới pause Three.js để giải phóng tài nguyên CPU/GPU cho điện thoại
              setTimeout(function () {
                if (AppDOM.sphereLayer) {
                  AppDOM.sphereLayer.classList.remove('active', 'is-transitioning-out');
                  AppDOM.sphereLayer.setAttribute('aria-hidden', 'true');
                  AppDOM.sphereLayer.style.display = 'none';
                  AppDOM.sphereLayer.style.pointerEvents = '';
                }

                // Chỉ tạm dừng Three.js loop SAU KHI chuyển cảnh đã hoàn tất hoàn toàn
                if (window.Sphere3DModule && typeof window.Sphere3DModule.pause === 'function') {
                  window.Sphere3DModule.pause();
                }

                if (auraEl) {
                  auraEl.classList.remove('fading');
                }

                sphereActionBar.classList.remove('hiding', 'visible');
                sphereActionBar.setAttribute('aria-hidden', 'true');
                console.info('[20/10 App] Chuyển cảnh sang Phong Bì hoàn tất thành công.');
              }, 1050);
            };

            openLetterBtn.addEventListener('click', handleTransitionToLetter);
            openLetterBtn.addEventListener('keydown', function (e) {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTransitionToLetter();
              }
            });
          }
        }, 220);

        // 4. Giai đoạn Hoàn tất (T = 850ms): Lịch đã mờ hẳn, dọn dẹp lịch và làm mờ aura
        setTimeout(function () {
          const calendarScreen = document.getElementById('calendar-screen');
          if (calendarScreen) {
            calendarScreen.classList.remove('active', 'is-transitioning-out');
            calendarScreen.style.display = 'none';
            calendarScreen.setAttribute('aria-hidden', 'true');
          }

          if (AppDOM.endingLayer) {
            AppDOM.endingLayer.style.pointerEvents = 'none';
          }

          if (auraEl) {
            auraEl.classList.remove('active');
            auraEl.classList.add('fading');
          }

          if (AppDOM.sphereLayer) {
            AppDOM.sphereLayer.classList.remove('is-entering');
          }
          console.info('[20/10 App] Chuyển cảnh sang Quả Cầu 3D hoàn tất thành công.');
        }, 850);

        // 5. Tắt hoàn toàn aura sau khi đã fade-out (T = 1100ms)
        setTimeout(function () {
          if (auraEl) {
            auraEl.classList.remove('fading');
          }
        }, 1100);
      }

      if (window.CalendarModule && typeof window.CalendarModule.show === 'function') {
        window.CalendarModule.show(function onCalendarContinue() {
          transitionCalendarToSphere();
        });
      } else {
        transitionCalendarToSphere();
      }
    }

    // Khởi tạo Màn hình Lịch & Puzzle nếu module đã sẵn sàng
    if (window.CalendarModule && typeof window.CalendarModule.init === 'function') {
      window.CalendarModule.init();
    }

    // Khởi tạo Màn hình Thiệp Thư nếu module đã sẵn sàng
    if (window.LetterModule && typeof window.LetterModule.init === 'function') {
      window.LetterModule.init();
    }

    // Quản lý tạm dừng / khôi phục animation khi ẩn/hiện tab trên điện thoại và máy tính
    document.addEventListener('visibilitychange', function () {
      const isVisible = !document.hidden;
      if (isVisible) {
        if (AppState.currentPhase === 'FORMING' || AppState.currentPhase === 'HOLD') {
          if (window.FlowerCanvasModule && typeof window.FlowerCanvasModule.resume === 'function') {
            window.FlowerCanvasModule.resume();
          }
        } else if (AppState.currentPhase === 'SPHERE') {
          if (window.Sphere3DModule && typeof window.Sphere3DModule.resume === 'function') {
            window.Sphere3DModule.resume();
          }
        }
      } else {
        if (window.FlowerCanvasModule && typeof window.FlowerCanvasModule.pause === 'function') {
          window.FlowerCanvasModule.pause();
        }
        if (window.Sphere3DModule && typeof window.Sphere3DModule.pause === 'function') {
          window.Sphere3DModule.pause();
        }
      }
    });

    console.info(
      '%c[20/10 App] Bộ khung website đã sẵn sàng! Màn hình mở đầu là đóa hoa hạt 6 cánh trung tâm.',
      'color: #ff85a2; font-weight: bold;'
    );
  }

  // Đăng ký sự kiện khi DOM tải hoàn tất
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // Xuất biến toàn cục để phục vụ điều phối và kết nối các module ở các task sau
  window.__APP_20_10__ = {
    DOM: AppDOM,
    State: AppState,
    Audio: BackgroundAudio,
    Modules: {
      bgEffects: window.BgEffectsModule || null,
      sphere3D: window.Sphere3DModule || null,
      flowerCanvas: window.FlowerCanvasModule || null,
      bloom: window.FlowerBloomModule || null,
      calendar: window.CalendarModule || null,
      letter: window.LetterAndPuzzleModule || null,
    },
  };
})();
