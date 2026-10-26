/**
 * DateTimePicker - 輕量級日期時間選擇器
 * 
 * 特點：
 * - 純 Vanilla JS，無框架依賴
 * - iOS PWA 完美兼容
 * - 輕量級 (< 10KB)
 * - 支援日期和時間選擇
 */

// Presentation ownership only: replacing a panel also closes its instance state.
const pickerRegistry = { active: null };

class DateTimePicker {
  constructor(options = {}) {
    this.type = options.type || 'date'; // 'date' or 'time'
    this.mode = options.mode || 'single'; // ✅ 新增：'single' or 'multiple'
    this.input = options.input;
    this.onChange = options.onChange || (() => {});
    this.minDate = options.minDate || null;
    this.maxDate = options.maxDate || null;
    
    this.currentDate = new Date();
    this.selectedDate = null;
    this.selectedDates = []; // ✅ 新增：多選日期陣列
    this.selectedTime = { hour: 9, minute: 0 };
    
    this.picker = null;
    this.isOpen = false;
    this.destroyed = false;
    this.closingElements = [];
    this.closeTimer = null;
    this.outsideTimer = null;
    this.scrollTimer = null;
    
    this.init();
  }
  
  init() {
    if (!this.input) return;
    
    // 設置 input 為 readonly
    this.input.setAttribute('readonly', 'true');
    this.input.style.cursor = 'pointer';
    
    // ✅ 保存事件處理器引用，方便後續移除
    this.handleInputClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.open();
    };
    
    // 綁定事件
    this.input.addEventListener('click', this.handleInputClick);
    
    // 解析初始值
    if (this.input.value) {
      if (this.type === 'date') {
        this.selectedDate = new Date(this.input.value);
        this.currentDate = new Date(this.selectedDate);
      } else if (this.type === 'time') {
        const [hour, minute] = this.input.value.split(':');
        this.selectedTime = { hour: parseInt(hour), minute: parseInt(minute) };
      }
    }
  }
  
  open() {
    if (this.destroyed || this.input?.disabled || this.isOpen) return;
    if (pickerRegistry.active && pickerRegistry.active !== this) {
      const previous = pickerRegistry.active;
      previous.close();
      previous.cleanupOldElements();
    }
    
    // ✅ 先清理可能存在的舊元素（防止重複疊加）
    this.cleanupOldElements();
    
    // ✅ 初始化 currentDate（多選模式）
    if (this.mode === 'multiple' && this.selectedDates.length > 0) {
      // 使用第一個選中的日期作為當前顯示月份
      this.currentDate = new Date(this.selectedDates[0]);
    } else if (!this.currentDate || isNaN(this.currentDate.getTime())) {
      // 如果 currentDate 無效，使用今天
      this.currentDate = new Date();
    }
    
    this.isOpen = true;
    pickerRegistry.active = this;
    this.createPicker();
    this.render();
    
    // 延遲添加，避免立即觸發關閉
    this.outsideTimer = setTimeout(() => {
      this.outsideTimer = null;
      if (this.isOpen && !this.destroyed) document.addEventListener('click', this.handleOutsideClick);
    }, 100);
  }
  
  cleanupOldElements() {
    clearTimeout(this.closeTimer);
    this.closeTimer = null;
    // Never query/remove panels owned by another input.
    this.closingElements.forEach(element => element.remove());
    this.closingElements = [];
    this.picker?.remove();
    this.overlay?.remove();
    this.picker = null;
    this.overlay = null;
  }
  
  close() {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    if (pickerRegistry.active === this) pickerRegistry.active = null;
    clearTimeout(this.outsideTimer);
    clearTimeout(this.scrollTimer);
    this.outsideTimer = null;
    this.scrollTimer = null;
    document.removeEventListener('click', this.handleOutsideClick);
    
    // ✅ 添加淡出動畫
    if (this.picker) {
      this.picker.style.animation = 'slideDown 0.2s ease-out forwards';
    }
    if (this.overlay) {
      this.overlay.style.animation = 'fadeOut 0.2s ease-out forwards';
    }
    
    // Capture outgoing nodes. A later open must not be removed by this timer.
    const outgoing = [this.picker, this.overlay].filter(Boolean);
    this.closingElements = outgoing;
    this.picker = null;
    this.overlay = null;
    this.closeTimer = setTimeout(() => {
      outgoing.forEach(element => element.remove());
      this.closingElements = [];
      this.closeTimer = null;
    }, 200);
  }
  
  handleOutsideClick = (e) => {
    if (this.picker && !this.picker.contains(e.target) && e.target !== this.input) {
      this.close();
    }
  }
  
  createPicker() {
    this.picker = document.createElement('div');
    this.picker.className = 'datetime-picker';
    this.picker.setAttribute('data-type', this.type);
    
    // ✅ 統一使用置中顯示（手機和電腦都一樣）
    this.picker.style.position = 'fixed';
    this.picker.style.top = '50%';
    this.picker.style.left = '50%';
    this.picker.style.transform = 'translate(-50%, -50%)';
    this.picker.style.width = 'calc(100vw - 2rem)';
    this.picker.style.maxWidth = '400px'; // ✅ 電腦版稍微大一點
    this.picker.style.maxHeight = '90vh';
    this.picker.style.overflow = 'auto';
    this.picker.style.zIndex = '9999';
    
    // 添加遮罩層
    this.overlay = document.createElement('div');
    this.overlay.className = 'datetime-picker-overlay';
    this.overlay.style.position = 'fixed';
    this.overlay.style.top = '0';
    this.overlay.style.left = '0';
    this.overlay.style.right = '0';
    this.overlay.style.bottom = '0';
    this.overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.overlay.style.zIndex = '9998';
    this.overlay.style.animation = 'fadeIn 0.2s ease-out';
    
    document.body.appendChild(this.overlay);
    this.overlay.addEventListener('click', () => this.close());
    
    document.body.appendChild(this.picker);
    
    // 添加動畫
    this.picker.style.animation = 'slideUp 0.3s ease-out';
  }
  
  render() {
    if (!this.picker) return;
    
    if (this.type === 'date') {
      this.renderDatePicker();
    } else if (this.type === 'time') {
      this.renderTimePicker();
    }
  }
  
  renderDatePicker() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    const firstDayOfWeek = firstDay.getDay();
    const lastDateOfMonth = lastDay.getDate();
    const prevLastDate = prevLastDay.getDate();
    
    let html = `
      <div class="datetime-picker-header">
        <button type="button" class="datetime-picker-nav" data-action="prev-month" aria-label="上個月">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="datetime-picker-title">
          ${year} 年 ${month + 1} 月
        </div>
        <button type="button" class="datetime-picker-nav" data-action="next-month" aria-label="下個月">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7.5 15L12.5 10L7.5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="datetime-picker-weekdays">
        <div>日</div>
        <div>一</div>
        <div>二</div>
        <div>三</div>
        <div>四</div>
        <div>五</div>
        <div>六</div>
      </div>
      <div class="datetime-picker-days">
    `;
    
    // 上個月的日期
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevLastDate - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      html += `<button type="button" class="datetime-picker-day other-month" data-date="${dateStr}">${day}</button>`;
    }
    
    // 本月的日期
    for (let day = 1; day <= lastDateOfMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = this.formatDate(date);
      const isSelected = this.mode === 'multiple' 
        ? this.selectedDates.includes(dateStr) // ✅ 多選模式：檢查是否在陣列中
        : (this.selectedDate && this.formatDate(this.selectedDate) === dateStr); // 單選模式
      const isToday = this.formatDate(new Date()) === dateStr;
      const isDisabled = this.isDateDisabled(date);
      
      let classes = 'datetime-picker-day';
      if (isSelected) classes += ' selected';
      if (isToday) classes += ' today';
      if (isDisabled) classes += ' disabled';
      
      html += `<button type="button" class="${classes}" data-date="${dateStr}" ${isDisabled ? 'disabled' : ''}>${day}</button>`;
    }
    
    // 下個月的日期
    const remainingDays = 42 - (firstDayOfWeek + lastDateOfMonth);
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      html += `<button type="button" class="datetime-picker-day other-month" data-date="${dateStr}">${day}</button>`;
    }
    
    html += `</div>`;
    
    // 底部按鈕
    if (this.mode === 'multiple') {
      // ✅ 多選模式：顯示已選數量 + 確認/取消按鈕
      html += `
        <div class="datetime-picker-footer">
          <div class="datetime-picker-selected-count">
            已選擇 <strong>${this.selectedDates.length}</strong> 天
          </div>
          <div class="datetime-picker-actions">
            <button type="button" class="datetime-picker-cancel" data-action="cancel">取消</button>
            <button type="button" class="datetime-picker-confirm" data-action="confirm-multiple">確認</button>
          </div>
        </div>
      `;
    } else {
      // 單選模式：今天 + 取消按鈕
      html += `
        <div class="datetime-picker-footer">
          <button type="button" class="datetime-picker-today" data-action="today">今天</button>
          <button type="button" class="datetime-picker-cancel" data-action="cancel">取消</button>
        </div>
      `;
    }
    
    this.picker.innerHTML = html;
    this.bindDateEvents();
  }
  
  renderTimePicker() {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    
    let html = `
      <div class="datetime-picker-header">
        <div class="datetime-picker-title">選擇時間</div>
      </div>
      <div class="datetime-picker-time">
        <div class="datetime-picker-time-column">
          <div class="datetime-picker-time-label">時</div>
          <div class="datetime-picker-time-list" data-type="hour">
            ${hours.map(h => `
              <button type="button" class="datetime-picker-time-item ${h === this.selectedTime.hour ? 'selected' : ''}" data-value="${h}">
                ${String(h).padStart(2, '0')}
              </button>
            `).join('')}
          </div>
        </div>
        <div class="datetime-picker-time-separator">:</div>
        <div class="datetime-picker-time-column">
          <div class="datetime-picker-time-label">分</div>
          <div class="datetime-picker-time-list" data-type="minute">
            ${minutes.map(m => `
              <button type="button" class="datetime-picker-time-item ${m === this.selectedTime.minute ? 'selected' : ''}" data-value="${m}">
                ${String(m).padStart(2, '0')}
              </button>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="datetime-picker-footer">
        <button type="button" class="datetime-picker-confirm" data-action="confirm">確認</button>
        <button type="button" class="datetime-picker-cancel" data-action="cancel">取消</button>
      </div>
    `;
    
    this.picker.innerHTML = html;
    this.bindTimeEvents();
    
    // 滾動到選中的時間
    clearTimeout(this.scrollTimer);
    const panel = this.picker;
    this.scrollTimer = setTimeout(() => {
      this.scrollTimer = null;
      if (this.destroyed || !this.isOpen || this.picker !== panel) return;
      const hourList = panel.querySelector('[data-type="hour"]');
      const minuteList = panel.querySelector('[data-type="minute"]');
      const selectedHour = hourList.querySelector('.selected');
      const selectedMinute = minuteList.querySelector('.selected');
      
      for (const [list, selected] of [[hourList, selectedHour], [minuteList, selectedMinute]]) {
        if (!selected) continue;
        // offsetTop may be relative to the panel, not the scroll list.
        const itemRect = selected.getBoundingClientRect();
        const listRect = list.getBoundingClientRect();
        const centered = list.scrollTop + itemRect.top - listRect.top - list.clientHeight / 2 + itemRect.height / 2;
        list.scrollTop = Math.max(0, Math.min(centered, list.scrollHeight - list.clientHeight));
      }
    }, 0);
  }
  
  bindDateEvents() {
    // 導航按鈕
    this.picker.querySelector('[data-action="prev-month"]')?.addEventListener('click', (e) => {
      e.stopPropagation(); // ✅ 阻止事件冒泡
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render();
    });
    
    this.picker.querySelector('[data-action="next-month"]')?.addEventListener('click', (e) => {
      e.stopPropagation(); // ✅ 阻止事件冒泡
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render();
    });
    
    // 今天按鈕
    this.picker.querySelector('[data-action="today"]')?.addEventListener('click', (e) => {
      e.stopPropagation(); // ✅ 阻止事件冒泡
      this.selectDate(new Date());
    });
    
    // 取消按鈕
    this.picker.querySelector('[data-action="cancel"]')?.addEventListener('click', (e) => {
      e.stopPropagation(); // ✅ 阻止事件冒泡
      this.close();
    });
    
    // ✅ 確認按鈕（多選模式）
    this.picker.querySelector('[data-action="confirm-multiple"]')?.addEventListener('click', (e) => {
      e.stopPropagation(); // ✅ 阻止事件冒泡
      this.confirmMultipleSelection();
    });
    
    // 日期按鈕
    this.picker.querySelectorAll('.datetime-picker-day:not(.disabled):not(.other-month)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation(); // ✅ 阻止事件冒泡
        const dateStr = btn.getAttribute('data-date');
        
        // ✅ 多選模式處理
        if (this.mode === 'multiple') {
          this.toggleDate(dateStr);
        } else {
          // 單選模式：選擇後關閉
          this.selectDate(new Date(dateStr));
        }
      });
    });
  }
  
  bindTimeEvents() {
    // 時間選擇
    this.picker.querySelectorAll('.datetime-picker-time-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const value = parseInt(btn.getAttribute('data-value'));
        const type = btn.closest('.datetime-picker-time-list').getAttribute('data-type');
        
        if (type === 'hour') {
          this.selectedTime.hour = value;
        } else if (type === 'minute') {
          this.selectedTime.minute = value;
        }
        
        // 更新選中狀態
        btn.closest('.datetime-picker-time-list').querySelectorAll('.datetime-picker-time-item').forEach(item => {
          item.classList.remove('selected');
        });
        btn.classList.add('selected');
      });
    });
    
    // 確認按鈕
    this.picker.querySelector('[data-action="confirm"]')?.addEventListener('click', () => {
      this.selectTime();
    });
    
    // 取消按鈕
    this.picker.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      this.close();
    });
  }
  
  selectDate(date) {
    this.selectedDate = date;
    const dateStr = this.formatDate(date);
    this.input.value = dateStr;
    this.onChange(dateStr);
    this.close();
  }
  
  toggleDate(dateStr) {
    // ✅ 多選模式：切換日期選中狀態
    const index = this.selectedDates.indexOf(dateStr);
    
    if (index > -1) {
      // 已選中，取消選中
      this.selectedDates.splice(index, 1);
    } else {
      // 未選中，添加選中
      this.selectedDates.push(dateStr);
    }
    
    // 排序日期
    this.selectedDates.sort();
    
    // 重新渲染（更新選中狀態）
    this.render();
  }
  
  confirmMultipleSelection() {
    // ✅ 確認多選 - 即使沒選也要關閉
    this.onChange([...this.selectedDates]); // 傳遞副本
    this.close(); // 一定要關閉
  }
  
  selectTime() {
    const timeStr = `${String(this.selectedTime.hour).padStart(2, '0')}:${String(this.selectedTime.minute).padStart(2, '0')}`;
    this.input.value = timeStr;
    this.onChange(timeStr);
    this.close();
  }
  
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  isDateDisabled(date) {
    if (this.minDate) {
      const min = new Date(this.minDate);
      min.setHours(0, 0, 0, 0);
      if (date < min) return true;
    }
    
    if (this.maxDate) {
      const max = new Date(this.maxDate);
      max.setHours(23, 59, 59, 999);
      if (date > max) return true;
    }
    
    return false;
  }
  
  destroy() {
    this.close();
    this.destroyed = true;
    clearTimeout(this.outsideTimer);
    clearTimeout(this.scrollTimer);
    
    // ✅ 清理所有事件監聽器
    document.removeEventListener('click', this.handleOutsideClick);
    
    // ✅ 清理可能殘留的元素
    this.cleanupOldElements();
    
    if (this.input) {
      // ✅ 移除所有綁定的事件（需要保存引用）
      this.input.removeEventListener('click', this.handleInputClick);
    }
  }
}

// 導出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DateTimePicker;
}
