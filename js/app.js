/* ============================================================
   성균관대 IMBA 46기 시간표 - 메인 앱 JavaScript
   ============================================================ */

// ===== 전역 상태 =====
const state = {
  selectedStudents: [],
  currentFilter:    'all',      // 수업 타입: all | offline | qna
  currentMode:      'list',     // 뷰 모드: list | calendar
  currentCalView:   'date',     // 캘린더 하위: date | month
  currentMonth:     '2026-03',
  calendarYear:     2026,
  calendarMonth:    2,          // 0-indexed
  calFilter:        'all',
  calSelectedStudents: [],
  searchQuery:      ''
};

// ===== 초기화 =====
document.addEventListener('DOMContentLoaded', () => {
  // 탭 nav sticky top을 헤더 높이에 맞게 동적 조정
  function adjustStickyTop() {
    const header = document.querySelector('.site-header');
    const tabNav = document.querySelector('.tab-nav');
    const splitLeft = document.querySelector('.split-left');
    if (header && tabNav) {
      const hh = header.offsetHeight;
      tabNav.style.top = hh + 'px';
      const tabH = tabNav.offsetHeight;
      if (splitLeft && window.innerWidth > 768) {
        splitLeft.style.top = (hh + tabH + 12) + 'px';
        splitLeft.style.maxHeight = `calc(100vh - ${hh + tabH + 24}px)`;
      }
    }
  }
  adjustStickyTop();
  window.addEventListener('resize', adjustStickyTop);

  initTabs();
  initSearchTab();
  initTimetableTab();
  initCalendarTab();
  initCoursesTab();
  initStatsTab();
  initDateQueryTab();

  // 기본 학기: 여름집중학기 (데이터/상태/라벨/토글 일괄 적용)
  switchSemester('summer');
});

// 로고 클릭 → 사이트 초기 화면으로 복귀 (외부 이동 없이 기본 학기 + 기본 탭)
window.goHome = function() {
  switchSemester('summer');                 // 기본 학기 + 상태/렌더 초기화
  const homeBtn = document.querySelector('.tab-btn[data-tab="timetable"]');
  if (homeBtn) homeBtn.click();              // 기본 탭(전체 시간표) 활성화
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// ============================================================
// 학기 전환 (1학기 ↔ 여름집중학기) — 데이터셋을 통째로 교체해 분리
// ============================================================
window.switchSemester = function(sem) {
  if (typeof applySemester !== 'function') return;
  const applied = applySemester(sem);

  // 토글 버튼 활성화 표시
  document.querySelectorAll('.semester-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.sem === applied));

  // 헤더/타이틀 라벨 갱신
  updateSemesterLabels(applied);

  // 상태 초기화 (학기 간 선택/필터가 섞이지 않도록)
  state.selectedStudents    = [];
  state.calSelectedStudents = [];
  state.searchQuery         = '';
  state.currentFilter       = 'all';
  state.calFilter           = 'all';
  state.currentMode         = 'list';
  state.calendarYear        = 2026;
  state.calendarMonth       = (applied === 'summer') ? 5 : 2;   // 여름=6월, 1학기=3월

  // 타입 필터 버튼 UI 초기화
  document.querySelectorAll('.type-filter .filter-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.filter === 'all'));

  // 검색 입력 비우기
  ['studentSearch', 'calStudentSearch', 'statsTableSearch'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  if (typeof statsState !== 'undefined') statsState.searchQ = '';

  // 날짜별 조회 탭은 학기별 범위/안내로 초기화
  resetDateQueryForSemester(applied);

  // 데이터 재렌더 (이벤트 리스너는 그대로, 화면만 갱신)
  renderStudentList();
  if (typeof renderGroupList === 'function') renderGroupList();
  renderMonthTabs();
  renderTimetable();
  renderCalendar();
  renderCourseGrid();
  renderStatsKpi();
  renderStatsTable();

  // 열려 있던 결과/상세 패널 닫기
  ['scheduleResult', 'dayDetail', 'courseDetail'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  const se = document.getElementById('splitEmpty'); if (se) se.style.display = 'flex';
  const cdp = document.getElementById('calDayDetailPanel'); if (cdp) cdp.style.display = 'none';

  // 상단으로 스크롤
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

function updateSemesterLabels(sem) {
  const isSummer = sem === 'summer';
  const sub   = document.querySelector('.header-titles p');
  const badge = document.querySelector('.badge-semester');
  if (sub)   sub.textContent   = isSummer ? '2026년 여름집중학기 수업 시간표' : '2026년 1학기 수업 시간표';
  if (badge) badge.textContent = isSummer ? '2026학년도 여름집중학기' : '2026학년도 1학기';
  document.title = isSummer
    ? 'SKKU IMBA 46기 | 2026년 여름집중학기 수업 시간표'
    : 'SKKU IMBA 46기 | 2026년 1학기 수업 시간표';
}

// 날짜별 조회 탭을 활성 학기에 맞게 초기화 (날짜 입력 범위 + 결과 초기화)
function resetDateQueryForSemester(sem) {
  const input    = document.getElementById('dqDateInput');
  const result   = document.getElementById('dqResult');
  const empty     = document.getElementById('dqEmpty');
  const selector = document.querySelector('.dq-selector-card');
  const slots    = document.getElementById('dqTimeslots');
  if (result)   result.style.display = 'none';
  if (input)    input.value = '';
  if (selector) selector.style.display = '';
  if (slots)    slots.innerHTML = '<span class="dq-timeslot-hint">먼저 날짜를 선택하세요</span>';

  if (input) {
    if (sem === 'summer') { input.min = '2026-06-20'; input.max = '2026-08-10'; }
    else                  { input.min = '2026-03-01'; input.max = '2026-06-30'; }
  }
  if (empty) {
    empty.style.display = 'flex';
    empty.innerHTML = '<i class="fas fa-calendar-search"></i><p>날짜와 시간대를 선택하면<br>수업 있는 원우 목록이 표시됩니다</p>';
  }
}

// ============================================================
// 탭 시스템
// ============================================================
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + tabId).classList.add('active');
    });
  });
}

// ============================================================
// 유틸리티
// ============================================================
function formatDateKo(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${month}월 ${day}일(${days[d.getDay()]})`;
}
function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${month}/${day}(${days[d.getDay()]})`;
}
function isToday(dateStr) {
  const today = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  return today.toDateString() === d.toDateString();
}
function getWeekNumber(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  // 여름집중학기(6/24~)는 별도 주차 체계 (6/22 월요일 기준)
  const summerStart = new Date('2026-06-22T00:00:00');
  if (d >= summerStart) {
    return Math.floor((d - summerStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
  }
  const startDate = new Date('2026-03-07T00:00:00');
  const diff = Math.floor((d - startDate) / (7 * 24 * 60 * 60 * 1000));
  return diff + 1;
}
function getMonthLabel(ym) {
  const [y, m] = ym.split('-');
  return `${y}년 ${parseInt(m)}월`;
}
function getInitial(name) {
  return name ? name.charAt(0) : '?';
}
function getPeriodTime(period) {
  if (CLASS_PERIODS[period]) return CLASS_PERIODS[period].time;
  if (period === '전교시') return '전일';
  return period;
}
function getTypeBadge(type) {
  if (type === 'offline') return '<span class="type-badge offline"><i class="fas fa-building"></i> 오프라인</span>';
  if (type === 'qna')     return '<span class="type-badge qna"><i class="fas fa-video"></i> 화상Q&A</span>';
  return '';
}

// 날짜 목록 (중복 제거 정렬) — 현재 활성 학기 기준
function getAllScheduleDates() {
  const all = [...SCHEDULE_DATA, ...QNA_SCHEDULE];
  return [...new Set(all.map(s => s.date))].sort();
}

// 전체 시간표/캘린더용 필터 — 현재 활성 학기(SCHEDULE_DATA/QNA_SCHEDULE) 기준
function getScheduleByFilter(filter) {
  if (filter === 'offline') return SCHEDULE_DATA.filter(s => s.type === 'offline');
  if (filter === 'qna')     return [...SCHEDULE_DATA.filter(s => s.type === 'qna'), ...QNA_SCHEDULE];
  return [...SCHEDULE_DATA, ...QNA_SCHEDULE];
}

// 특정 학생들의 수업 필터
function getStudentSchedule(studentNames, filter) {
  const students = STUDENTS.filter(s => studentNames.includes(s.name));
  const allCourses = [...new Set(students.flatMap(s => s.courses))];
  let data = getScheduleByFilter(filter);
  const classItems = data.filter(s => !s.isExam && allCourses.includes(s.course));
  // 시험은 원우가 수강하는 과목의 시험만 포함 (과목별 시험 데이터)
  const examItems = SCHEDULE_DATA.filter(e => e.isExam && allCourses.includes(e.course));
  return [...classItems, ...examItems];
}

// ============================================================
// 그룹 저장 (localStorage + Firestore 동기화)
// ============================================================
const GROUP_KEY = 'imba46_groups';

function loadGroups() {
  try { return JSON.parse(localStorage.getItem(GROUP_KEY)) || []; }
  catch(e) { return []; }
}

function saveGroups(groups) {
  // 1) localStorage 즉시 저장 (오프라인·비로그인 대비)
  try { localStorage.setItem(GROUP_KEY, JSON.stringify(groups)); } catch(e) {}
  // 2) 로그인 상태이면 Firestore에도 비동기 저장
  if (typeof window.fbSaveGroups === 'function') {
    window.fbSaveGroups(groups).catch(e => console.warn('[Firebase] saveGroups:', e));
  }
}

// 전역 노출: Firebase 로그인 후 Firestore 데이터 반영에 사용
window.renderGroupList = renderGroupList;

function renderGroupList() {
  const groups = loadGroups();
  const el = document.getElementById('groupList');
  if (!el) return;

  if (!groups.length) {
    el.innerHTML = `<div class="group-empty"><i class="fas fa-info-circle"></i> 저장된 그룹이 없습니다</div>`;
    return;
  }

  el.innerHTML = groups.map((g, idx) => {
    const isActive = JSON.stringify(state.selectedStudents.slice().sort()) === JSON.stringify(g.members.slice().sort());
    return `<div class="group-item ${isActive ? 'active' : ''}" id="group-item-${idx}">
      <div class="group-item-main" onclick="loadGroup(${idx})">
        <div class="group-item-color" style="background:${g.color}"></div>
        <div class="group-item-info">
          <div class="group-item-name">${g.name}</div>
          <div class="group-item-members">${g.members.join(', ')}</div>
        </div>
        <span class="group-item-count">${g.members.length}명</span>
      </div>
      <div class="group-item-actions">
        <button class="group-action-btn rename" onclick="openGroupRenameModal(${idx})" title="이름 변경"><i class="fas fa-pen"></i></button>
        <button class="group-action-btn delete" onclick="deleteGroup(${idx})" title="삭제"><i class="fas fa-trash"></i></button>
      </div>
    </div>`;
  }).join('');
}

window.loadGroup = function(idx) {
  const groups = loadGroups();
  const g = groups[idx];
  if (!g) return;
  state.selectedStudents = [...g.members];
  state.searchQuery = '';
  const inp = document.getElementById('studentSearch');
  if (inp) inp.value = '';
  renderStudentList();
  renderScheduleResult();
  renderGroupList();
  document.getElementById('splitRight').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.deleteGroup = function(idx) {
  const groups = loadGroups();
  const g = groups[idx];
  if (!confirm(`"${g.name}" 그룹을 삭제할까요?`)) return;
  groups.splice(idx, 1);
  saveGroups(groups);
  renderGroupList();
};

// ── 그룹 저장 모달 (신규) ─────────────────────────────────
const GROUP_COLORS = ['#2563b0','#e74c3c','#27ae60','#f39c12','#8e44ad','#16a085','#d35400','#2c3e50','#c0392b','#1abc9c'];

window.openGroupSaveModal = function() {
  const selected = state.selectedStudents;
  if (!selected.length) {
    alert('먼저 원우를 선택해주세요.');
    return;
  }
  document.getElementById('groupModalTitle').innerHTML = '<i class="fas fa-layer-group"></i> 그룹 저장';
  document.getElementById('groupNameInput').value = '';
  document.getElementById('gm-count').textContent = `(${selected.length}명)`;
  document.getElementById('gmMemberList').innerHTML = selected.map(n =>
    `<span class="gm-chip">${n}</span>`
  ).join('');
  document.getElementById('gmSaveBtn').onclick = saveGroupConfirm;
  document.getElementById('groupModal').style.display = 'flex';
  setTimeout(() => document.getElementById('groupNameInput').focus(), 100);
};

// ── 그룹 이름 변경 모달 ───────────────────────────────────
window.openGroupRenameModal = function(idx) {
  const groups = loadGroups();
  const g = groups[idx];
  document.getElementById('groupModalTitle').innerHTML = '<i class="fas fa-pen"></i> 그룹 이름 변경';
  document.getElementById('groupNameInput').value = g.name;
  document.getElementById('gm-count').textContent = `(${g.members.length}명)`;
  document.getElementById('gmMemberList').innerHTML = g.members.map(n =>
    `<span class="gm-chip">${n}</span>`
  ).join('');
  document.getElementById('gmSaveBtn').onclick = () => renameGroupConfirm(idx);
  document.getElementById('groupModal').style.display = 'flex';
  setTimeout(() => {
    const inp = document.getElementById('groupNameInput');
    inp.focus();
    inp.select();
  }, 100);
};

window.saveGroupConfirm = function() {
  const name = document.getElementById('groupNameInput').value.trim();
  if (!name) { document.getElementById('groupNameInput').focus(); return; }
  const groups = loadGroups();
  const colors = GROUP_COLORS;
  const color = colors[groups.length % colors.length];
  groups.unshift({ name, members: [...state.selectedStudents], color, createdAt: Date.now() });
  saveGroups(groups);
  renderGroupList();
  closeGroupModal();
};

window.renameGroupConfirm = function(idx) {
  const name = document.getElementById('groupNameInput').value.trim();
  if (!name) { document.getElementById('groupNameInput').focus(); return; }
  const groups = loadGroups();
  groups[idx].name = name;
  saveGroups(groups);
  renderGroupList();
  closeGroupModal();
};

window.closeGroupModal = function(e) {
  if (e && e.target !== document.getElementById('groupModal')) return;
  document.getElementById('groupModal').style.display = 'none';
};

// Enter 키로 저장
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('groupNameInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('gmSaveBtn').click();
    if (e.key === 'Escape') closeGroupModal();
  });
});

// ============================================================
// TAB 1: 원우 검색 (좌우 2분할)
// ============================================================
function initSearchTab() {
  renderStudentList();
  renderGroupList();
  initStudentSearch();
  initViewToggle();

  // 전체보기 버튼
  document.getElementById('clearAllStudents').addEventListener('click', () => {
    state.selectedStudents = [];
    renderStudentList();
    document.getElementById('scheduleResult').style.display = 'none';
    document.getElementById('splitEmpty').style.display = 'flex';
  });
}

// 원우 목록 렌더링 (1열 세로 리스트)
function renderStudentList() {
  const list    = document.getElementById('studentList');
  const count   = document.getElementById('totalCount');
  const subheader = document.getElementById('splitLeftSubheader');
  const selectedLabel = document.getElementById('selectedCountLabel');
  const clearBtn = document.getElementById('clearAllStudents');

  const selected = state.selectedStudents;
  const query    = state.searchQuery;

  let students = [...STUDENTS].sort((a, b) => a.name.localeCompare(b.name));

  // 선택된 사람이 있으면 → 그 사람만 보여줌
  if (selected.length > 0) {
    students = students.filter(s => selected.includes(s.name));
    subheader.style.display = 'flex';
    selectedLabel.textContent = `${selected.length}명 선택됨`;
    count.textContent = `${STUDENTS.length}명`;
  } else {
    // 검색어가 있으면 필터
    if (query) {
      students = students.filter(s => s.name.includes(query));
    }
    subheader.style.display = 'none';
    count.textContent = `${students.length}명`;
  }

  if (students.length === 0) {
    const msg = (STUDENTS.length === 0)
      ? '<i class="fas fa-user-clock" style="font-size:22px;display:block;margin-bottom:8px;opacity:.5"></i>여름집중학기 원우 수강 명단은<br>준비 중입니다'
      : '검색 결과 없음';
    list.innerHTML = `<div style="padding:24px;text-align:center;color:#8a9ab0;font-size:13px;line-height:1.6;">${msg}</div>`;
    return;
  }

  list.innerHTML = students.map(s => {
    const isSel = selected.includes(s.name);
    return `<div class="student-row ${isSel ? 'selected' : ''}" onclick="selectStudent('${s.name}')">
      <div class="sr-avatar">${getInitial(s.name)}</div>
      <span class="sr-name">${s.name}</span>
    </div>`;
  }).join('');
}

// 원우 선택 (단일 선택 → 해당 인원만 목록에 남음)
window.selectStudent = function(name) {
  // 이미 선택된 사람 클릭 → 해제 후 전체 복원
  if (state.selectedStudents.includes(name)) {
    state.selectedStudents = state.selectedStudents.filter(n => n !== name);
  } else {
    state.selectedStudents.push(name);
  }
  // 검색어 초기화
  state.searchQuery = '';
  const inp = document.getElementById('studentSearch');
  if (inp) inp.value = '';
  const dd = document.getElementById('searchDropdown');
  if (dd) dd.style.display = 'none';

  renderStudentList();
  renderGroupList();
  renderScheduleResult();

  // 선택 시 → 수업 스케줄 영역으로 스크롤 이동
  if (state.selectedStudents.length > 0) {
    const resultEl = document.getElementById('scheduleResult');
    if (resultEl && resultEl.style.display !== 'none') {
      setTimeout(() => {
        resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }
};

// (하위 호환) toggleStudent → selectStudent 위임
function toggleStudent(name) { selectStudent(name); }

// 더 이상 사용 안 하는 chips 렌더 (빈 함수로 유지)
function renderSelectedChips() {}

function initStudentSearch() {
  const input    = document.getElementById('studentSearch');
  const dropdown = document.getElementById('searchDropdown');
  const clearBtn = document.getElementById('clearSearch');

  input.addEventListener('input', () => {
    const q = input.value.trim();
    state.searchQuery = q;
    clearBtn.style.display = q ? 'flex' : 'none';

    // 선택된 사람이 없을 때만 검색어 반영
    if (state.selectedStudents.length === 0) {
      renderStudentList();
    }

    if (q.length >= 1) {
      const matched = STUDENTS.filter(s => s.name.includes(q)).slice(0, 8);
      if (!matched.length) { dropdown.style.display = 'none'; return; }
      dropdown.innerHTML = matched.map(s => {
        const isSel = state.selectedStudents.includes(s.name);
        return `<div class="dropdown-item ${isSel ? 'selected' : ''}" onclick="selectStudent('${s.name}')">
          <div class="dropdown-avatar">${getInitial(s.name)}</div>
          <div>
            <div class="dropdown-name">${s.name}</div>
            <div class="dropdown-courses">${s.courses.join(' · ')}</div>
          </div>
          ${isSel ? '<i class="fas fa-check dropdown-check"></i>' : ''}
        </div>`;
      }).join('');
      dropdown.style.display = 'block';
    } else {
      dropdown.style.display = 'none';
    }
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    state.searchQuery = '';
    clearBtn.style.display = 'none';
    dropdown.style.display = 'none';
    renderStudentList();
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#leftSearchWrap')) {
      dropdown.style.display = 'none';
    }
  });
}

window.selectFromDropdown = function(name) { selectStudent(name); };

function initFilterButtons(selector, callback) {
  document.querySelectorAll(selector).forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.type-filter').querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      callback(btn.dataset.filter);
    });
  });
}

function initViewToggle() {
  // 뷰 모드 탭 (전체 수업 목록 / 캘린더)
  document.querySelectorAll('.view-mode-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-mode-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentMode = btn.dataset.mode; // 'list' | 'calendar'
      renderScheduleResult();
    });
  });

  // 수업 타입 필터 (우측 패널 내)
  document.querySelectorAll('.sr-type-filter .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sr-type-filter .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentFilter = btn.dataset.filter;
      renderScheduleResult();
    });
  });
}

function initSortButtons() {} // 더 이상 사용 안 함 (이름순 고정)

function renderScheduleResult() {
  const resultArea = document.getElementById('scheduleResult');
  const emptyArea  = document.getElementById('splitEmpty');
  const titleEl    = document.getElementById('resultTitle');
  const contentEl  = document.getElementById('scheduleContent');
  if (state.selectedStudents.length === 0) {
    resultArea.style.display = 'none';
    emptyArea.style.display  = 'flex';
    return;
  }
  resultArea.style.display = 'block';
  emptyArea.style.display  = 'none';

  const names = state.selectedStudents;

  // 이름 + 수강과목 표시
  const courseChips = (() => {
    if (names.length === 1) {
      const st = STUDENTS.find(s => s.name === names[0]);
      if (st && st.courses && st.courses.length) {
        return `<div class="sr-course-chips">${st.courses.map(c => {
          const color = (COURSES[c] && COURSES[c].color) ? COURSES[c].color : '#2563b0';
          return `<span class="sr-course-chip" style="border-left:3px solid ${color}">${c}</span>`;
        }).join('')}</div>`;
      }
    } else if (names.length > 1) {
      const allCourses = [...new Set(names.flatMap(n => {
        const st = STUDENTS.find(s => s.name === n);
        return st ? st.courses : [];
      }))];
      return `<div class="sr-course-chips"><span class="sr-course-chip-count">수강과목 합계 ${allCourses.length}개</span></div>`;
    }
    return '';
  })();

  titleEl.innerHTML = `<div class="sr-title-wrap">
    <div class="sr-name-row"><i class="fas fa-user"></i> ${names.join(', ')}</div>
    ${courseChips}
  </div>`;

  // 뷰 모드 변경 시 날짜 상세 패널 초기화
  const panelEl = document.getElementById('calDayDetailPanel');
  if (panelEl) { panelEl.style.display = 'none'; panelEl.dataset.open = ''; }
  document.querySelectorAll('.mini-cal-day.active-day').forEach(d => d.classList.remove('active-day'));

  const scheduleItems = getStudentSchedule(names, state.currentFilter);

  if (scheduleItems.length === 0) {
    contentEl.innerHTML = `<div class="empty-schedule">
      <i class="fas fa-calendar-times"></i>
      <p>해당 조건에 맞는 수업이 없습니다</p>
    </div>`;
    return;
  }

  if (state.currentMode === 'list') {
    // ── 전체 수업 목록
    contentEl.innerHTML = renderListView(scheduleItems, names);

  } else if (state.currentMode === 'calendar') {
    // ── 캘린더 뷰 (날짜별만 사용)
    contentEl.innerHTML = renderCalDateView(scheduleItems, names);
  }
}

function renderListView(items, studentNames) {
  const byDate = groupByDate(items);
  const dates = Object.keys(byDate).sort();

  return dates.map(date => {
    const dayItems = byDate[date].sort(sortByPeriod);
    const todayClass = isToday(date) ? 'today' : '';
    const hasExam    = dayItems.some(it => it.isExam);
    const wn = getWeekNumber(date);
    return `<div class="schedule-date-group">
      <div class="schedule-date-header">
        <span class="date-badge ${todayClass} ${hasExam ? 'exam-date' : ''}">${formatDateShort(date)}</span>
        <span class="date-week-no">${wn > 0 ? wn + '주차' : ''}</span>
        <span style="font-size:12px;color:#8a9ab0;">${dayItems.length}개 수업</span>
      </div>
      ${dayItems.map(item => renderScheduleItem(item, studentNames)).join('')}
    </div>`;
  }).join('');
}

// ── 화상Q&A 전용: 주간 시간표 뷰 ──────────────────────────
function renderQnaWeeklyView(items, studentNames) {
  if (!items.length) return '';

  // 요일 인덱스: 월=1, 화=2, 수=3, 목=4, 금=5 (토=6,일=0은 제외)
  const DAY_COLS = [1, 2, 3, 4, 5]; // Mon~Fri
  const DAY_LABEL = { 1: 'MON', 2: 'TUE', 3: 'WED', 4: 'THU', 5: 'FRI' };
  const DAY_KO    = ['일', '월', '화', '수', '목', '금', '토'];
  const TIME_SLOTS = ['19:00~20:00', '20:00~21:00', '21:00~22:00'];

  // 카테고리별 배경색 (연하게)
  function getCatBg(courseName) {
    const cat = COURSE_CATEGORY ? (COURSE_CATEGORY[courseName] || '기타') : '기타';
    const map = {
      '전략/경영': '#e8f4ff',
      '마케팅':    '#fff3e0',
      '재무/회계': '#e8f5e9',
      '인사/조직': '#fce4ec',
      '기술/IT':   '#f3e5f5',
      '기타':      '#f5f7fa'
    };
    return map[cat] || '#f5f7fa';
  }
  function getCatBorder(courseName) {
    const cat = COURSE_CATEGORY ? (COURSE_CATEGORY[courseName] || '기타') : '기타';
    const map = {
      '전략/경영': '#2196f3',
      '마케팅':    '#ff9800',
      '재무/회계': '#4caf50',
      '인사/조직': '#e91e63',
      '기술/IT':   '#9c27b0',
      '기타':      '#90a4ae'
    };
    return map[cat] || '#90a4ae';
  }

  // 월별 그룹핑
  const byMonth = {};
  items.forEach(item => {
    const ym = item.date.substring(0, 7);
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push(item);
  });

  return Object.keys(byMonth).sort().map(ym => {
    const [y, m] = ym.split('-').map(Number);
    const label = `${y}년 ${m}월`;
    const monthItems = byMonth[ym];

    // 이 월의 모든 월~금 날짜를 주차별로 그룹핑
    // 주차 = Math.ceil(date / 7) 방식 대신 "월요일 기준 ISO 주차" 사용
    const firstDay = new Date(y, m - 1, 1);
    const lastDate = new Date(y, m, 0).getDate();

    // 월~금만 존재하는 주차 목록 (각 주차에 해당하는 Mon~Fri 날짜 배열)
    const weeks = []; // [{weekLabel, dates: [{date, dow},...]}]
    let weekNum = 0;
    let curWeekDates = null;

    for (let d = 1; d <= lastDate; d++) {
      const dateObj = new Date(y, m - 1, d);
      const dow = dateObj.getDay(); // 0=일,...,6=토
      if (dow === 1) { // 월요일 → 새 주 시작
        weekNum++;
        curWeekDates = [];
        weeks.push({ weekNum, dates: curWeekDates });
      }
      if (dow >= 1 && dow <= 5) { // 월~금
        if (!curWeekDates) { // 월 시작이 화~금인 경우
          weekNum++;
          curWeekDates = [];
          weeks.push({ weekNum, dates: curWeekDates });
        }
        curWeekDates.push({ date: `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`, dow });
      }
    }

    // QNA 아이템을 date->item 맵핑
    const itemByDate = {};
    monthItems.forEach(item => {
      if (!itemByDate[item.date]) itemByDate[item.date] = [];
      itemByDate[item.date].push(item);
    });

    // 테이블 생성
    // 헤더: 구분(월rowspan) | 수업시간 | MON | TUE | WED | THU | FRI
    // 데이터 있는 주차만 표시
    const filteredWeeks = weeks.filter(w =>
      w.dates.some(d => itemByDate[d.date] && itemByDate[d.date].length > 0)
    );

    if (!filteredWeeks.length) return '';

    // 각 주차의 MON~FRI 날짜 맵
    function getWeekDateMap(week) {
      const map = {};
      week.dates.forEach(({ date, dow }) => { map[dow] = date; });
      return map;
    }

    // 테이블 행 생성: 주차 × 시간슬롯
    let tbodyRows = '';
    const monthRowCount = filteredWeeks.reduce((acc, week) => {
      const usedSlots = TIME_SLOTS.filter(slot =>
        week.dates.some(({ date }) =>
          itemByDate[date] && itemByDate[date].some(it => it.time === slot)
        )
      );
      return acc + Math.max(usedSlots.length, 1);
    }, 0);

    filteredWeeks.forEach((week, wi) => {
      const dateMap = getWeekDateMap(week);

      // 이 주차에서 실제 수업 있는 시간 슬롯만
      const usedSlots = TIME_SLOTS.filter(slot =>
        DAY_COLS.some(dow => {
          const date = dateMap[dow];
          return date && itemByDate[date] && itemByDate[date].some(it => it.time === slot);
        })
      );
      const slots = usedSlots.length > 0 ? usedSlots : ['19:00~20:00'];

      slots.forEach((slot, si) => {
        let rowHtml = '<tr>';

        // 주차 셀 (첫 슬롯만 rowspan)
        if (si === 0) {
          rowHtml += `<td class="qna-tbl-week" rowspan="${slots.length}">${week.weekNum}주차</td>`;
        }

        // 날짜 행 추가: 첫 슬롯에 날짜 숫자 행을 별도 tr로 앞에 삽입
        // → 대신 시간 슬롯 첫번째 행에 날짜를 셀 상단에 함께 표시하는 방식 사용

        // 수업시간 셀
        rowHtml += `<td class="qna-tbl-time">${slot}</td>`;

        // 요일별 셀
        DAY_COLS.forEach(dow => {
          const date = dateMap[dow];
          if (!date) {
            rowHtml += `<td class="qna-tbl-cell empty"></td>`;
            return;
          }
          const dd = parseInt(date.split('-')[2]);
          const cellItems = (itemByDate[date] || []).filter(it => it.time === slot);

          if (si === 0) {
            // 날짜 숫자는 첫 슬롯에만 표시 (셀 상단)
            const dateNum = `<div class="qna-tbl-datenum">${dd}</div>`;
            if (cellItems.length === 0) {
              rowHtml += `<td class="qna-tbl-cell">${dateNum}</td>`;
            } else {
              const cards = cellItems.map(item => {
                const course = COURSES[item.course] || { professor: '-', total: '?', color: '#2563b0' };
                const enrolled = studentNames
                  ? STUDENTS.filter(s => studentNames.includes(s.name) && s.courses.includes(item.course))
                  : [];
                const isPast   = new Date(item.date) < new Date(new Date().toDateString());
                const isTodayI = isToday(item.date);
                const bg     = getCatBg(item.course);
                const border = getCatBorder(item.course);
                const safeCourseName = item.course.replace(/'/g, "\\'");

                return `<div class="qna-tbl-card ${isPast?'past':''} ${isTodayI?'today-card':''}"
                  style="background:${bg};border-left:3px solid ${border}">
                  ${isTodayI ? '<span class="qna-today-dot">TODAY</span>' : ''}
                  <div class="qna-tbl-cname" onclick="showCourseDetail('${safeCourseName}')">${item.course}</div>
                  <div class="qna-tbl-cmeta">
                    <span><i class="fas fa-user-tie"></i> ${course.professor} 교수</span>
                    <span class="qna-tbl-session">${item.sessionNo}/3회차</span>
                  </div>
                  ${enrolled.length > 0 ? `<div class="qna-tbl-chips">${enrolled.map(s=>`<span class="qna-student-chip" onclick="showStudentInfoPopup('${s.name}',event)">${s.name}</span>`).join('')}</div>` : ''}
                </div>`;
              }).join('');
              rowHtml += `<td class="qna-tbl-cell has-item">${dateNum}${cards}</td>`;
            }
          } else {
            // 날짜 숫자 없이 수업 카드만
            if (cellItems.length === 0) {
              rowHtml += `<td class="qna-tbl-cell"></td>`;
            } else {
              const cards = cellItems.map(item => {
                const course = COURSES[item.course] || { professor: '-', total: '?', color: '#2563b0' };
                const enrolled = studentNames
                  ? STUDENTS.filter(s => studentNames.includes(s.name) && s.courses.includes(item.course))
                  : [];
                const isPast   = new Date(item.date) < new Date(new Date().toDateString());
                const isTodayI = isToday(item.date);
                const bg     = getCatBg(item.course);
                const border = getCatBorder(item.course);
                const safeCourseName = item.course.replace(/'/g, "\\'");

                return `<div class="qna-tbl-card ${isPast?'past':''} ${isTodayI?'today-card':''}"
                  style="background:${bg};border-left:3px solid ${border}">
                  ${isTodayI ? '<span class="qna-today-dot">TODAY</span>' : ''}
                  <div class="qna-tbl-cname" onclick="showCourseDetail('${safeCourseName}')">${item.course}</div>
                  <div class="qna-tbl-cmeta">
                    <span><i class="fas fa-user-tie"></i> ${course.professor} 교수</span>
                    <span class="qna-tbl-session">${item.sessionNo}/3회차</span>
                  </div>
                  ${enrolled.length > 0 ? `<div class="qna-tbl-chips">${enrolled.map(s=>`<span class="qna-student-chip" onclick="showStudentInfoPopup('${s.name}',event)">${s.name}</span>`).join('')}</div>` : ''}
                </div>`;
              }).join('');
              rowHtml += `<td class="qna-tbl-cell has-item">${cards}</td>`;
            }
          }
        });

        rowHtml += '</tr>';
        tbodyRows += rowHtml;
      });
    });

    return `<div class="qna-month-block">
      <div class="qna-month-header">
        <i class="fas fa-calendar-alt"></i> ${label}
        <span class="qna-month-count">${monthItems.length}개 수업</span>
      </div>
      <div class="qna-tbl-wrap">
        <table class="qna-tbl">
          <thead>
            <tr>
              <th class="qna-th-week">구분</th>
              <th class="qna-th-time">수업시간</th>
              <th class="qna-th-day">MON<span class="qna-th-ko">월</span></th>
              <th class="qna-th-day">TUE<span class="qna-th-ko">화</span></th>
              <th class="qna-th-day">WED<span class="qna-th-ko">수</span></th>
              <th class="qna-th-day">THU<span class="qna-th-ko">목</span></th>
              <th class="qna-th-day">FRI<span class="qna-th-ko">금</span></th>
            </tr>
          </thead>
          <tbody>${tbodyRows}</tbody>
        </table>
      </div>
    </div>`;
  }).join('');
}

// ── 캘린더 날짜별 뷰: 미니 캘린더 그리드
function renderCalDateView(items, studentNames) {
  const byDate = groupByDate(items);
  const allDates = Object.keys(byDate).sort();
  if (!allDates.length) return '';

  // 월 범위 추출
  const months = [...new Set(allDates.map(d => d.substring(0, 7)))].sort();

  let html = '';
  months.forEach(ym => {
    const [y, m] = ym.split('-').map(Number);
    const label = `${y}년 ${m}월`;
    const firstDay = new Date(y, m - 1, 1).getDay();
    const lastDate = new Date(y, m, 0).getDate();
    const prevLastDate = new Date(y, m - 1, 0).getDate();
    const weekdays = ['일','월','화','수','목','금','토'];

    const days = [];
    for (let i = firstDay - 1; i >= 0; i--) days.push({ day: prevLastDate - i, current: false });
    for (let d = 1; d <= lastDate; d++) {
      const dateStr = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayItems = byDate[dateStr] || [];
      const today = new Date();
      const isT = today.getFullYear()===y && today.getMonth()===m-1 && today.getDate()===d;
      days.push({ day: d, current: true, dateStr, items: dayItems, isToday: isT });
    }
    const rem = Math.ceil(days.length / 7) * 7 - days.length;
    for (let i = 1; i <= rem; i++) days.push({ day: i, current: false });

    const weekdayHtml = weekdays.map((w, i) =>
      `<div class="mini-cal-wday ${i===0?'sun':i===6?'sat':''}">${w}</div>`).join('');

    const daysHtml = days.map((d, idx) => {
      if (!d.current) return `<div class="mini-cal-day other"></div>`;
      const hasClass = d.items.length > 0;
      const hasExam  = d.items.some(it => it.isExam);
      const todayCls = d.isToday ? 'today' : '';
      const hasCls   = hasClass  ? 'has-class' : '';
      const examCls  = hasExam   ? 'exam-day'  : '';
      const sunCls   = idx % 7 === 0 ? 'sun' : idx % 7 === 6 ? 'sat' : '';
      const dotHtml = hasClass ? (() => {
        const offlineCnt = d.items.filter(i => i.type === 'offline' && !i.isExam).length;
        const qnaCnt     = d.items.filter(i => i.type === 'qna').length;
        const examCnt    = d.items.filter(i => i.isExam).length;
        const dots = [];
        if (offlineCnt) dots.push(`<span class="cal-dot offline"></span>`);
        if (qnaCnt)     dots.push(`<span class="cal-dot qna"></span>`);
        if (examCnt)    dots.push(`<span class="cal-dot exam"></span>`);
        return `<div class="cal-dot-row">${dots.join('')}</div>`
             + `<div class="cal-more-count">+${d.items.length}개</div>`;
      })() : '';
      return `<div class="mini-cal-day ${todayCls} ${hasCls} ${examCls} ${sunCls}" onclick="toggleDayDetail('${d.dateStr}', this)">
        <span class="mini-cal-num">${d.day}</span>
        ${dotHtml}
      </div>`;
    }).join('');

    html += `<div class="mini-cal-block">
      <div class="mini-cal-month-label"><i class="fas fa-calendar-alt"></i> ${label}</div>
      <div class="mini-cal-grid">
        <div class="mini-cal-weekdays">${weekdayHtml}</div>
        <div class="mini-cal-days">${daysHtml}</div>
      </div>
    </div>`;
  });

  return html;
}

// 여름집중학기 전용 카드 렌더 (원우 수강 데이터 없음 → 인원/팝업 미표시)
function renderSummerItem(item) {
  // 중간/기말고사
  if (item.kind === 'exam') {
    return `<div class="schedule-item exam">
      <div class="schedule-item-time">
        <span class="period-label" style="color:#c0392b">시험</span>
        <span class="time-range" style="color:#c0392b;font-weight:700">${item.time || '종일'}</span>
      </div>
      <div class="schedule-item-content">
        <div class="course-name-label exam-label"><i class="fas fa-file-alt"></i> ${item.course}</div>
        <div class="professor-label" style="color:#c0392b;opacity:0.8"><i class="fas fa-graduation-cap"></i> 여름집중학기</div>
      </div>
      <span class="type-badge exam"><i class="fas fa-file-alt"></i> 시험</span>
    </div>`;
  }
  // 해외글로벌세미나 (사전학습 1·2차 / 사후발표 3차)
  if (item.kind === 'seminar') {
    const sinfo = (typeof SUMMER_COURSES !== 'undefined' && SUMMER_COURSES[item.course]) || { professor: '-' };
    const sub   = item.note ? ` · ${item.note}` : '';
    return `<div class="schedule-item offline">
      <div class="schedule-item-time">
        <span class="period-label">세미나</span>
        <span class="time-range">${item.time || ''}</span>
      </div>
      <div class="schedule-item-content">
        <div class="course-name-label"><i class="fas fa-globe"></i> ${item.course}</div>
        <div class="professor-label"><i class="fas fa-user-tie"></i> ${sinfo.professor} 교수 · 해외글로벌세미나${sub}</div>
        ${item.sessionNo ? `<div class="session-label">${item.sessionNo}/${item.total}회차 · 여름집중학기</div>` : ''}
      </div>
      <span class="type-badge offline"><i class="fas fa-plane-departure"></i> 세미나</span>
    </div>`;
  }
  // 일반 여름 수업 (오프라인 / 화상Q&A)
  const info = (typeof SUMMER_COURSES !== 'undefined' && SUMMER_COURSES[item.course]) || { professor: '-' };
  return `<div class="schedule-item ${item.type}">
    <div class="schedule-item-time">
      <span class="period-label">${item.period || ''}</span>
      <span class="time-range">${item.time || ''}</span>
    </div>
    <div class="schedule-item-content">
      <div class="course-name-label">${item.course}</div>
      <div class="professor-label"><i class="fas fa-user-tie"></i> ${info.professor} 교수</div>
      <div class="session-label">${item.sessionNo}/${item.total}회차 · 여름집중학기</div>
    </div>
    ${getTypeBadge(item.type)}
  </div>`;
}

function renderScheduleItem(item, studentNames) {
  if (item.summer) return renderSummerItem(item);
  // 시험(중간/기말고사) 특수 처리
  if (item.isExam) {
    const course   = COURSES[item.course] || { professor: '-' };
    const examTime = item.time || '종일';
    const groupBadge = item.examGroup
      ? `<span class="exam-group-badge">${item.examGroup}그룹</span>`
      : '';
    // 수강 원우 chip (원우 선택 시)
    const shownStudents = studentNames
      ? STUDENTS.filter(s => studentNames.includes(s.name) && s.courses.includes(item.course))
      : [];
    const studentTags = shownStudents.length > 0
      ? `<div class="student-tags">${shownStudents.map(s =>
          `<span class="student-tag" onclick="event.stopPropagation();showStudentInfoPopup('${s.name}',event)" style="cursor:pointer">${s.name}</span>`
        ).join('')}</div>`
      : '';
    return `<div class="schedule-item exam">
      <div class="schedule-item-time">
        <span class="period-label" style="color:#c0392b">시험</span>
        <span class="time-range" style="color:#c0392b;font-weight:700">${examTime}</span>
      </div>
      <div class="schedule-item-content">
        <div class="course-name-label exam-label">
          <i class="fas fa-file-alt"></i> ${item.course} ${groupBadge}
        </div>
        <div class="professor-label" style="color:#c0392b;opacity:0.8">
          <i class="fas fa-user-tie"></i> ${course.professor} 교수 &nbsp;·&nbsp; ${item.date <= '2026-04-18' ? '중간고사' : '기말고사'}
        </div>
        ${studentTags}
      </div>
      <span class="type-badge exam"><i class="fas fa-file-alt"></i> 시험</span>
    </div>`;
  }
  const course = COURSES[item.course] || { name: item.course, professor: '-', color: '#999' };
  const shownStudents = studentNames
    ? STUDENTS.filter(s => studentNames.includes(s.name) && s.courses.includes(item.course))
    : [];
  const allStudents = STUDENTS.filter(s => s.courses.includes(item.course));
  const studentTags = shownStudents.length > 0
    ? `<div class="student-tags">${shownStudents.map(s => `<span class="student-tag" onclick="event.stopPropagation();showStudentInfoPopup('${s.name}',event)" style="cursor:pointer">${s.name}</span>`).join('')}</div>`
    : '';
  const period = CLASS_PERIODS[item.period] || { label: item.period, time: item.time || '' };
  const safeCourseName = item.course.replace(/'/g, "\\'");
  return `<div class="schedule-item ${item.type}">
    <div class="schedule-item-time">
      <span class="period-label">${period.label}</span>
      <span class="time-range">${item.time || period.time || ''}</span>
    </div>
    <div class="schedule-item-content" style="position:relative;">
      <div class="course-name-label si-clickable" onclick="toggleCourseStudentPopup(event, '${safeCourseName}')">
        ${item.course} <i class="fas fa-users tt-students-icon"></i>
      </div>
      <div class="professor-label"><i class="fas fa-user-tie"></i> ${course.professor} 교수</div>
      <div class="session-label">${item.sessionNo}/${item.type === 'qna' ? 3 : course.total}회차 · 전체 ${allStudents.length}명</div>
      ${studentTags}
    </div>
    ${getTypeBadge(item.type)}
  </div>`;
}

function renderWeekView(items, studentNames) {
  const byDate = groupByDate(items);
  const dates = Object.keys(byDate).sort();

  // 주차 그룹핑
  const weekGroups = {};
  dates.forEach(date => {
    const wn = getWeekNumber(date);
    const key = wn > 0 ? `${wn}` : '0';
    if (!weekGroups[key]) weekGroups[key] = [];
    weekGroups[key].push(date);
  });

  const periods = ['0교시', '1교시', '2교시', '3교시', '4교시'];

  return Object.keys(weekGroups).sort((a,b) => Number(a)-Number(b)).map(wn => {
    const weekDates = weekGroups[wn].sort();
    const header = weekDates.map(d => formatDateShort(d)).join(', ');
    const tableRows = periods.map(period => {
      const cells = weekDates.map(date => {
        const dayItems = (byDate[date] || []).filter(i => i.period === period);
        if (!dayItems.length) return '<td></td>';
        return `<td>${dayItems.map(i =>
          `<div class="week-cell-course ${i.type}" title="${i.course}">${i.course.length > 10 ? i.course.substring(0,10)+'…' : i.course}</div>`
        ).join('')}</td>`;
      }).join('');
      const pd = CLASS_PERIODS[period];
      return `<tr>
        <th style="white-space:nowrap;background:#f5f8ff;color:var(--primary);">${period}<br><span style="font-size:10px;font-weight:400;color:#8a9ab0">${pd ? pd.time : ''}</span></th>
        ${cells}
      </tr>`;
    }).join('');
    return `<div class="week-group">
      <div class="week-group-header">
        <div class="week-number-badge">${wn}</div>
        <div>
          <div class="week-date-range">${wn}주차</div>
          <div class="week-subtext">${header}</div>
        </div>
      </div>
      <div class="week-view">
        <table class="week-table">
          <thead><tr>
            <th style="width:80px">교시</th>
            ${weekDates.map(d => `<th>${formatDateShort(d)}</th>`).join('')}
          </tr></thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
    </div>`;
  }).join('');
}

function renderMonthGroupView(items, studentNames) {
  const byDate = groupByDate(items);
  const dates = Object.keys(byDate).sort();
  const byMonth = {};
  dates.forEach(d => {
    const ym = d.substring(0, 7);
    if (!byMonth[ym]) byMonth[ym] = [];
    byMonth[ym].push(d);
  });

  return Object.keys(byMonth).sort().map(ym => {
    const monthDates = byMonth[ym];
    const label = getMonthLabel(ym);
    const monthContent = monthDates.map(date => {
      const dayItems = byDate[date].sort(sortByPeriod);
      const hasExam  = dayItems.some(it => it.isExam);
      return `<div class="schedule-date-group">
        <div class="schedule-date-header">
          <span class="date-badge ${isToday(date) ? 'today' : ''} ${hasExam ? 'exam-date' : ''}">${formatDateShort(date)}</span>
          <span class="date-week-no">${getWeekNumber(date)}주차</span>
        </div>
        ${dayItems.map(item => renderScheduleItem(item, studentNames)).join('')}
      </div>`;
    }).join('');
    return `<div class="month-group">
      <div class="month-group-header"><i class="fas fa-calendar-alt"></i> ${label}</div>
      ${monthContent}
    </div>`;
  }).join('');
}

function groupByDate(items) {
  const result = {};
  items.forEach(item => {
    if (!result[item.date]) result[item.date] = [];
    result[item.date].push(item);
  });
  return result;
}

// 미니 캘린더 날짜 클릭 → 캘린더 위 상세 패널 토글
window.toggleDayDetail = function(dateStr, el) {
  const panel = document.getElementById('calDayDetailPanel');
  if (!panel) return;

  // 이미 같은 날짜가 열려 있으면 닫기
  if (panel.dataset.open === dateStr && panel.style.display !== 'none') {
    panel.style.display = 'none';
    panel.dataset.open = '';
    document.querySelectorAll('.mini-cal-day.active-day').forEach(d => d.classList.remove('active-day'));
    return;
  }

  // 활성 표시
  document.querySelectorAll('.mini-cal-day.active-day').forEach(d => d.classList.remove('active-day'));
  el.classList.add('active-day');
  panel.dataset.open = dateStr;

  const names = state.selectedStudents;
  const scheduleItems = getStudentSchedule(names, state.currentFilter);
  const dayItems = scheduleItems.filter(s => s.date === dateStr).sort(sortByPeriod);

  if (!dayItems.length) {
    panel.innerHTML = `<div class="cdp-header">
      <span><strong>${formatDateKo(dateStr)}</strong></span>
      <button class="cdp-close-btn" onclick="closeDayDetailPanel()"><i class="fas fa-times"></i></button>
    </div>
    <div class="empty-schedule" style="padding:20px"><i class="fas fa-calendar-times"></i><p>이 날은 수업이 없습니다</p></div>`;
  } else {
    panel.innerHTML = `<div class="cdp-header">
      <span><strong>${formatDateKo(dateStr)}</strong> <span class="date-week-no">${getWeekNumber(dateStr)}주차</span></span>
      <button class="cdp-close-btn" onclick="closeDayDetailPanel()"><i class="fas fa-times"></i></button>
    </div>
    ${dayItems.map(item => renderScheduleItem(item, names)).join('')}`;
  }
  panel.style.display = 'block';
  // 상세 패널 열리면 패널 최상단으로 스크롤
  setTimeout(() => {
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
};

window.closeDayDetailPanel = function() {
  const panel = document.getElementById('calDayDetailPanel');
  if (panel) {
    panel.style.display = 'none';
    panel.dataset.open = '';
  }
  document.querySelectorAll('.mini-cal-day.active-day').forEach(d => d.classList.remove('active-day'));
};

const periodOrder = ['전교시','0교시','1교시','2교시','3교시','4교시','저녁'];
function sortByPeriod(a, b) {
  const pa = periodOrder.indexOf(a.period);
  const pb = periodOrder.indexOf(b.period);
  if (pa !== pb) return pa - pb;
  // 동일/미지정 교시(여름집중학기 시간 블록)는 시작 시간순 정렬, 시간 없으면 맨 뒤
  const sa = (a.time || '').split('~')[0] || '99:99';
  const sb = (b.time || '').split('~')[0] || '99:99';
  return sa.localeCompare(sb);
}

// ============================================================
// TAB 2: 전체 시간표
// ============================================================
function initTimetableTab() {
  renderMonthTabs();
  renderTimetable();
  initFilterButtons('#tab-timetable .type-filter .filter-btn', (f) => {
    state.ttFilter = f || 'all';
    renderTimetable();
  });
  state.ttFilter = 'all';
}

function renderMonthTabs() {
  const container = document.getElementById('monthTabs');
  const months = [...new Set(getAllScheduleDates().map(d => d.substring(0,7)))].sort();
  container.innerHTML = months.map((ym, i) =>
    `<button class="month-tab ${i===0?'active':''}" data-month="${ym}" onclick="switchMonth('${ym}')">${getMonthLabel(ym)}</button>`
  ).join('');
  state.currentMonth = months[0];
}

window.switchMonth = function(ym) {
  state.currentMonth = ym;
  document.querySelectorAll('.month-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.month === ym);
  });
  renderTimetable();
};

function renderTimetable() {
  const container = document.getElementById('timetableContent');
  const filter = state.ttFilter || 'all';
  let data = getScheduleByFilter(filter);
  const dates = [...new Set(data.map(s => s.date))].sort()
    .filter(d => d.startsWith(state.currentMonth));

  if (!dates.length) {
    container.innerHTML = `<div class="empty-schedule"><i class="fas fa-calendar-times"></i><p>해당 월에 수업이 없습니다</p></div>`;
    return;
  }

  // renderListView / renderScheduleItem 과 동일한 구조로 렌더링
  // 단, 전체 시간표이므로 studentNames = null (수강생 태그 없음, 전체 인원 표시)
  container.innerHTML = dates.map(date => {
    const dayItems = data.filter(s => s.date === date).sort(sortByPeriod);
    const todayClass = isToday(date) ? 'today' : '';
    const hasExam    = dayItems.some(it => it.isExam);
    const wn = getWeekNumber(date);
    return `<div class="schedule-date-group">
      <div class="schedule-date-header">
        <span class="date-badge ${todayClass} ${hasExam ? 'exam-date' : ''}">${formatDateShort(date)}</span>
        <span class="date-week-no">${wn > 0 ? wn + '주차' : ''}</span>
        <span style="font-size:12px;color:#8a9ab0;">${dayItems.length}개 수업</span>
      </div>
      ${dayItems.map(item => renderTimetableItem(item)).join('')}
    </div>`;
  }).join('');
}

// 전체 시간표 전용 아이템 렌더 (수강생 chip 없이, 전체 인원 클릭으로 팝업)
function renderTimetableItem(item) {
  if (item.summer) return renderSummerItem(item);
  // 시험 처리
  if (item.isExam) {
    const course    = COURSES[item.course] || { professor: '-' };
    const examTime  = item.time || '종일';
    const groupBadge = item.examGroup
      ? `<span class="exam-group-badge">${item.examGroup}그룹</span>`
      : '';
    return `<div class="schedule-item exam">
      <div class="schedule-item-time">
        <span class="period-label" style="color:#c0392b">시험</span>
        <span class="time-range" style="color:#c0392b;font-weight:700">${examTime}</span>
      </div>
      <div class="schedule-item-content">
        <div class="course-name-label exam-label">
          <i class="fas fa-file-alt"></i> ${item.course} ${groupBadge}
        </div>
        <div class="professor-label" style="color:#c0392b;opacity:0.8">
          <i class="fas fa-user-tie"></i> ${course.professor} 교수 &nbsp;·&nbsp; ${item.date <= '2026-04-18' ? '중간고사' : '기말고사'}
        </div>
      </div>
      <span class="type-badge exam"><i class="fas fa-file-alt"></i> 시험</span>
    </div>`;
  }

  const course     = COURSES[item.course] || { name: item.course, professor: '-', color: '#999' };
  const allStudents = STUDENTS.filter(s => s.courses.includes(item.course));
  const period     = CLASS_PERIODS[item.period] || { label: item.period, time: item.time || '' };
  const safeCourseName = item.course.replace(/'/g, "\\'");

  return `<div class="schedule-item ${item.type}">
    <div class="schedule-item-time">
      <span class="period-label">${period.label}</span>
      <span class="time-range">${item.time || period.time || ''}</span>
    </div>
    <div class="schedule-item-content" style="position:relative;">
      <div class="course-name-label si-clickable" onclick="toggleCourseStudentPopup(event, '${safeCourseName}')">
        ${item.course} <i class="fas fa-users tt-students-icon"></i>
      </div>
      <div class="professor-label"><i class="fas fa-user-tie"></i> ${course.professor} 교수</div>
      <div class="session-label">${item.sessionNo}/${item.type === 'qna' ? 3 : course.total}회차 · 전체 ${allStudents.length}명</div>
    </div>
    ${getTypeBadge(item.type)}
  </div>`;
}

// 과목 수강생 팝업 토글
let _openPopupCourse = null;
window.toggleCourseStudentPopup = function(e, courseName) {
  e.stopPropagation();
  // 기존 팝업 모두 제거
  document.querySelectorAll('.course-student-popup').forEach(p => p.remove());
  removePopupOverlay();
  if (_openPopupCourse === courseName) {
    _openPopupCourse = null;
    return;
  }
  _openPopupCourse = courseName;

  const students = STUDENTS.filter(s => s.courses.includes(courseName));
  const popup = document.createElement('div');
  popup.className = 'course-student-popup';
  popup.innerHTML = `
    <div class="csp-header">
      <span class="csp-title"><i class="fas fa-users"></i> 수강생 (${students.length}명)</span>
      <button class="csp-close" onclick="event.stopPropagation();closePopup()"><i class="fas fa-times"></i></button>
    </div>
    <div class="csp-list">${students.map(s =>
      `<span class="csp-chip" onclick="event.stopPropagation();showStudentInfoPopup('${s.name}',event)">${s.name}</span>`
    ).join('')}</div>
  `;

  // PC/모바일 모두 화면 정중앙 fixed 고정
  document.body.appendChild(popup);
  showPopupOverlay();
};

function showPopupOverlay() {
  let overlay = document.getElementById('popupOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'popupOverlay';
    overlay.className = 'popup-overlay';
    overlay.addEventListener('click', closePopup);
    document.body.appendChild(overlay);
  }
  overlay.classList.add('active');
}

function removePopupOverlay() {
  const overlay = document.getElementById('popupOverlay');
  if (overlay) overlay.classList.remove('active');
}

window.closePopup = function() {
  document.querySelectorAll('.course-student-popup').forEach(p => p.remove());
  removePopupOverlay();
  _openPopupCourse = null;
};

document.addEventListener('click', () => {
  document.querySelectorAll('.course-student-popup').forEach(p => p.remove());
  removePopupOverlay();
  _openPopupCourse = null;
});

// ============================================================
// TAB 3: 캘린더 뷰
// ============================================================
function initCalendarTab() {
  renderCalendar();
  document.getElementById('calPrev').addEventListener('click', () => {
    state.calendarMonth--;
    if (state.calendarMonth < 0) { state.calendarMonth = 11; state.calendarYear--; }
    renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    state.calendarMonth++;
    if (state.calendarMonth > 11) { state.calendarMonth = 0; state.calendarYear++; }
    renderCalendar();
  });
  document.getElementById('closeDayDetail').addEventListener('click', () => {
    document.getElementById('dayDetail').style.display = 'none';
  });
  initCalStudentSearch();
  initFilterButtons('#tab-calendar .type-filter .filter-btn', (f) => {
    state.calFilter = f;
    renderCalendar();
  });
  state.calFilter = 'all';
}

function initCalStudentSearch() {
  const input = document.getElementById('calStudentSearch');
  const dropdown = document.getElementById('calDropdown');

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (q.length >= 1) {
      const matched = STUDENTS.filter(s => s.name.includes(q) && !state.calSelectedStudents.includes(s.name)).slice(0, 6);
      if (!matched.length) { dropdown.style.display = 'none'; return; }
      dropdown.innerHTML = matched.map(s =>
        `<div class="dropdown-item" onclick="calToggleStudent('${s.name}')">
          <div class="dropdown-avatar">${getInitial(s.name)}</div>
          <div><div class="dropdown-name">${s.name}</div></div>
        </div>`
      ).join('');
      dropdown.style.display = 'block';
    } else {
      dropdown.style.display = 'none';
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.cal-student-select-wrap')) dropdown.style.display = 'none';
  });
}

window.calToggleStudent = function(name) {
  if (!state.calSelectedStudents.includes(name)) {
    state.calSelectedStudents.push(name);
  } else {
    state.calSelectedStudents = state.calSelectedStudents.filter(n => n !== name);
  }
  document.getElementById('calStudentSearch').value = '';
  document.getElementById('calDropdown').style.display = 'none';
  renderCalSelectedChips();
  renderCalendar();
};

function renderCalSelectedChips() {
  const container = document.getElementById('calSelectedChips');
  container.innerHTML = state.calSelectedStudents.map(name =>
    `<div class="chip" style="font-size:12px;padding:4px 10px;">
      ${name}
      <span class="chip-remove" onclick="calToggleStudent('${name}')"><i class="fas fa-times"></i></span>
    </div>`
  ).join('');
}

function renderCalendar() {
  const y = state.calendarYear;
  const m = state.calendarMonth;
  document.getElementById('calTitle').textContent = `${y}년 ${m+1}월`;

  const grid = document.getElementById('calendarGrid');
  const weekdays = ['일','월','화','수','목','금','토'];

  // 해당 월 날짜 계산
  const firstDay = new Date(y, m, 1).getDay();
  const lastDate = new Date(y, m+1, 0).getDate();
  const prevLastDate = new Date(y, m, 0).getDate();

  let data = getScheduleByFilter(state.calFilter);
  if (state.calSelectedStudents.length > 0) {
    data = getStudentSchedule(state.calSelectedStudents, state.calFilter);
  }

  const days = [];
  // 이전 월 날짜
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevLastDate - i, current: false, date: null });
  }
  // 현재 월 날짜
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayData = data.filter(s => s.date === dateStr);
    const today = new Date();
    const isT = today.getFullYear()===y && today.getMonth()===m && today.getDate()===d;
    days.push({ day: d, current: true, date: dateStr, items: dayData, isToday: isT });
  }
  // 다음 월 날짜
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, current: false, date: null });
  }

  const weekdayHtml = weekdays.map(w =>
    `<div class="cal-weekday">${w}</div>`).join('');

  const daysHtml = days.map((d, idx) => {
    if (!d.current) {
      return `<div class="cal-day other-month">
        <span class="cal-day-num">${d.day}</span>
      </div>`;
    }
    const items = d.items || [];
    const hasClass = items.length > 0;
    const todayClass = d.isToday ? 'today' : '';
    const hasClassC = hasClass ? 'has-class' : '';

    // 항상 dot + 개수 방식으로 표시
    let eventHtml, moreHtml;
    if (items.length > 0) {
      const offlineCnt = items.filter(i => i.type === 'offline' && !i.isExam).length;
      const qnaCnt     = items.filter(i => i.type === 'qna').length;
      const examCnt    = items.filter(i => i.isExam).length;
      const dots = [];
      if (offlineCnt) dots.push(`<span class="cal-dot offline"></span>`);
      if (qnaCnt)     dots.push(`<span class="cal-dot qna"></span>`);
      if (examCnt)    dots.push(`<span class="cal-dot exam"></span>`);
      eventHtml = `<div class="cal-dot-row">${dots.join('')}</div>`;
      moreHtml  = `<div class="cal-more-count">+${items.length}개</div>`;
    } else {
      eventHtml = '';
      moreHtml  = '';
    }

    return `<div class="cal-day ${todayClass} ${hasClassC}" onclick="showDayDetail('${d.date}')">
      <span class="cal-day-num">${d.day}</span>
      ${eventHtml}
      ${moreHtml}
    </div>`;
  }).join('');

  grid.innerHTML = `
    <div class="cal-weekdays">${weekdayHtml}</div>
    <div class="cal-days">${daysHtml}</div>
  `;
}

window.showDayDetail = function(dateStr) {
  const detail = document.getElementById('dayDetail');
  const title = document.getElementById('dayDetailTitle');
  const content = document.getElementById('dayDetailContent');

  let data = getScheduleByFilter(state.calFilter);
  if (state.calSelectedStudents.length > 0) {
    data = getStudentSchedule(state.calSelectedStudents, state.calFilter);
  }
  const items = data.filter(s => s.date === dateStr).sort(sortByPeriod);

  title.textContent = formatDateKo(dateStr);

  if (!items.length) {
    content.innerHTML = `<div class="empty-schedule"><i class="fas fa-calendar-times"></i><p>이 날은 수업이 없습니다</p></div>`;
  } else {
    const studentNames = state.calSelectedStudents.length > 0 ? state.calSelectedStudents : null;
    content.innerHTML = items.map(item => renderScheduleItem(item, studentNames)).join('');
  }

  detail.style.display = 'block';
  detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// ============================================================
// TAB 4: 과목별 조회
// ============================================================
function initCoursesTab() {
  renderCourseGrid();
  document.getElementById('closeCourseDetail').addEventListener('click', () => {
    document.getElementById('courseDetail').style.display = 'none';
  });
}

function renderCourseGrid() {
  const grid = document.getElementById('courseListGrid');
  // 시험(중간/기말고사)은 과목 카드에서 제외, 세미나는 정식 과목이므로 포함
  const courseNames = [...new Set(SCHEDULE_DATA.filter(s => !s.isExam).map(s => s.course))].sort();

  grid.innerHTML = courseNames.map(courseName => {
    const course = COURSES[courseName] || { name: courseName, professor: '-', total: '?', color: '#999' };
    const schedules = SCHEDULE_DATA.filter(s => s.course === courseName);
    const students = STUDENTS.filter(s => s.courses.includes(courseName));
    return `<div class="course-card" style="border-top-color: ${course.color}" onclick="showCourseDetail('${courseName}')">
      <div class="cc-name">${courseName}</div>
      <div class="cc-prof"><i class="fas fa-user-tie"></i> ${course.professor} 교수</div>
      <div class="cc-stats">
        <span class="cc-stat"><i class="fas fa-users"></i> ${students.length}명</span>
      </div>
    </div>`;
  }).join('');
}

window.showCourseDetail = function(courseName) {
  const detail = document.getElementById('courseDetail');
  const title = document.getElementById('courseDetailTitle');
  const content = document.getElementById('courseDetailContent');

  const course = COURSES[courseName] || { name: courseName, professor: '-', total: '?' };
  const schedules = [...SCHEDULE_DATA, ...QNA_SCHEDULE]
    .filter(s => s.course === courseName && !s.isExam)
    .sort((a,b) => a.date.localeCompare(b.date));
  const students = STUDENTS.filter(s => s.courses.includes(courseName));

  title.textContent = courseName;

  const studentHtml = students.map(s =>
    `<span class="cd-student-chip" onclick="showStudentInfoPopup('${s.name}',event)">${s.name}</span>`
  ).join('');

  const scheduleHtml = schedules.map(item => {
    const period = CLASS_PERIODS[item.period] || { label: item.period, time: item.time || '' };
    // 실제 수업 시간(item.time)을 우선 — 화상Q&A는 회차마다 시간이 달라 교시 기본시간으로 덮으면 안 됨
    return `<div class="cd-schedule-item ${item.type}">
      <strong>${formatDateShort(item.date)}</strong>
      &nbsp;·&nbsp; ${period.label} (${item.time || period.time || ''})
      &nbsp; ${getTypeBadge(item.type)}
    </div>`;
  }).join('');

  content.innerHTML = `
    <div style="margin-bottom:16px;padding:14px;background:#f5f8ff;border-radius:10px;">
      <strong>담당교수:</strong> ${course.professor} 교수 &nbsp;|&nbsp;
      <strong>총 강의:</strong> ${schedules.length}회 &nbsp;|&nbsp;
      <strong>수강인원:</strong> ${students.length}명
    </div>
    <div class="cd-grid">
      <div>
        <div class="cd-section-title"><i class="fas fa-users"></i> 수강 원우 (${students.length}명)</div>
        <div class="cd-student-list">${studentHtml || '<span style="color:#8a9ab0">등록된 원우 없음</span>'}</div>
      </div>
      <div>
        <div class="cd-section-title"><i class="fas fa-calendar-check"></i> 수업 일정 (${schedules.length}회)</div>
        <div class="cd-schedule-list">${scheduleHtml || '<span style="color:#8a9ab0">일정 없음</span>'}</div>
      </div>
    </div>
  `;

  detail.style.display = 'block';
  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.goToStudent = function(name) {
  // 검색 탭으로 이동
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="search"]').classList.add('active');
  document.getElementById('tab-search').classList.add('active');

  state.selectedStudents = [name];
  state.searchQuery = '';
  renderStudentList();
  renderScheduleResult();
  document.getElementById('splitRight').scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ============================================================
// 엑셀 다운로드
// ============================================================
window.exportScheduleToExcel = function() {
  const names = state.selectedStudents;
  if (!names || names.length === 0) {
    alert('원우를 먼저 선택해주세요.');
    return;
  }

  const items = getStudentSchedule(names, state.currentFilter);
  if (!items.length) {
    alert('다운로드할 수업 데이터가 없습니다.');
    return;
  }

  const wb = XLSX.utils.book_new();

  // ── 시트1: 수업 일정 목록 ──────────────────────────────────
  const scheduleRows = [
    ['날짜', '요일', '주차', '교시', '시간', '과목명', '교수', '회차', '구분', '수강 원우']
  ];

  const sorted = [...items].sort((a, b) => a.date.localeCompare(b.date) || sortByPeriod(a, b));
  const periodOrder = { '0교시': 0, '1교시': 1, '2교시': 2, '3교시': 3, '4교시': 4, '저녁': 5, '전교시': 6 };

  sorted.forEach(item => {
    const d = new Date(item.date);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayStr = days[d.getDay()];
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateStr = `${d.getFullYear()}-${mm}-${dd}`;
    const wn = getWeekNumber(item.date);
    const weekStr = wn > 0 ? `${wn}주차` : '';

    const period = CLASS_PERIODS[item.period] || { label: item.period, time: item.time || '' };
    const course = COURSES[item.course] || { professor: '-', total: '?' };

    const typeLabel = item.type === 'qna' ? '화상Q&A' : (item.type === 'exam' ? '시험' : '오프라인');

    // 해당 수업을 수강하는 선택 원우 목록
    const enrolled = names.filter(n => {
      const s = STUDENTS.find(st => st.name === n);
      return s && s.courses.includes(item.course);
    });

    scheduleRows.push([
      dateStr,
      dayStr,
      weekStr,
      period.label,
      item.time || period.time || '',
      item.course,
      course.professor,
      `${item.sessionNo}/${item.type === 'qna' ? 3 : course.total}회차`,
      typeLabel,
      enrolled.join(', ')
    ]);
  });

  const wsSchedule = XLSX.utils.aoa_to_sheet(scheduleRows);

  // 열 너비 설정
  wsSchedule['!cols'] = [
    { wch: 12 }, { wch: 5 }, { wch: 6 }, { wch: 8 }, { wch: 14 },
    { wch: 28 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 40 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSchedule, '수업일정');

  // ── 시트2: 원우별 수강 과목 ────────────────────────────────
  const studentRows = [['이름', '소속', '회사', '수강과목수', '수강과목']];
  names.forEach(n => {
    const s = STUDENTS.find(st => st.name === n);
    if (!s) return;
    studentRows.push([
      s.name,
      s.location || '국내',
      s.company || '-',
      s.courses.length,
      s.courses.join(', ')
    ]);
  });

  const wsStudents = XLSX.utils.aoa_to_sheet(studentRows);
  wsStudents['!cols'] = [
    { wch: 8 }, { wch: 20 }, { wch: 30 }, { wch: 8 }, { wch: 60 }
  ];
  XLSX.utils.book_append_sheet(wb, wsStudents, '원우정보');

  // ── 파일명: 원우명_날짜.xlsx ──────────────────────────────
  const today = new Date();
  const ymd = `${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}`;
  const nameTag = names.length === 1 ? names[0] : `${names[0]} 외 ${names.length - 1}명`;
  const filterTag = state.currentFilter === 'qna' ? '_화상QA' : state.currentFilter === 'offline' ? '_오프라인' : '';
  const fileName = `IMBA46_${nameTag}${filterTag}_${ymd}.xlsx`;

  XLSX.writeFile(wb, fileName);
};

// ============================================================
// 원우 개인정보 팝업
// ============================================================
window.showStudentInfoPopup = function(name, event) {
  event && event.stopPropagation();

  // 기존 팝업 제거
  document.querySelectorAll('.student-info-popup').forEach(p => p.remove());

  const student = STUDENTS.find(s => s.name === name);
  if (!student) return;

  const isAbroad = student.location && student.location !== '국내';
  const locationIcon = isAbroad ? '✈️' : '🏢';
  const locationBadgeClass = isAbroad ? 'sip-badge abroad' : 'sip-badge domestic';
  const locationText = student.location || '국내';

  const coursesHtml = (student.courses || []).map(c => {
    const course = COURSES[c] || { professor: '-', color: '#888' };
    return `<span class="sip-course-chip" style="border-left:3px solid ${course.color}" onclick="event.stopPropagation();closeStudentInfoPopup();showCourseDetail('${c.replace(/'/g,"\\'")}');">${c}</span>`;
  }).join('');

  const popup = document.createElement('div');
  popup.className = 'student-info-popup';
  popup.innerHTML = `
    <div class="sip-header">
      <div class="sip-avatar">${name.charAt(0)}</div>
      <div class="sip-title-wrap">
        <div class="sip-name">${name}</div>
        <span class="${locationBadgeClass}">${locationIcon} ${locationText}</span>
      </div>
      <button class="sip-close" onclick="event.stopPropagation();closeStudentInfoPopup()">✕</button>
    </div>
    <div class="sip-body">
      <div class="sip-row">
        <span class="sip-label"><i class="fas fa-building"></i> 소속</span>
        <span class="sip-value">${student.company || '-'}</span>
      </div>
      <div class="sip-row">
        <span class="sip-label"><i class="fas fa-book-open"></i> 수강과목</span>
      </div>
      <div class="sip-courses">${coursesHtml || '<span style="color:#aaa;font-size:12px;">수강 과목 없음</span>'}</div>
    </div>
    <div class="sip-footer">
      <button class="sip-schedule-btn" onclick="event.stopPropagation();closeStudentInfoPopup();goToStudent('${name}')">
        <i class="fas fa-calendar-alt"></i> 수업 일정 보기
      </button>
    </div>
  `;

  popup.style.position  = 'fixed';
  popup.style.left      = '50%';
  popup.style.top       = '50%';
  // transform은 CSS(sipFadeIn 포함)에서 translate(-50%,-50%) 고정 처리

  // 배경 딥 오버레이
  const overlay = document.createElement('div');
  overlay.className = 'sip-overlay';
  overlay.onclick = () => closeStudentInfoPopup();
  document.body.appendChild(overlay);
  document.body.appendChild(popup);

  // 외부 클릭 시 닫기
  setTimeout(() => {
    document.addEventListener('click', _closePopupOnOutside);
  }, 0);
};

function _closePopupOnOutside(e) {
  if (!e.target.closest('.student-info-popup')) {
    closeStudentInfoPopup();
  }
}

window.closeStudentInfoPopup = function() {
  document.querySelectorAll('.student-info-popup').forEach(p => p.remove());
  document.querySelectorAll('.sip-overlay').forEach(o => o.remove());
  document.removeEventListener('click', _closePopupOnOutside);
};

// ============================================================
// TAB 5: 과목 통계
// ============================================================

// 과목 분야 분류
const COURSE_CATEGORY = {
  '경영전략론':                         '전략/경영',
  '국제경영론':                         '전략/경영',
  '일과조직의관리와혁신':               '전략/경영',
  '인적자원전략론':                     '전략/경영',
  '조직행동론':                         '전략/경영',
  '창업실무론':                         '전략/경영',
  '마케팅믹스론':                       '마케팅',
  '마케팅관리론(1분반)':                '마케팅',
  '마케팅조사론':                       '마케팅',
  '유통관리론':                         '마케팅',
  '소비자경험관리':                     '마케팅',
  '소비자행동론':                       '마케팅',
  '글로벌금융시장':                     '재무/금융',
  '금융시장과금융기관의변화':           '재무/금융',
  '기업재무전략론':                     '재무/금융',
  '증권투자의이해':                     '재무/금융',
  '핀테크와행동재무':                   '재무/금융',
  '글로벌비즈니스협상론':              '국제경영',
  '글로벌ESG론':                       '국제경영',
  '재무제표분석론':                     '회계',
  '재무회계론':                         '회계',
  '회계와기업경영':                     '회계',
  '회계와비즈니스모델의이해':           '회계',
  '빅데이터분석론':                     'IT/데이터',
  '경영자를위한데이터분석및통계적사고': 'IT/데이터',
  '최신정보시스템사례와전략':           'IT/데이터',
};

const CATEGORY_COLORS = {
  '전략/경영': '#3498db',
  '마케팅':    '#e91e63',
  '재무/금융': '#f39c12',
  '국제경영':  '#27ae60',
  '회계':      '#9b59b6',
  'IT/데이터': '#e74c3c',
};

// 통계 탭 상태
const statsState = {
  sortCol: 'students',
  sortDir: 'desc',
  searchQ: ''
};

function initStatsTab() {
  renderStatsKpi();
  renderStatsTable();

  // 테이블 검색
  document.getElementById('statsTableSearch').addEventListener('input', e => {
    statsState.searchQ = e.target.value.trim();
    renderStatsTable();
  });

  // 컬럼 정렬
  document.querySelectorAll('#statsTable thead .sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (statsState.sortCol === col) {
        statsState.sortDir = statsState.sortDir === 'desc' ? 'asc' : 'desc';
      } else {
        statsState.sortCol = col;
        statsState.sortDir = 'desc';
      }
      document.querySelectorAll('#statsTable thead .sortable').forEach(h => {
        h.classList.remove('sorted-asc','sorted-desc');
        h.querySelector('i').className = 'fas fa-sort';
      });
      th.classList.add(statsState.sortDir === 'desc' ? 'sorted-desc' : 'sorted-asc');
      th.querySelector('i').className = statsState.sortDir === 'desc'
        ? 'fas fa-sort-down' : 'fas fa-sort-up';
      renderStatsTable();
    });
  });
}

// ── 핵심 통계 KPI 카드
function renderStatsKpi() {
  const totalStudents  = STUDENTS.length;
  const totalCourses   = Object.keys(COURSES).length;
  const totalOffline   = SCHEDULE_DATA.filter(s => s.type === 'offline' && !s.isExam).length;
  const totalQna       = QNA_SCHEDULE.length;
  const totalSessions  = totalOffline + totalQna;
  const avgCourses     = totalStudents
    ? (STUDENTS.reduce((s, st) => s + st.courses.length, 0) / totalStudents).toFixed(1)
    : '0';
  const overseasCount  = STUDENTS.filter(s => s.location && s.location !== '국내').length;

  // 최다 수강 과목
  const topCourse = Object.keys(COURSES)
    .map(c => ({ name: c, cnt: STUDENTS.filter(s => s.courses.includes(c)).length }))
    .sort((a, b) => b.cnt - a.cnt)[0] || { name: '-', cnt: 0 };

  // 최소 수강 과목
  const minCourse = Object.keys(COURSES)
    .map(c => ({ name: c, cnt: STUDENTS.filter(s => s.courses.includes(c)).length }))
    .sort((a, b) => a.cnt - b.cnt)[0] || { name: '-', cnt: 0 };

  const kpis = [
    {
      icon: 'fa-users',
      color: '#2563b0',
      bg:    '#e8f0ff',
      label: '총 원우 수',
      value: `${totalStudents}명`,
      sub:   `해외 재직 ${overseasCount}명 포함`
    },
    {
      icon: 'fa-book-open',
      color: '#0d9488',
      bg:    '#e6faf8',
      label: '총 과목 수',
      value: `${totalCourses}개`,
      sub:   `원우 평균 ${avgCourses}과목 수강`
    },
    {
      icon: 'fa-trophy',
      color: '#d97706',
      bg:    '#fff8e1',
      label: '최다 수강 과목',
      value: topCourse.name,
      sub:   `${topCourse.cnt}명 수강`
    },
    {
      icon: 'fa-user-graduate',
      color: '#059669',
      bg:    '#e6f7f0',
      label: '최소 수강 과목',
      value: minCourse.name,
      sub:   `${minCourse.cnt}명 수강`
    }
  ];

  document.getElementById('statsKpiRow').innerHTML = kpis.map(k => `
    <div class="stats-kpi-card">
      <div class="skc-icon" style="background:${k.bg};color:${k.color}">
        <i class="fas ${k.icon}"></i>
      </div>
      <div class="skc-body">
        <div class="skc-label">${k.label}</div>
        <div class="skc-value" style="color:${k.color}">${k.value}</div>
        <div class="skc-sub">${k.sub}</div>
      </div>
    </div>
  `).join('');
}

// ── 과목 상세 테이블
function renderStatsTable() {
  const q = statsState.searchQ.toLowerCase();

  let rows = Object.keys(COURSES).map(cName => {
    const c        = COURSES[cName];
    const students = STUDENTS.filter(s => s.courses.includes(cName));
    const offline  = SCHEDULE_DATA.filter(s => s.course === cName && s.type === 'offline').length;
    const qna      = [...SCHEDULE_DATA, ...QNA_SCHEDULE].filter(s => s.course === cName && s.type === 'qna').length;
    const cat      = COURSE_CATEGORY[cName] || '기타';
    return { name: cName, professor: c.professor, students: students.length,
             sessions: c.total, offline, qna, color: c.color, cat,
             studentList: students };
  });

  if (q) rows = rows.filter(r => r.name.includes(q));

  // 정렬
  rows.sort((a,b) => {
    let va = a[statsState.sortCol], vb = b[statsState.sortCol];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (statsState.sortDir === 'desc') return vb > va ? 1 : vb < va ? -1 : 0;
    return va > vb ? 1 : va < vb ? -1 : 0;
  });

  const maxStudents = Math.max(...rows.map(r => r.students));

  document.getElementById('statsTableBody').innerHTML = rows.map(r => {
    const catColor   = CATEGORY_COLORS[r.cat] || '#999';
    const barPct     = Math.round((r.students / maxStudents) * 100);
    const chipsHtml  = r.studentList.map(s =>
      `<span class="csp-chip" onclick="showStudentInfoPopup('${s.name}',event)">${s.name}</span>`
    ).join('');
    return `<tr>
      <td>
        <div class="st-course-name-cell">
          <span class="st-color-dot" style="background:${catColor}"></span>
          <div>
            <div style="font-weight:600;font-size:13px">${r.name}</div>
            <span class="st-cat-badge" style="background:${catColor}22;color:${catColor}">${r.cat}</span>
          </div>
        </div>
      </td>
      <td>
        <div class="st-bar-cell">
          <span class="st-bar-num" style="min-width:32px;font-weight:700;color:${catColor}">${r.students}명</span>
          <div class="st-inline-bar">
            <div class="st-inline-fill" style="width:${barPct}%;background:${catColor}"></div>
          </div>
        </div>
      </td>
      <td class="hide-mobile">
        <div class="st-chips-cell">${chipsHtml}</div>
      </td>
    </tr>`;
  }).join('');
}

// ============================================================
// 날짜별 조회 탭
// ============================================================
function initDateQueryTab() {
  const dateInput   = document.getElementById('dqDateInput');
  const timeslotEl  = document.getElementById('dqTimeslots');

  dateInput.addEventListener('change', () => {
    const dateVal = dateInput.value;
    if (!dateVal) return;
    renderDqTimeslots(dateVal);
    hideDqResult();
  });
}

// 선택 날짜에 존재하는 시간대 버튼 렌더링
function renderDqTimeslots(dateStr) {
  const timeslotEl = document.getElementById('dqTimeslots');
  // 그룹/시간 없는 시험(여름 중간·기말고사)은 시간대 선택 대상에서 제외
  const allItems   = [...SCHEDULE_DATA, ...QNA_SCHEDULE].filter(s => s.date === dateStr && !(s.isExam && !s.examGroup));

  if (!allItems.length) {
    timeslotEl.innerHTML = `<span class="dq-timeslot-hint" style="color:#e74c3c"><i class="fas fa-calendar-times"></i> 해당 날짜에 수업이 없습니다</span>`;
    return;
  }

  // 시험 날짜 여부 확인
  const isExamDate = allItems.some(s => s.isExam);

  // 시험 날짜: 시간대별로 그룹핑 (모든 시험 과목을 시간대로 묶음)
  if (isExamDate) {
    // 시험 과목들의 고유 시간대 추출
    const examSlotMap = {};
    allItems.filter(s => s.isExam).forEach(item => {
      const timeStr   = item.time || '';
      const startTime = timeStr ? timeStr.split('~')[0] : '99:99';
      const key       = timeStr || item.period;
      if (!examSlotMap[key]) {
        examSlotMap[key] = {
          period:  item.period,
          label:   `${item.examGroup}그룹`,
          time:    timeStr,
          start:   startTime,
          isExam:  true,
          key
        };
      } else {
        // 같은 시간대에 여러 그룹이 있을 경우 첫 번째 그룹 사용
      }
    });
    // 그룹 라벨을 시간대별로 재정리 (같은 시간 → 그룹명 하나로)
    const groupByTime = {};
    allItems.filter(s => s.isExam).forEach(item => {
      const timeStr = item.time || '';
      if (!groupByTime[timeStr]) groupByTime[timeStr] = { groups: new Set(), start: timeStr.split('~')[0] || '99:99' };
      groupByTime[timeStr].groups.add(item.examGroup);
    });

    const examSlots = Object.entries(groupByTime)
      .sort((a, b) => a[1].start.localeCompare(b[1].start))
      .map(([timeStr, info]) => ({
        period:  '전교시',
        label:   [...info.groups].sort().join('/') + '그룹',
        time:    timeStr,
        start:   info.start,
        isExam:  true,
        key:     '전교시|' + timeStr
      }));

    // 일반 수업도 있으면 추가
    const normalItems = allItems.filter(s => !s.isExam);
    const normalSlots = [];
    if (normalItems.length) {
      const slotMap = {};
      normalItems.forEach(item => {
        const periodInfo = CLASS_PERIODS[item.period] || { label: item.period, time: item.time || '', start: item.time ? item.time.split('~')[0] : '99:99' };
        const timeStr    = item.time || periodInfo.time || '';
        const startTime  = item.time ? item.time.split('~')[0] : (periodInfo.start || '99:99');
        const key        = item.period + '|' + timeStr;
        if (!slotMap[key]) slotMap[key] = { period: item.period, label: periodInfo.label || item.period, time: timeStr, start: startTime, isExam: false, key };
      });
      normalSlots.push(...Object.values(slotMap));
    }

    const allSlots = [...examSlots, ...normalSlots].sort((a, b) => a.start.localeCompare(b.start));

    timeslotEl.innerHTML = allSlots.map(s => `
      <button class="dq-timeslot-btn${s.isExam ? ' dq-exam-slot' : ''}" data-key="${s.key}" data-period="${s.period}" data-time="${s.time}" data-isexam="${s.isExam ? '1' : '0'}">
        ${s.isExam ? '<i class="fas fa-pencil-alt"></i> ' : ''}<span class="dq-slot-period">${s.label}</span>
        ${s.time ? `<span class="dq-slot-time">${s.time}</span>` : ''}
      </button>
    `).join('');
  } else {
    // 일반 날짜: 기존 로직
    const slotMap = {};
    allItems.forEach(item => {
      const periodInfo = CLASS_PERIODS[item.period] || { label: item.period, time: item.time || '', start: item.time ? item.time.split('~')[0] : '99:99' };
      const timeStr    = item.time || periodInfo.time || '';
      const startTime  = item.time ? item.time.split('~')[0] : (periodInfo.start || '99:99');
      const key        = item.period + '|' + timeStr;
      if (!slotMap[key]) {
        slotMap[key] = { period: item.period, label: periodInfo.label || item.period, time: timeStr, start: startTime, isExam: false, key };
      }
    });
    const slots = Object.values(slotMap).sort((a, b) => a.start.localeCompare(b.start));
    timeslotEl.innerHTML = slots.map(s => `
      <button class="dq-timeslot-btn" data-key="${s.key}" data-period="${s.period}" data-time="${s.time}" data-isexam="0">
        <span class="dq-slot-period">${s.label}</span>
        ${s.time ? `<span class="dq-slot-time">${s.time}</span>` : ''}
      </button>
    `).join('');
  }

  // 버튼 클릭 이벤트 (토글 방식: 클릭하면 선택/해제, 여러 개 동시 선택 가능)
  timeslotEl.querySelectorAll('.dq-timeslot-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // 이미 선택된 버튼을 다시 클릭하면 해제
      btn.classList.toggle('active');

      const dateVal = document.getElementById('dqDateInput').value;
      const activeSlots = [...timeslotEl.querySelectorAll('.dq-timeslot-btn.active')].map(b => ({
        period:  b.dataset.period,
        time:    b.dataset.time,
        isExam:  b.dataset.isexam === '1'
      }));
      if (activeSlots.length === 0) { hideDqResult(); return; }
      renderDqResult(dateVal, activeSlots);
    });
  });
}

function hideDqResult() {
  document.getElementById('dqResult').style.display = 'none';
  document.getElementById('dqEmpty').style.display  = 'flex';
}

// 결과 렌더링 (selectedSlots: [{period, time, isExam}] 배열)
function renderDqResult(dateStr, selectedSlots) {
  const resultEl  = document.getElementById('dqResult');
  const emptyEl   = document.getElementById('dqEmpty');
  const titleEl   = document.getElementById('dqResultTitle');
  const metaEl    = document.getElementById('dqResultMeta');
  const courseEl  = document.getElementById('dqCourseList');
  const summaryEl = document.getElementById('dqStudentSummary');

  const d         = new Date(dateStr + 'T00:00:00');
  const DAY_KO    = ['일','월','화','수','목','금','토'];
  const dateLabel = `${d.getMonth()+1}월 ${d.getDate()}일(${DAY_KO[d.getDay()]})`;
  const isMulti   = selectedSlots.length > 1;

  // 슬롯별 아이템 수집
  let allItems = [];
  selectedSlots.forEach(slot => {
    if (slot.isExam) {
      const examItems = SCHEDULE_DATA.filter(s => s.date === dateStr && s.isExam && s.time === slot.time);
      allItems.push(...examItems);
    } else {
      const normal = [...SCHEDULE_DATA, ...QNA_SCHEDULE].filter(s => {
        if (s.date !== dateStr || s.isExam) return false;
        if (s.period !== slot.period) return false;
        if (slot.time && s.time && s.time !== slot.time) return false;
        return true;
      });
      allItems.push(...normal);
    }
  });

  // 중복 제거 (같은 date+course+period)
  const seen = new Set();
  allItems = allItems.filter(s => {
    const key = `${s.date}|${s.course}|${s.period}|${s.time}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  if (!allItems.length) { hideDqResult(); return; }

  // 제목: 날짜 행 + 교시 칩 행 분리
  const slotChips = selectedSlots.map(slot => {
    if (slot.isExam) {
      const examName = dateStr === '2026-04-18' ? '중간고사' : '기말고사';
      return `<span class="dq-slot-chip dq-slot-chip-exam">${examName}${slot.time ? '<span class="dq-chip-time">' + slot.time + '</span>' : ''}</span>`;
    }
    const pi = CLASS_PERIODS[slot.period] || { label: slot.period };
    return `<span class="dq-slot-chip">${pi.label}${slot.time ? '<span class="dq-chip-time">' + slot.time + '</span>' : ''}</span>`;
  }).join('');

  titleEl.innerHTML =
    `<div class="dq-title-date"><i class="fas fa-calendar-day"></i> ${dateLabel}</div>` +
    `<div class="dq-title-chips">${slotChips}</div>`;

  // 과목별 카드
  const allEnrolledSet = new Map();
  const examName = dateStr === '2026-04-18' ? '중간고사' : '기말고사';

  courseEl.innerHTML = allItems.map(item => {
    const course    = COURSES[item.course] || { professor: '-', color: '#2563b0' };
    const enrolled  = STUDENTS.filter(s => s.courses.includes(item.course));
    enrolled.forEach(s => {
      if (!allEnrolledSet.has(s.name)) allEnrolledSet.set(s.name, []);
      if (!allEnrolledSet.get(s.name).includes(item.course))
        allEnrolledSet.get(s.name).push(item.course);
    });
    const chips = enrolled.map(s =>
      `<span class="dq-student-chip" onclick="showStudentInfoPopup('${s.name}',event)">${s.name}</span>`
    ).join('');

    if (item.isExam) {
      const examBadge = `<span class="dq-exam-badge"><i class="fas fa-pencil-alt"></i> ${examName}</span>`;
      return `<div class="dq-course-card dq-exam-card" style="border-left:4px solid #e74c3c">
        <div class="dq-course-top">
          <div class="dq-course-info">
            <span class="dq-course-name" style="color:#c0392b" onclick="showCourseDetail('${item.course.replace(/'/g,"\\'")}')">${item.course}</span>
            <span class="dq-course-prof"><i class="fas fa-user-tie"></i> ${course.professor} 교수 · ${item.examGroup}그룹 ${item.time}</span>
          </div>
          <div class="dq-course-badges">${examBadge}<span class="dq-enroll-count"><i class="fas fa-users"></i> ${enrolled.length}명</span></div>
        </div>
        ${enrolled.length > 0 ? `<div class="dq-chips-row">${chips}</div>` : `<div class="dq-no-student">등록된 수강생 없음</div>`}
      </div>`;
    }

    const typeBadge = getTypeBadge(item.type);
    const pi = CLASS_PERIODS[item.period] || { label: item.period };
    const timeDisp = item.time || pi.time || '';
    return `<div class="dq-course-card" style="border-left:4px solid ${course.color || '#2563b0'}">
      <div class="dq-course-top">
        <div class="dq-course-info">
          <span class="dq-course-name" onclick="showCourseDetail('${item.course.replace(/'/g,"\\'")}')">${item.course}</span>
          <span class="dq-course-prof"><i class="fas fa-user-tie"></i> ${course.professor} 교수${isMulti ? ' · ' + pi.label + (timeDisp ? ' ' + timeDisp : '') : ''}</span>
        </div>
        <div class="dq-course-badges">${typeBadge}<span class="dq-enroll-count"><i class="fas fa-users"></i> ${enrolled.length}명</span></div>
      </div>
      ${enrolled.length > 0 ? `<div class="dq-chips-row">${chips}</div>` : `<div class="dq-no-student">등록된 수강생 없음</div>`}
    </div>`;
  }).join('');

  const sortedStudents = [...allEnrolledSet.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ko'));
  summaryEl.innerHTML = sortedStudents.map(([name, courses]) =>
    `<div class="dq-summary-chip" onclick="showStudentInfoPopup('${name}',event)">
      <span class="dq-summary-name">${name}</span>
      <span class="dq-summary-courses">${courses.map(c => `(${c})`).join(' ')}</span>
    </div>`
  ).join('');

  metaEl.innerHTML = `과목 ${allItems.length}개 · 수강 원우 ${sortedStudents.length}명`;
  resultEl.style.display = 'block';
  emptyEl.style.display  = 'none';

  // 엑셀 다운로드 버튼에 현재 데이터 저장
  window._dqLastData = { dateStr, dateLabel, allItems, allEnrolledSet, sortedStudents };
}

// ===== 날짜별 조회 엑셀 다운로드 =====
window.exportDqToExcel = function() {
  const d = window._dqLastData;
  if (!d || !d.allItems.length) { alert('먼저 날짜와 시간대를 선택하세요.'); return; }

  const wb = XLSX.utils.book_new();

  // ── 시트1: 과목별 수강생 ──
  const sheet1Data = [['날짜','시간','과목명','교수','수업유형','수강생 이름']];
  d.allItems.forEach(item => {
    const course   = COURSES[item.course] || { professor: '-' };
    const enrolled = STUDENTS.filter(s => s.courses.includes(item.course));
    const pi       = CLASS_PERIODS[item.period] || { label: item.period };
    const timeStr  = item.time || pi.time || '';
    const typeStr  = item.isExam ? (d.dateStr === '2026-04-18' ? '중간고사' : '기말고사')
                   : (item.type === 'qna' ? '화상Q&A' : '오프라인');
    if (enrolled.length === 0) {
      sheet1Data.push([d.dateLabel, timeStr, item.course, course.professor, typeStr, '']);
    } else {
      enrolled.forEach(s => {
        sheet1Data.push([d.dateLabel, timeStr, item.course, course.professor, typeStr, s.name]);
      });
    }
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet1Data), '과목별수강생');

  // ── 시트2: 원우별 수업 목록 ──
  const sheet2Data = [['이름','과목명','시간','수업유형']];
  d.sortedStudents.forEach(([name, courses]) => {
    courses.forEach(cName => {
      const item = d.allItems.find(i => i.course === cName);
      if (!item) return;
      const pi      = CLASS_PERIODS[item.period] || { label: item.period };
      const timeStr = item.time || pi.time || '';
      const typeStr = item.isExam ? (d.dateStr === '2026-04-18' ? '중간고사' : '기말고사')
                    : (item.type === 'qna' ? '화상Q&A' : '오프라인');
      sheet2Data.push([name, cName, timeStr, typeStr]);
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet2Data), '원우별수업');

  XLSX.writeFile(wb, `날짜별조회_${d.dateStr}.xlsx`);
};
