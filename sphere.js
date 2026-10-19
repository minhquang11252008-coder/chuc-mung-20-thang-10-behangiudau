/**
 * ====================================================================
 * MODULE: QUẢ CẦU 3D THREE.JS CSS3D (SPHERE.JS) - TASK 04
 * ====================================================================
 * Trách nhiệm kỹ thuật:
 * 1. Khởi tạo không gian 3D Three.js và CSS3DRenderer trong #sphere-layer.
 * 2. Phân bố đều các thẻ ảnh kỷ niệm và thông điệp tình cảm lên bề mặt hình cầu
 *    theo thuật toán tọa độ cầu Fibonacci Sphere (Spherical Coordinates).
 * 3. Hướng mặt phẳng các thẻ vuông góc và quay ra ngoài tâm cầu (lookAt outward).
 * 4. Tích hợp điều khiển xoay tự do OrbitControls kèm hiệu ứng tự xoay chậm (autoRotate).
 * 5. Tự động co giãn theo kích thước màn hình (Responsive Resize) cho cả desktop và mobile.
 * 6. Quản lý tài nguyên sạch sẽ (init / destroy / pause on hidden tab), không xung đột
 *    với nút bấm trung tâm và nền vũ trụ TASK 03.
 */

(function () {
  'use strict';

  // Biến đối tượng Three.js & CSS3D
  let scene = null;
  let camera = null;
  let renderer = null;
  let controls = null;
  let container = null;
  let animationFrameId = null;

  // Biến trạng thái hoạt động
  let isRunning = false;
  let isTabVisible = true;
  let prefersReducedMotion = false;
  let resizeTimeout = null;

  // Kích thước logic
  let width = 0;
  let height = 0;

  // Mảng chứa các đối tượng CSS3D trên quả cầu
  let objects = [];

  /**
   * Danh sách 20 lời chúc 20/10 trên quả cầu 3D
   */
  const DEFAULT_SPHERE_ITEMS = [
    { type: 'text', content: 'Chúc Hằng yêu 20/10 vui vẻ, luôn luôn xinh đẹp và hạnh phúc bên anh ❤️' },
    { type: 'text', content: 'Chúc em luôn nở nụ cười thật tươi trên môi, yêu em nhiều! 💕' },
    { type: 'text', content: '20/10 vui vẻ nhé bée yêu, anh thương em nhất! 🥰' },
    { type: 'text', content: 'Chúc bé Hằng iu luôn xinh đẹp và bình an bên anh ❤️' },
    { type: 'text', content: 'Chúc bé Hằng iu mọi điều tốt đẹp nhất! 🌹' },
    { type: 'text', content: 'Mãi yêu em, chúc em 20/10 thật hạnh phúc! 💖' },
    { type: 'text', content: 'Chúc bé iu luôn vui vẻ, anh sẽ luôn bên em! 🫶' },
    { type: 'text', content: '20/10 thật vui nhé, công chúa của anh! 👑' },
    { type: 'text', content: 'Chúc em luôn rạng rỡ và thành công trong công việc! 💗' },
    { type: 'text', content: 'Cảm ơn em đã luôn ở bên và yêu thương anh. Yêu em! ❤️' },
    { type: 'text', content: 'Ngày này năm ngoái anh mới mở lời với em anh thấy rất áy náy :((' },
    { type: 'text', content: 'Chúc em luôn mạnh khỏe, bình an và hạnh phúc! 💐' },
    { type: 'text', content: 'em là món quà tuyệt vời nhất của anh! 💝' },
    { type: 'text', content: 'kể từ khi có em cuộc đời anh đã có rất nhiều niềm vui mới! 😍' },
    { type: 'text', content: '20/10 hạnh phúc nhé bée yêu, anh nhớ em lắm ạ! 💋' },
    { type: 'text', content: 'Chúc tình yêu của anh luôn gặp nhiều may mắn! 🍀' },
    { type: 'text', content: 'Mong em luôn vui vẻ vì đã có anh bên cạnh! ❤️' },
    { type: 'text', content: 'Chúc em nhận thật nhiều yêu thương hôm nay! 🌷' },
    { type: 'text', content: 'Cả thế giới của anh là em. 20/10 vui vẻ nhé! 💞' },
    { type: 'text', content: 'Chúc em yêu mãi hạnh phúc, anh yêu em rất nhiều! 💍' },
  ];

  /**
   * Tính toán bán kính quả cầu:
   * Giữ cố định 475px (nhỏ hơn bản gốc ban đầu 480px đúng 5px) trên mọi kích thước màn hình
   * để quả cầu luôn to đẹp, rõ ràng, không bị thu nhỏ quá mức trên điện thoại.
   */
  function calculateRadius() {
    return 475; // Cố định 475px (480px - 5px) cho mọi kích thước màn hình
  }

  /**
   * Tạo phần tử DOM đại diện cho một thẻ trên quả cầu
   * @param {Object} item - Thông tin thẻ (ảnh hoặc thông điệp)
   * @param {number} index - Chỉ số thẻ
   * @returns {HTMLElement} Phần tử thẻ HTML
   */
  function createCardElement(item, index) {
    const cardEl = document.createElement('div');
    cardEl.className = 'sphere-element';
    cardEl.setAttribute('data-index', index);

    if (item.type === 'photo') {
      const photoBox = document.createElement('div');
      photoBox.className = 'sphere-card-photo';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'photo-icon';
      iconSpan.textContent = item.icon || '📷';

      const captionP = document.createElement('p');
      captionP.className = 'photo-caption';
      captionP.textContent = item.caption || `Ảnh ${index + 1}`;

      photoBox.appendChild(iconSpan);
      photoBox.appendChild(captionP);
      cardEl.appendChild(photoBox);
    } else {
      const textBox = document.createElement('div');
      textBox.className = 'sphere-card-text';

      const textP = document.createElement('p');
      textP.textContent = item.content || '20/10 Yêu Thương';

      textBox.appendChild(textP);
      cardEl.appendChild(textBox);
    }

    return cardEl;
  }

  /**
   * Tạo và phân bố các đối tượng CSS3D trên bề mặt hình cầu
   * Áp dụng thuật toán Fibonacci Sphere (Spherical Coordinates)
   * @param {Array<Object>} itemsData - Danh sách thẻ
   */
  function buildSphere(itemsData) {
    if (!scene || typeof THREE === 'undefined' || !THREE.CSS3DObject) return;

    // Xóa các đối tượng cũ trong scene
    objects.forEach(obj => scene.remove(obj));
    objects = [];

    const items = itemsData && itemsData.length > 0 ? itemsData : DEFAULT_SPHERE_ITEMS;
    const count = items.length;
    const radius = calculateRadius();
    const outwardVector = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      // 1. Thuật toán Fibonacci Sphere phân bố đều trên mặt cầu
      // phi = acos(-1 + (2 * i) / count); theta = sqrt(count * PI) * phi
      const phi = Math.acos(-1 + (2 * i) / count);
      const theta = Math.sqrt(count * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      // 2. Tạo phần tử DOM và bọc thành THREE.CSS3DObject
      const domEl = createCardElement(items[i], i);
      const object3D = new THREE.CSS3DObject(domEl);

      // 3. Đặt vị trí trong không gian 3D
      object3D.position.set(x, y, z);

      // 4. Định hướng mặt thẻ hướng ra ngoài tâm cầu
      outwardVector.set(x * 2, y * 2, z * 2);
      object3D.lookAt(outwardVector);

      scene.add(object3D);
      objects.push(object3D);
    }
  }

  /**
   * Vòng lặp render chính của Three.js CSS3D
   */
  function renderLoop() {
    if (!isRunning) return;

    if (!isTabVisible) {
      // Dừng rAF khi tab bị ẩn để giải phóng 100% CPU trên điện thoại
      animationFrameId = null;
      return;
    }

    // Cập nhật OrbitControls (bao gồm cả quán tính và autoRotate)
    if (controls) {
      controls.update();
    }

    // Render cảnh CSS3D
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }

    animationFrameId = requestAnimationFrame(renderLoop);
  }

  /**
   * Cập nhật kích thước và tỷ lệ camera khi cửa sổ thay đổi
   */
  function updateDimensions() {
    if (!container || !renderer || !camera) return;

    const rect = container.getBoundingClientRect();
    width = rect.width || window.innerWidth;
    height = rect.height || window.innerHeight;

    camera.aspect = width / height;

    // Khoảng cách camera cố định giúp quả cầu giữ nguyên tỷ lệ trên mọi màn hình
    camera.position.z = 1000;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);

    // Tái cấu trúc lại bán kính quả cầu khi resize
    buildSphere(DEFAULT_SPHERE_ITEMS);
  }

  /**
   * Xử lý resize có debounce
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
   * Tạm dừng hoặc tiếp tục khi đổi tab
   */
  function handleVisibilityChange() {
    isTabVisible = !document.hidden;
    if (isTabVisible) {
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
   * Kiểm tra thiết lập giảm chuyển động
   */
  function checkReducedMotionPreference() {
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = motionMediaQuery.matches;
    if (controls) {
      controls.autoRotate = !prefersReducedMotion;
    }
    motionMediaQuery.addEventListener('change', function (e) {
      prefersReducedMotion = e.matches;
      if (controls) {
        controls.autoRotate = !prefersReducedMotion;
      }
    });
  }

  // ====================================================================
  // PUBLIC API CỦA MODULE SPHERE 3D
  // ====================================================================
  const Sphere3DModule = {
    name: 'Sphere3DModule',
    isInitialized: false,

    /**
     * Khởi tạo quả cầu 3D Three.js CSS3D
     * @param {HTMLElement} containerElement - Thẻ chứa #sphere-layer
     * @param {Array<Object>} customItemsData - Dữ liệu ảnh & lời chúc tùy chọn
     * @returns {boolean} True nếu khởi tạo thành công
     */
    init: function (containerElement, customItemsData) {
      // 1. Kiểm tra sự tồn tại của thư viện Three.js và module CSS3DRenderer
      if (typeof THREE === 'undefined') {
        console.error('[Sphere3DModule] Lỗi: Chưa nạp thư viện Three.js.');
        return false;
      }
      if (!THREE.CSS3DRenderer || !THREE.CSS3DObject) {
        console.error('[Sphere3DModule] Lỗi: Module Three.js CSS3DRenderer chưa được nạp.');
        return false;
      }

      container = containerElement || document.getElementById('sphere-layer');
      if (!container) {
        console.error('[Sphere3DModule] Lỗi: Không tìm thấy container #sphere-layer.');
        return false;
      }

      // Đảm bảo dọn dẹp các tài nguyên cũ nếu khởi tạo lại
      this.destroy();

      const rect = container.getBoundingClientRect();
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;

      camera = new THREE.PerspectiveCamera(50, width / height, 1, 3000);
      camera.position.z = 1000;

      // 3. Khởi tạo Scene
      scene = new THREE.Scene();

      // 4. Khởi tạo CSS3DRenderer
      renderer = new THREE.CSS3DRenderer();
      renderer.setSize(width, height);

      // Gắn DOM element của CSS3DRenderer vào container
      const rendererDom = renderer.domElement;
      rendererDom.className = 'sphere-css3d-canvas';
      rendererDom.style.position = 'absolute';
      rendererDom.style.top = '0';
      rendererDom.style.left = '0';
      rendererDom.style.width = '100%';
      rendererDom.style.height = '100%';
      container.appendChild(rendererDom);

      // 5. Khởi tạo OrbitControls nếu có sẵn
      if (THREE.OrbitControls) {
        controls = new THREE.OrbitControls(camera, rendererDom);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = false; // Ngăn chặn zoom cuộn trang ngoài ý muốn
        controls.enablePan = false;  // Giữ tâm cố định
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.75; // Xoay chậm mượt mà
        controls.minPolarAngle = Math.PI * 0.2; // Giới hạn góc để không bị lộn ngược
        controls.maxPolarAngle = Math.PI * 0.8;
      }

      // 6. Xây dựng quả cầu với thuật toán Fibonacci Sphere
      buildSphere(customItemsData || DEFAULT_SPHERE_ITEMS);

      // 7. Đăng ký các sự kiện theo dõi cửa sổ
      checkReducedMotionPreference();
      window.addEventListener('resize', handleResize);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // 8. Bắt đầu vòng lặp render
      isRunning = true;
      animationFrameId = requestAnimationFrame(renderLoop);

      this.isInitialized = true;
      console.info(
        `%c[Sphere3DModule] Đã khởi tạo thành công quả cầu 3D với ${objects.length} thẻ kỷ niệm & thông điệp.`,
        'color: #ff85a2; font-weight: bold;'
      );
      return true;
    },

    /**
     * Tạm dừng render loop
     */
     pause: function () {
       isRunning = false;
       if (animationFrameId) {
         cancelAnimationFrame(animationFrameId);
         animationFrameId = null;
       }
       console.info('[Sphere3DModule] Tạm dừng renderLoop quả cầu 3D.');
     },

     /**
      * Khôi phục render loop
      */
     resume: function () {
       if (isRunning) return;
       isRunning = true;
       if (!animationFrameId) {
         animationFrameId = requestAnimationFrame(renderLoop);
       }
       console.info('[Sphere3DModule] Tiếp tục renderLoop quả cầu 3D.');
     },

     /**
      * Duy trì quả cầu xoay mượt mà với quán tính nhẹ trong suốt quá trình chuyển cảnh sang thư
      */
     transitionOut: function (speed = 1.35) {
       if (!isRunning) {
         this.resume();
       }
       if (controls) {
         controls.autoRotate = true;
         controls.autoRotateSpeed = speed;
       }
       console.info('[Sphere3DModule] Duy trì xoay quả cầu trong quá trình chuyển tiếp sang thư.');
     },

    /**
     * Dọn dẹp tài nguyên Three.js và dừng animation
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

      if (controls && controls.dispose) {
        controls.dispose();
        controls = null;
      }

      if (scene) {
        objects.forEach(obj => scene.remove(obj));
        objects = [];
        scene = null;
      }

      if (renderer && renderer.domElement && container) {
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer = null;
      }

      camera = null;
      this.isInitialized = false;
      console.info('[Sphere3DModule] Đã giải phóng toàn bộ tài nguyên quả cầu 3D.');
    },

    /**
     * Trả về thông tin trạng thái hoạt động (phục vụ kiểm thử)
     */
    getStats: function () {
      return {
        isInitialized: this.isInitialized,
        isRunning: isRunning,
        objectCount: objects.length,
        width: width,
        height: height,
        cameraZ: camera ? camera.position.z : 0,
        hasControls: !!controls,
      };
    },
  };

  // Đăng ký module vào không gian tên ứng dụng
  window.Sphere3DModule = Sphere3DModule;
})();
