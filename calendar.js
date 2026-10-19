/**
 * ====================================================================
 * MODULE: MÀN HÌNH LỊCH 20/10 FANTASY & LỜI CHÚC NGHỆ THUẬT (CALENDAR.JS)
 * ====================================================================
 * Quản lý:
 * 1. Khu vực lời chúc 20/10 tiếng Anh thư pháp nghệ thuật bên trái.
 * 2. Tờ lịch ma thuật lơ lửng màu hồng pastel/kem trong suốt bên phải.
 * 3. Hiệu ứng khoanh tròn nét hồng phát sáng tinh tế quanh số 20/10.
 * 4. Điều phối chuyển cảnh và kích hoạt nút Tiếp tục sang Quả cầu 3D.
 */

(function () {
  'use strict';

  let screenEl = null;
  let wishAreaEl = null;
  let day20El = null;
  let circlePathEl = null;
  let continueBtn = null;
  let onContinueCallback = null;
  let hasContinued = false;

  const CalendarModule = {
    name: 'CalendarModule',
    isInitialized: false,

    /**
     * Khởi tạo các phần tử DOM của màn hình Lịch và Lời chúc
     */
    init: function () {
      screenEl = document.getElementById('calendar-screen');
      wishAreaEl = document.getElementById('calendar-wish-area');
      day20El = document.getElementById('calendar-day-20');
      continueBtn = document.getElementById('calendar-continue-btn');

      if (!screenEl || !day20El || !continueBtn) {
        console.warn('[CalendarModule] Không tìm thấy đầy đủ các phần tử DOM của lịch trong trang.');
        return false;
      }

      // 1. Tính toán độ dài path nét vẽ khoanh tròn số 20
      circlePathEl = day20El.querySelector('.day-circle-path');
      if (circlePathEl && typeof circlePathEl.getTotalLength === 'function') {
        try {
          const pathLen = Math.ceil(circlePathEl.getTotalLength()) || 105;
          circlePathEl.style.strokeDasharray = `${pathLen}`;
          circlePathEl.style.strokeDashoffset = `${pathLen}`;
        } catch (e) {
          circlePathEl.style.strokeDasharray = '105';
          circlePathEl.style.strokeDashoffset = '105';
        }
      }

      // 2. Đăng ký sự kiện nhấn nút Tiếp tục (hỗ trợ cả click, touch và bàn phím)
      const onBtnPress = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        this.handleContinueClick();
      };

      continueBtn.addEventListener('click', onBtnPress);
      continueBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onBtnPress(e);
        }
      });

      this.isInitialized = true;
      console.info('[CalendarModule] Đã khởi tạo thành công module Lịch Fantasy & Lời chúc 20/10.');
      return true;
    },

    /**
     * Hiển thị màn hình lịch và kích hoạt chuỗi hiệu ứng
     * @param {Function} onComplete - Callback khi người dùng nhấn nút Tiếp tục
     */
    show: function (onComplete) {
      if (!this.isInitialized) {
        this.init();
      }

      if (!screenEl) {
        console.error('[CalendarModule] Container #calendar-screen không tồn tại.');
        if (typeof onComplete === 'function') onComplete();
        return;
      }

      onContinueCallback = onComplete;
      hasContinued = false;

      // Đặt lại các trạng thái ban đầu của ngày 20
      day20El.classList.remove('drawing', 'marked');
      if (circlePathEl) {
        const pathLen = circlePathEl.style.strokeDasharray || '105';
        circlePathEl.style.strokeDashoffset = pathLen;
      }

      screenEl.style.display = 'flex';
      screenEl.classList.remove('fade-out', 'is-transitioning-out');
      screenEl.removeAttribute('aria-hidden');

      // 1. Màn hình xuất hiện mượt mà cùng lời chúc nghệ thuật bên trái
      requestAnimationFrame(() => {
        screenEl.classList.add('active');
        console.info('[CalendarModule] Màn hình Lịch và Lời chúc 20/10 xuất hiện.');

        // HIỂN THỊ NÚT "TIẾP TỤC" NGAY LẬP TỨC KHI GIAO DIỆN HIỆN XONG
        continueBtn.disabled = false;
        continueBtn.style.pointerEvents = 'auto';
        continueBtn.classList.add('visible');
        continueBtn.removeAttribute('aria-hidden');
        console.info('[CalendarModule] Nút "Tiếp tục" đã sẵn sàng ngay lập tức.');
      });

      // 2. Hiệu ứng vẽ nét khoanh tròn ngày 20 chạy đồng thời
      setTimeout(() => {
        if (hasContinued) return;
        day20El.classList.add('drawing');
        if (circlePathEl) {
          circlePathEl.style.strokeDashoffset = '0';
        }

        setTimeout(() => {
          if (hasContinued) return;
          day20El.classList.add('marked');
          console.info('[CalendarModule] Ngày 20/10 đã khoanh tròn và phát sáng nhẹ nhàng.');
        }, 500);
      }, 200);
    },

    /**
     * Xử lý khi người dùng nhấn nút Tiếp tục - Kích hoạt chuyển cảnh mượt sang Quả Cầu 3D
     */
    handleContinueClick: function () {
      if (hasContinued) return;
      hasContinued = true;

      console.info('[CalendarModule] Người dùng đã nhấn "Tiếp tục" -> Bắt đầu chuyển cảnh mượt mà sang Quả cầu 3D.');

      // 1. Khóa nút ngay lập tức để tránh double click
      continueBtn.disabled = true;
      continueBtn.style.pointerEvents = 'none';

      // 2. Kích hoạt hiệu ứng Lịch thu nhỏ nhẹ, mờ dần về phía tâm màn hình
      screenEl.classList.remove('active');
      screenEl.classList.add('is-transitioning-out');

      // 3. Kích hoạt callback ngay lập tức để main.js điều phối đồng bộ ánh sáng hào quang và Quả cầu 3D
      if (typeof onContinueCallback === 'function') {
        onContinueCallback();
      }
    },

    /**
     * Ẩn tức thời
     */
    hide: function () {
      if (screenEl) {
        screenEl.classList.remove('active', 'fade-out', 'is-transitioning-out');
        screenEl.style.display = 'none';
        screenEl.setAttribute('aria-hidden', 'true');
      }
      hasContinued = false;
    },

    // Các hàm stub an toàn đề phòng các đoạn code cũ gọi tới
    buildPuzzle: function () {},
    animatePuzzlePieces: function () {},
  };

  // Đăng ký module vào phạm vi toàn cục
  window.CalendarModule = CalendarModule;
})();
