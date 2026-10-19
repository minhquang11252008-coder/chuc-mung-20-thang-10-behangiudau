/**
 * ====================================================================
 * MODULE: GIAO DIỆN PHONG BÌ 3D & THIỆP CHÚC MỪNG TƯƠNG TÁC (LETTER.JS)
 * Phong cách: Fantasy Romantic, Vũ trụ tím đen, Ánh sáng hồng lavender
 * ====================================================================
 * Quản lý chính xác 3 trạng thái và 2 lần nhấp tuần tự theo ảnh tham chiếu:
 *   1. Trạng thái 1 (closed - State A):
 *      - Phong bì đóng kín nằm CHÍNH GIỮA màn hình
 *      - Không có tờ thư nhô lên
 *      - Quỹ đạo ánh sáng cosmic quay quanh phong bì
 *      - Dòng hướng dẫn: "Nhấn vào phong bì để mở thư ♡" nằm bên dưới, không đè phong bì
 *   2. Nhấp lần 1 (opened-partially - State B):
 *      - Nắp tam giác phong bì mở ra bằng hoạt ảnh 3D tự nhiên
 *      - Con dấu sáp phát sáng nhẹ rồi mờ dần
 *      - Tấm thiệp trượt lên nhưng CHỈ LỘ PHẦN TIÊU ĐỀ: "Happy / Women's Day" + flourish trái tim ♡
 *      - Phần còn lại của bức thư vẫn ở trong phong bì, che bởi mặt trước
 *      - Dòng hướng dẫn đổi thành: "Nhấn vào lá thư để mở ♡"
 *      - DỪNG LẠI CHỜ NGƯỜI DÙNG NHẤP TIẾP LẦN 2 (Không tự động mở tiếp)
 *   3. Nhấp lần 2 (letter-revealed - State C):
 *      - Tờ thư tiếp tục vươn lên thành trang thư dài hoàn chỉnh
 *      - Tâm lá thư nằm ở vị trí trung tâm màn hình, đủ cao để đọc rõ
 *      - Phong bì lùi nhẹ phía sau và thấp hơn tờ thư
 *      - Ẩn hoàn toàn dòng hướng dẫn để không bao giờ đè lên nội dung
 *      - Hiển thị đầy đủ: tiêu đề, ảnh chân dung cô gái khung đứng, cụm hoa, bướm tím phát sáng
 *      - Bắt đầu gõ nội dung bức thư (Typewriter Effect), chữ ký và nút đọc lại
 */

(function () {
  'use strict';

  // Tham chiếu các phần tử DOM
  let letterScreenEl = null;
  let envelopeSceneContainerEl = null;
  let envelopePromptEl = null;
  let envelopePromptTextEl = null;
  let envelopeWrapperEl = null;
  let envelopeFlapEl = null;
  let waxSealEl = null;
  let letterCardEl = null;
  let closeBtn = null;
  let bodyTextEl = null;
  let typingCursorEl = null;
  let signatureAreaEl = null;
  let signatureNameEl = null;
  let replayBtn = null;
  let actionsFooterEl = null;
  let particlesContainerEl = null;
  let greetingTextEl = null;

  let currentState = 'closed';
  let isAnimating = false;
  let isTyping = false;
  let typewriterTimeout = null;

  /**
   * Cấu hình nội dung bức thư chúc mừng 20/10
   * Lời chúc chân thành, tình cảm chuẩn theo ảnh tham chiếu
   */
  const LETTER_CONFIG = {
    title: "Mừng ngày 20/10 bé Hằng iu của anh ❤️",
    greeting: '',
    body: `Anh chúc bé Hằng iu của anh nhân ngày 20/10 lúc nào cùng xinh đẹp rực rỡ, may mắn, nhiều sức khỏe và nhiều tiền lúc nào cũng vui vẻ. Anh mong rằng em sẽ đồng hành cùng anh trên chặng đường phía trước.\n\nCảm ơn em vì tất cả ❤️❤️\n\nAnh yêu lắm bé iu của anh`,
    signature: '',
    typingSpeed: 26,
  };

  const LetterModule = {
    name: 'LetterModule',
    isInitialized: false,

    /**
     * Khởi tạo các phần tử DOM và đăng ký sự kiện tương tác
     */
    init: function () {
      letterScreenEl = document.getElementById('letter-screen');
      envelopeSceneContainerEl = document.getElementById('letter-scene-container');
      envelopePromptEl = document.getElementById('envelope-prompt');
      envelopePromptTextEl = document.getElementById('envelope-prompt-text');
      envelopeWrapperEl = document.getElementById('envelope-wrapper');
      envelopeFlapEl = document.getElementById('envelope-flap');
      waxSealEl = document.getElementById('wax-seal');
      letterCardEl = document.getElementById('letter-card');
      closeBtn = document.getElementById('letter-close-btn');
      bodyTextEl = document.getElementById('letter-body-text');
      typingCursorEl = document.getElementById('typing-cursor');
      signatureAreaEl = document.getElementById('letter-signature-area');
      signatureNameEl = document.getElementById('letter-signature-name');
      replayBtn = document.getElementById('letter-replay-btn');
      actionsFooterEl = document.getElementById('letter-actions-footer');
      particlesContainerEl = document.getElementById('letter-particles');
      greetingTextEl = document.querySelector('.letter-greeting-text');

      if (!letterScreenEl || !envelopeWrapperEl || !letterCardEl) {
        console.warn('[LetterModule] Không tìm thấy các phần tử DOM cần thiết cho phong thư.');
        return false;
      }

      // Khởi tạo chữ ký và dọn sạch chữ trước khi mở thư
      if (greetingTextEl) {
        greetingTextEl.textContent = '';
      }
      if (signatureNameEl) {
        signatureNameEl.textContent = LETTER_CONFIG.signature;
      }

      // Bộ điều hướng tương tác click theo đúng thứ tự 2 lần nhấp
      const handleSceneInteraction = (e) => {
        if (e) e.stopPropagation();

        if (isAnimating) {
          console.debug('[LetterModule] Đang chạy animation, bỏ qua thao tác nhấp chuột dồn dập.');
          return;
        }

        if (currentState === 'closed') {
          // Nhấp lần 1: Mở nắp phong bì và hé lộ phần đầu thiệp
          this.openFlapAndPeek();
        } else if (currentState === 'opened-partially') {
          // Nhấp lần 2: Rút toàn bộ lá thư lên chiếm chính giữa màn hình
          this.revealFullLetter();
        }
      };

      // 1. Nhấp vào con dấu sáp
      if (waxSealEl) {
        waxSealEl.addEventListener('click', handleSceneInteraction);
        waxSealEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSceneInteraction(e);
          }
        });
      }

      // 2. Nhấp vào phong bì
      envelopeWrapperEl.addEventListener('click', handleSceneInteraction);
      envelopeWrapperEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSceneInteraction(e);
        }
      });

      // 3. Nhấp vào dòng chữ hướng dẫn
      if (envelopePromptEl) {
        envelopePromptEl.addEventListener('click', handleSceneInteraction);
      }

      // 4. Nhấp vào tấm thiệp
      letterCardEl.addEventListener('click', (e) => {
        if (currentState === 'closed') {
          e.stopPropagation();
          this.openFlapAndPeek();
        } else if (currentState === 'opened-partially') {
          e.stopPropagation();
          this.revealFullLetter();
        }
        // Ở trạng thái 'letter-revealed', click vào nội dung thư không đóng thư (cho phép đọc, cuộn, tương tác)
      });

      // 5. Nút đóng thiệp (Trạng thái mở -> thu nhỏ về phong bì)
      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeCard();
        });
      }

      // 6. Nút "Đọc lại thư ↺"
      if (replayBtn) {
        replayBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.replay();
        });
      }

      // 7. Phím tắt ESC để đóng thư về phong bì khi đang mở toàn bộ
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && currentState === 'letter-revealed') {
          this.closeCard();
        }
      });

      // Khởi tạo các hạt sáng và cánh hoa bồng bềnh
      this.initFloatingParticles();

      this.isInitialized = true;
      console.info('[LetterModule] Đã khởi tạo thành công giao diện phong bì và thiệp 20/10 với 2 lần nhấp tuần tự.');
      return true;
    },

    /**
     * Kích hoạt hiển thị màn hình thư (Bắt đầu với Trạng thái 1: Phong bì đóng kín chính giữa màn hình)
     * @param {Object} [options] - Tuỳ chọn hiển thị ({ entering: true } để kích hoạt chuyển cảnh mềm mại)
     */
    show: function (options) {
      if (!letterScreenEl) return;

      console.info('[LetterModule] Hiển thị Giai đoạn cuối: Trạng thái 1 (closed) - Phong bì đóng kín chính giữa màn hình.');
      letterScreenEl.classList.remove('fade-out');
      letterScreenEl.classList.add('active');
      letterScreenEl.removeAttribute('aria-hidden');

      if (options && options.entering) {
        letterScreenEl.classList.add('entering');
        setTimeout(() => {
          if (letterScreenEl) {
            letterScreenEl.classList.remove('entering');
          }
        }, 1100);
      }

      // Đặt về Trạng thái 1 chuẩn: phong bì đóng kín, nắp đậy, con dấu hoa ở giữa
      this.resetToClosed();

      // Tự động focus vào phong bì để hỗ trợ bàn phím
      setTimeout(() => {
        if (waxSealEl) {
          waxSealEl.focus();
        } else if (envelopeWrapperEl) {
          envelopeWrapperEl.focus();
        }
      }, 400);
    },

    /**
     * Đặt lại về Trạng thái 1: Phong bì đóng kín chính giữa màn hình
     */
    resetToClosed: function () {
      currentState = 'closed';
      isAnimating = false;

      this.clearFloatingAvatars();

      if (typewriterTimeout) {
        clearTimeout(typewriterTimeout);
        typewriterTimeout = null;
      }
      isTyping = false;

      if (greetingTextEl) {
        greetingTextEl.textContent = '';
      }

      if (bodyTextEl) {
        bodyTextEl.textContent = '';
      }

      if (typingCursorEl) {
        typingCursorEl.classList.remove('done');
      }

      if (signatureAreaEl) {
        signatureAreaEl.classList.remove('visible');
      }

      if (actionsFooterEl) {
        actionsFooterEl.classList.remove('visible');
      }

      if (letterScreenEl) {
        letterScreenEl.classList.remove('state-2', 'state-3');
        letterScreenEl.classList.add('state-1');
      }

      if (envelopeWrapperEl) {
        envelopeWrapperEl.classList.remove('is-reading-active', 'is-open', 'flap-behind');
      }

      if (waxSealEl) {
        waxSealEl.classList.remove('is-glowing', 'is-clicked');
      }

      if (letterCardEl) {
        letterCardEl.classList.remove('is-reading', 'is-peeking', 'is-ready-to-read');
        letterCardEl.scrollTop = 0;
        letterCardEl.style.opacity = '0';
        letterCardEl.style.visibility = 'hidden';
        letterCardEl.style.pointerEvents = 'none';
        letterCardEl.style.transform = '';
      }

      if (envelopePromptTextEl) {
        envelopePromptTextEl.textContent = 'Nhấn vào phong bì để mở thư ♡';
      }
      if (envelopePromptEl) {
        envelopePromptEl.classList.remove('is-hidden');
      }
    },

    /** Alias tương thích ngược */
    resetToPeeking: function () {
      this.resetToClosed();
    },

    /**
     * NHẤP LẦN 1: MỞ NẮP PHONG BÌ & HÉ LỘ PHẦN ĐẦU TỜ THƯ (State 1 -> State 2)
     * - Nắp tam giác mở ra bằng hoạt ảnh xoay gập 3D tự nhiên
     * - Con dấu phát sáng nhẹ rồi mờ dần
     * - Tấm thiệp bên trong bắt đầu trượt lên nhưng CHỈ LỘ PHẦN TIÊU ĐỀ:
     *   "Happy / Women's Day" + flourish trái tim
     * - Phần còn lại của lá thư vẫn ở trong phong bì, chưa hiển thị toàn bộ
     * - Dòng hướng dẫn đổi thành: "Nhấn vào lá thư để mở ♡"
     * - DỪNG Ở TRẠNG THÁI NÀY ĐỂ NGƯỜI DÙNG NHẤP TIẾP (Không chạy tiếp sang State 3)
     */
    openFlapAndPeek: function () {
      if (isAnimating || currentState !== 'closed') return;
      isAnimating = true;

      console.info('[LetterModule] Nhấp lần 1: Mở nắp phong bì và hé lộ tiêu đề lá thư.');

      // Bước 1: Con dấu phát sáng nhẹ
      if (waxSealEl) {
        waxSealEl.classList.add('is-glowing');
      }

      // Bước 2: Nắp phong bì mở ra bằng hoạt ảnh xoay gập 3D
      setTimeout(() => {
        if (envelopeWrapperEl) {
          envelopeWrapperEl.classList.add('is-open');
        }
      }, 250);

      // Bước 3: Nắp lật qua 90 độ, chuyển nắp ra sau và thiệp nhô lên ở trạng thái .is-peeking
      setTimeout(() => {
        if (envelopeWrapperEl) {
          envelopeWrapperEl.classList.add('flap-behind');
        }
        if (waxSealEl) {
          waxSealEl.classList.add('is-clicked');
        }
        if (letterCardEl) {
          letterCardEl.classList.remove('is-reading');
          letterCardEl.classList.add('is-peeking');
          letterCardEl.style.opacity = '1';
          letterCardEl.style.visibility = 'visible';
          letterCardEl.style.pointerEvents = 'auto';
        }
        if (letterScreenEl) {
          letterScreenEl.classList.remove('state-1');
          letterScreenEl.classList.add('state-2');
        }
        if (envelopePromptTextEl) {
          envelopePromptTextEl.textContent = 'Nhấn vào lá thư để mở ♡';
        }
      }, 550);

      // Bước 4: Ổn định ở Trạng thái 2, DỪNG LẠI CHỜ NHẤP LẦN 2
      setTimeout(() => {
        currentState = 'opened-partially';
        isAnimating = false;
        console.info('[LetterModule] Đã dừng ở Trạng thái 2 (opened-partially). Chờ người dùng nhấp lần 2.');
      }, 1050);
    },

    /**
     * NHẤP LẦN 2: RÚT TOÀN BỘ LÁ THƯ LÊN CHÍNH GIỮA MÀN HÌNH (State 2 -> State 3)
     * - Khi nhấp vào tờ giấy hoặc vùng thư đang lộ ra, tờ giấy tiếp tục trượt lên khỏi phong bì
     * - Toàn bộ lá thư xuất hiện với bố cục đầy đủ: tiêu đề, ảnh chân dung khung chữ nhật đứng, nội dung, chữ ký
     * - Phong bì nằm phía sau và thấp hơn tờ thư
     * - Tờ thư dừng ở vị trí trung tâm, đủ cao để đọc rõ
     * - Ẩn hoàn toàn dòng hướng dẫn mở thư, không bao giờ đè lên nội dung
     * - Bắt đầu gõ chữ nội dung thư
     */
    revealFullLetter: function () {
      if (isAnimating || currentState !== 'opened-partially') return;
      isAnimating = true;

      console.info('[LetterModule] Nhấp lần 2: Rút toàn bộ lá thư lên chiếm vị trí trung tâm.');

      // Dọn sạch hiệu ứng avatar cũ (nếu có) trước khi bắt đầu
      this.clearFloatingAvatars();

      // Bước 1: Ẩn hoàn toàn dòng hướng dẫn
      if (envelopePromptEl) {
        envelopePromptEl.classList.add('is-hidden');
      }

      // Xoá sạch chữ ngay lập tức để không có chữ nào bị lộ trong chuyển động trượt lên
      if (greetingTextEl) {
        greetingTextEl.textContent = '';
      }
      if (bodyTextEl) {
        bodyTextEl.textContent = '';
      }
      if (typingCursorEl) {
        typingCursorEl.classList.remove('done');
        typingCursorEl.style.opacity = '0';
      }
      if (signatureAreaEl) {
        signatureAreaEl.classList.remove('visible');
      }
      if (actionsFooterEl) {
        actionsFooterEl.classList.remove('visible');
      }

      // Bước 2: Tờ thư vươn lên thành trang thư lớn (.is-reading), phong bì dịch lùi xuống thấp (.is-reading-active)
      if (letterCardEl) {
        letterCardEl.classList.remove('is-ready-to-read');
        letterCardEl.classList.remove('is-peeking');
        letterCardEl.classList.add('is-reading');
        letterCardEl.scrollTop = 0;
      }
      if (envelopeWrapperEl) {
        envelopeWrapperEl.classList.add('is-reading-active');
      }
      if (letterScreenEl) {
        letterScreenEl.classList.remove('state-2');
        letterScreenEl.classList.add('state-3');
      }

      // Bước 3: Lá thư ổn định tại trung tâm màn hình, mở khóa thao tác và bắt đầu gõ chữ
      setTimeout(() => {
        currentState = 'letter-revealed';
        isAnimating = false;

        if (letterCardEl) {
          letterCardEl.classList.add('is-ready-to-read');
        }

        // Cho khoảng nghỉ ngắn 180ms để lời chào hiện trang nhã rồi bắt đầu gõ chữ
        setTimeout(() => {
          this.startTypewriter(LETTER_CONFIG.body);
        }, 180);

        console.info('[LetterModule] Đã hoàn thành Nhấp lần 2: Tờ thư ở vị trí trung tâm, bắt đầu gõ lời chúc.');
      }, 900);
    },

    /** Alias tương thích ngược cho hàm openCard */
    openCard: function () {
      if (currentState === 'closed') {
        this.openFlapAndPeek();
      } else if (currentState === 'opened-partially') {
        this.revealFullLetter();
      }
    },

    /**
     * Thu nhỏ thiệp trở lại phong bì (Đóng về State 1)
     */
    closeCard: function () {
      if (isAnimating || currentState === 'closed') return;
      isAnimating = true;

      console.info('[LetterModule] Thu nhỏ thiệp về phong bì (Đóng về State 1).');

      // Hủy bỏ hiệu ứng avatar bay ngang và bộ đếm thời gian
      this.clearFloatingAvatars();

      if (typewriterTimeout) {
        clearTimeout(typewriterTimeout);
        typewriterTimeout = null;
      }
      isTyping = false;

      // Xoá nội dung và ẩn ngay để không còn chữ thừa
      if (greetingTextEl) {
        greetingTextEl.textContent = '';
      }
      if (bodyTextEl) {
        bodyTextEl.textContent = '';
      }
      if (typingCursorEl) {
        typingCursorEl.classList.remove('done');
      }
      if (signatureAreaEl) {
        signatureAreaEl.classList.remove('visible');
      }
      if (actionsFooterEl) {
        actionsFooterEl.classList.remove('visible');
      }

      // Bước 1: Thu nhỏ thiệp trượt xuống lại
      if (letterCardEl) {
        letterCardEl.classList.remove('is-ready-to-read');
        letterCardEl.classList.remove('is-reading');
        letterCardEl.classList.add('is-peeking');
        letterCardEl.scrollTop = 0;
      }

      // Bước 2: Phong bì trở về trung tâm
      setTimeout(() => {
        if (envelopeWrapperEl) {
          envelopeWrapperEl.classList.remove('is-reading-active');
        }
        if (letterScreenEl) {
          letterScreenEl.classList.remove('state-2', 'state-3');
          letterScreenEl.classList.add('state-1');
        }
      }, 300);

      // Bước 3: Tấm thiệp rút hẳn vào lòng phong bì và nắp gập đóng lại
      setTimeout(() => {
        if (letterCardEl) {
          letterCardEl.classList.remove('is-peeking');
          letterCardEl.style.opacity = '0';
          letterCardEl.style.visibility = 'hidden';
          letterCardEl.style.pointerEvents = 'none';
          letterCardEl.style.transform = '';
        }
        if (envelopeWrapperEl) {
          envelopeWrapperEl.classList.remove('flap-behind');
          envelopeWrapperEl.classList.remove('is-open');
        }
        if (waxSealEl) {
          waxSealEl.classList.remove('is-glowing', 'is-clicked');
        }
      }, 650);

      // Bước 4: Hoàn thành khôi phục về Trạng thái 1
      setTimeout(() => {
        currentState = 'closed';
        isAnimating = false;
        if (envelopePromptTextEl) {
          envelopePromptTextEl.textContent = 'Nhấn vào phong bì để mở thư ♡';
        }
        if (envelopePromptEl) {
          envelopePromptEl.classList.remove('is-hidden');
        }
      }, 1150);
    },

    /**
     * Vô hiệu hóa và dọn sạch hiệu ứng avatar bay ngang (đã xóa theo yêu cầu của Owner)
     */
    clearFloatingAvatars: function () {
      // Đã xóa hiệu ứng theo yêu cầu của Owner
    },

    triggerFloatingAvatars: function () {
      // Đã xóa hiệu ứng theo yêu cầu của Owner
    },

    /**
     * Hiệu ứng máy đánh chữ (Typewriter Effect) 2 giai đoạn kèm tự động cuộn thông minh
     * - Giai đoạn 1: Gõ dòng lời chào "Gửi Din Din 💕,"
     * - Khi lời chào hoàn tất: Kích hoạt hiệu ứng 3 avatar bay ngang màn hình
     * - Giai đoạn 2: Tiếp tục gõ phần thân thư chúc mừng trong khi avatar bay qua
     * @param {string} text - Nội dung lời chúc
     */
    startTypewriter: function (text) {
      if (!bodyTextEl) return;

      if (typewriterTimeout) {
        clearTimeout(typewriterTimeout);
        typewriterTimeout = null;
      }

      isTyping = true;
      bodyTextEl.textContent = '';
      if (greetingTextEl) {
        greetingTextEl.textContent = '';
      }

      if (typingCursorEl) {
        typingCursorEl.classList.remove('done');
        typingCursorEl.style.opacity = '1';
      }

      if (signatureAreaEl) {
        signatureAreaEl.classList.remove('visible');
      }

      if (actionsFooterEl) {
        actionsFooterEl.classList.remove('visible');
      }

      // Đảm bảo bắt đầu gõ từ đỉnh thư
      if (letterCardEl) {
        letterCardEl.scrollTop = 0;
      }

      const greetingChars = Array.from(LETTER_CONFIG.greeting || '');
      const bodyChars = Array.from(text || LETTER_CONFIG.body);
      let greetingIndex = 0;
      let bodyIndex = 0;
      let lastScrollTime = 0;

      /**
       * Tự động cuộn xuống mượt mà khi dòng chữ mới gần chạm đáy
       * Kích hoạt khi con trỏ cách đáy vùng hiển thị dưới 55px (tương đương khoảng 1 dòng trống)
       */
      const checkAndAutoScroll = (force = false) => {
        if (!letterCardEl || !typingCursorEl) return;

        const now = performance.now();
        // Không kích hoạt quá dày đặc sau mỗi ký tự để tránh giật hình
        if (!force && (now - lastScrollTime < 180)) return;

        const cardRect = letterCardEl.getBoundingClientRect();
        const cursorRect = typingCursorEl.getBoundingClientRect();

        // Ngưỡng: khi con trỏ cách mép đáy dưới 55px
        const bottomThreshold = cardRect.bottom - 55;

        if (cursorRect.bottom > bottomThreshold) {
          const delta = (cursorRect.bottom - bottomThreshold) + 32;
          lastScrollTime = now;
          letterCardEl.scrollBy({
            top: delta,
            behavior: 'smooth'
          });
        }
      };

      // Giai đoạn 2: Gõ phần thân thư kèm auto-scroll
      const typeNextBodyChar = () => {
        if (bodyIndex < bodyChars.length) {
          bodyTextEl.textContent += bodyChars[bodyIndex];
          bodyIndex++;

          const char = bodyChars[bodyIndex - 1];
          let delay = LETTER_CONFIG.typingSpeed;

          if (char === '.' || char === '!' || char === '?') {
            delay += 140;
          } else if (char === ',' || char === '–') {
            delay += 60;
          } else if (char === '\n') {
            delay += 120;
          }

          // Kiểm tra và cuộn xuống mượt mà tại các dấu cách hoặc ngắt câu
          if (char === ' ' || char === '\n' || char === '.' || char === ',' || bodyIndex % 8 === 0) {
            checkAndAutoScroll();
          }

          typewriterTimeout = setTimeout(typeNextBodyChar, delay);
        } else {
          isTyping = false;
          console.info('[LetterModule] Đã hoàn thành gõ chữ nội dung thư chúc mừng 20/10.');

          // Ẩn con trỏ gõ chữ sau một nhịp
          setTimeout(() => {
            if (typingCursorEl) {
              typingCursorEl.classList.add('done');
            }
          }, 700);

          // Hiển thị chữ ký (nếu có)
          if (LETTER_CONFIG.signature && signatureAreaEl) {
            setTimeout(() => {
              signatureAreaEl.classList.add('visible');
              if (letterCardEl) {
                letterCardEl.scrollBy({
                  top: 80,
                  behavior: 'smooth'
                });
              }
            }, 350);
          }

          // Hiển thị nút đọc lại thư (Replay)
          setTimeout(() => {
            if (actionsFooterEl) {
              actionsFooterEl.classList.add('visible');
            }
          }, 600);
        }
      };

      // Giai đoạn 1: Gõ dòng lời chào (nếu có)
      const typeNextGreetingChar = () => {
        if (greetingChars.length === 0) {
          typeNextBodyChar();
          return;
        }
        if (greetingIndex < greetingChars.length) {
          if (greetingTextEl) {
            greetingTextEl.textContent += greetingChars[greetingIndex];
          }
          greetingIndex++;

          // Khi dòng lời chào đã hiển thị đầy đủ, tiếp tục gõ phần thân thư
          if (greetingIndex >= greetingChars.length) {
            typewriterTimeout = setTimeout(typeNextBodyChar, 220);
          } else {
            typewriterTimeout = setTimeout(typeNextGreetingChar, LETTER_CONFIG.typingSpeed + 12);
          }
        }
      };

      typeNextGreetingChar();
    },

    /**
     * Chạy lại hiệu ứng gõ chữ khi người dùng nhấn "Đọc lại thư ↺"
     */
    replay: function () {
      if (isAnimating || currentState !== 'letter-revealed') return;
      console.info('[LetterModule] Đọc lại bức thư.');

      // Dừng việc gõ chữ hiện tại (nếu đang chạy)
      if (typewriterTimeout) {
        clearTimeout(typewriterTimeout);
        typewriterTimeout = null;
      }
      isTyping = false;

      // Dọn sạch hiệu ứng avatar cũ để chuẩn bị chạy lại sau khi dòng người nhận gõ xong
      this.clearFloatingAvatars();

      if (greetingTextEl) {
        greetingTextEl.textContent = '';
      }
      if (bodyTextEl) {
        bodyTextEl.textContent = '';
      }
      if (signatureAreaEl) {
        signatureAreaEl.classList.remove('visible');
      }
      if (actionsFooterEl) {
        actionsFooterEl.classList.remove('visible');
      }
      if (typingCursorEl) {
        typingCursorEl.classList.remove('done');
        typingCursorEl.style.opacity = '1';
      }

      // Cuộn mượt về đầu trang thư
      if (letterCardEl) {
        letterCardEl.scrollTo({ top: 0, behavior: 'smooth' });
      }

      // Chờ cuộn lên đầu êm ái (350ms) rồi bắt đầu gõ lại
      setTimeout(() => {
        this.startTypewriter(LETTER_CONFIG.body);
      }, 350);
    },

    /**
     * Khởi tạo hệ thống hạt sáng & cánh hoa bay nhẹ nhàng quanh màn hình
     * Giới hạn số lượng hạt hợp lý (mobile: 10, desktop: 16) để tối ưu hiệu năng
     */
    initFloatingParticles: function () {
      if (!particlesContainerEl) return;
      particlesContainerEl.innerHTML = '';

      const items = [
        { type: 'petal', char: '' },
        { type: 'heart', char: '🌸' },
        { type: 'petal', char: '' },
        { type: 'sparkle', char: '✨' },
        { type: 'petal', char: '' },
        { type: 'sparkle', char: '✦' },
        { type: 'petal', char: '' },
      ];

      const isMobile = window.innerWidth <= 640;
      const TOTAL_PARTICLES = isMobile ? 10 : 16;

      for (let i = 0; i < TOTAL_PARTICLES; i++) {
        const itemConfig = items[i % items.length];
        const span = document.createElement('span');
        span.className = `letter-floating-item item-${itemConfig.type}`;

        if (itemConfig.type !== 'petal') {
          span.textContent = itemConfig.char;
        }

        const left = Math.floor(Math.random() * 92) + 4;
        const top = Math.floor(Math.random() * 84) + 8;
        const delay = (Math.random() * 6).toFixed(2);
        const duration = (7.5 + Math.random() * 5).toFixed(2);

        span.style.left = `${left}%`;
        span.style.top = `${top}%`;
        span.style.animationDelay = `${delay}s`;
        span.style.animationDuration = `${duration}s`;

        particlesContainerEl.appendChild(span);
      }
    },

    /**
     * Cung cấp hàm cập nhật nội dung thư khi cần thay thế
     */
    updateContent: function (options) {
      if (!options) return;

      if (options.title) {
        LETTER_CONFIG.title = options.title;
      }

      if (options.greeting) {
        LETTER_CONFIG.greeting = options.greeting;
        const greetingEl = document.querySelector('.letter-greeting-text');
        if (greetingEl) greetingEl.textContent = options.greeting;
      }

      if (options.body) {
        LETTER_CONFIG.body = options.body;
      }

      if (options.signature) {
        LETTER_CONFIG.signature = options.signature;
        if (signatureNameEl) signatureNameEl.textContent = options.signature;
      }
    },
  };

  // Đăng ký module vào phạm vi toàn cục
  window.LetterModule = LetterModule;
  window.LetterAndPuzzleModule = LetterModule;
})();
