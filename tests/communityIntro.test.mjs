import test from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_ENTER_CHAT,
  STORAGE_INTRO_MODAL,
  STORAGE_HALL_BANNER,
} from "../lib/communityIntro.js";

test("storage keys are defined", () => {
  assert.equal(STORAGE_ENTER_CHAT, "evonvchat_enter_chat");
  assert.equal(STORAGE_INTRO_MODAL, "evonvchat_intro_modal_v1");
  assert.equal(STORAGE_HALL_BANNER, "evonvchat_hall_banner_v1");
});
