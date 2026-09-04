/* ============================================================
   Firebase 설정 & Auth / Firestore 초기화
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// ── Firebase 초기화 ──────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCDArOzufr562_cJXEEj7uFY_pEiQDSY1Q",
  authDomain:        "alicia1-b3000.firebaseapp.com",
  projectId:         "alicia1-b3000",
  storageBucket:     "alicia1-b3000.firebasestorage.app",
  messagingSenderId: "299254800200",
  appId:             "1:299254800200:web:12e4e6e49f37c2db05dd7d",
  measurementId:     "G-8LK0BSRD00"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Firestore 그룹 CRUD ──────────────────────────────────────

/**
 * Firestore에서 현재 유저의 그룹 목록을 불러옵니다.
 * @returns {Promise<Array>} 그룹 배열
 */
async function loadGroupsFromFirestore() {
  const user = auth.currentUser;
  if (!user) return null;          // 비로그인 → null 반환
  try {
    const ref  = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data().groups || [];
    }
    return [];
  } catch (e) {
    console.warn("[Firebase] loadGroups 실패:", e);
    return null;
  }
}

/**
 * Firestore에 현재 유저의 그룹 목록을 저장합니다.
 * @param {Array} groups 저장할 그룹 배열
 */
async function saveGroupsToFirestore(groups) {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const ref = doc(db, "users", user.uid);
    await setDoc(ref, {
      uid:       user.uid,
      email:     user.email,
      name:      user.displayName,
      groups,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (e) {
    console.warn("[Firebase] saveGroups 실패:", e);
  }
}

// ── 구글 로그인 / 로그아웃 ───────────────────────────────────

// 모바일 여부 체크
function isMobile() {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    if (isMobile()) {
      await signInWithRedirect(auth, provider);   // 모바일: 리디렉션 방식
    } else {
      await signInWithPopup(auth, provider);      // PC: 기존 팝업 방식
    }
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      console.error("[Firebase] 로그인 실패:", e);
      alert("로그인에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
  }
}

// 페이지 로드 시 리디렉션 결과 처리 (반드시 추가해야 함!)
getRedirectResult(auth).catch((e) => {
  console.error("[Firebase] 리디렉션 로그인 처리 실패:", e);
});

async function signOutUser() {
  try {
    await signOut(auth);
  } catch (e) {
    console.error("[Firebase] 로그아웃 실패:", e);
  }
}

// ── 전역 노출 ────────────────────────────────────────────────
export {
  auth,
  db,
  onAuthStateChanged,
  loadGroupsFromFirestore,
  saveGroupsToFirestore,
  signInWithGoogle,
  signOutUser
};
