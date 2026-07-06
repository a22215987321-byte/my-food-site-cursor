export const STORAGE_ENTER_CHAT = "evonvchat_enter_chat";
export const STORAGE_INTRO_MODAL = "evonvchat_intro_modal_v1";
export const STORAGE_HALL_BANNER = "evonvchat_hall_banner_v1";

export function markEnterChat() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(STORAGE_ENTER_CHAT, "1");
  }
}

export function shouldSkipSplash() {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE_ENTER_CHAT) === "1";
}

export function shouldShowIntroModal() {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(STORAGE_INTRO_MODAL);
}

export function dismissIntroModal() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_INTRO_MODAL, "1");
  }
}

export function shouldShowHallBanner() {
  if (typeof window === "undefined") return false;
  return !localStorage.getItem(STORAGE_HALL_BANNER);
}

export function dismissHallBanner() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_HALL_BANNER, "1");
  }
}
