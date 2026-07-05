import test from "node:test";
import assert from "node:assert/strict";
import { buildWireframeSvg } from "../lib/designMockupImage.js";

test("buildWireframeSvg returns valid svg for feed target", () => {
  const svg = buildWireframeSvg(
    { name: "動態消息", focus: "貼文卡片" },
    { label: "7月6日 12:00" }
  );
  assert.ok(svg.startsWith("<?xml"));
  assert.match(svg, /動態消息/);
  assert.match(svg, /EVONVCHAT/);
});

test("buildWireframeSvg varies layout by target name", () => {
  const chatSvg = buildWireframeSvg({ name: "聊天室首頁", focus: "大廳" }, { label: "slot" });
  const cinemaSvg = buildWireframeSvg({ name: "電影院", focus: "直播" }, { label: "slot" });
  assert.notEqual(chatSvg, cinemaSvg);
});
